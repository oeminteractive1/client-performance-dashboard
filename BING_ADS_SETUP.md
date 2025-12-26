# Bing Ads API Setup Guide

## Backend Setup

### 1. Add Environment Variables

Copy the Bing Ads credentials to your `backend/.env` file:

```bash
# Bing Ads API Configuration
BING_ADS_DEVELOPER_TOKEN=1189432E04263655
BING_ADS_CLIENT_ID=dc13e974-6600-4056-bd51-9c731a0f13b4
BING_ADS_CLIENT_SECRET=your_client_secret_here
BING_ADS_TENANT_ID=52484930-ac10-429a-a595-82ebe059a642
BING_ADS_CUSTOMER_ID=your_customer_id_here
BING_ADS_ACCOUNT_ID=your_account_id_here
```

### 2. Find Your Customer ID and Account ID

1. Go to https://ads.microsoft.com
2. Click on your account name in the top right
3. **Customer ID**: Found in the account dropdown (format: numbers only)
4. **Account ID**: Click on "Accounts & Billing" → "Accounts" to see your account IDs

### 3. Start the Backend Server

```bash
cd backend
npm install  # Install dependencies (axios, @azure/msal-node)
npm start    # Start on port 3002
```

## Frontend Setup

The frontend is already configured to:
- Fetch campaigns from `http://localhost:3002/api/bing-ads/performance`
- Fall back to mock data if the backend is unavailable
- Display loading states and errors

## API Endpoints

### Get Campaign Performance
```
POST http://localhost:3002/api/bing-ads/performance
Body: {
  "accountId": "your_account_id",
  "startDate": null,  // Optional: YYYY-MM-DD
  "endDate": null     // Optional: YYYY-MM-DD
}
```

Returns campaign data including:
- Campaign name, ID, status, type
- Budget, cost, impressions, clicks
- Conversions, revenue, CTR, CPC, ROAS

## Current Implementation

**Status**: Backend integration complete with fallback to mock data

The Bing Ads Playground will:
1. Try to fetch real data from the backend
2. Display a loading spinner while fetching
3. Fall back to mock data if the backend is unavailable or returns an error
4. Show a warning banner when using mock data

**Mock Data Fallback**: If the backend fails, the frontend displays sample campaigns to ensure the UI remains functional for testing and development.

## Next Steps for Production

1. **Add Customer/Account IDs**: Update your `.env` file with real IDs
2. **XML Parsing**: Implement proper XML parsing for Bing Ads SOAP responses (currently returns mock data)
3. **Report Polling**: Implement async report generation and polling for real performance data
4. **Error Handling**: Add more robust error handling and retry logic
5. **Caching**: Add Redis or in-memory caching for API responses
6. **Rate Limiting**: Implement rate limiting to avoid API quota issues

## Testing

1. **With Backend Running**:
   - Start backend: `cd backend && npm start`
   - Select a client in the Bing Ads Playground
   - Should attempt to fetch from API (currently returns mock data)

2. **Without Backend**:
   - Frontend will show error and fall back to mock data
   - Yellow warning banner indicates mock data is being used

## Troubleshooting

**"Failed to fetch campaigns"**:
- Ensure backend is running on port 3002
- Check CORS settings in `backend/server.js`
- Verify environment variables are set

**"Authentication failed"**:
- Verify Client ID, Client Secret, and Tenant ID are correct
- Check that Azure App has proper API permissions

**"Customer ID not found"**:
- Add your Customer ID and Account ID to `.env`
- Verify IDs are correct in Bing Ads portal
