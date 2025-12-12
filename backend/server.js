const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleAdsApi, enums } = require('google-ads-api');
require('dotenv').config();

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
    service: 'Google Ads API Backend'
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
    const { customerId } = req.body;
    
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    console.log(`Fetching campaigns for customer: ${customerId}`);
    
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      login_customer_id: process.env.GOOGLE_ADS_MCC_ID,
    });

    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        campaign_budget.amount_micros,
        metrics.cost_micros,
        metrics.clicks,
        metrics.impressions
      FROM campaign
      WHERE campaign.status IN ('ENABLED', 'PAUSED')
      ORDER BY campaign.name ASC
    `;

    const results = await customer.query(query);
    
    console.log('Raw campaign data:', results.slice(0, 2)); // Log first 2 campaigns
    
    const formattedCampaigns = results.map(row => {
      // Convert status number to text
      const statusMap = {
        2: 'ENABLED',
        3: 'PAUSED',
        4: 'REMOVED'
      };
      
      return {
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
          clicks: row.metrics?.clicks || 0,
          impressions: row.metrics?.impressions || 0,
          costMicros: row.metrics?.cost_micros || 0
        }
      };
    });

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

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Google Ads API Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;