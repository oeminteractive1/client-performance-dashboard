const http = require('http');
const url = require('url');
const axios = require('axios');
require('dotenv').config();

const REDIRECT_URI = 'http://localhost:3003/oauth/callback';
const PORT = 3003;
const CLIENT_ID = process.env.BING_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.BING_ADS_CLIENT_SECRET;
const TENANT_ID = process.env.BING_ADS_TENANT_ID;

// Step 1: Generate authorization URL manually
function getAuthUrl() {
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${CLIENT_ID}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&scope=${encodeURIComponent('https://ads.microsoft.com/msads.manage offline_access')}`;

    return authUrl;
}

// Step 2: Start server to receive callback
const server = http.createServer(async (req, res) => {
    const queryObject = url.parse(req.url, true).query;

    if (queryObject.code) {
        console.log('\n✓ Authorization code received!');

        try {
            // Exchange code for tokens using direct HTTP call
            const tokenResponse = await axios.post(
                `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
                new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    code: queryObject.code,
                    redirect_uri: REDIRECT_URI,
                    grant_type: 'authorization_code',
                    scope: 'https://ads.microsoft.com/msads.manage offline_access'
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            console.log('\n✓ Successfully acquired tokens!');
            console.log('\n=== ADD THIS TO YOUR .env FILE ===');
            console.log(`BING_ADS_REFRESH_TOKEN=${tokenResponse.data.refresh_token}`);
            console.log('===================================\n');

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                    <body style="font-family: Arial; padding: 50px; text-align: center;">
                        <h1 style="color: green;">✓ Success!</h1>
                        <p>Refresh token acquired! Check your terminal.</p>
                        <p>You can close this window.</p>
                    </body>
                </html>
            `);

            setTimeout(() => {
                console.log('Closing server...');
                server.close();
                process.exit(0);
            }, 2000);

        } catch (error) {
            console.error('Error acquiring token:', error.response?.data || error.message);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                    <body style="font-family: Arial; padding: 50px; text-align: center;">
                        <h1 style="color: red;">Error</h1>
                        <p>${error.message}</p>
                    </body>
                </html>
            `);
        }
    }
});

// Start the flow
async function startOAuthFlow() {
    const authUrl = getAuthUrl();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Bing Ads API - Get Refresh Token (Direct OAuth)              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    console.log('Step 1: Click the link below to authorize the app:\n');
    console.log(authUrl);
    console.log('\nStep 2: Log in with: oeminteractive@gmail.com');
    console.log('Step 3: Approve the permissions');
    console.log('Step 4: You will be redirected back automatically\n');
    console.log('Waiting for authorization...\n');

    server.listen(PORT, () => {
        console.log(`✓ Callback server listening on http://localhost:${PORT}`);
    });
}

startOAuthFlow().catch(console.error);
