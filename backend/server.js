const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleAdsApi, enums } = require('google-ads-api');
const axios = require('axios');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', process.env.FRONTEND_URL].filter(Boolean),
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Body parser
app.use(express.json());

// Initialize Google Ads API client
const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Advertising API Backend (Google & Bing)'
  });
});

// Test token and credentials
app.get('/debug/token', async (req, res) => {
  try {
    // Test authentication by trying to access the client
    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_MCC_ID,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    res.json({
      success: true,
      message: 'Google Ads API client initialized successfully',
      customer_id: process.env.GOOGLE_ADS_MCC_ID
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get campaigns for a customer
app.post('/api/campaigns', async (req, res) => {
  try {
    const { customerId, dateRange, startDate, endDate } = req.body;
    
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      login_customer_id: process.env.GOOGLE_ADS_MCC_ID,
    });

    let startDateFormatted, endDateFormatted, logMessage;

    if (startDate && endDate) {
      // Specific date range provided
      startDateFormatted = startDate;
      endDateFormatted = endDate;
      logMessage = `Fetching campaigns for customer: ${customerId} (${startDate} to ${endDate})`;
    } else {
      // Use dateRange (last X days)
      const endDateCalc = new Date();
      const startDateCalc = new Date();
      startDateCalc.setDate(endDateCalc.getDate() - parseInt(dateRange || '30'));
      
      const formatDate = (date) => date.toISOString().split('T')[0].replace(/-/g, '');
      startDateFormatted = formatDate(startDateCalc);
      endDateFormatted = formatDate(endDateCalc);
      logMessage = `Fetching campaigns for customer: ${customerId} (Last ${dateRange || '30'} days)`;
    }
    
    console.log(logMessage);
    console.log(`Date range: ${startDateFormatted} to ${endDateFormatted}`);

    // Test query without date segmentation to check conversions compatibility
    const testQuery = `
      SELECT 
        campaign.id,
        campaign.name,
        metrics.conversions
      FROM campaign
      WHERE campaign.status IN ('ENABLED', 'PAUSED')
        AND segments.date BETWEEN '${startDateFormatted}' AND '${endDateFormatted}'
      ORDER BY campaign.name ASC
    `;
    
    console.log('Testing conversions field availability...');
    
    let testResults;
    try {
      testResults = await customer.query(testQuery);
      console.log('✓ Conversions field test successful');
      console.log('Test results sample:', testResults.slice(0, 2));
    } catch (testError) {
      console.error('✗ Conversions field test failed:', testError.message);
    }

    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        campaign_budget.amount_micros,
        segments.date,
        metrics.cost_micros,
        metrics.clicks,
        metrics.impressions,
        metrics.conversions_value,
        metrics.conversions
      FROM campaign
      WHERE campaign.status IN ('ENABLED', 'PAUSED')
        AND segments.date BETWEEN '${startDateFormatted}' AND '${endDateFormatted}'
      ORDER BY campaign.name ASC, segments.date ASC
    `;

    let results;
    try {
      results = await customer.query(query);
    } catch (queryError) {
      console.error('Google Ads API Query Error:', queryError.message);
      console.error('Query that failed:', query);
      throw queryError;
    }
    
    console.log('Raw campaign data:', results.slice(0, 2)); // Log first 2 campaigns
    
    // Debug: log all available metrics fields from first result
    if (results.length > 0) {
      console.log('Available metrics fields:', Object.keys(results[0].metrics || {}));
      console.log('First result metrics object:', results[0].metrics);
    }
    
    // Group daily results by campaign
    const campaignsMap = new Map();
    
    results.forEach(row => {
      const campaignId = row.campaign.id;
      const statusMap = {
        2: 'ENABLED',
        3: 'PAUSED',
        4: 'REMOVED'
      };
      
      if (!campaignsMap.has(campaignId)) {
        campaignsMap.set(campaignId, {
          campaign: {
            id: row.campaign.id,
            name: row.campaign.name,
            status: statusMap[row.campaign.status] || 'UNKNOWN',
            campaignBudget: `customers/${customerId}/campaignBudgets/${row.campaign.id}`
          },
          campaignBudget: {
            amountMicros: row.campaign_budget?.amount_micros || 0
          },
          metrics: {
            clicks: 0,
            impressions: 0,
            costMicros: 0,
            conversions: 0,
            conversionsValue: 0
          },
          dailyData: []
        });
      }
      
      const campaign = campaignsMap.get(campaignId);
      
      // Aggregate totals
      campaign.metrics.clicks += row.metrics?.clicks || 0;
      campaign.metrics.impressions += row.metrics?.impressions || 0;
      campaign.metrics.costMicros += row.metrics?.cost_micros || 0;
      campaign.metrics.conversions += row.metrics?.conversions || 0;
      campaign.metrics.conversionsValue += row.metrics?.conversions_value || 0;
      
      // Add daily data point
      const costInDollars = (row.metrics?.cost_micros || 0) / 1000000;
      const roas = costInDollars > 0 ? (row.metrics?.conversions_value || 0) / costInDollars : 0;
      
      campaign.dailyData.push({
        date: row.segments.date,
        cost: costInDollars,
        roas: roas,
        conversionsValue: row.metrics?.conversions_value || 0
      });
    });
    
    const formattedCampaigns = Array.from(campaignsMap.values());

    res.json({ 
      success: true, 
      results: formattedCampaigns,
      count: formattedCampaigns.length
    });

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Pause campaign
app.post('/api/campaigns/pause', async (req, res) => {
  try {
    const { customerId, campaignId } = req.body;
    
    if (!customerId || !campaignId) {
      return res.status(400).json({ error: 'Customer ID and Campaign ID are required' });
    }

    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      login_customer_id: process.env.GOOGLE_ADS_MCC_ID,
    });

    console.log(`Pausing campaign ${campaignId} for customer ${customerId}`);
    const result = await customer.campaigns.update([
      {
        resource_name: `customers/${customerId}/campaigns/${campaignId}`,
        status: enums.CampaignStatus.PAUSED,
      }
    ]);

    res.json({ 
      success: true, 
      message: 'Campaign paused successfully',
      result: result
    });

  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Enable campaign
app.post('/api/campaigns/enable', async (req, res) => {
  try {
    const { customerId, campaignId } = req.body;
    
    if (!customerId || !campaignId) {
      return res.status(400).json({ error: 'Customer ID and Campaign ID are required' });
    }

    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      login_customer_id: process.env.GOOGLE_ADS_MCC_ID,
    });

    console.log(`Enabling campaign ${campaignId} for customer ${customerId}`);
    const result = await customer.campaigns.update([
      {
        resource_name: `customers/${customerId}/campaigns/${campaignId}`,
        status: enums.CampaignStatus.ENABLED,
      }
    ]);

    res.json({ 
      success: true, 
      message: 'Campaign enabled successfully',
      result: result
    });

  } catch (error) {
    console.error('Error enabling campaign:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update campaign budget
app.post('/api/campaigns/budget', async (req, res) => {
  try {
    const { customerId, campaignId, budgetAmount } = req.body;
    
    if (!customerId || !campaignId || !budgetAmount) {
      return res.status(400).json({ error: 'Customer ID, Campaign ID, and Budget Amount are required' });
    }

    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      login_customer_id: process.env.GOOGLE_ADS_MCC_ID,
    });

    // First get the campaign to find its budget
    const campaignQuery = `
      SELECT campaign.campaign_budget 
      FROM campaign 
      WHERE campaign.id = ${campaignId}
    `;
    
    console.log(`Getting budget info for campaign ${campaignId}`);
    const campaignResults = await customer.query(campaignQuery);
    
    if (campaignResults.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const budgetResourceName = campaignResults[0].campaign.campaign_budget;
    const budgetId = budgetResourceName.split('/').pop();

    // Update the budget
    console.log(`Updating budget for campaign ${campaignId} to $${budgetAmount}`);
    const result = await customer.campaignBudgets.update([
      {
        resource_name: budgetResourceName,
        amount_micros: budgetAmount * 1000000, // Convert dollars to micros
      }
    ]);

    res.json({ 
      success: true, 
      message: `Campaign budget updated to $${budgetAmount}/day`,
      result: result
    });

  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get performance data by day and time for selected client
app.post('/api/performance-by-time', async (req, res) => {
  try {
    const { dateRange, startDate, endDate, selectedClient } = req.body;
    
    console.log(`Fetching performance data by day and time for client: ${selectedClient || 'all accounts'}`);
    
    // First get all accounts or filter to selected client
    const mccCustomer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_MCC_ID,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    let accountsQuery;
    if (selectedClient && selectedClient !== '') {
      accountsQuery = `
        SELECT 
          customer_client.id,
          customer_client.descriptive_name
        FROM customer_client 
        WHERE customer_client.manager = false
          AND customer_client.descriptive_name = '${selectedClient}'
        ORDER BY customer_client.descriptive_name ASC
      `;
    } else {
      // Limit to top 10 accounts if no specific client selected
      accountsQuery = `
        SELECT 
          customer_client.id,
          customer_client.descriptive_name
        FROM customer_client 
        WHERE customer_client.manager = false
        ORDER BY customer_client.descriptive_name ASC
        LIMIT 10
      `;
    }

    const accounts = await mccCustomer.query(accountsQuery);
    console.log(`Found ${accounts.length} accounts`);
    
    // Calculate date range
    let startDateFormatted, endDateFormatted;
    
    if (startDate && endDate) {
      startDateFormatted = startDate;
      endDateFormatted = endDate;
    } else {
      const endDateCalc = new Date();
      const startDateCalc = new Date();
      startDateCalc.setDate(endDateCalc.getDate() - parseInt(dateRange || '30'));
      
      const formatDate = (date) => date.toISOString().split('T')[0].replace(/-/g, '');
      startDateFormatted = formatDate(startDateCalc);
      endDateFormatted = formatDate(endDateCalc);
    }
    
    console.log(`Date range: ${startDateFormatted} to ${endDateFormatted}`);
    
    const allPerformanceData = [];
    
    // Query each account for time-based performance data in parallel
    const accountPromises = accounts.map(async (account) => {
      try {
        const customer = client.Customer({
          customer_id: account.customer_client.id,
          refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
          login_customer_id: process.env.GOOGLE_ADS_MCC_ID,
        });

        // Query for hourly data with day of week
        const timeQuery = `
          SELECT 
            segments.date,
            segments.day_of_week,
            segments.hour,
            metrics.cost_micros,
            metrics.conversions_value,
            metrics.clicks,
            metrics.impressions
          FROM campaign
          WHERE campaign.status IN ('ENABLED', 'PAUSED')
            AND segments.date BETWEEN '${startDateFormatted}' AND '${endDateFormatted}'
        `;

        const results = await customer.query(timeQuery);
        
        const accountData = [];
        results.forEach(row => {
          const cost = (row.metrics?.cost_micros || 0) / 1000000;
          const revenue = row.metrics?.conversions_value || 0;
          const roas = cost > 0 ? revenue / cost : 0;
          
          accountData.push({
            account: account.customer_client.descriptive_name,
            date: row.segments.date,
            dayOfWeek: row.segments.day_of_week,
            hour: row.segments.hour,
            cost,
            revenue,
            roas,
            clicks: row.metrics?.clicks || 0,
            impressions: row.metrics?.impressions || 0
          });
        });
        
        console.log(`✓ Processed ${results.length} time segments for ${account.customer_client.descriptive_name}`);
        return accountData;
        
      } catch (accountError) {
        console.error(`Error processing account ${account.customer_client.descriptive_name}:`, accountError.message);
        return [];
      }
    });
    
    // Wait for all account queries to complete
    const accountResults = await Promise.all(accountPromises);
    accountResults.forEach(accountData => {
      allPerformanceData.push(...accountData);
    });
    
    // Aggregate data by day of week and hour
    const dayOfWeekData = {};
    const hourOfDayData = {};
    
    allPerformanceData.forEach(row => {
      // Day of week aggregation
      if (!dayOfWeekData[row.dayOfWeek]) {
        dayOfWeekData[row.dayOfWeek] = { totalCost: 0, totalRevenue: 0, count: 0 };
      }
      dayOfWeekData[row.dayOfWeek].totalCost += row.cost;
      dayOfWeekData[row.dayOfWeek].totalRevenue += row.revenue;
      dayOfWeekData[row.dayOfWeek].count++;
      
      // Hour of day aggregation
      if (!hourOfDayData[row.hour]) {
        hourOfDayData[row.hour] = { totalCost: 0, totalRevenue: 0, count: 0 };
      }
      hourOfDayData[row.hour].totalCost += row.cost;
      hourOfDayData[row.hour].totalRevenue += row.revenue;
      hourOfDayData[row.hour].count++;
    });
    
    // Calculate average ROAS for each day of week
    const dayOfWeekRoas = Object.keys(dayOfWeekData).map(day => {
      const data = dayOfWeekData[day];
      const avgRoas = data.totalCost > 0 ? data.totalRevenue / data.totalCost : 0;
      return {
        dayOfWeek: parseInt(day),
        dayName: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][day - 2] || 'Sunday',
        roas: avgRoas,
        totalCost: data.totalCost,
        totalRevenue: data.totalRevenue
      };
    }).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    
    // Calculate average ROAS for each hour
    const hourOfDayRoas = Object.keys(hourOfDayData).map(hour => {
      const data = hourOfDayData[hour];
      const avgRoas = data.totalCost > 0 ? data.totalRevenue / data.totalCost : 0;
      const hourNum = parseInt(hour);
      const hourLabel = hourNum === 0 ? '12 AM' : 
                       hourNum < 12 ? `${hourNum} AM` : 
                       hourNum === 12 ? '12 PM' : 
                       `${hourNum - 12} PM`;
      
      return {
        hour: hourNum,
        hourLabel,
        roas: avgRoas,
        totalCost: data.totalCost,
        totalRevenue: data.totalRevenue
      };
    }).sort((a, b) => a.hour - b.hour);
    
    res.json({
      success: true,
      dayOfWeekData: dayOfWeekRoas,
      hourOfDayData: hourOfDayRoas,
      totalDataPoints: allPerformanceData.length,
      accountsProcessed: accounts.length
    });
    
  } catch (error) {
    console.error('Error fetching performance by time:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get accounts under MCC
app.get('/api/accounts', async (req, res) => {
  try {
    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_MCC_ID,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    const query = `
      SELECT 
        customer_client.id,
        customer_client.descriptive_name,
        customer_client.currency_code,
        customer_client.status
      FROM customer_client 
      WHERE customer_client.manager = false
      ORDER BY customer_client.descriptive_name ASC
    `;

    console.log('Fetching accounts under MCC');
    const results = await customer.query(query);
    
    const formattedAccounts = results.map(row => ({
      id: row.customer_client.id,
      name: row.customer_client.descriptive_name,
      currency: row.customer_client.currency_code,
      status: row.customer_client.status
    }));

    res.json({ 
      success: true, 
      results: formattedAccounts,
      count: formattedAccounts.length
    });

  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// BING ADS API ENDPOINTS
// ============================================

// Initialize MSAL for Bing Ads OAuth
const msalConfig = {
  auth: {
    clientId: process.env.BING_ADS_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.BING_ADS_TENANT_ID}`,
    clientSecret: process.env.BING_ADS_CLIENT_SECRET,
  }
};

let msalClient;
let bingAdsAccessToken = null;
let tokenExpiry = null;

// Function to get Bing Ads access token using refresh token
async function getBingAdsAccessToken() {
  // Return cached token if still valid
  if (bingAdsAccessToken && tokenExpiry && new Date() < tokenExpiry) {
    return bingAdsAccessToken;
  }

  try {
    // Use refresh token to get new access token
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: process.env.BING_ADS_CLIENT_ID,
        client_secret: process.env.BING_ADS_CLIENT_SECRET,
        refresh_token: process.env.BING_ADS_REFRESH_TOKEN,
        grant_type: 'refresh_token',
        scope: 'https://ads.microsoft.com/msads.manage'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    bingAdsAccessToken = tokenResponse.data.access_token;
    // Set expiry to 1 hour from now (tokens typically expire in 1 hour)
    tokenExpiry = new Date(Date.now() + 3600 * 1000);

    console.log('✓ Bing Ads access token acquired');
    return bingAdsAccessToken;
  } catch (error) {
    console.error('Error acquiring Bing Ads access token:', error.response?.data || error.message);
    throw error;
  }
}

// Helper function to make Bing Ads API SOAP requests
async function makeBingAdsSoapRequest(service, method, body) {
  const accessToken = await getBingAdsAccessToken();

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <h:AuthenticationToken xmlns:h="https://bingads.microsoft.com/${service}/v13">${accessToken}</h:AuthenticationToken>
    <h:DeveloperToken xmlns:h="https://bingads.microsoft.com/${service}/v13">${process.env.BING_ADS_DEVELOPER_TOKEN}</h:DeveloperToken>
    <h:CustomerId xmlns:h="https://bingads.microsoft.com/${service}/v13" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">${process.env.BING_ADS_CUSTOMER_ID}</h:CustomerId>
    <h:CustomerAccountId xmlns:h="https://bingads.microsoft.com/${service}/v13" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">${process.env.BING_ADS_ACCOUNT_ID}</h:CustomerAccountId>
  </s:Header>
  <s:Body>
    ${body}
  </s:Body>
</s:Envelope>`;

  const response = await axios.post(
    `https://campaign.api.bingads.microsoft.com/${service}/v13/${service}Service.svc`,
    soapEnvelope,
    {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `https://bingads.microsoft.com/${service}/v13/${service}Service/${method}`,
      }
    }
  );

  return response.data;
}

// Get Bing Ads campaigns
app.post('/api/bing-ads/campaigns', async (req, res) => {
  try {
    const { accountId } = req.body;

    console.log(`Fetching Bing Ads campaigns for account: ${accountId || process.env.BING_ADS_ACCOUNT_ID}`);

    const getCampaignsBody = `
      <GetCampaignsByAccountIdRequest xmlns="https://bingads.microsoft.com/CampaignManagement/v13">
        <AccountId>${accountId || process.env.BING_ADS_ACCOUNT_ID}</AccountId>
        <CampaignType>Search Shopping DynamicSearchAds</CampaignType>
        <ReturnAdditionalFields>AdScheduleUseSearcherTimeZone BidStrategyId CpvCpmBiddingScheme DynamicDescriptionSetting DynamicFeedSetting MaxConversionValueBiddingScheme MultimediaAdsBidAdjustment TargetImpressionShareBiddingScheme TargetSetting VerifiedTrackingSetting</ReturnAdditionalFields>
      </GetCampaignsByAccountIdRequest>`;

    const xmlResponse = await makeBingAdsSoapRequest('CampaignManagement', 'GetCampaignsByAccountId', getCampaignsBody);

    // Parse XML response (simplified - in production use a proper XML parser)
    const campaigns = parseBingAdsCampaignsXML(xmlResponse);

    res.json({
      success: true,
      campaigns: campaigns
    });

  } catch (error) {
    console.error('Error fetching Bing Ads campaigns:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Bing Ads campaign performance
app.post('/api/bing-ads/performance', async (req, res) => {
  try {
    const { accountId, customerId, timeSpan, startDate, endDate } = req.body;

    const accountIdToUse = accountId || process.env.BING_ADS_ACCOUNT_ID;
    const customerIdToUse = customerId || process.env.BING_ADS_CUSTOMER_ID;
    const timeSpanToUse = timeSpan || 'Last30Days';

    // Calculate date range (last 30 days if not provided)
    const endDateObj = endDate ? new Date(endDate) : new Date();
    const startDateObj = startDate ? new Date(startDate) : new Date(endDateObj.getTime() - 30 * 24 * 60 * 60 * 1000);

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    console.log(`Fetching Bing Ads performance for Customer ID: ${customerIdToUse}, Account ID: ${accountIdToUse}, Time Period: ${timeSpanToUse} (${formatDate(startDateObj)} to ${formatDate(endDateObj)})`);

    const submitGenerateReportBody = `
      <SubmitGenerateReportRequest xmlns="https://bingads.microsoft.com/Reporting/v13">
        <ReportRequest xmlns:i="http://www.w3.org/2001/XMLSchema-instance" i:type="CampaignPerformanceReportRequest">
          <Format>Csv</Format>
          <ReportName>Campaign Performance Report</ReportName>
          <ReturnOnlyCompleteData>false</ReturnOnlyCompleteData>
          <Aggregation>Summary</Aggregation>
          <Columns>
            <CampaignPerformanceReportColumn>CampaignName</CampaignPerformanceReportColumn>
            <CampaignPerformanceReportColumn>CampaignId</CampaignPerformanceReportColumn>
            <CampaignPerformanceReportColumn>CampaignStatus</CampaignPerformanceReportColumn>
            <CampaignPerformanceReportColumn>CampaignType</CampaignPerformanceReportColumn>
            <CampaignPerformanceReportColumn>BudgetAssociationStatus</CampaignPerformanceReportColumn>
            <CampaignPerformanceReportColumn>DailyBudget</CampaignPerformanceReportColumn>
            <CampaignPerformanceReportColumn>Impressions</CampaignPerformanceReportColumn>
            <CampaignPerformanceReportColumn>Clicks</CampaignPerformanceReportColumn>
            <CampaignPerformanceReportColumn>Spend</CampaignPerformanceReportColumn>
            <CampaignPerformanceReportColumn>Conversions</CampaignPerformanceReportColumn>
            <CampaignPerformanceReportColumn>Revenue</CampaignPerformanceReportColumn>
            <CampaignPerformanceReportColumn>Ctr</CampaignPerformanceReportColumn>
            <CampaignPerformanceReportColumn>AverageCpc</CampaignPerformanceReportColumn>
            <CampaignPerformanceReportColumn>ReturnOnAdSpend</CampaignPerformanceReportColumn>
          </Columns>
          <Scope>
            <AccountIds xmlns:a="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
              <a:long>${accountIdToUse}</a:long>
            </AccountIds>
          </Scope>
          <Time>
            <CustomDateRangeStart>
              <Day>${startDateObj.getDate()}</Day>
              <Month>${startDateObj.getMonth() + 1}</Month>
              <Year>${startDateObj.getFullYear()}</Year>
            </CustomDateRangeStart>
            <CustomDateRangeEnd>
              <Day>${endDateObj.getDate()}</Day>
              <Month>${endDateObj.getMonth() + 1}</Month>
              <Year>${endDateObj.getFullYear()}</Year>
            </CustomDateRangeEnd>
          </Time>
        </ReportRequest>
      </SubmitGenerateReportRequest>`;

    const accessToken = await getBingAdsAccessToken();

    // Submit report request
    const reportResponse = await axios.post(
      'https://reporting.api.bingads.microsoft.com/Api/Advertiser/Reporting/v13/ReportingService.svc',
      `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <h:AuthenticationToken xmlns:h="https://bingads.microsoft.com/Reporting/v13">${accessToken}</h:AuthenticationToken>
    <h:DeveloperToken xmlns:h="https://bingads.microsoft.com/Reporting/v13">${process.env.BING_ADS_DEVELOPER_TOKEN}</h:DeveloperToken>
    <h:CustomerId xmlns:h="https://bingads.microsoft.com/Reporting/v13">${customerIdToUse}</h:CustomerId>
    <h:CustomerAccountId xmlns:h="https://bingads.microsoft.com/Reporting/v13">${accountIdToUse}</h:CustomerAccountId>
  </s:Header>
  <s:Body>
    ${submitGenerateReportBody}
  </s:Body>
</s:Envelope>`,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'SubmitGenerateReport',
        }
      }
    );

    // Use Campaign Management Service to get campaigns directly
    const getCampaignsBody = `
      <GetCampaignsByAccountIdRequest xmlns="https://bingads.microsoft.com/CampaignManagement/v13">
        <AccountId>${accountIdToUse}</AccountId>
        <CampaignType>Search Shopping DynamicSearchAds</CampaignType>
      </GetCampaignsByAccountIdRequest>`;

    const campaignsXmlResponse = await axios.post(
      'https://campaign.api.bingads.microsoft.com/Api/Advertiser/CampaignManagement/v13/CampaignManagementService.svc',
      `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <h:AuthenticationToken xmlns:h="https://bingads.microsoft.com/CampaignManagement/v13">${accessToken}</h:AuthenticationToken>
    <h:DeveloperToken xmlns:h="https://bingads.microsoft.com/CampaignManagement/v13">${process.env.BING_ADS_DEVELOPER_TOKEN}</h:DeveloperToken>
    <h:CustomerId xmlns:h="https://bingads.microsoft.com/CampaignManagement/v13">${customerIdToUse}</h:CustomerId>
    <h:CustomerAccountId xmlns:h="https://bingads.microsoft.com/CampaignManagement/v13">${accountIdToUse}</h:CustomerAccountId>
  </s:Header>
  <s:Body>
    ${getCampaignsBody}
  </s:Body>
</s:Envelope>`,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'GetCampaignsByAccountId',
        }
      }
    );

    console.log('Raw Bing Ads API Response:', campaignsXmlResponse.data);

    // Parse XML response to extract campaigns (simplified)
    const xml2js = require('xml2js');
    const parser = new xml2js.Parser({ explicitArray: false });

    const parsedResult = await parser.parseStringPromise(campaignsXmlResponse.data);
    console.log('Parsed Bing Ads Response:', JSON.stringify(parsedResult, null, 2));

    // Check for SOAP fault
    const soapBody = parsedResult['s:Envelope']?.['s:Body'];
    const soapFault = soapBody?.['s:Fault'];

    if (soapFault) {
      const errorDetail = soapFault.detail?.AdApiFaultDetail?.Errors?.AdApiError;
      const errorMessage = errorDetail?.Message || soapFault.faultstring?._ || soapFault.faultstring || 'Unknown error';
      const errorCode = errorDetail?.ErrorCode || 'Unknown';
      throw new Error(`Bing Ads API Error (${errorCode}): ${errorMessage}`);
    }

    // Extract campaigns from SOAP response
    const campaigns = [];
    const response = soapBody?.['GetCampaignsByAccountIdResponse'];
    const campaignsData = response?.['Campaigns']?.['Campaign'];

    if (campaignsData) {
      const campaignArray = Array.isArray(campaignsData) ? campaignsData : [campaignsData];
      const campaignMap = new Map();

      for (const camp of campaignArray) {
        campaignMap.set(camp.Id, {
          id: camp.Id || 'unknown',
          name: camp.Name || 'Unknown Campaign',
          status: camp.Status || 'Unknown',
          type: camp.CampaignType || 'Unknown',
          budget: parseFloat(camp.DailyBudget || camp.Budget?.Amount || 0),
          cost: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          ctr: 0,
          cpc: 0,
          roas: 0
        });
      }

      // Fetch performance metrics using async reporting
      try {
        console.log('📊 Fetching performance metrics for campaigns...');

        // Build Time element based on whether using predefined time or custom dates
        let timeElement;
        if (startDate && endDate) {
          console.log(`Using custom date range: ${startDate} to ${endDate}`);
          // Use custom date range for month mode
          // Parse dates manually to avoid timezone issues
          const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
          const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

          timeElement = `<Time xmlns:tns="https://bingads.microsoft.com/Reporting/v13">
            <CustomDateRangeStart>
              <tns:Day>${startDay}</tns:Day>
              <tns:Month>${startMonth}</tns:Month>
              <tns:Year>${startYear}</tns:Year>
            </CustomDateRangeStart>
            <CustomDateRangeEnd>
              <tns:Day>${endDay}</tns:Day>
              <tns:Month>${endMonth}</tns:Month>
              <tns:Year>${endYear}</tns:Year>
            </CustomDateRangeEnd>
            <ReportTimeZone>PacificTimeUSCanadaTijuana</ReportTimeZone>
          </Time>`;
        } else {
          console.log(`Using predefined time: ${timeSpanToUse}`);
          // Use predefined time for time span mode
          timeElement = `<Time>
            <PredefinedTime>${timeSpanToUse}</PredefinedTime>
            <ReportTimeZone>PacificTimeUSCanadaTijuana</ReportTimeZone>
          </Time>`;
        }

        const submitReportBody = `
          <SubmitGenerateReportRequest xmlns="https://bingads.microsoft.com/Reporting/v13">
            <ReportRequest i:type="CampaignPerformanceReportRequest" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
              <Format>Csv</Format>
              <Language>English</Language>
              <ReportName>CampaignPerf</ReportName>
              <ReturnOnlyCompleteData>false</ReturnOnlyCompleteData>
              <Aggregation>Daily</Aggregation>
              <Columns>
                <CampaignPerformanceReportColumn>CampaignId</CampaignPerformanceReportColumn>
                <CampaignPerformanceReportColumn>Spend</CampaignPerformanceReportColumn>
                <CampaignPerformanceReportColumn>Impressions</CampaignPerformanceReportColumn>
                <CampaignPerformanceReportColumn>Clicks</CampaignPerformanceReportColumn>
                <CampaignPerformanceReportColumn>Conversions</CampaignPerformanceReportColumn>
                <CampaignPerformanceReportColumn>Revenue</CampaignPerformanceReportColumn>
              </Columns>
              <Scope>
                <AccountIds xmlns:a="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
                  <a:long>${accountIdToUse}</a:long>
                </AccountIds>
              </Scope>
              ${timeElement}
            </ReportRequest>
          </SubmitGenerateReportRequest>`;

        console.log('Report request XML Time element:', timeElement);
        console.log('FULL REPORT REQUEST XML:', submitReportBody);

        // Step 1: Submit report request
        const submitResponse = await axios.post(
          'https://reporting.api.bingads.microsoft.com/Api/Advertiser/Reporting/v13/ReportingService.svc',
          `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <h:AuthenticationToken xmlns:h="https://bingads.microsoft.com/Reporting/v13">${accessToken}</h:AuthenticationToken>
    <h:DeveloperToken xmlns:h="https://bingads.microsoft.com/Reporting/v13">${process.env.BING_ADS_DEVELOPER_TOKEN}</h:DeveloperToken>
    <h:CustomerId xmlns:h="https://bingads.microsoft.com/Reporting/v13">${customerIdToUse}</h:CustomerId>
    <h:CustomerAccountId xmlns:h="https://bingads.microsoft.com/Reporting/v13">${accountIdToUse}</h:CustomerAccountId>
  </s:Header>
  <s:Body>
    ${submitReportBody}
  </s:Body>
</s:Envelope>`,
          {
            headers: {
              'Content-Type': 'text/xml; charset=utf-8',
              'SOAPAction': 'SubmitGenerateReport',
            }
          }
        );

        const submitParsed = await parser.parseStringPromise(submitResponse.data);
        const reportRequestId = submitParsed['s:Envelope']?.['s:Body']?.['SubmitGenerateReportResponse']?.['ReportRequestId'];

        if (!reportRequestId) {
          console.error('Submit report response:', JSON.stringify(submitParsed, null, 2));
          const errorMessage = submitParsed['s:Envelope']?.['s:Body']?.['s:Fault']?.['faultstring'] ||
                               submitParsed['s:Envelope']?.['s:Body']?.['s:Fault']?.['detail'] ||
                               'Failed to get report request ID';
          throw new Error(`Report submission failed: ${errorMessage}`);
        }

        console.log(`✓ Report submitted (ID: ${reportRequestId}). Polling for completion...`);

        // Step 2: Poll for report completion (max 10 times, 3 seconds apart)
        let reportUrl = null;
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

          const pollBody = `
            <PollGenerateReportRequest xmlns="https://bingads.microsoft.com/Reporting/v13">
              <ReportRequestId>${reportRequestId}</ReportRequestId>
            </PollGenerateReportRequest>`;

          const pollResponse = await axios.post(
            'https://reporting.api.bingads.microsoft.com/Api/Advertiser/Reporting/v13/ReportingService.svc',
            `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <h:AuthenticationToken xmlns:h="https://bingads.microsoft.com/Reporting/v13">${accessToken}</h:AuthenticationToken>
    <h:DeveloperToken xmlns:h="https://bingads.microsoft.com/Reporting/v13">${process.env.BING_ADS_DEVELOPER_TOKEN}</h:DeveloperToken>
    <h:CustomerId xmlns:h="https://bingads.microsoft.com/Reporting/v13">${customerIdToUse}</h:CustomerId>
    <h:CustomerAccountId xmlns:h="https://bingads.microsoft.com/Reporting/v13">${accountIdToUse}</h:CustomerAccountId>
  </s:Header>
  <s:Body>
    ${pollBody}
  </s:Body>
</s:Envelope>`,
            {
              headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'PollGenerateReport',
              }
            }
          );

          const pollParsed = await parser.parseStringPromise(pollResponse.data);
          const status = pollParsed['s:Envelope']?.['s:Body']?.['PollGenerateReportResponse']?.['ReportRequestStatus']?.['Status'];

          console.log(`Poll ${i + 1}/10: Status = ${status}`);

          if (status === 'Success') {
            reportUrl = pollParsed['s:Envelope']?.['s:Body']?.['PollGenerateReportResponse']?.['ReportRequestStatus']?.['ReportDownloadUrl'];
            break;
          } else if (status === 'Error') {
            throw new Error('Report generation failed');
          }
        }

        // Step 3: Download and parse report
        if (reportUrl) {
          console.log('✓ Report ready. Downloading...');
          const reportData = await axios.get(reportUrl, { responseType: 'arraybuffer' });

          // Bing Ads returns reports as ZIP files, extract the CSV
          let csvData;
          try {
            const zip = new AdmZip(reportData.data);
            const zipEntries = zip.getEntries();

            if (zipEntries.length === 0) {
              throw new Error('ZIP file is empty');
            }

            // Get the first CSV file from the ZIP
            const csvEntry = zipEntries.find(entry => entry.entryName.endsWith('.csv'));
            if (!csvEntry) {
              throw new Error('No CSV file found in ZIP');
            }

            csvData = csvEntry.getData().toString('utf8');
            console.log('✓ Extracted CSV from ZIP');
          } catch (zipError) {
            console.error('Error extracting ZIP:', zipError.message);
            throw new Error('Failed to extract report data from ZIP');
          }

          // Parse CSV report
          // Bing Ads CSV has multiple header rows before the actual column headers
          const lines = csvData.split('\n').filter(line => line.trim() && !line.startsWith('©'));

          // Find the line that contains "CampaignId" - that's the actual header row
          let headerIndex = -1;
          let headers = [];
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('CampaignId')) {
              headerIndex = i;
              // Remove quotes and split by comma
              headers = lines[i].replace(/"/g, '').split(',').map(h => h.trim());
              break;
            }
          }

          if (headerIndex === -1) {
            console.error('Could not find column headers in CSV');
            throw new Error('Invalid CSV format - no column headers found');
          }

          console.log('📋 CSV Headers:', headers);
          console.log(`📊 CSV Data Rows: ${lines.length - headerIndex - 1}`);

          // Parse data rows (skip all lines up to and including header)
          for (let i = headerIndex + 1; i < lines.length; i++) {
            // Handle quoted values properly
            const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());

            const campaignId = cleanValues[headers.indexOf('CampaignId')];
            const campaign = campaignMap.get(campaignId);

            console.log(`Campaign ${campaignId}: Spend=${cleanValues[headers.indexOf('Spend')]}, Conversions=${cleanValues[headers.indexOf('Conversions')]}, Revenue=${cleanValues[headers.indexOf('Revenue')]}`);

            if (campaign) {
              // Remove commas from numeric values before parsing (Bing Ads uses commas in large numbers)
              const parseNumber = (val) => parseFloat((val || '0').replace(/,/g, ''));

              campaign.cost = parseNumber(cleanValues[headers.indexOf('Spend')]);
              campaign.impressions = parseInt((cleanValues[headers.indexOf('Impressions')] || '0').replace(/,/g, ''));
              campaign.clicks = parseInt((cleanValues[headers.indexOf('Clicks')] || '0').replace(/,/g, ''));
              campaign.conversions = parseNumber(cleanValues[headers.indexOf('Conversions')]);
              campaign.revenue = parseNumber(cleanValues[headers.indexOf('Revenue')]);
              campaign.roas = campaign.cost > 0 ? campaign.revenue / campaign.cost : 0;
              campaign.ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
              campaign.cpc = campaign.clicks > 0 ? campaign.cost / campaign.clicks : 0;
            }
          }

          console.log('✓ Performance metrics loaded!');
        } else {
          console.log('⚠ Report not ready after polling. Using campaign data only.');
        }
      } catch (perfError) {
        console.error('Error fetching performance data:', perfError.message);
      }

      campaigns.push(...campaignMap.values());
    }

    // Filter to only include Active campaigns (not paused)
    const filteredCampaigns = campaigns.filter(campaign => {
      return campaign.status === 'Active';
    });

    console.log(`📤 Sending ${filteredCampaigns.length} campaigns to frontend (filtered from ${campaigns.length} total)`);

    res.json({
      success: true,
      campaigns: filteredCampaigns,
      count: filteredCampaigns.length
    });

  } catch (error) {
    console.error('Error fetching Bing Ads performance:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to parse Bing Ads XML (simplified)
function parseBingAdsCampaignsXML(xml) {
  // This is a simplified parser - in production, use a proper XML parser like 'xml2js'
  const campaigns = [];
  // Mock return for now
  return campaigns;
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Get performance comparison data for different time periods
app.post('/api/performance-comparison', async (req, res) => {
  try {
    const { selectedClient } = req.body;
    
    if (!selectedClient) {
      return res.status(400).json({ error: 'Selected client is required' });
    }
    
    console.log(`Fetching performance comparison data for client: ${selectedClient}`);
    
    // First get the customer ID for the selected client
    const mccCustomer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_MCC_ID,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });
    
    const accountsQuery = `
      SELECT 
        customer_client.id,
        customer_client.descriptive_name
      FROM customer_client 
      WHERE customer_client.status = 'ENABLED'
        AND customer_client.descriptive_name = '${selectedClient}'
      ORDER BY customer_client.descriptive_name ASC
    `;
    
    const accountsResults = await mccCustomer.query(accountsQuery);
    if (accountsResults.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const customerId = accountsResults[0].customer_client.id;
    
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      login_customer_id: process.env.GOOGLE_ADS_MCC_ID,
    });
    
    const today = new Date();
    const periods = [7, 14, 30, 60, 90];
    const comparisonData = {};

    // Calculate Month-to-Date actual values
    const mtdStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (date) => date.toISOString().split('T')[0].replace(/-/g, '');

    const mtdQuery = `
      SELECT
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE campaign.status IN ('ENABLED', 'PAUSED')
        AND segments.date BETWEEN '${formatDate(mtdStartDate)}' AND '${formatDate(today)}'
    `;

    try {
      const mtdResults = await customer.query(mtdQuery);

      let mtdCost = 0;
      let mtdRevenue = 0;

      mtdResults.forEach(row => {
        mtdCost += (row.metrics?.cost_micros || 0) / 1000000;
        mtdRevenue += row.metrics?.conversions_value || 0;
      });

      const mtdRoas = mtdCost > 0 ? mtdRevenue / mtdCost : 0;

      comparisonData['mtd'] = {
        costActual: mtdCost,
        roasActual: mtdRoas
      };

      console.log(`✓ Month-to-Date: Cost $${mtdCost.toFixed(2)}, ROAS ${mtdRoas.toFixed(2)}x`);

    } catch (mtdError) {
      console.error('Error calculating MTD:', mtdError.message);
      comparisonData['mtd'] = {
        costActual: 0,
        roasActual: 0
      };
    }

    // Calculate data for each time period
    for (const days of periods) {
      // Current period
      const currentEndDate = new Date(today);
      const currentStartDate = new Date(today);
      currentStartDate.setDate(currentStartDate.getDate() - days);
      
      // Previous period
      const previousEndDate = new Date(currentStartDate);
      previousEndDate.setDate(previousEndDate.getDate() - 1);
      const previousStartDate = new Date(previousEndDate);
      previousStartDate.setDate(previousStartDate.getDate() - days);

      const currentQuery = `
        SELECT 
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE campaign.status IN ('ENABLED', 'PAUSED')
          AND segments.date BETWEEN '${formatDate(currentStartDate)}' AND '${formatDate(currentEndDate)}'
      `;
      
      const previousQuery = `
        SELECT 
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE campaign.status IN ('ENABLED', 'PAUSED')
          AND segments.date BETWEEN '${formatDate(previousStartDate)}' AND '${formatDate(previousEndDate)}'
      `;
      
      try {
        const [currentResults, previousResults] = await Promise.all([
          customer.query(currentQuery),
          customer.query(previousQuery)
        ]);
        
        // Aggregate current period
        let currentCost = 0;
        let currentConversions = 0;
        let currentRevenue = 0;
        
        currentResults.forEach(row => {
          currentCost += (row.metrics?.cost_micros || 0) / 1000000;
          currentConversions += row.metrics?.conversions || 0;
          currentRevenue += row.metrics?.conversions_value || 0;
        });
        
        // Aggregate previous period
        let previousCost = 0;
        let previousConversions = 0;
        let previousRevenue = 0;
        
        previousResults.forEach(row => {
          previousCost += (row.metrics?.cost_micros || 0) / 1000000;
          previousConversions += row.metrics?.conversions || 0;
          previousRevenue += row.metrics?.conversions_value || 0;
        });
        
        // Calculate ROAS
        const currentROAS = currentCost > 0 ? currentRevenue / currentCost : 0;
        const previousROAS = previousCost > 0 ? previousRevenue / previousCost : 0;
        
        // Calculate percentage changes
        const costChange = previousCost > 0 ? ((currentCost - previousCost) / previousCost) * 100 : 0;
        const roasChange = previousROAS > 0 ? ((currentROAS - previousROAS) / previousROAS) * 100 : 0;
        const conversionsChange = previousConversions > 0 ? ((currentConversions - previousConversions) / previousConversions) * 100 : 0;
        
        comparisonData[`${days}d`] = {
          cost: costChange,
          roas: roasChange,
          conversions: conversionsChange,
          // Debug info
          current: { cost: currentCost, roas: currentROAS, conversions: currentConversions },
          previous: { cost: previousCost, roas: previousROAS, conversions: previousConversions }
        };
        
        console.log(`✓ Calculated comparison for ${days} days: Cost ${costChange.toFixed(2)}%, ROAS ${roasChange.toFixed(2)}%, Conversions ${conversionsChange.toFixed(2)}%`);
        
      } catch (periodError) {
        console.error(`Error calculating ${days}-day comparison:`, periodError.message);
        comparisonData[`${days}d`] = {
          cost: 0,
          roas: 0,
          conversions: 0
        };
      }
    }
    
    res.json(comparisonData);
    
  } catch (error) {
    console.error('Error fetching performance comparison:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// Update campaign budget
app.post('/api/update-campaign-budget', async (req, res) => {
  try {
    const { customerId, campaignId, newBudget } = req.body;

    if (!customerId || !campaignId || !newBudget) {
      return res.status(400).json({ error: 'customerId, campaignId, and newBudget are required' });
    }

    console.log(`Updating budget for campaign ${campaignId} in account ${customerId} to $${newBudget}`);

    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      login_customer_id: process.env.GOOGLE_ADS_MCC_ID,
    });

    // First, get the campaign budget ID
    const campaignQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.campaign_budget
      FROM campaign
      WHERE campaign.id = ${campaignId}
    `;

    const campaignResults = await customer.query(campaignQuery);

    if (campaignResults.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const budgetResourceName = campaignResults[0].campaign.campaign_budget;

    // Update the campaign budget
    const budgetUpdate = {
      resource_name: budgetResourceName,
      amount_micros: Math.round(newBudget * 1000000),
    };

    await customer.campaignBudgets.update([budgetUpdate]);

    console.log(`✓ Successfully updated budget to $${newBudget}`);

    res.json({
      success: true,
      campaignId,
      newBudget,
      message: `Budget updated to $${newBudget}`
    });

  } catch (error) {
    console.error('Error updating campaign budget:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Advertising API Backend (Google & Bing) running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;