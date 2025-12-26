const msal = require('@azure/msal-node');
const http = require('http');
const url = require('url');
require('dotenv').config();

const REDIRECT_URI = 'http://localhost:3003/oauth/callback';
const PORT = 3003;

const msalConfig = {
    auth: {
        clientId: process.env.BING_ADS_CLIENT_ID,
        authority: 'https://login.microsoftonline.com/common',
        clientSecret: process.env.BING_ADS_CLIENT_SECRET,
    }
};

const pca = new msal.ConfidentialClientApplication(msalConfig);

// Step 1: Generate authorization URL
const authCodeUrlParameters = {
    scopes: ['https://ads.microsoft.com/msads.manage', 'offline_access'],
    redirectUri: REDIRECT_URI,
};

async function getAuthUrl() {
    const authUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);
    return authUrl;
}

// Step 2: Start server to receive callback
const server = http.createServer(async (req, res) => {
    const queryObject = url.parse(req.url, true).query;

    if (queryObject.code) {
        console.log('\n✓ Authorization code received!');

        try {
            // Exchange code for tokens
            const tokenRequest = {
                code: queryObject.code,
                scopes: ['https://ads.microsoft.com/msads.manage', 'offline_access'],
                redirectUri: REDIRECT_URI,
            };

            const response = await pca.acquireTokenByCode(tokenRequest);

            console.log('\n✓ Successfully acquired tokens!');
            console.log('\nFull response:', JSON.stringify(response, null, 2));
            console.log('\n=== ADD THIS TO YOUR .env FILE ===');
            console.log(`BING_ADS_REFRESH_TOKEN=${response.refreshToken || response.refresh_token || 'NOT_FOUND'}`);
            console.log('===================================\n');

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                    <body style="font-family: Arial; padding: 50px; text-align: center;">
                        <h1 style="color: green;">✓ Success!</h1>
                        <p>You can close this window and check your terminal for the refresh token.</p>
                    </body>
                </html>
            `);

            setTimeout(() => {
                console.log('Closing server...');
                server.close();
                process.exit(0);
            }, 2000);

        } catch (error) {
            console.error('Error acquiring token:', error);
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
    const authUrl = await getAuthUrl();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Bing Ads API - Get Refresh Token                             ║');
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
