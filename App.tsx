
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ClientDataRecord, AccountDetailsRecord, AllItemsInFeedData, ItemsInFeedDataPoint, Theme, AllFeedStatusData, AllPercentApprovedData, AllStoreStatusData, AllStoreChangesData, AllBudgetStatusData, BudgetStatusRecord, KeyContactRecord, RevolutionLinksRecord, AllRevolutionLinksData, GoogleSearchConsoleRecord, AllGoogleSearchConsoleData, PercentApprovedRecord, GoogleAnalyticsRecord, AllGoogleAnalyticsData, GoogleAdsRecord, AllGoogleAdsData, StoreChangesRecord, HistoryState, AllToolStates, AllCurrentStatusData, CurrentStatusRecord, FeedStatus, StoreStatusRecord as StoreStatusRecordType, NoteRecord, UserRecord } from './types';
import { themes } from './themes';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import WelcomeScreen from './components/WelcomeScreen';
import BudgetStatusTool from './components/BudgetStatusTool';
import MetricComparisonTool from './components/RevenueTool';
import CustomSeoTitlesTool from './components/CustomTitlesCsv';
import MultiClientDashboard from './components/MultiClientDashboard';
import BrandComparisonTool from './components/BrandComparisonTool';
import ThemeSelector from './components/ThemeSelector';
import FeedHealthTool from './components/FeedHealthTool';
import MediumComparisonTool from './components/MediumComparisonTool';
import AlertsPopover from './components/AlertsPopover';
import ToolsPopover from './components/ToolsPopover';
import DashboardsPopover from './components/DashboardsPopover';
import BulkUrlOpenerTool from './components/BulkUrlOpenerTool';
import ManagerDashboard from './components/ManagerDashboard';
import StrategyNotesTool from './components/StrategyNotesTool';
import GoogleAdsRobotTool from './components/GoogleAdsRobotTool';
import PolarisMSRPUpdater from './components/PolarisMsrpUpdater';
import TagCreatorTool from './components/TagCreatorTool';
import SearchPageCreatorTool from './components/SearchPageCreatorTool';
import FreeShippingTool from './components/FreeShippingTool';
import CategoryPageCreatorTool from './components/CategoryPageCreatorTool';
import ProductAvailabilityTool from './components/ProductAvailabilityTool';
import FileUploaderTool from './components/FileUploaderTool';

// Hardcoded Google Sheets API Key for read-only operations.
const API_KEY = 'AIzaSyC-XMGjEXrs4m9LU4wy1blZ9zdULZdILAo';
const CLIENT_ID = '865402407071-q1ise3m52uf1j6i0cg2r5dhhv7p4nkig.apps.googleusercontent.com';
// Added email scope to fetch user info
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.appdata email';
const GOOGLE_TOKEN_KEY = 'google_access_token';

// Settings Sync Configuration
const SETTINGS_FILENAME = 'oem_dashboard_settings.json';
const SYNC_PREFIXES = ['dashboard-', 'welcome-', 'mc-', 'brand-', 'ai-chat-', 'budget-', 'revenue-', 'feed-'];
const SYNC_SUFFIXES = ['SheetId', 'SheetName'];

// --- Router Mapping ---
const TOOL_ROUTES: Record<string, string> = {
    // Dashboards
    'client': '/dashboards/client',
    'multi_client': '/dashboards/multi-client',
    'manager_dashboard': '/dashboards/manager',
    // Analysis
    'budget_status': '/tools/analysis/budget-status',
    'revenue_tool': '/tools/analysis/revenue',
    'brand_comparison': '/tools/analysis/brand-comparison',
    'feed_health': '/tools/analysis/feed-health',
    'medium_comparison': '/tools/analysis/medium-comparison',
    // Workflows
    'custom_titles': '/tools/workflow/seo-titles',
    'bulk_url_opener': '/tools/workflow/bulk-url',
    'strategy_notes': '/tools/workflow/strategy-notes',
    'google_ads_robot': '/tools/workflow/google-ads-robot',
    'polaris_msrp_updater': '/tools/workflow/polaris-msrp',
    'tag_creator': '/tools/workflow/tag-creator',
    'search_page_creator': '/tools/workflow/search-page-creator',
    'free_shipping_tool': '/tools/workflow/free-shipping',
    'category_page_creator': '/tools/workflow/category-page-creator',
    'product_availability': '/tools/workflow/product-availability',
    'file_uploader': '/tools/workflow/file-uploader',
};

// Helper functions
const cleanCurrency = (val: string) => parseFloat(String(val || '0').replace(/[$,]/g, '')) || 0;
const cleanNumber = (val: string | number) => parseInt(String(val || '0').replace(/,/g, ''), 10) || 0;
const cleanFloat = (val: string | number) => parseFloat(String(val || '0').replace(/,/g, '')) || 0;
const cleanPercentage = (val: string) => parseFloat(String(val || '0').replace('%', '')) || 0;

// Maps CSV/Sheet headers (with spaces) to interface keys
const performanceHeaderMapping: { [key: string]: keyof ClientDataRecord } = {
    'ClientName': 'ClientName', 'Dashboard': 'Dashboard', 'Month': 'Month', 'Start': 'Start',
    'End': 'End', 'Orders': 'Orders', 'Revenue': 'Revenue', 'Canceled': 'Canceled',
    'Avg Fulfillment': 'Avg_Fulfillment', 'Profit': 'Profit', 'Clean Fulfillment': 'Clean_Fulfillment',
    'MonthNumber': 'MonthNumber', 'Quarter': 'Quarter', 'Year': 'Year',
    'PPC Spend': 'PPC_Spend', 'Sessions': 'Sessions', 'Conv Rate': 'Conv_Rate',
    'AOV': 'AOV', 'Pricing': 'Pricing', 'Shipping': 'Shipping',
    'Orders Canceled': 'Orders_Canceled', 'RP Store Hash': 'RP_Store_Hash',
    'Pricing Changes': 'Pricing_Changes', 'Shipping Changes': 'Shipping_Changes',
    'Strategy Notes': 'Strategy_Notes', 'Other Notes': 'Other_Notes', 'Days of Data': 'Days_of_Data',
    'Projected Revenue': 'Projected_Revenue', 'Projected Orders': 'Projected_Orders',
};

const accountDetailsHeaderMapping: { [key: string]: keyof AccountDetailsRecord } = {
    'Clients': 'ClientName', 'Client Name': 'ClientName', 'Website': 'Website', 'Google Ads': 'Google Ads', 'Google Ads ID': 'Google Ads ID',
    'GMC': 'GMC', 'MID': 'GMC', 'Current SEO Package': 'CurrentSEOPackage', 'Auto Group': 'AutoGroup',
    'Brands': 'Brands',
    'Bing': 'Bing',
    'State': 'State',
    'ShippingMethods': 'ShippingMethods',
    'SignatureSurcharge': 'SignatureSurcharge',
    'HazmatSurcharge': 'HazmatSurcharge',
    'Allow PO Box?': 'AllowPOBox',
    'HandlingFee': 'HandlingFee',
    'T&C': 'TAndC',
    'Fitment Verification': 'FitmentVerification',
    'Required Field': 'RequiredField',
};

const keyContactsHeaderMapping: { [key: string]: keyof KeyContactRecord } = {
    'Clients': 'ClientName',
    'PPC': 'PPC',
    'PDM': 'PDM',
    'Deal': 'Deal',
    'Hubspot Contact Name': 'Hubspot Contact Name',
    'Hub Spot Contact ID': 'Hub Spot Contact ID',
    'Hubspot Contact Phone': 'Hubspot Contact Phone',
};

const budgetStatusHeaderMapping: { [key: string]: keyof BudgetStatusRecord } = {
    'Clients': 'ClientName',
    'PPC': 'ppcBudget',
    'Google': 'googleSpend',
    'Bing': 'bingSpend',
    '% Spent': 'percentSpent',
    'Target Spend': 'targetSpend',
    'Proj. Total Spend': 'projectedTotalSpend',
    '2 days ago': 'spend2DaysAgo',
    'Yesterday': 'yesterdaySpend',
    'Rec. Daily Budget': 'recDailyBudget',
};

const revolutionLinksHeaderMapping: { [key: string]: keyof RevolutionLinksRecord } = {
    'Clients': 'ClientName', 'Dashboard': 'Dashboard', 'Pricing': 'Pricing',
    'Shipping': 'Shipping', 'Orders': 'Orders', 'Products': 'Products',
    'Pages': 'Pages', 'Layouts': 'Layouts', 'Feeds': 'Feeds', 'Imports': 'Imports',
    'Checkout': 'Checkout', 'File Manager': 'FileManager', 'Promotions': 'Promotions',
};

const storeChangesHeaderMapping: { [key: string]: keyof StoreChangesRecord } = {
    'Clients': 'ClientName',
    'LastPriceChange': 'LastPriceChange',
    'LastShippingChange': 'LastShippingChange',
    'LastSettingsChange': 'LastSettingsChange',
    'LastCheckoutChange': 'LastCheckoutChange',
    'ShippingMethods': 'ShippingMethods',
    'HandlingFee': 'HandlingFee',
    'SignatureSurcharge': 'SignatureSurcharge',
    'HazmatSurcharge': 'HazmatSurcharge',
    'Allow PO Box?': 'AllowPOBox',
    'T&C': 'TAndC',
    'Fitment Verification': 'FitmentVerification',
    'Required Field': 'RequiredField',
    'Date': 'Date',
};

const googleSearchConsoleHeaderMapping: { [key: string]: keyof GoogleSearchConsoleRecord } = {
    'Clients': 'ClientName', 'Website': 'Website', 'Date': 'Date', 'Impressions': 'Impressions',
    'Clicks': 'Clicks', 'Desktop': 'Desktop', 'Mobile': 'Mobile', 'Tablet': 'Tablet',
    'Average CTR': 'Average_CTR', 'Average Position': 'Average_Position',
    'Top 10 Clicks': 'Top_10_Clicks', 'Top 10 Queries': 'Top_10_Queries',
};

const googleAnalyticsHeaderMapping: { [key: string]: keyof GoogleAnalyticsRecord } = {
    'Clients': 'ClientName',
    'Property ID': 'PropertyID',
    'Date': 'Date',
    'Revenue': 'Revenue',
    'Revenue%Organic': 'RevenuePercentOrganic',
    'Revenue%Direct': 'RevenuePercentDirect',
    'Revenue%PPC': 'RevenuePercentPPC',
    'Revenue %Referral': 'RevenuePercentReferral',
    'Sessions': 'Sessions',
    'Sessions%Organic': 'SessionsPercentOrganic',
    'Sessions%Direct': 'SessionsPercentDirect',
    'Sessions%PPC': 'SessionsPercentPPC',
    'Sessions %Referral': 'SessionsPercentReferral',
    'Orders': 'Orders',
    'Orders%Organic': 'OrdersPercentOrganic',
    'Orders%Direct': 'OrdersPercentDirect',
    'Orders%PPC': 'OrdersPercentPPC',
    'Orders %Referral': 'OrdersPercentReferral',
    'ConvRate': 'ConvRate',
    'ConvRate%Organic': 'ConvRatePercentOrganic',
    'ConvRate%Direct': 'ConvRatePercentDirect',
    'ConvRate%PPC': 'ConvRatePercentPPC',
    'ConvRate %Referral': 'ConvRatePercentReferral',
    'Session Duration': 'SessionDuration',
    'Bounce Rate': 'BounceRate',
    'Date Ran:': 'DateRan',
};

const googleAdsHeaderMapping: { [key: string]: keyof GoogleAdsRecord } = {
    'Clients': 'ClientName', 'ID': 'ID', 'Date': 'Date', 'PartsCost': 'PartsCost',
    'PartsImpressions': 'PartsImpressions', 'PartsClicks': 'PartsClicks', 'PartsAvgCPC': 'PartsAvgCPC',
    'PartsCTR': 'PartsCTR', 'PartsROAS': 'PartsROAS', 'PartsConversions': 'PartsConversions',
    'PartsConvRate': 'PartsConvRate', 'PartsBudget': 'PartsBudget', 'AccCost': 'AccCost',
    'AccImpressions': 'AccImpressions', 'AccClicks': 'AccClicks', 'AccAvgCPC': 'AccAvgCPC',
    'AccCTR': 'AccCTR', 'AccROAS': 'AccROAS', 'AccConversions': 'AccConversions',
    'AccConvRate': 'AccConvRate', 'AccBudget': 'AccBudget',
    'Date Ran:': 'DateRan',
};


const requiredPerformanceHeaders = ['ClientName', 'Month', 'Year', 'Orders', 'Revenue', 'Profit', 'Sessions'];

const LinkIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
);
const PhoneIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
);
const HomeIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
);

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const App: React.FC = () => {
    // Routing Hooks
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    // Authentication state
    // Check for specific hostname to bypass login
    const isBypassed = window.location.hostname.includes('client-performance-dashboard-865402407071.us-west1.run.app');
    
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return isBypassed || localStorage.getItem('isAuthenticated') === 'true' || sessionStorage.getItem('isAuthenticated') === 'true';
    });
    
    // Determine current tool from path for UI logic (back buttons, titles)
    const currentPath = location.pathname;
    const currentToolId = Object.keys(TOOL_ROUTES).find(key => TOOL_ROUTES[key] === currentPath) || '';

    // Google API State
    const [gapiClient, setGapiClient] = useState<any>(null);
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [signInError, setSignInError] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

    // User Info State
    const [usersData, setUsersData] = useState<UserRecord[]>([]);
    const [userEmail, setUserEmail] = useState<string>('');
    const [loggedInUserName, setLoggedInUserName] = useState<string>('');

    // State for Performance Data
    const [allData, setAllData] = useState<ClientDataRecord[]>([]);
    const [clients, setClients] = useState<string[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [performanceError, setPerformanceError] = useState<string>('');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isPerformanceLoading, setIsPerformanceLoading] = useState<boolean>(false);
    const [performanceSheetId, setPerformanceSheetId] = useState<string>(() => localStorage.getItem('performanceSheetId') || '1EYp-vsBxiio0HlBzJckp8J2B6YAXxvKfXGGdgJDNtqY');
    const [performanceSheetName, setPerformanceSheetName] = useState<string>(() => localStorage.getItem('performanceSheetName') || 'Website Data');
    
    // State for Account Details Data
    const [accountDetailsData, setAccountDetailsData] = useState<AccountDetailsRecord[]>([]);
    const accountDetailsDataRef = useRef(accountDetailsData);
    useEffect(() => {
        accountDetailsDataRef.current = accountDetailsData;
    }, [accountDetailsData]);
    const [accountDetailsError, setAccountDetailsError] = useState<string>('');
    const [isAccountDetailsLoading, setIsAccountDetailsLoading] = useState<boolean>(false);
    const [accountDetailsSheetId, setAccountDetailsSheetId] = useState<string>(() => localStorage.getItem('accountDetailsSheetId') || '1EYp-vsBxiio0HlBzJckp8J2B6YAXxvKfXGGdgJDNtqY');
    const [accountDetailsSheetName, setAccountDetailsSheetName] = useState<string>(() => localStorage.getItem('accountDetailsSheetName') || 'Settings');
    
    // State for Key Contacts Data
    const [keyContactsData, setKeyContactsData] = useState<KeyContactRecord[]>([]);
    const [keyContactsError, setKeyContactsError] = useState<string>('');
    const [isKeyContactsLoading, setIsKeyContactsLoading] = useState<boolean>(false);
    const [keyContactsSheetId, setKeyContactsSheetId] = useState<string>(() => localStorage.getItem('keyContactsSheetId') || '1EYp-vsBxiio0HlBzJckp8J2B6YAXxvKfXGGdgJDNtqY');
    const [keyContactsSheetName, setKeyContactsSheetName] = useState<string>(() => localStorage.getItem('keyContactsSheetName') || 'KeyContacts');

    // State for Items in Feed Data
    const [itemsInFeedData, setItemsInFeedData] = useState<AllItemsInFeedData>({});
    const [itemsInFeedError, setItemsInFeedError] = useState<string>('');
    const [isItemsInFeedLoading, setIsItemsInFeedLoading] = useState<boolean>(false);
    const [itemsInFeedSheetId, setItemsInFeedSheetId] = useState<string>(() => localStorage.getItem('itemsInFeedSheetId') || '1EYp-vsBxiio0HlBzJckp8J2B6YAXxvKfXGGdgJDNtqY');
    const [itemsInFeedSheetName, setItemsInFeedSheetName] = useState<string>(() => localStorage.getItem('itemsInFeedSheetName') || 'ItemsinFeed');

    // State for Feed Status Data
    const [feedStatusData, setFeedStatusData] = useState<AllFeedStatusData>({});
    const [feedStatusError, setFeedStatusError] = useState<string>('');
    const [isFeedStatusLoading, setIsFeedStatusLoading] = useState<boolean>(false);
    const [feedStatusSheetId, setFeedStatusSheetId] = useState<string>(() => localStorage.getItem('feedStatusSheetId') || '1EYp-vsBxiio0HlBzJckp8J2B6YAXxvKfXGGdgJDNtqY');
    const [feedStatusSheetName, setFeedStatusSheetName] = useState<string>(() => localStorage.getItem('feedStatusSheetName') || 'FeedStatus');

    // State for Percent Approved Data
    const [percentApprovedData, setPercentApprovedData] = useState<AllPercentApprovedData>({});
    const [percentApprovedError, setPercentApprovedError] = useState<string>('');
    const [isPercentApprovedLoading, setIsPercentApprovedLoading] = useState<boolean>(false);
    const [percentApprovedSheetId, setPercentApprovedSheetId] = useState<string>(() => localStorage.getItem('percentApprovedSheetId') || '1EYp-vsBxiio0HlBzJckp8J2B6YAXxvKfXGGdgJDNtqY');
    const [percentApprovedSheetName, setPercentApprovedSheetName] = useState<string>(() => localStorage.getItem('percentApprovedSheetName') || 'PercentApproved');

    // State for Store Status Data
    const [storeStatusData, setStoreStatusData] = useState<AllStoreStatusData>({});
    const [storeStatusError, setStoreStatusError] = useState<string>('');
    const [isStoreStatusLoading, setIsStoreStatusLoading] = useState<boolean>(false);
    const [storeStatusSheetId, setStoreStatusSheetId] = useState<string>(() => localStorage.getItem('storeStatusSheetId') || '1EYp-vsBxiio0HlBzJckp8J2B6YAXxvKfXGGdgJDNtqY');
    const [storeStatusSheetName, setStoreStatusSheetName] = useState<string>(() => localStorage.getItem('storeStatusSheetName') || 'StoreStatus');

    // State for Current Status Data
    const [currentStatusData, setCurrentStatusData] = useState<AllCurrentStatusData>({});
    const [currentStatusError, setCurrentStatusError] = useState<string>('');
    const [isCurrentStatusLoading, setIsCurrentStatusLoading] = useState<boolean>(false);

    // State for Store Changes Data
    const [storeChangesData, setStoreChangesData] = useState<AllStoreChangesData>({});
    const [storeChangesError, setStoreChangesError] = useState<string>('');
    const [isStoreChangesLoading, setIsStoreChangesLoading] = useState<boolean>(false);
    const [storeChangesSheetId, setStoreChangesSheetId] = useState<string>(() => localStorage.getItem('storeChangesSheetId') || '1EYp-vsBxiio0HlBzJckp8J2B6YAXxvKfXGGdgJDNtqY');
    const [storeChangesSheetName, setStoreChangesSheetName] = useState<string>(() => localStorage.getItem('storeChangesSheetName') || 'StoreChanges');

    // State for Budget Status Data
    const [budgetStatusData, setBudgetStatusData] = useState<AllBudgetStatusData>({});
    const [budgetStatusError, setBudgetStatusError] = useState<string>('');
    const [isBudgetStatusLoading, setIsBudgetStatusLoading] = useState<boolean>(false);
    const [budgetStatusSheetId, setBudgetStatusSheetId] = useState<string>(() => localStorage.getItem('budgetStatusSheetId') || '1EYp-vsBxiio0HlBzJckp8J2B6YAXxvKfXGGdgJDNtqY');
    const [budgetStatusSheetName, setBudgetStatusSheetName] = useState<string>(() => localStorage.getItem('budgetStatusSheetName') || 'BudgetStatus');

    // State for Revolution Links Data
    const [revolutionLinksData, setRevolutionLinksData] = useState<AllRevolutionLinksData>({});
    const [revolutionLinksError, setRevolutionLinksError] = useState<string>('');
    const [isRevolutionLinksLoading, setIsRevolutionLinksLoading] = useState<boolean>(false);
    const [revolutionLinksSheetId, setRevolutionLinksSheetId] = useState<string>(() => localStorage.getItem('revolutionLinksSheetId') || '1EYp-vsBxiio0HlBzJckp8J2B6YAXxvKfXGGdgJDNtqY');
    const [revolutionLinksSheetName, setRevolutionLinksSheetName] = useState<string>(() => localStorage.getItem('revolutionLinksSheetName') || 'RevolutionLinks');

    // State for Google Search Console Data
    const [googleSearchConsoleData, setGoogleSearchConsoleData] = useState<AllGoogleSearchConsoleData>({});
    const [googleSearchConsoleError, setGoogleSearchConsoleError] = useState<string>('');
    const [isGoogleSearchConsoleLoading, setIsGoogleSearchConsoleLoading] = useState<boolean>(false);
    const [googleSearchConsoleSheetId, setGoogleSearchConsoleSheetId] = useState<string>(() => localStorage.getItem('googleSearchConsoleSheetId') || '1EYp-vsBxiio0HlBzJckp8J2B6YAXxvKfXGGdgJDNtqY');
    const [googleSearchConsoleSheetName, setGoogleSearchConsoleSheetName] = useState<string>(() => localStorage.getItem('googleSearchConsoleSheetName') || 'GoogleSearchConsole');

    // State for Google Analytics Data
    const [googleAnalyticsData, setGoogleAnalyticsData] = useState<AllGoogleAnalyticsData>({});
    const [googleAnalyticsError, setGoogleAnalyticsError] = useState<string>('');
    const [isGoogleAnalyticsLoading, setIsGoogleAnalyticsLoading] = useState<boolean>(false);
    const [googleAnalyticsSheetId, setGoogleAnalyticsSheetId] = useState<string>(() => localStorage.getItem('googleAnalyticsSheetId') || '1EYp-vsBxiio0HlBzJckp8J2B6YAXxvKfXGGdgJDNtqY');
    const [googleAnalyticsSheetName, setGoogleAnalyticsSheetName] = useState<string>(() => localStorage.getItem('googleAnalyticsSheetName') || 'GoogleAnalytics');

    // State for Google Ads Data
    const [googleAdsData, setGoogleAdsData] = useState<AllGoogleAdsData>({});
    const [googleAdsError, setGoogleAdsError] = useState<string>('');
    const [isGoogleAdsLoading, setIsGoogleAdsLoading] = useState<boolean>(false);
    const [googleAdsSheetId, setGoogleAdsSheetId] = useState<string>(() => localStorage.getItem('googleAdsSheetId') || '1EYp-vsBxiio0HlBzJckp8J2B6YAXxvKfXGGdgJDNtqY');
    const [googleAdsSheetName, setGoogleAdsSheetName] = useState<string>(() => localStorage.getItem('googleAdsSheetName') || 'GoogleAds');

    // State for Strategy Notes Data (pre-caching)
    const [strategyNotesData, setStrategyNotesData] = useState<NoteRecord[]>([]);
    const [isStrategyNotesLoading, setIsStrategyNotesLoading] = useState<boolean>(false);
    const [strategyNotesError, setStrategyNotesError] = useState<string>('');

    // Settings Version for Sync
    const [settingsVersion, setSettingsVersion] = useState(0);

    // Theme state
    const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
        const savedThemeId = localStorage.getItem('dashboard-theme-id');
        return themes.find(t => t.id === savedThemeId) || themes[0];
    });
    const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
    const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false);
    const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);

    // Alert & Tool system state
    const [isAlertsOpen, setIsAlertsOpen] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isDashboardsOpen, setIsDashboardsOpen] = useState(false);
    const [alertsSeen, setAlertsSeen] = useState(() => sessionStorage.getItem('alertsSeen') === 'true');

    // Quick Links State
    const [quickLinks, setQuickLinks] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('dashboard-quick-links');
            return saved ? JSON.parse(saved) : ['client', 'multi_client', 'manager_dashboard'];
        } catch (e) {
            return ['client', 'multi_client', 'manager_dashboard'];
        }
    });
    
    // Persist quickLinks
    useEffect(() => {
        localStorage.setItem('dashboard-quick-links', JSON.stringify(quickLinks));
    }, [quickLinks]);

    const handleToggleQuickLink = (toolId: string) => {
        setQuickLinks(prev => {
            if (prev.includes(toolId)) {
                return prev.filter(id => id !== toolId);
            }
            return [...prev, toolId];
        });
    };

    // State for collapsible sections
    const [isClientSelectorCollapsed, setIsClientSelectorCollapsed] = useState(false);

    // State for sequential data fetching
    const [completedConnections, setCompletedConnections] = useState(0);
    const [totalConnections, setTotalConnections] = useState(0);
    const [isFetchingAll, setIsFetchingAll] = useState(false);
    const isFetchingAllRef = useRef(false);
    const [allDataLoadedSuccessfully, setAllDataLoadedSuccessfully] = useState(false);

    // State for header dropdowns
    const [clientSearchQuery, setClientSearchQuery] = useState('');
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const clientSelectorRef = useRef<HTMLDivElement>(null);

    const [autoGroups, setAutoGroups] = useState<string[]>([]);
    const [selectedAutoGroup, setSelectedAutoGroup] = useState<string>('');
    const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
    const [groupSearchQuery, setGroupSearchQuery] = useState('');
    const groupSelectorRef = useRef<HTMLDivElement>(null);

    // State for individual tools to preserve settings during navigation
    const [toolStates, setToolStates] = useState<AllToolStates>({
        strategy_notes: { role: '', manager: '', filterType: 'month', month: '', selectedClientFilter: '' },
        budget_status: { role: '', manager: '', threshold: 0.10 },
        revenue_tool: { role: '', manager: '', threshold: 0.10, chartTimeRange: '12m', selectedMetric: 'revenue' },
        custom_titles: { selectedBrand: '' },
        brand_comparison: {
            selectedBrand: '', selectedClientName: '', clientsForAverage: [], comparisonMode: 'clientVsBrand',
            viewMode: 'month', timeRange: '3', selectedMonthYear: ''
        },
        feed_health: {
            selectedBrand: '', itemsInFeedTimeRange: '12m', dropThreshold: 0.15,
            dropTimeFrame: '14d', approvalThreshold: 0.90
        },
        medium_comparison: {
            viewMode: 'month', timeRange: '3', selectedMonth: '', selectedMedium: '', sortOrder: 'descending'
        },
        bulk_url_opener: { selectedPreset: 'gmcSuspensions', batchSize: 20 },
        google_ads_robot: { selectedClient: '' },
        polaris_msrp_updater: {},
        tag_creator: { selectedClient: '', selectedBrand: '', tag: '', partNumbers: '' },
        search_page_creator: { selectedClient: '', title: '', url: '', h1: '', metaTitle: '', metaDescription: '', contentUrl: '', searchTerms: '' },
        free_shipping_tool: { selectedClient: '', selectedBrand: '', partNumbers: '' },
        category_page_creator: { selectedClient: '', selectedBrand: '', categoryName: '', h1: '', metaTitle: '', metaDescription: '', contentUrl: '', partNumbers: '' },
        product_availability: { selectedClient: '', selectedBrand: '', availability: 'Available for Sale', partNumbers: '' },
        file_uploader: {},
        manager_dashboard: { 
            role: 'All', 
            manager: 'All Clients', 
            revenueFilter: 'none', 
            comparisonMode: 'lastCompleted',
            isTrendVisible: true,
            isCurrentMonthVisible: true,
            columnOrder: ['clientName', 'currentRevenue', 'projectedRevenue', 'lastYearRevenue', 'lastMonthRevenue', 'threeMoTrend', 'avg3mo', 'sixMoTrend', 'avg6mo', 'twelveMoTrend', 'avg12mo']
        },
    });

    const handleToolStateChange = <K extends keyof AllToolStates>(tool: K, newState: Partial<AllToolStates[K]>) => {
        setToolStates(prev => ({
            ...prev,
            [tool]: {
                ...prev[tool],
                ...newState,
            },
        }));
    };
    
    // --- Sync URL Params with State ---
    // Only update state if param exists and is valid.
    // If user manually changes URL, this catches it.
    useEffect(() => {
        const clientParam = searchParams.get('client');
        // Explicitly depend on selectedClient to ensure we have the latest value
        // This pattern ensures we don't loop because of strict equality checks
        if (clientParam && clients.includes(clientParam) && clientParam !== selectedClient) {
            setSelectedClient(clientParam);
        }
        
        const groupParam = searchParams.get('group');
        if (groupParam && autoGroups.includes(groupParam) && groupParam !== selectedAutoGroup) {
            setSelectedAutoGroup(groupParam);
        }
    }, [searchParams, clients, autoGroups, selectedClient, selectedAutoGroup]);

    // Helper to update client state and URL simultaneously
    const updateSelectedClient = (client: string) => {
        setSelectedClient(client);
        // If we are on the client dashboard, update the URL params
        if (location.pathname === TOOL_ROUTES.client) {
            const newParams = new URLSearchParams(searchParams);
            if (client) newParams.set('client', client);
            else newParams.delete('client');
            setSearchParams(newParams);
        }
    };

    // Helper to update group state and URL simultaneously
    const updateSelectedAutoGroup = (group: string) => {
        setSelectedAutoGroup(group);
        if (location.pathname === TOOL_ROUTES.multi_client) {
            const newParams = new URLSearchParams(searchParams);
            if (group) newParams.set('group', group);
            else newParams.delete('group');
            setSearchParams(newParams);
        }
    };

    // --- Settings Sync Logic ---
    
    const gatherSettings = useCallback(() => {
        const settings: any = {};
        // 1. LocalStorage keys with prefixes
        SYNC_PREFIXES.forEach(prefix => {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    settings[key] = localStorage.getItem(key);
                }
            }
        });
        // 2. Sheet IDs/Names (Suffixes)
        SYNC_SUFFIXES.forEach(suffix => {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.endsWith(suffix)) {
                    settings[key] = localStorage.getItem(key);
                }
            }
        });
        
        // 3. Tool States
        settings['toolStates'] = JSON.stringify(toolStates);
        
        // 4. Quick Links
        settings['dashboard-quick-links'] = JSON.stringify(quickLinks);
        
        return settings;
    }, [toolStates, quickLinks]);

    const applySettings = useCallback((settings: any) => {
        if (!settings) return;
        
        // 1. Apply LocalStorage items
        Object.keys(settings).forEach(key => {
            if (key !== 'toolStates' && key !== 'dashboard-quick-links') {
                localStorage.setItem(key, settings[key]);
            }
        });
        
        // 2. Apply Tool States (Requires state update)
        if (settings['toolStates']) {
            try {
                setToolStates(JSON.parse(settings['toolStates']));
            } catch (e) {
                console.error("Failed to parse tool states from sync:", e);
            }
        }
        
        // 3. Apply Quick Links
        if (settings['dashboard-quick-links']) {
            try {
                setQuickLinks(JSON.parse(settings['dashboard-quick-links']));
            } catch (e) {
                console.error("Failed to parse quick links from sync:", e);
            }
        }
        
        // 4. Force refresh specific states that depend on LS
        setCurrentTheme(prev => {
            const savedThemeId = localStorage.getItem('dashboard-theme-id');
            return themes.find(t => t.id === savedThemeId) || themes[0];
        });
        
        // Refresh connection IDs in state
        setPerformanceSheetId(localStorage.getItem('performanceSheetId') || '1EYp-vsBxiio0HlBzJckp8J2B6YAXxvKfXGGdgJDNtqY');
        setPerformanceSheetName(localStorage.getItem('performanceSheetName') || 'Website Data');
        
        // Force component refresh
        setSettingsVersion(prev => prev + 1);
        
    }, []);

    const saveSettingsToDrive = async () => {
        if (!isSignedIn || !gapiClient) return;
        setSyncStatus('syncing');
        try {
            const settings = gatherSettings();
            const fileContent = JSON.stringify(settings);
            const file = new Blob([fileContent], { type: 'application/json' });
            const metadata = {
                name: SETTINGS_FILENAME,
                mimeType: 'application/json',
                parents: ['appDataFolder']
            };

            const accessToken = gapiClient.getToken().access_token;

            // 1. Check if file exists
            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${SETTINGS_FILENAME}' and 'appDataFolder' in parents&spaces=appDataFolder`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const searchResult = await searchResponse.json();
            const existingFileId = searchResult.files?.[0]?.id;

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);

            if (existingFileId) {
                // Update existing file
                await fetch(
                    `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`,
                    {
                        method: 'PATCH',
                        headers: { Authorization: `Bearer ${accessToken}` },
                        body: form
                    }
                );
            } else {
                // Create new file
                await fetch(
                    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                    {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${accessToken}` },
                        body: form
                    }
                );
            }
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (error) {
            console.error("Error saving settings to Drive:", error);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 5000);
        }
    };
    
    const loadSettingsFromDrive = useCallback(async () => {
        if (!isSignedIn || !gapiClient) return;
        setSyncStatus('syncing');
        try {
            const accessToken = gapiClient.getToken().access_token;
            
            // 1. Find the file
            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${SETTINGS_FILENAME}' and 'appDataFolder' in parents&spaces=appDataFolder`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const searchResult = await searchResponse.json();
            const fileId = searchResult.files?.[0]?.id;

            if (fileId) {
                // 2. Download content
                const contentResponse = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                const settings = await contentResponse.json();
                applySettings(settings);
                setSyncStatus('success');
            } else {
                console.log("No settings file found in Drive.");
                setSyncStatus('idle'); // Not an error, just no file
            }
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (error) {
            console.error("Error loading settings from Drive:", error);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 5000);
        }
    }, [gapiClient, isSignedIn, applySettings]);
    
    // Auto-load on sign in
    useEffect(() => {
        if (isSignedIn && gapiClient) {
            // Small delay to ensure token is fully ready
            setTimeout(() => loadSettingsFromDrive(), 1000);
        }
    }, [isSignedIn, gapiClient, loadSettingsFromDrive]);

    // Auto-save Effect
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const triggerAutoSave = useCallback(() => {
        if (!isSignedIn || !gapiClient) return;

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout for auto-save
        saveTimeoutRef.current = setTimeout(() => {
            saveSettingsToDrive();
        }, 2000);
    }, [isSignedIn, gapiClient, saveSettingsToDrive]);

    // Trigger save when toolStates or quickLinks change
    useEffect(() => {
        triggerAutoSave();
    }, [toolStates, quickLinks, triggerAutoSave]);


    // --- Google API Initialization ---
    
    const handleLoginSuccess = useCallback(() => {
        localStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('isAuthenticated', 'true');
        setIsAuthenticated(true);
    }, []);

    useEffect(() => {
        const gapiLoadedCallback = () => {
            window.gapi.load('client', async () => {
                try {
                    await window.gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
                    });
                    setGapiClient(window.gapi.client);
                    
                    // Check for existing token in localStorage and restore session if valid
                    const savedTokenString = localStorage.getItem(GOOGLE_TOKEN_KEY);
                    if (savedTokenString) {
                        try {
                            const savedToken = JSON.parse(savedTokenString);
                            // Check expiry (add buffer of 60s)
                            if (savedToken.expiry && Date.now() < savedToken.expiry - 60000) {
                                const { expiry, ...apiToken } = savedToken;
                                window.gapi.client.setToken(apiToken);
                                setIsSignedIn(true);
                            } else {
                                // Token expired
                                localStorage.removeItem(GOOGLE_TOKEN_KEY);
                            }
                        } catch (e) {
                            console.error("Error parsing saved token", e);
                            localStorage.removeItem(GOOGLE_TOKEN_KEY);
                        }
                    }

                } catch (error) {
                    console.error("Error initializing GAPI client", error);
                }
            });
        };

        const gisLoadedCallback = () => {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (tokenResponse: any) => {
                    console.log("GIS Success Callback received.");
                    setSignInError(null); // Clear error on success
                    if (tokenResponse && tokenResponse.access_token) {
                        // Store token in localStorage with expiration time
                        const tokenWithExpiry = {
                            ...tokenResponse,
                            expiry: Date.now() + (tokenResponse.expires_in * 1000)
                        };
                        localStorage.setItem(GOOGLE_TOKEN_KEY, JSON.stringify(tokenWithExpiry));

                        window.gapi.client.setToken(tokenResponse);
                        setIsSignedIn(true);
                        handleLoginSuccess(); // Automatically unlock the app if Google Sign-In succeeds
                    } else {
                        setIsSignedIn(false);
                        const errorMessage = "Sign-in successful, but no access token was received from Google.";
                        console.error("GIS Error:", errorMessage, tokenResponse);
                        setSignInError(errorMessage);
                    }
                },
                error_callback: (error: any) => {
                    console.error("Full Google Sign-In Error Object:", error);
                    
                    // FIX: Ignore popup_closed errors so they don't clutter the UI
                    if (error?.type === 'popup_closed') {
                        return;
                    }

                    let detailedMessage = `An unexpected Google Sign-In error occurred. Type: '${error?.type || 'unknown'}'. Check the console for the full error object.`;

                    // Check for the most common configuration error.
                    if (error?.type === 'popup_failed_to_open' || (error?.details && error.details.includes('invalid_request'))) {
                        detailedMessage = `Access blocked: This is a common configuration error. The app's URL is not authorized in your Google Cloud project.

                        To fix this, go to your Google Cloud Console's "Credentials" page, select your OAuth 2.0 Client ID, and add the following URL to the "Authorized JavaScript origins" list:
                
                        ${window.location.origin}
                
                        (Note: It can take a few minutes for the change to take effect.)`;
                    }
                    
                    setSignInError(detailedMessage);
                }
            });
            setTokenClient(client);
        };

        const checkGapi = () => {
            if (window.gapi?.load) {
                gapiLoadedCallback();
            } else {
                setTimeout(checkGapi, 100);
            }
        };

        const checkGis = () => {
            if (window.google?.accounts?.oauth2) {
                gisLoadedCallback();
            } else {
                setTimeout(checkGis, 100);
            }
        };
        
        checkGapi();
        checkGis();
    }, [handleLoginSuccess]);

    const handleSignIn = () => {
        setSignInError(null); // Clear previous errors
        if (tokenClient) {
            // FIX: Force consent prompt to prevent immediate closure issues
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            setSignInError("Google Sign-In client is not ready. Please wait a moment and try again.");
        }
    };
    
    const handleSignOut = () => {
        const token = window.gapi?.client?.getToken();
        if (token) {
            window.google.accounts.oauth2.revoke(token.access_token, () => {
                window.gapi.client.setToken(null);
                localStorage.removeItem(GOOGLE_TOKEN_KEY); // Clear stored token
                setIsSignedIn(false);
                setUserEmail('');
                setLoggedInUserName('');
            });
        } else {
             localStorage.removeItem(GOOGLE_TOKEN_KEY); // Clear stored token even if gapi doesn't have it
             setIsSignedIn(false);
             setUserEmail('');
             setLoggedInUserName('');
        }
    };


    // Persist sheet settings
    useEffect(() => { localStorage.setItem('performanceSheetId', performanceSheetId); }, [performanceSheetId]);
    useEffect(() => { localStorage.setItem('performanceSheetName', performanceSheetName); }, [performanceSheetName]);
    useEffect(() => { localStorage.setItem('accountDetailsSheetId', accountDetailsSheetId); }, [accountDetailsSheetId]);
    useEffect(() => { localStorage.setItem('accountDetailsSheetName', accountDetailsSheetName); }, [accountDetailsSheetName]);
    useEffect(() => { localStorage.setItem('keyContactsSheetId', keyContactsSheetId); }, [keyContactsSheetId]);
    useEffect(() => { localStorage.setItem('keyContactsSheetName', keyContactsSheetName); }, [keyContactsSheetName]);
    useEffect(() => { localStorage.setItem('itemsInFeedSheetId', itemsInFeedSheetId); }, [itemsInFeedSheetId]);
    useEffect(() => { localStorage.setItem('itemsInFeedSheetName', itemsInFeedSheetName); }, [itemsInFeedSheetName]);
    useEffect(() => { localStorage.setItem('feedStatusSheetId', feedStatusSheetId); }, [feedStatusSheetId]);
    useEffect(() => { localStorage.setItem('feedStatusSheetName', feedStatusSheetName); }, [feedStatusSheetName]);
    useEffect(() => { localStorage.setItem('percentApprovedSheetId', percentApprovedSheetId); }, [percentApprovedSheetId]);
    useEffect(() => { localStorage.setItem('percentApprovedSheetName', percentApprovedSheetName); }, [percentApprovedSheetName]);
    useEffect(() => { localStorage.setItem('storeStatusSheetId', storeStatusSheetId); }, [storeStatusSheetId]);
    useEffect(() => { localStorage.setItem('storeStatusSheetName', storeStatusSheetName); }, [storeStatusSheetName]);
    useEffect(() => { localStorage.setItem('storeChangesSheetId', storeChangesSheetId); }, [storeChangesSheetId]);
    useEffect(() => { localStorage.setItem('storeChangesSheetName', storeChangesSheetName); }, [storeChangesSheetName]);
    useEffect(() => { localStorage.setItem('budgetStatusSheetId', budgetStatusSheetId); }, [budgetStatusSheetId]);
    useEffect(() => { localStorage.setItem('budgetStatusSheetName', budgetStatusSheetName); }, [budgetStatusSheetName]);
    useEffect(() => { localStorage.setItem('revolutionLinksSheetId', revolutionLinksSheetId); }, [revolutionLinksSheetId]);
    useEffect(() => { localStorage.setItem('revolutionLinksSheetName', revolutionLinksSheetName); }, [revolutionLinksSheetName]);
    useEffect(() => { localStorage.setItem('googleSearchConsoleSheetId', googleSearchConsoleSheetId); }, [googleSearchConsoleSheetId]);
    useEffect(() => { localStorage.setItem('googleSearchConsoleSheetName', googleSearchConsoleSheetName); }, [googleSearchConsoleSheetName]);
    useEffect(() => { localStorage.setItem('googleAnalyticsSheetId', googleAnalyticsSheetId); }, [googleAnalyticsSheetId]);
    useEffect(() => { localStorage.setItem('googleAnalyticsSheetName', googleAnalyticsSheetName); }, [googleAnalyticsSheetName]);
    useEffect(() => { localStorage.setItem('googleAdsSheetId', googleAdsSheetId); }, [googleAdsSheetId]);
    useEffect(() => { localStorage.setItem('googleAdsSheetName', googleAdsSheetName); }, [googleAdsSheetName]);

    // Apply and persist theme
    useEffect(() => {
        localStorage.setItem('dashboard-theme-id', currentTheme.id);
        const root = document.documentElement;
        Object.entries(currentTheme.colors).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });
    }, [currentTheme]);

    // Populate auto groups when account data is loaded
    useEffect(() => {
        const groups = [...new Set(accountDetailsData.map(d => d.AutoGroup).filter(Boolean) as string[])].sort();
        setAutoGroups(groups);
    }, [accountDetailsData]);

    // Handle clicks outside dropdowns to close them
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (clientSelectorRef.current && !clientSelectorRef.current.contains(event.target as Node)) {
                setIsClientDropdownOpen(false);
            }
             if (groupSelectorRef.current && !groupSelectorRef.current.contains(event.target as Node)) {
                setIsGroupDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('alertsSeen');
        setIsAuthenticated(false);
        updateSelectedClient('');
        updateSelectedAutoGroup('');
        navigate('/');
    };

    const handleSelectTool = (toolId: string) => {
        const path = TOOL_ROUTES[toolId];
        if (path) {
            // Clear current selections when switching main tools
            updateSelectedClient('');
            updateSelectedAutoGroup('');
            navigate(path);
        } else {
            console.warn(`Route not found for tool: ${toolId}`);
        }
    };

    const handleBackToTools = () => {
        updateSelectedClient('');
        updateSelectedAutoGroup('');
        navigate('/');
    };
    
    const handleSelectClientFromToolView = (clientName: string) => {
        if (clients.includes(clientName)) {
            updateSelectedClient(clientName);
            navigate(TOOL_ROUTES.client);
            window.scrollTo(0, 0);
        } else {
            console.warn(`Attempted to switch to client "${clientName}", but they were not found in the performance data.`);
        }
    };


    const processPerformanceData = useCallback((rows: string[][], headers: string[]): ClientDataRecord[] => {
        const headerMap = new Map<string, number>();
        headers.forEach((h, i) => headerMap.set(h.trim(), i));

        const missing = requiredPerformanceHeaders.filter(h => !performanceHeaderMapping[h] || !headerMap.has(h));
        if (missing.length > 0) throw new Error(`Missing required headers: ${missing.join(', ')}.`);

        return rows.map(row => {
            if (row.length === 0 || row.every(cell => !cell || cell.trim() === '')) return null;

            const record: Partial<ClientDataRecord> = {};
            for (const header of headers) {
                const key = performanceHeaderMapping[header.trim()];
                if (key) {
                    const cellValue = row[headerMap.get(header.trim())!];
                    switch (key) {
                        case 'Orders': case 'Year': case 'Sessions': case 'MonthNumber': case 'Orders_Canceled': case 'Days_of_Data': case 'Projected_Orders':
                            record[key] = cleanNumber(cellValue); break;
                        case 'Revenue': case 'Profit': case 'PPC_Spend': case 'AOV': case 'Avg_Fulfillment': case 'Projected_Revenue':
                            record[key] = cleanCurrency(cellValue); break;
                        case 'Conv_Rate':
                        case 'Canceled':
                            record[key] = cleanPercentage(cellValue); break;
                        default: (record as any)[key] = cellValue; break;
                    }
                }
            }
            
            const revenue = record.Revenue || 0, ppcSpend = record.PPC_Spend || 0, profit = record.Profit || 0, orders = record.Orders || 0;
            record.ROAS = ppcSpend > 0 ? revenue / ppcSpend : 0;
            record.Profit_Margin = revenue > 0 ? (profit / revenue) * 100 : 0;
            record.Profit_Per_Order = orders > 0 ? profit / orders : 0;
            
            return record as ClientDataRecord;
        }).filter((r): r is ClientDataRecord => r !== null);
    }, []);
    
    const processUsersData = useCallback((rows: string[][], headers: string[]): UserRecord[] => {
        const headerMap = new Map<string, number>();
        headers.forEach((h, i) => headerMap.set(h.trim().toLowerCase(), i));

        const userIndex = headerMap.get('user');
        const emailIndex = headerMap.get('email');

        if (userIndex === undefined || emailIndex === undefined) return [];

        return rows.map(row => ({
            name: row[userIndex],
            email: row[emailIndex]
        })).filter(r => r.name && r.email);
    }, []);

    const processAccountDetailsData = useCallback((rows: string[][], headers: string[]): AccountDetailsRecord[] => {
        const headerMap = new Map<string, number>();
        headers.forEach((h, i) => headerMap.set(h.trim(), i));

        if (!headerMap.has('Clients') && !headerMap.has('Client Name')) {
            throw new Error(`Missing required header: 'Clients' or 'Client Name' in the Client Info file.`);
        }

        return rows.map(row => {
            if (row.length === 0 || row.every(cell => !cell || cell.trim() === '')) return null;
            const record: any = {};
            for (const header of headers) {
                const key = accountDetailsHeaderMapping[header.trim()];
                if (key) {
                    const cellValue = row[headerMap.get(header.trim())!];
                    switch(key) {
                        case 'SignatureSurcharge':
                        case 'HazmatSurcharge':
                            record[key] = cleanCurrency(cellValue);
                            break;
                        case 'HandlingFee':
                            record[key] = cleanFloat(cellValue);
                            break;
                        default:
                             record[key] = cellValue || '';
                            break;
                    }
                }
            }
            return record as AccountDetailsRecord;
        }).filter((r): r is AccountDetailsRecord => r !== null && !!r.ClientName);
    }, []);

    const processKeyContactsData = useCallback((rows: string[][], headers: string[]): KeyContactRecord[] => {
        const headerMap = new Map<string, number>();
        headers.forEach((h, i) => headerMap.set(h.trim(), i));

        if (!headerMap.has('Clients')) throw new Error(`Missing required header: Clients in the KeyContacts file.`);

        return rows.map(row => {
            if (row.length === 0 || row.every(cell => !cell || cell.trim() === '')) return null;
            const record: any = {};
            for (const header of headers) {
                const key = keyContactsHeaderMapping[header.trim()];
                if (key) {
                    record[key] = row[headerMap.get(header.trim())!] || '';
                }
            }
            return record as KeyContactRecord;
        }).filter((r): r is KeyContactRecord => r !== null && !!r.ClientName);
    }, []);

    const processBudgetStatusData = useCallback((rows: string[][], headers: string[]): AllBudgetStatusData => {
        const headerMap = new Map<string, number>();
        headers.forEach((h, i) => headerMap.set(h.trim(), i));
    
        const requiredHeaders = ['Clients', 'PPC', 'Google', 'Bing', '% Spent', 'Target Spend', 'Proj. Total Spend', 'Yesterday', 'Rec. Daily Budget'];
        const missing = requiredHeaders.filter(h => !headerMap.has(h));
        if (missing.length > 0) throw new Error(`Missing required headers in Budget Status file: ${missing.join(', ')}.`);
    
        const data: AllBudgetStatusData = {};
    
        rows.forEach(row => {
            const clientName = row[headerMap.get('Clients')!];
            if (!clientName || clientName.trim() === '') return;
    
            const record: any = { ClientName: clientName };
            for (const header of headers) {
                const key = budgetStatusHeaderMapping[header.trim()];
                if (key) {
                    const cellValue = row[headerMap.get(header.trim())!];
                    switch (key) {
                        case 'ppcBudget':
                        case 'googleSpend':
                        case 'bingSpend':
                        case 'spend2DaysAgo':
                        case 'yesterdaySpend':
                        case 'recDailyBudget':
                            record[key] = cleanCurrency(cellValue);
                            break;
                        case 'percentSpent':
                        case 'targetSpend':
                        case 'projectedTotalSpend':
                            record[key] = cleanPercentage(cellValue);
                            break;
                        default:
                            record[key] = cellValue;
                            break;
                    }
                }
            }
            data[clientName] = record as BudgetStatusRecord;
        });
        return data;
    }, []);

    const processRevolutionLinksData = useCallback((rows: string[][], headers: string[]): AllRevolutionLinksData => {
        const headerMap = new Map<string, number>();
        headers.forEach((h, i) => headerMap.set(h.trim(), i));

        if (!headerMap.has('Clients')) throw new Error(`Missing required header: Clients in the RevolutionLinks file.`);

        const data: AllRevolutionLinksData = {};
        rows.forEach(row => {
            const clientName = row[headerMap.get('Clients')!];
            if (!clientName || clientName.trim() === '') return;

            const record: any = { ClientName: clientName };
            for (const header of headers) {
                const key = revolutionLinksHeaderMapping[header.trim()];
                if (key) {
                    record[key] = row[headerMap.get(header.trim())!] || '';
                }
            }
            data[clientName] = record as RevolutionLinksRecord;
        });
        return data;
    }, []);

    const processGoogleSearchConsoleData = useCallback((rows: string[][], headers: string[]): AllGoogleSearchConsoleData => {
        const headerMap = new Map<string, number>();
        headers.forEach((h, i) => headerMap.set(h.trim(), i));

        const requiredHeaders = ['Clients', 'Date', 'Impressions', 'Clicks'];
        const missing = requiredHeaders.filter(h => !headerMap.has(h));
        if (missing.length > 0) throw new Error(`Missing required headers in GoogleSearchConsole file: ${missing.join(', ')}.`);

        const data: AllGoogleSearchConsoleData = {};

        rows.forEach(row => {
            const clientName = row[headerMap.get('Clients')!];
            if (!clientName || clientName.trim() === '') return;

            const record: Partial<GoogleSearchConsoleRecord> = { ClientName: clientName };
            for (const header of headers) {
                const key = googleSearchConsoleHeaderMapping[header.trim()];
                if (key) {
                    const cellValue = row[headerMap.get(header.trim())!];
                    switch (key) {
                        case 'Impressions':
                        case 'Clicks':
                            record[key] = cleanNumber(cellValue);
                            break;
                        case 'Desktop':
                        case 'Mobile':
                        case 'Tablet':
                        case 'Average_CTR':
                            record[key] = cleanPercentage(cellValue);
                            break;
                        case 'Average_Position':
                            record[key] = cleanFloat(cellValue);
                            break;
                        default:
                            (record as any)[key] = cellValue;
                            break;
                    }
                }
            }
            if (!data[clientName]) {
                data[clientName] = [];
            }
            data[clientName].push(record as GoogleSearchConsoleRecord);
        });
        
        // Sort each client's data by date
        for (const client in data) {
            data[client].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
        }

        return data;
    }, []);
    
    const processGoogleAnalyticsData = useCallback((rows: string[][], headers: string[]): AllGoogleAnalyticsData => {
        const headerMap = new Map<string, number>();
        headers.forEach((h, i) => headerMap.set(h.trim(), i));

        const requiredHeaders = ['Clients', 'Date', 'Revenue', 'Revenue%Organic', 'Revenue%Direct', 'Revenue%PPC', 'Revenue %Referral', 'Sessions'];
        const missing = requiredHeaders.filter(h => !headerMap.has(h));
        if (missing.length > 0) throw new Error(`Missing required headers in GoogleAnalytics file: ${missing.join(', ')}.`);

        const data: AllGoogleAnalyticsData = {};

        rows.forEach(row => {
            const clientName = row[headerMap.get('Clients')!];
            if (!clientName || clientName.trim() === '') return;

            const record: Partial<GoogleAnalyticsRecord> = { ClientName: clientName };
            for (const header of headers) {
                const key = googleAnalyticsHeaderMapping[header.trim()];
                if (key) {
                    const cellValue = row[headerMap.get(header.trim())!];
                    switch (key) {
                        case 'Revenue':
                            record[key] = cleanCurrency(cellValue);
                            break;
                        case 'Sessions':
                        case 'Orders':
                            record[key] = cleanNumber(cellValue);
                            break;
                        case 'RevenuePercentOrganic':
                        case 'RevenuePercentDirect':
                        case 'RevenuePercentPPC':
                        case 'RevenuePercentReferral':
                        case 'SessionsPercentOrganic':
                        case 'SessionsPercentDirect':
                        case 'SessionsPercentPPC':
                        case 'SessionsPercentReferral':
                        case 'OrdersPercentOrganic':
                        case 'OrdersPercentDirect':
                        case 'OrdersPercentPPC':
                        case 'OrdersPercentReferral':
                        case 'ConvRate':
                        case 'ConvRatePercentOrganic':
                        case 'ConvRatePercentDirect':
                        case 'ConvRatePercentPPC':
                        case 'ConvRatePercentReferral':
                        case 'BounceRate':
                            record[key] = cleanPercentage(cellValue);
                            break;
                        default:
                            (record as any)[key] = cellValue;
                            break;
                    }
                }
            }
            if (!data[clientName]) {
                data[clientName] = [];
            }
            data[clientName].push(record as GoogleAnalyticsRecord);
        });
        
        // Sort each client's data by date
        for (const client in data) {
            data[client].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
        }

        return data;
    }, []);

    const processGoogleAdsData = useCallback((rows: string[][], headers: string[]): AllGoogleAdsData => {
        const headerMap = new Map<string, number>();
        headers.forEach((h, i) => headerMap.set(h.trim(), i));

        const requiredHeaders = ['Clients', 'Date', 'PartsCost', 'AccCost'];
        const missing = requiredHeaders.filter(h => !headerMap.has(h));
        if (missing.length > 0) throw new Error(`Missing required headers in GoogleAds file: ${missing.join(', ')}.`);

        const data: AllGoogleAdsData = {};

        rows.forEach(row => {
            const clientName = row[headerMap.get('Clients')!];
            if (!clientName || clientName.trim() === '') return;

            const record: Partial<GoogleAdsRecord> = { ClientName: clientName };
            for (const header of headers) {
                const key = googleAdsHeaderMapping[header.trim()];
                if (key) {
                    const cellValue = row[headerMap.get(header.trim())!];
                    switch (key) {
                        case 'PartsCost': case 'PartsAvgCPC': case 'PartsBudget':
                        case 'AccCost': case 'AccAvgCPC': case 'AccBudget':
                            record[key] = cleanCurrency(cellValue); break;
                        case 'PartsImpressions': case 'PartsClicks': case 'PartsConversions':
                        case 'AccImpressions': case 'AccClicks': case 'AccConversions':
                            record[key] = cleanNumber(cellValue); break;
                        case 'PartsCTR': case 'PartsROAS': case 'PartsConvRate':
                        case 'AccCTR': case 'AccROAS': case 'AccConvRate':
                            record[key] = cleanFloat(cellValue); break;
                        default:
                            (record as any)[key] = cellValue; break;
                    }
                }
            }
            if (!data[clientName]) {
                data[clientName] = [];
            }
            data[clientName].push(record as GoogleAdsRecord);
        });
        
        // Sort each client's data by date
        for (const client in data) {
            data[client].sort((a, b) => {
                // Assuming date format like "August 2025"
                const dateA = new Date(a.Date);
                const dateB = new Date(b.Date);
                return dateA.getTime() - dateB.getTime();
            });
        }

        return data;
    }, []);

    const processItemsInFeedData = useCallback((rows: string[][], headers: string[]): AllItemsInFeedData => {
        let clientNameIndex = headers.findIndex(h => /client name|clients/i.test(h.trim()));
        let midIndex = headers.findIndex(h => /mid|gmc/i.test(h.trim())); // Find MID column

        if (clientNameIndex === -1) {
            throw new Error(`Missing required header: 'Client Name' or 'Clients' in the ItemsinFeed file.`);
        }
    
        const firstDateColIndex = 2; // Assume dates start at col C.
        const dateHeaders = headers.slice(firstDateColIndex);
    
        const data: AllItemsInFeedData = {};
    
        rows.forEach(row => {
            const clientName = row[clientNameIndex];
            if (!clientName || clientName.trim() === '') return;
    
            const merchantId = midIndex !== -1 ? row[midIndex] : undefined;
            const timeline: ItemsInFeedDataPoint[] = [];
    
            dateHeaders.forEach((dateStr, index) => {
                const cellIndex = index + firstDateColIndex;
                if (cellIndex >= row.length) return;

                const countStr = row[cellIndex];
    
                if (dateStr && countStr) {
                    const date = new Date(dateStr + 'T00:00:00'); 
                    const count = parseInt(String(countStr).replace(/,/g, ''), 10);
                    
                    if (!isNaN(date.getTime()) && !isNaN(count)) {
                        timeline.push({ date, count });
                    }
                }
            });
    
            if (timeline.length > 0) {
                timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
            }

            data[clientName] = { merchantId, timeline };
        });
        return data;
    }, []);

    const processFeedStatusData = useCallback((rows: string[][], headers: string[]): AllFeedStatusData => {
        const clientNameIndex = headers.findIndex(h => /client(s| name)/i.test(h.trim()));
        const checkDateIndex = headers.findIndex(h => /check date|last checked/i.test(h.trim()));
    
        if (clientNameIndex === -1) throw new Error("Missing required header: 'Clients' or 'Client Name'.");
        if (checkDateIndex === -1) throw new Error("Missing required header: 'Check Date' or 'Last Checked'.");
    
        const feedNameHeaderRegex = /feed name/i;
        const feedNameColumnIndices: number[] = [];
        headers.forEach((header, index) => {
            if (feedNameHeaderRegex.test(header.trim())) {
                feedNameColumnIndices.push(index);
            }
        });
    
        if (feedNameColumnIndices.length === 0) {
            console.warn("No 'Feed Name' columns found in FeedStatus file.");
            return {};
        }
    
        const data: AllFeedStatusData = {};
        
        const allClients = [...new Set(accountDetailsDataRef.current.map(d => d.ClientName))];
        allClients.forEach(clientName => {
            data[clientName] = { lastChecked: new Date(), feeds: [] };
        });

        rows.forEach(row => {
            const clientName = row[clientNameIndex];
            if (!clientName || clientName.trim() === '') return;
    
            const lastCheckedStr = row[checkDateIndex];
            if (!lastCheckedStr) return;
    
            const lastChecked = new Date(lastCheckedStr + 'T00:00:00');
            if (isNaN(lastChecked.getTime())) return;
    
            const feeds: any[] = [];
            for (const nameIndex of feedNameColumnIndices) {
                const updateIndex = nameIndex + 1;
                
                if (updateIndex >= headers.length || updateIndex >= row.length) continue;
    
                const feedName = row[nameIndex];
                const lastUpdateStr = row[updateIndex];
    
                if (feedName && feedName.trim() && feedName.trim().toLowerCase() !== 'no feeds found') {
                    let lastUpdate: Date | 'Never';
                    if (!lastUpdateStr || lastUpdateStr.trim().toLowerCase() === 'never' || lastUpdateStr.trim() === '') {
                        lastUpdate = 'Never';
                    } else {
                        const parsedDate = new Date(lastUpdateStr);
                        lastUpdate = !isNaN(parsedDate.getTime()) ? parsedDate : 'Never';
                    }
                    feeds.push({ name: feedName.trim(), lastUpdate });
                }
            }
    
            data[clientName] = { lastChecked, feeds };
        });
    
        return data;
    }, []);

    const processPercentApprovedData = useCallback((rows: string[][], headers: string[]): AllPercentApprovedData => {
        const clientNameIndex = headers.findIndex(h => /client(s| name)/i.test(h.trim()));
        const percentIndex = headers.findIndex(h => /% approved/i.test(h.trim()));
        const dateIndex = headers.findIndex(h => /date/i.test(h.trim()));

        if (clientNameIndex === -1) throw new Error("Missing required header in PercentApproved: 'Clients' or 'Client Name'.");
        if (percentIndex === -1) throw new Error("Missing required header in PercentApproved: '% Approved'.");
        if (dateIndex === -1) throw new Error("Missing required header in PercentApproved: 'Date'.");

        const data: AllPercentApprovedData = {};

        rows.forEach(row => {
            const clientName = row[clientNameIndex];
            if (!clientName || clientName.trim() === '') return;
            
            const percentStr = row[percentIndex];
            const dateStr = row[dateIndex];
            
            if (!percentStr || !dateStr) return;

            const percentApproved = cleanFloat(percentStr);
            const date = new Date(dateStr + 'T00:00:00');

            if (!isNaN(percentApproved) && !isNaN(date.getTime())) {
                if (!data[clientName]) {
                    data[clientName] = [];
                }
                data[clientName].push({ percentApproved, date });
            }
        });
        
        // Sort each client's data by date, so the latest is always last
        for (const client in data) {
            data[client].sort((a, b) => a.date.getTime() - b.date.getTime());
        }
        
        return data;
    }, []);

    const processStoreStatusData = useCallback((rows: string[][], headers: string[]): AllStoreStatusData => {
        const clientNameIndex = headers.findIndex(h => /client(s| name)/i.test(h.trim()));
        const statusIndex = headers.findIndex(h => /status/i.test(h.trim()));
        const bannerIndex = headers.findIndex(h => /banner/i.test(h.trim()));
        const dateIndex = headers.findIndex(h => /date/i.test(h.trim()));

        if (clientNameIndex === -1) throw new Error("Missing required header in StoreStatus: 'Clients' or 'Client Name'.");
        if (statusIndex === -1) throw new Error("Missing required header in StoreStatus: 'Status'.");
        if (bannerIndex === -1) throw new Error("Missing required header in StoreStatus: 'Banner'.");
        if (dateIndex === -1) throw new Error("Missing required header in StoreStatus: 'Date'.");

        const data: AllStoreStatusData = {};

        rows.forEach(row => {
            const clientName = row[clientNameIndex];
            if (!clientName || clientName.trim() === '') return;
            
            const status = row[statusIndex] || '';
            const banner = row[bannerIndex] || '';
            const dateStr = row[dateIndex];
            
            if (!dateStr) return;

            const date = new Date(dateStr + 'T00:00:00');

            if (!isNaN(date.getTime())) {
                 data[clientName] = { status, banner, date };
            }
        });
        return data;
    }, []);

    const processStoreChangesData = useCallback((rows: string[][], headers: string[]): AllStoreChangesData => {
        const headerMap = new Map<string, number>();
        headers.forEach((h, i) => headerMap.set(h.trim(), i));
    
        if (!headerMap.has('Clients')) throw new Error("Missing required header in StoreChanges: 'Clients'.");
    
        const data: AllStoreChangesData = {};
        rows.forEach(row => {
            const clientName = row[headerMap.get('Clients')!];
            if (!clientName || clientName.trim() === '') return;
    
            const record: Partial<StoreChangesRecord> = { ClientName: clientName };
            for (const header of headers) {
                const key = storeChangesHeaderMapping[header.trim()];
                if (key) {
                    const cellValue = row[headerMap.get(header.trim())!];
                    switch (key) {
                        case 'SignatureSurcharge':
                        case 'HazmatSurcharge':
                            (record as any)[key] = cleanCurrency(cellValue);
                            break;
                        case 'HandlingFee':
                            (record as any)[key] = cleanFloat(cellValue);
                            break;
                        default:
                            (record as any)[key] = cellValue || '';
                            break;
                    }
                }
            }
            data[clientName] = record as StoreChangesRecord;
        });
        return data;
    }, []);

    const parseCSV = <T,>(csvText: string, processor: (rows: string[][], headers: string[]) => T): T => {
        const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return (processor === processItemsInFeedData || processor === processFeedStatusData || processor === processBudgetStatusData ? {} : []) as T;

        const parseCsvLine = (line: string): string[] => {
            const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
            const values = []; let match;
            while ((match = regex.exec(line))) { values.push((match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2]).trim()); }
            return values;
        };
        
        const headers = parseCsvLine(lines[0]);
        const dataRows = lines.slice(1).map(line => parseCsvLine(line));
        return processor(dataRows, headers);
    };
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const genericSheetFetcher = useCallback(async <T,>(
        sheetId: string,
        sheetName: string,
        processor: (rows: string[][], headers: string[]) => T
    ): Promise<T> => {
        const maxRetries = 3;
        const initialDelay = 1000;
        let lastError: Error | null = null;
    
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const encodedSheetName = encodeURIComponent(sheetName);
                const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedSheetName}?key=${API_KEY}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Google Sheets API Error: ${errorData?.error?.message || `HTTP error! status: ${response.status}`}. Please check restrictions, permissions, ID, and Name.`);
                }
    
                const json = await response.json();
                if (!json.values || json.values.length < 1) throw new Error(`Sheet "${sheetName}" is empty or has no data.`);
                
                if (json.values.length < 2 && (processor === processPerformanceData || processor === processAccountDetailsData) ) {
                    throw new Error(`Sheet "${sheetName}" requires at least one header row and one data row.`);
                }
                
                return processor(json.values.slice(1), json.values[0]);
    
            } catch (err) {
                lastError = err instanceof Error ? err : new Error('An unknown error occurred');
                console.warn(`Attempt ${attempt + 1}/${maxRetries} failed for sheet "${sheetName}". Error: ${lastError.message}`);
                if (attempt < maxRetries - 1) {
                    const delay = initialDelay * Math.pow(2, attempt);
                    console.warn(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    }, []);
    
    const handleFetchPerformanceData = useCallback(async () => {
        if (!performanceSheetId || !performanceSheetName) {
            setPerformanceError('Please provide a valid Spreadsheet ID and Sheet Name.');
            return false;
        }
        setIsPerformanceLoading(true); setPerformanceError('');
        try {
            const parsedData = await genericSheetFetcher(performanceSheetId, performanceSheetName, processPerformanceData);
            if (!parsedData || parsedData.length === 0) throw new Error("No data found. Check source.");
            setAllData(parsedData);
            setLastUpdated(new Date());

            // Set the master client list from the performance data
            const uniqueClients = [...new Set(parsedData.map(d => d.ClientName))].sort();
            setClients(uniqueClients);
            // Don't auto-select client here, let URL handle it
            
            return true;
        } catch (err) { 
            setPerformanceError(err instanceof Error ? err.message : 'An unknown error occurred.'); 
            return false;
        } finally { 
            setIsPerformanceLoading(false); 
        }
    }, [performanceSheetId, performanceSheetName, genericSheetFetcher, processPerformanceData]);
    
    const handleFetchAccountDetails = useCallback(async () => {
        if (!accountDetailsSheetId || !accountDetailsSheetName) {
            setAccountDetailsError('Please provide a valid Spreadsheet ID and Sheet Name.');
            return false;
        }
        setIsAccountDetailsLoading(true); setAccountDetailsError('');
        try {
            const parsedData = await genericSheetFetcher(accountDetailsSheetId, accountDetailsSheetName, processAccountDetailsData);
            setAccountDetailsData(parsedData);
            return true;
        } catch (err) { 
            setAccountDetailsError(err instanceof Error ? err.message : 'An unknown error occurred.'); 
            return false;
        } finally { 
            setIsAccountDetailsLoading(false); 
        }
    }, [accountDetailsSheetId, accountDetailsSheetName, genericSheetFetcher, processAccountDetailsData]);

    const handleFetchKeyContacts = useCallback(async () => {
        if (!keyContactsSheetId || !keyContactsSheetName) {
            setKeyContactsError('Please provide a valid Spreadsheet ID and Sheet Name.');
            return false;
        }
        setIsKeyContactsLoading(true); setKeyContactsError('');
        try {
            const parsedData = await genericSheetFetcher(keyContactsSheetId, keyContactsSheetName, processKeyContactsData);
            setKeyContactsData(parsedData);
            return true;
        } catch (err) { 
            setKeyContactsError(err instanceof Error ? err.message : 'An unknown error occurred.'); 
            return false;
        } finally { 
            setIsKeyContactsLoading(false); 
        }
    }, [keyContactsSheetId, keyContactsSheetName, genericSheetFetcher, processKeyContactsData]);

    const handleFetchItemsInFeedData = useCallback(async () => {
        if (!itemsInFeedSheetId || !itemsInFeedSheetName) {
            setItemsInFeedError('Please provide a valid Spreadsheet ID and Sheet Name.');
            return false;
        }
        setIsItemsInFeedLoading(true); setItemsInFeedError('');
        try {
            const parsedData = await genericSheetFetcher(itemsInFeedSheetId, itemsInFeedSheetName, processItemsInFeedData);
            setItemsInFeedData(parsedData);
            return true;
        } catch (err) { 
            setItemsInFeedError(err instanceof Error ? err.message : 'An unknown error occurred.'); 
            return false;
        } finally { 
            setIsItemsInFeedLoading(false); 
        }
    }, [itemsInFeedSheetId, itemsInFeedSheetName, genericSheetFetcher, processItemsInFeedData]);

    const handleFetchFeedStatusData = useCallback(async () => {
        if (!feedStatusSheetId || !feedStatusSheetName) {
            setFeedStatusError('Please provide a valid Spreadsheet ID and Sheet Name.');
            return false;
        }
        setIsFeedStatusLoading(true); setFeedStatusError('');
        try {
            const parsedData = await genericSheetFetcher(feedStatusSheetId, feedStatusSheetName, processFeedStatusData);
            setFeedStatusData(parsedData);
            return true;
        } catch (err) { 
            setFeedStatusError(err instanceof Error ? err.message : 'An unknown error occurred.'); 
            return false;
        } finally { 
            setIsFeedStatusLoading(false); 
        }
    }, [feedStatusSheetId, feedStatusSheetName, genericSheetFetcher, processFeedStatusData]);

    const handleFetchPercentApprovedData = useCallback(async () => {
        if (!percentApprovedSheetId || !percentApprovedSheetName) {
            setPercentApprovedError('Please provide a valid Spreadsheet ID and Sheet Name.');
            return false;
        }
        setIsPercentApprovedLoading(true); setPercentApprovedError('');
        try {
            const parsedData = await genericSheetFetcher(percentApprovedSheetId, percentApprovedSheetName, processPercentApprovedData);
            setPercentApprovedData(parsedData);
            return true;
        } catch (err) { 
            setPercentApprovedError(err instanceof Error ? err.message : 'An unknown error occurred.'); 
            return false;
        } finally { 
            setIsPercentApprovedLoading(false); 
        }
    }, [percentApprovedSheetId, percentApprovedSheetName, genericSheetFetcher, processPercentApprovedData]);

    const handleFetchStoreStatusData = useCallback(async () => {
        if (!storeStatusSheetId || !storeStatusSheetName) {
            setStoreStatusError('Please provide a valid Spreadsheet ID and Sheet Name.');
            return false;
        }
        setIsStoreStatusLoading(true); setStoreStatusError('');
        try {
            const parsedData = await genericSheetFetcher(storeStatusSheetId, storeStatusSheetName, processStoreStatusData);
            setStoreStatusData(parsedData);
            return true;
        } catch (err) { 
            setStoreStatusError(err instanceof Error ? err.message : 'An unknown error occurred.'); 
            return false;
        } finally { 
            setIsStoreStatusLoading(false); 
        }
    }, [storeStatusSheetId, storeStatusSheetName, genericSheetFetcher, processStoreStatusData]);

    const handleFetchStoreChangesData = useCallback(async () => {
        if (!storeChangesSheetId || !storeChangesSheetName) {
            setStoreChangesError('Please provide a valid Spreadsheet ID and Sheet Name.');
            return false;
        }
        setIsStoreChangesLoading(true); setStoreChangesError('');
        try {
            const parsedData = await genericSheetFetcher(storeChangesSheetId, storeChangesSheetName, processStoreChangesData);
            setStoreChangesData(parsedData);
    
            // Merge into accountDetailsData
            setAccountDetailsData(currentDetails => {
                if (currentDetails.length === 0) return [];
                return currentDetails.map(detail => {
                    const changes = parsedData[detail.ClientName];
                    if (changes) {
                        return {
                            ...detail,
                            ShippingMethods: changes.ShippingMethods ?? detail.ShippingMethods,
                            HandlingFee: changes.HandlingFee ?? detail.HandlingFee,
                            SignatureSurcharge: changes.SignatureSurcharge ?? detail.SignatureSurcharge,
                            HazmatSurcharge: changes.HazmatSurcharge ?? detail.HazmatSurcharge,
                            AllowPOBox: changes.AllowPOBox ?? detail.AllowPOBox,
                            TAndC: changes.TAndC ?? detail.TAndC,
                            FitmentVerification: changes.FitmentVerification ?? detail.FitmentVerification,
                            RequiredField: changes.RequiredField ?? detail.RequiredField,
                        };
                    }
                    return detail;
                });
            });
    
            return true;
        } catch (err) {
            setStoreChangesError(err instanceof Error ? err.message : 'An unknown error occurred.');
            return false;
        } finally {
            setIsStoreChangesLoading(false);
        }
    }, [storeChangesSheetId, storeChangesSheetName, genericSheetFetcher, processStoreChangesData]);

    const handleFetchBudgetStatusData = useCallback(async () => {
        if (!budgetStatusSheetId || !budgetStatusSheetName) {
            setBudgetStatusError('Please provide a valid Spreadsheet ID and Sheet Name.');
            return false;
        }
        setIsBudgetStatusLoading(true); setBudgetStatusError('');
        try {
            const parsedData = await genericSheetFetcher(budgetStatusSheetId, budgetStatusSheetName, processBudgetStatusData);
            setBudgetStatusData(parsedData);
            return true;
        } catch (err) { 
            setBudgetStatusError(err instanceof Error ? err.message : 'An unknown error occurred.'); 
            return false;
        } finally { 
            setIsBudgetStatusLoading(false); 
        }
    }, [budgetStatusSheetId, budgetStatusSheetName, genericSheetFetcher, processBudgetStatusData]);

    const handleFetchRevolutionLinksData = useCallback(async () => {
        if (!revolutionLinksSheetId || !revolutionLinksSheetName) {
            setRevolutionLinksError('Please provide a valid Spreadsheet ID and Sheet Name.');
            return false;
        }
        setIsRevolutionLinksLoading(true); setRevolutionLinksError('');
        try {
            const parsedData = await genericSheetFetcher(revolutionLinksSheetId, revolutionLinksSheetName, processRevolutionLinksData);
            setRevolutionLinksData(parsedData);
            return true;
        } catch (err) { 
            setRevolutionLinksError(err instanceof Error ? err.message : 'An unknown error occurred.'); 
            return false;
        } finally { 
            setIsRevolutionLinksLoading(false); 
        }
    }, [revolutionLinksSheetId, revolutionLinksSheetName, genericSheetFetcher, processRevolutionLinksData]);

    const handleFetchGoogleSearchConsoleData = useCallback(async () => {
        if (!googleSearchConsoleSheetId || !googleSearchConsoleSheetName) {
            setGoogleSearchConsoleError('Please provide a valid Spreadsheet ID and Sheet Name.');
            return false;
        }
        setIsGoogleSearchConsoleLoading(true); setGoogleSearchConsoleError('');
        try {
            const parsedData = await genericSheetFetcher(googleSearchConsoleSheetId, googleSearchConsoleSheetName, processGoogleSearchConsoleData);
            setGoogleSearchConsoleData(parsedData);
            return true;
        } catch (err) {
            setGoogleSearchConsoleError(err instanceof Error ? err.message : 'An unknown error occurred.');
            return false;
        } finally {
            setIsGoogleSearchConsoleLoading(false);
        }
    }, [googleSearchConsoleSheetId, googleSearchConsoleSheetName, genericSheetFetcher, processGoogleSearchConsoleData]);

    const handleFetchGoogleAnalyticsData = useCallback(async () => {
        if (!googleAnalyticsSheetId || !googleAnalyticsSheetName) {
            setGoogleAnalyticsError('Please provide a valid Spreadsheet ID and Sheet Name.');
            return false;
        }
        setIsGoogleAnalyticsLoading(true); setGoogleAnalyticsError('');
        try {
            const parsedData = await genericSheetFetcher(googleAnalyticsSheetId, googleAnalyticsSheetName, processGoogleAnalyticsData);
            setGoogleAnalyticsData(parsedData);
            return true;
        } catch (err) {
            setGoogleAnalyticsError(err instanceof Error ? err.message : 'An unknown error occurred.');
            return false;
        } finally {
            setIsGoogleAnalyticsLoading(false);
        }
    }, [googleAnalyticsSheetId, googleAnalyticsSheetName, genericSheetFetcher, processGoogleAnalyticsData]);

    const handleFetchGoogleAdsData = useCallback(async () => {
        if (!googleAdsSheetId || !googleAdsSheetName) {
            setGoogleAdsError('Please provide a valid Spreadsheet ID and Sheet Name.');
            return false;
        }
        setIsGoogleAdsLoading(true); setGoogleAdsError('');
        try {
            const parsedData = await genericSheetFetcher(googleAdsSheetId, googleAdsSheetName, processGoogleAdsData);
            setGoogleAdsData(parsedData);
            return true;
        } catch (err) {
            setGoogleAdsError(err instanceof Error ? err.message : 'An unknown error occurred.');
            return false;
        } finally {
            setIsGoogleAdsLoading(false);
        }
    }, [googleAdsSheetId, googleAdsSheetName, genericSheetFetcher, processGoogleAdsData]);

    const handleFetchUsersData = useCallback(async () => {
        if (!performanceSheetId) return false;
        try {
            const parsedData = await genericSheetFetcher(performanceSheetId, 'Users', processUsersData);
            setUsersData(parsedData);
            return true;
        } catch (e) {
            console.warn("Could not fetch Users tab:", e);
            return false;
        }
    }, [performanceSheetId, genericSheetFetcher, processUsersData]);

    const handleFetchStrategyNotes = useCallback(async () => {
        const NOTES_SHEET_ID = '1Qg65GE1_Wfx3ryTgK8N_lhdNPqVRU80KmuH2gVHgyhk';
        const NOTES_SHEET_NAME = 'Notes';

        if (!isSignedIn || !gapiClient) return;
        setIsStrategyNotesLoading(true);
        setStrategyNotesError('');
        try {
            const response = await gapiClient.sheets.spreadsheets.values.get({
                spreadsheetId: NOTES_SHEET_ID,
                range: `${NOTES_SHEET_NAME}!A2:F`,
            });
            const rows = response.result.values || [];
            const loadedNotes: NoteRecord[] = rows.map((row: string[], index: number) => {
                if (!row[0] || !row[1]) return null;
                const monthStr = row[1];
                let formattedMonth = monthStr.includes('|') ? monthStr.replace('|', '-') : monthStr;
                return { 
                    clientName: row[0], 
                    month: formattedMonth, 
                    pricing: row[2] || '',
                    shipping: row[3] || '',
                    otherNotes: row[4] || '',
                    strategyNote: row[5] || '', 
                    rowIndex: index + 2 
                };
            }).filter((note): note is NoteRecord => note !== null);
            setStrategyNotesData(loadedNotes);
        } catch (err: any) {
            console.error("Failed to fetch strategy notes:", err);
            setStrategyNotesError("Could not load notes. Check permissions and ensure the 'Notes' tab exists.");
        } finally {
            setIsStrategyNotesLoading(false);
        }
    }, [gapiClient, isSignedIn]);

    const handleUpdateStrategyNoteLocally = useCallback((updatedNote: NoteRecord) => {
        setStrategyNotesData(prevNotes => {
            const noteIndex = prevNotes.findIndex(note => 
                note.clientName === updatedNote.clientName && note.month === updatedNote.month
            );
    
            if (noteIndex !== -1) {
                // Update existing note
                const newNotes = [...prevNotes];
                newNotes[noteIndex] = updatedNote;
                return newNotes;
            } else {
                // Add new note if it doesn't exist
                return [...prevNotes, updatedNote];
            }
        });
    }, []);


    // Sequential data fetching orchestrator
    const fetchAllDataSequentially = useCallback(async () => {
        if (isFetchingAllRef.current) return;
        isFetchingAllRef.current = true;

        setIsFetchingAll(true);
        setAllDataLoadedSuccessfully(false);
        setCompletedConnections(0);

        const dataFetchers = [
            handleFetchAccountDetails,
            handleFetchPerformanceData,
            handleFetchKeyContacts,
            handleFetchItemsInFeedData,
            handleFetchFeedStatusData,
            handleFetchPercentApprovedData,
            handleFetchStoreStatusData,
            handleFetchStoreChangesData,
            handleFetchBudgetStatusData,
            handleFetchRevolutionLinksData,
            handleFetchGoogleSearchConsoleData,
            handleFetchGoogleAnalyticsData,
            handleFetchGoogleAdsData,
            handleFetchUsersData
        ];
        
        setTotalConnections(dataFetchers.length);
        
        let successCount = 0;
        for (const fetcher of dataFetchers) {
            try {
                const success = await fetcher();
                if (success) {
                    successCount++;
                }
            } catch (e) {
                console.error("A fetcher failed:", e);
            } finally {
                setCompletedConnections(prev => prev + 1);
            }
        }
        
        isFetchingAllRef.current = false;
        setIsFetchingAll(false);
        if (successCount >= 2) { // Need at least performance and account details to function
            setAllDataLoadedSuccessfully(true);
        }
    }, [
        handleFetchAccountDetails, handleFetchPerformanceData, handleFetchKeyContacts,
        handleFetchItemsInFeedData, handleFetchFeedStatusData, handleFetchPercentApprovedData,
        handleFetchStoreStatusData, handleFetchStoreChangesData, handleFetchBudgetStatusData,
        handleFetchRevolutionLinksData, handleFetchGoogleSearchConsoleData, handleFetchGoogleAnalyticsData,
        handleFetchGoogleAdsData, handleFetchUsersData
    ]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchAllDataSequentially();
        }
    }, [isAuthenticated, fetchAllDataSequentially]);
    
    // --- Current Status Note & Strategy Notes Data Fetching ---
    const handleFetchCurrentStatusData = useCallback(async () => {
        const sheetId = '1cg-YeArVto30qAFE1mzR4phx6KOxtNS7JFapPyhc7SY';
        const sheetName = 'Account Details';

        if (!gapiClient) return false;
        setIsCurrentStatusLoading(true);
        setCurrentStatusError('');
        try {
            const range = `'${sheetName}'!A2:DG`;
            const response = await gapiClient.sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: range,
            });

            const rows = response.result.values || [];
            const data: AllCurrentStatusData = {};
            rows.forEach((row: string[], index: number) => {
                const clientName = row[0];
                if (clientName && clientName.trim()) {
                    data[clientName.trim()] = {
                        clientName: clientName.trim(),
                        status: row[110] || '', // Column DG is index 110
                        rowIndex: index + 2, // Data starts at row 2
                    };
                }
            });

            setCurrentStatusData(data);
            return true;
        } catch (err: unknown) {
            const errorMessage = (err as any)?.result?.error?.message || (err instanceof Error ? err.message : String(err));
            setCurrentStatusError(`Failed to load Current Status notes: ${errorMessage}`);
            return false;
        } finally {
            setIsCurrentStatusLoading(false);
        }
    }, [gapiClient]);

    useEffect(() => {
        if (isSignedIn && gapiClient) {
            handleFetchCurrentStatusData();
            handleFetchStrategyNotes();
            
            const token = gapiClient.getToken();
            if (token && token.access_token) {
                 fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${token.access_token}` }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.email) setUserEmail(data.email);
                })
                .catch(e => console.error("Error fetching user info", e));
            }
        }
    }, [isSignedIn, gapiClient, handleFetchCurrentStatusData, handleFetchStrategyNotes]);

    // Match user email to name in Users tab
    useEffect(() => {
        if (userEmail && usersData.length > 0) {
            const user = usersData.find(u => u.email.trim().toLowerCase() === userEmail.trim().toLowerCase());
            if (user) {
                setLoggedInUserName(user.name);
            }
        }
    }, [userEmail, usersData]);

    const handleUpdateCurrentStatus = useCallback(async (clientName: string, newStatus: string): Promise<boolean> => {
        const sheetId = '1cg-YeArVto30qAFE1mzR4phx6KOxtNS7JFapPyhc7SY';
        const sheetName = 'Account Details';

        if (!gapiClient || !isSignedIn) {
            throw new Error("You must be signed in to save changes.");
        }
        const record = currentStatusData[clientName];
        if (!record) {
            // In this specific sheet, we don't add new clients, we only update.
            throw new Error("Could not find client record to update. Client may not exist in the 'Account Details' sheet.");
        }
        
        const range = `'${sheetName}'!DG${record.rowIndex}`;

        try {
            await gapiClient.sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [[newStatus]]
                }
            });
            // Update local state for immediate feedback
            setCurrentStatusData(prev => ({
                ...prev,
                [clientName]: {
                    ...prev[clientName],
                    status: newStatus
                }
            }));
            return true; // Success
        } catch (err: unknown) {
            const errorMessage = (err as any)?.result?.error?.message || (err instanceof Error ? err.message : String(err));
            console.error("Update failed:", err);
            throw new Error(`Save failed: ${errorMessage}`);
        }
    }, [gapiClient, isSignedIn, currentStatusData]);


    const createUploadHandler = <T,>(processor: (rows: string[][], headers: string[]) => T, setData: (data: T) => void, setLoading: (loading: boolean) => void, setError: (error: string) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setLoading(true); setError('');
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsedData = parseCSV(e.target?.result as string, processor);
                setData(parsedData as any);
                if(processor === processAccountDetailsData as any) {
                    const accountData = parsedData as AccountDetailsRecord[];
                } else if (processor === processPerformanceData as any) {
                    const performanceData = parsedData as ClientDataRecord[];
                    const uniqueClients = [...new Set(performanceData.map(d => d.ClientName))].sort();
                    setClients(uniqueClients);
                    // setSelectedClient(''); // Handled by URL now
                    setLastUpdated(new Date());
                }
            } catch (err) { setError(`Failed to parse CSV. ${err instanceof Error ? err.message : 'Unknown error.'}`); } 
            finally { setLoading(false); }
        };
        reader.onerror = () => { setError('Error reading the file.'); setLoading(false); }
        reader.readAsText(file);
        event.target.value = '';
    };

    const handlePerformanceFileUpload = createUploadHandler(processPerformanceData, setAllData, setIsPerformanceLoading, setPerformanceError);
    const handleAccountDetailsFileUpload = createUploadHandler(processAccountDetailsData, setAccountDetailsData, setIsAccountDetailsLoading, setAccountDetailsError);
    const handleKeyContactsFileUpload = createUploadHandler(processKeyContactsData, setKeyContactsData, setIsKeyContactsLoading, setKeyContactsError);
    const handleItemsInFeedFileUpload = createUploadHandler(processItemsInFeedData, setItemsInFeedData, setIsItemsInFeedLoading, setItemsInFeedError);
    const handleFeedStatusFileUpload = createUploadHandler(processFeedStatusData, setFeedStatusData, setIsFeedStatusLoading, setFeedStatusError);
    const handlePercentApprovedFileUpload = createUploadHandler(processPercentApprovedData, setPercentApprovedData, setIsPercentApprovedLoading, setPercentApprovedError);
    const handleStoreStatusFileUpload = createUploadHandler(processStoreStatusData, setStoreStatusData, setIsStoreStatusLoading, setStoreStatusError);
    const handleStoreChangesFileUpload = createUploadHandler(processStoreChangesData, setStoreChangesData, setIsStoreChangesLoading, setStoreChangesError);
    const handleBudgetStatusFileUpload = createUploadHandler(processBudgetStatusData, setBudgetStatusData, setIsBudgetStatusLoading, setBudgetStatusError);
    const handleRevolutionLinksFileUpload = createUploadHandler(processRevolutionLinksData, setRevolutionLinksData, setIsRevolutionLinksLoading, setRevolutionLinksError);
    const handleGoogleSearchConsoleFileUpload = createUploadHandler(processGoogleSearchConsoleData, setGoogleSearchConsoleData, setIsGoogleSearchConsoleLoading, setGoogleSearchConsoleError);
    const handleGoogleAnalyticsFileUpload = createUploadHandler(processGoogleAnalyticsData, setGoogleAnalyticsData, setIsGoogleAnalyticsLoading, setGoogleAnalyticsError);
    const handleGoogleAdsFileUpload = createUploadHandler(processGoogleAdsData, setGoogleAdsData, setIsGoogleAdsLoading, setGoogleAdsError);


    const clientData = useMemo(() => {
        if (!selectedClient) return [];
        return allData.filter(d => d.ClientName === selectedClient);
    }, [allData, selectedClient]);

    const accountDetailsForClient = useMemo(() => {
        if (!selectedClient || !accountDetailsData) return null;
        return accountDetailsData.find(d => d.ClientName === selectedClient) || null;
    }, [accountDetailsData, selectedClient]);

    const keyContactForClient = useMemo(() => {
        if (!selectedClient || !keyContactsData) return null;
        return keyContactsData.find(d => d.ClientName === selectedClient) || null;
    }, [keyContactsData, selectedClient]);

    const itemsInFeedForClient = useMemo(() => {
        if (!selectedClient || !itemsInFeedData) return null;
        return itemsInFeedData[selectedClient]?.timeline || null;
    }, [itemsInFeedData, selectedClient]);

    const feedStatusForClient = useMemo(() => {
        if (!selectedClient || !feedStatusData) return null;
        return feedStatusData[selectedClient] || null;
    }, [feedStatusData, selectedClient]);
    
    const percentApprovedForClient = useMemo(() => {
        if (!selectedClient || !percentApprovedData) return null;
        const clientRecords = percentApprovedData[selectedClient];
        if (!clientRecords || clientRecords.length === 0) return null;
        // The array is sorted by date ascending, so the last element is the latest.
        return clientRecords[clientRecords.length - 1];
    }, [percentApprovedData, selectedClient]);

    const storeStatusForClient = useMemo(() => {
        if (!selectedClient || !storeStatusData) return null;
        return storeStatusData[selectedClient] || null;
    }, [storeStatusData, selectedClient]);
        
    const currentStatusForClient = useMemo(() => {
        if (!selectedClient || !currentStatusData) return null;
        return currentStatusData[selectedClient] || { clientName: selectedClient, status: '', rowIndex: -1 };
    }, [currentStatusData, selectedClient]);

    const storeChangesForClient = useMemo(() => {
        if (!selectedClient || !storeChangesData) return null;
        return storeChangesData[selectedClient] || null;
    }, [storeChangesData, selectedClient]);
    
    const budgetStatusForClient = useMemo(() => {
        if (!selectedClient || !budgetStatusData) return null;
        return budgetStatusData[selectedClient] || null;
    }, [budgetStatusData, selectedClient]);

    const revolutionLinksForClient = useMemo(() => {
        if (!selectedClient || !revolutionLinksData) return null;
        return revolutionLinksData[selectedClient] || null;
    }, [revolutionLinksData, selectedClient]);

    const googleSearchConsoleForClient = useMemo(() => {
        if (!selectedClient || !googleSearchConsoleData) return null;
        return googleSearchConsoleData[selectedClient] || null;
    }, [googleSearchConsoleData, selectedClient]);

    const googleAnalyticsForClient = useMemo(() => {
        if (!selectedClient || !googleAnalyticsData) return null;
        return googleAnalyticsData[selectedClient] || null;
    }, [googleAnalyticsData, selectedClient]);

    const googleAdsForClient = useMemo(() => {
        if (!selectedClient || !googleAdsData) return null;
        return googleAdsData[selectedClient] || null;
    }, [googleAdsData, selectedClient]);

    const getHeaderTitle = () => {
        if (currentPath === TOOL_ROUTES.client && selectedClient) return ``;
        if (currentPath === TOOL_ROUTES.multi_client) return ``;
        if (currentPath === TOOL_ROUTES.manager_dashboard) return `Manager Dashboard`;
        if (currentPath === TOOL_ROUTES.budget_status) return `Budget Status Tool`;
        if (currentPath === TOOL_ROUTES.revenue_tool) return `Metric Comparison Tool`;
        if (currentPath === TOOL_ROUTES.custom_titles) return `Custom SEO Titles Workflow`;
        if (currentPath === TOOL_ROUTES.brand_comparison) return `Brand Comparison Tool`;
        if (currentPath === TOOL_ROUTES.feed_health) return `Feed Health Tool`;
        if (currentPath === TOOL_ROUTES.medium_comparison) return `Medium Comparison Tool`;
        if (currentPath === TOOL_ROUTES.bulk_url_opener) return `Bulk URL Opener Tool`;
        if (currentPath === TOOL_ROUTES.strategy_notes) return 'Strategy Notes Viewer';
        if (currentPath === TOOL_ROUTES.google_ads_robot) return 'Google Ads Playground';
        if (currentPath === TOOL_ROUTES.polaris_msrp_updater) return 'Polaris MSRP Updater';
        if (currentPath === TOOL_ROUTES.tag_creator) return 'Tag Creator';
        if (currentPath === TOOL_ROUTES.search_page_creator) return 'Search Page Creator';
        if (currentPath === TOOL_ROUTES.free_shipping_tool) return 'Free Shipping Tool';
        if (currentPath === TOOL_ROUTES.category_page_creator) return 'Category Page Creator';
        if (currentPath === TOOL_ROUTES.product_availability) return 'Product Availability Tool';
        if (currentPath === TOOL_ROUTES.file_uploader) return 'File Uploader';
        return 'OEM Performance Tools';
    };

    if (!isAuthenticated) {
        return <Login onLoginSuccess={handleLoginSuccess} theme={currentTheme} onGoogleSignIn={handleSignIn} isGoogleReady={!!tokenClient} />;
    }

    const filteredClients = useMemo(() => {
        if (!clientSearchQuery) {
            return clients;
        }
        return clients.filter(client =>
            client.toLowerCase().includes(clientSearchQuery.toLowerCase())
        );
    }, [clients, clientSearchQuery]);

    const filteredGroups = useMemo(() => {
        if (!groupSearchQuery) return autoGroups;
        return autoGroups.filter(g => g.toLowerCase().includes(groupSearchQuery.toLowerCase()));
    }, [autoGroups, groupSearchQuery]);
    
    // --- Alert System Logic ---
    const closedStores = useMemo(() => {
        return Object.entries(storeStatusData)
            .filter(([, status]) => status && status.status && status.status.toLowerCase() !== 'open')
            .map(([clientName, status]) => ({
                name: clientName,
                status: status.status
            }));
    }, [storeStatusData]);

    const recentChanges = useMemo(() => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
        const changes = [];
    
        for (const clientName in storeChangesData) {
            const record = storeChangesData[clientName];
            if (!record) continue;

            const clientChanges: { type: string; date: Date }[] = [];
    
            const checkDate = (dateStr: string | undefined, changeType: string) => {
                if (!dateStr || dateStr.trim() === '' || dateStr.toLowerCase() === 'no activity' || dateStr.toLowerCase() === 'n/a') return;
                try {
                    const sanitizedDateStr = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
                    const changeDate = new Date(sanitizedDateStr);
                    if (!isNaN(changeDate.getTime()) && changeDate > oneWeekAgo) {
                        clientChanges.push({ type: changeType, date: changeDate });
                    }
                } catch (e) {
                    console.error(`Invalid date string for ${clientName}: ${dateStr}`);
                }
            };
    
            checkDate(record.LastPriceChange, 'Pricing');
            checkDate(record.LastShippingChange, 'Shipping');
            checkDate(record.LastSettingsChange, 'Settings');
            checkDate(record.LastCheckoutChange, 'Checkout');
    
            if (clientChanges.length > 0) {
                changes.push({
                    name: clientName,
                    changes: clientChanges.sort((a, b) => b.date.getTime() - a.date.getTime())
                });
            }
        }
        return changes.sort((a,b) => a.name.localeCompare(b.name));
    }, [storeChangesData]);
    
    const oldFeeds = useMemo(() => {
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const now = new Date().getTime();

        return Object.entries(feedStatusData)
            .map(([clientName, status]) => {
                const clientOldFeeds = status.feeds.filter(feed => {
                    if (feed.lastUpdate instanceof Date) {
                        const diffMs = now - feed.lastUpdate.getTime();
                        return diffMs > thirtyDaysInMs;
                    }
                    return false;
                });

                if (clientOldFeeds.length > 0) {
                    return {
                        name: clientName,
                        feeds: clientOldFeeds.map(f => f.name)
                    };
                }
                return null;
            })
            .filter((item): item is { name: string; feeds: string[] } => item !== null);
    }, [feedStatusData]);

    const alertCount = useMemo(() => closedStores.length + recentChanges.length + oldFeeds.length, [closedStores, recentChanges, oldFeeds]);

    const handleToggleAlerts = () => {
        setIsToolsOpen(false);
        setIsDashboardsOpen(false); // Close Dashboards
        setIsAlertsOpen(prev => !prev);
        if (!alertsSeen && alertCount > 0) {
            setAlertsSeen(true);
            sessionStorage.setItem('alertsSeen', 'true');
        }
    };

    const handleToggleTools = () => {
        setIsAlertsOpen(false);
        setIsDashboardsOpen(false); // Close Dashboards
        setIsToolsOpen(prev => !prev);
    };

    const handleToggleDashboards = () => {
        setIsAlertsOpen(false);
        setIsToolsOpen(false);
        setIsDashboardsOpen(prev => !prev);
    };

    const handleSelectToolAndClose = (tool: string) => {
        handleSelectTool(tool);
        setIsToolsOpen(false);
        setIsDashboardsOpen(false);
    }


    const renderClientDashboard = () => (
        <>
            {(isFetchingAll) ? (
                 <div className="text-center py-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent)] mx-auto"></div><p className="mt-4 text-lg text-[var(--color-text-secondary)]">Loading Data...</p></div>
            ) : allData.length > 0 && selectedClient ? (
                <Dashboard 
                    clientData={clientData} 
                    lastUpdated={lastUpdated} 
                    accountDetails={accountDetailsForClient}
                    keyContact={keyContactForClient}
                    itemsInFeedData={itemsInFeedForClient} 
                    theme={currentTheme} 
                    feedStatus={feedStatusForClient} 
                    percentApprovedData={percentApprovedForClient} 
                    storeStatus={storeStatusForClient}
                    currentStatus={currentStatusForClient}
                    onUpdateCurrentStatus={handleUpdateCurrentStatus}
                    storeChanges={storeChangesForClient}
                    budgetStatus={budgetStatusForClient}
                    revolutionLinks={revolutionLinksForClient}
                    googleSearchConsoleData={googleSearchConsoleForClient}
                    googleAnalyticsData={googleAnalyticsForClient}
                    googleAdsData={googleAdsForClient}
                    isModalOpen={isDashboardModalOpen}
                    setIsModalOpen={setIsDashboardModalOpen}
                />
            ) : allData.length > 0 ? (
                <div className="text-center p-8 bg-black/20 rounded-lg"><h2 className="text-2xl font-semibold mb-2">Ready to Go!</h2><p className="text-[var(--color-text-secondary)] text-lg">Please select a client from the dropdown in the header to view their dashboard.</p></div>
            ) : null}
        </>
    );

    const renderMultiClientDashboard = () => (
        <MultiClientDashboard 
            allPerformanceData={allData}
            allAccountDetails={accountDetailsData}
            lastUpdated={lastUpdated}
            theme={currentTheme}
            isModalOpen={isDashboardModalOpen}
            setIsModalOpen={setIsDashboardModalOpen}
            selectedAutoGroup={selectedAutoGroup}
        />
    );
    
    const headerTitle = getHeaderTitle();

    return (
        <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] min-h-screen text-[var(--color-text-primary)] font-sans">
            {signInError && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg p-4 bg-red-800 border border-red-600 text-white rounded-lg shadow-2xl animate-fade-in">
                    <div className="flex justify-between items-start">
                        <div className="flex-grow">
                            <p className="font-bold">Sign-In Failed</p>
                            <p className="text-sm mt-1 whitespace-pre-wrap">{signInError}</p>
                        </div>
                        <button onClick={() => setSignInError(null)} className="p-1 -mr-1 -mt-1 rounded-full hover:bg-red-700 transition-colors flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                </div>
            )}
            {isThemeSelectorOpen && (
                <ThemeSelector
                    themes={themes}
                    currentTheme={currentTheme}
                    setTheme={setCurrentTheme}
                    onClose={() => setIsThemeSelectorOpen(false)}
                />
            )}
             {isConnectionsModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setIsConnectionsModalOpen(false)}>
                    <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-2xl w-full max-w-5xl" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-[var(--color-border)] flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">🔗 Data Connections</h3>
                                 {totalConnections > 0 && (
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-black/20 ${isFetchingAll ? 'text-[var(--color-text-accent)]' : allDataLoadedSuccessfully ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                                        {isFetchingAll && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>}
                                        <span>{completedConnections} / {totalConnections} Loaded</span>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setIsConnectionsModalOpen(false)} aria-label="Close" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                         <div className="p-6 max-h-[70vh] overflow-y-auto">
                           <div className="p-6 pt-2 flex flex-col gap-8">
                                {/* 1. Website Data */}
                                <div className="border-b border-white/20 pb-8">
                                    <h3 className="text-xl font-bold text-[var(--color-accent-secondary)] mb-4">Google Sheets Connection for Website Data</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label htmlFor="p-sheet-id" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Spreadsheet ID</label><input id="p-sheet-id" type="text" value={performanceSheetId} onChange={e => setPerformanceSheetId(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Spreadsheet ID" /></div>
                                        <div><label htmlFor="p-sheet-name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sheet (Tab) Name</label><input id="p-sheet-name" type="text" value={performanceSheetName} onChange={e => setPerformanceSheetName(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Sheet Name" /></div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                                        <button onClick={() => handleFetchPerformanceData()} disabled={isPerformanceLoading} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors">{isPerformanceLoading ? 'Fetching...' : 'Fetch Website Data'}</button>
                                        <div className="flex items-center gap-2"><p className="text-sm text-[var(--color-text-secondary)]">or</p><label htmlFor="csv-upload-perf" className="text-sm text-[var(--color-accent-secondary)] hover:brightness-90 font-semibold cursor-pointer">Upload CSV</label><input id="csv-upload-perf" type="file" accept=".csv" onChange={handlePerformanceFileUpload} className="hidden" /></div>
                                    </div>
                                    {performanceError && <div className="bg-[var(--color-negative-bg)] border border-[var(--color-negative)] text-[var(--color-negative)] p-3 rounded-lg text-sm mt-4" role="alert">{performanceError}</div>}
                                </div>
                                {/* 2. Account Details */}
                                <div className="border-b border-white/20 pb-8">
                                    <h3 className="text-xl font-bold text-[var(--color-accent-secondary)] mb-4">Google Sheets Connection for Account Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label htmlFor="ad-sheet-id" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Spreadsheet ID</label><input id="ad-sheet-id" type="text" value={accountDetailsSheetId} onChange={e => setAccountDetailsSheetId(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Spreadsheet ID" /></div>
                                        <div><label htmlFor="ad-sheet-name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sheet (Tab) Name</label><input id="ad-sheet-name" type="text" value={accountDetailsSheetName} onChange={e => setAccountDetailsSheetName(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Sheet Name" /></div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                                        <button onClick={() => handleFetchAccountDetails()} disabled={isAccountDetailsLoading} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors">{isAccountDetailsLoading ? 'Fetching...' : 'Fetch Account Details'}</button>
                                        <div className="flex items-center gap-2"><p className="text-sm text-[var(--color-text-secondary)]">or</p><label htmlFor="csv-upload-ad" className="text-sm text-[var(--color-accent-secondary)] hover:brightness-90 font-semibold cursor-pointer">Upload CSV</label><input id="csv-upload-ad" type="file" accept=".csv" onChange={handleAccountDetailsFileUpload} className="hidden" /></div>
                                    </div>
                                    {accountDetailsError && <div className="bg-[var(--color-negative-bg)] border border-[var(--color-negative)] text-[var(--color-negative)] p-3 rounded-lg text-sm mt-4" role="alert">{accountDetailsError}</div>}
                                </div>                           </div>
                                {/* 3. Key Contacts */}
                                <div className="border-b border-white/20 pb-8">
                                    <h3 className="text-xl font-bold text-[var(--color-accent-secondary)] mb-4">Google Sheets Connection for Key Contacts</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label htmlFor="kc-sheet-id" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Spreadsheet ID</label><input id="kc-sheet-id" type="text" value={keyContactsSheetId} onChange={e => setKeyContactsSheetId(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Spreadsheet ID" /></div>
                                        <div><label htmlFor="kc-sheet-name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sheet (Tab) Name</label><input id="kc-sheet-name" type="text" value={keyContactsSheetName} onChange={e => setKeyContactsSheetName(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Sheet Name" /></div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                                        <button onClick={() => handleFetchKeyContacts()} disabled={isKeyContactsLoading} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors">{isKeyContactsLoading ? 'Fetching...' : 'Fetch Key Contacts'}</button>
                                        <div className="flex items-center gap-2"><p className="text-sm text-[var(--color-text-secondary)]">or</p><label htmlFor="csv-upload-kc" className="text-sm text-[var(--color-accent-secondary)] hover:brightness-90 font-semibold cursor-pointer">Upload CSV</label><input id="csv-upload-kc" type="file" accept=".csv" onChange={handleKeyContactsFileUpload} className="hidden" /></div>
                                    </div>
                                    {keyContactsError && <div className="bg-[var(--color-negative-bg)] border border-[var(--color-negative)] text-[var(--color-negative)] p-3 rounded-lg text-sm mt-4" role="alert">{keyContactsError}</div>}
                                </div>

                                {/* 4. Items in Feed */}
                                <div className="border-b border-white/20 pb-8">
                                    <h3 className="text-xl font-bold text-[var(--color-accent-secondary)] mb-4">Google Sheets Connection for Items in Feed</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label htmlFor="iif-sheet-id" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Spreadsheet ID</label><input id="iif-sheet-id" type="text" value={itemsInFeedSheetId} onChange={e => setItemsInFeedSheetId(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Spreadsheet ID" /></div>
                                        <div><label htmlFor="iif-sheet-name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sheet (Tab) Name</label><input id="iif-sheet-name" type="text" value={itemsInFeedSheetName} onChange={e => setItemsInFeedSheetName(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Sheet Name" /></div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                                        <button onClick={() => handleFetchItemsInFeedData()} disabled={isItemsInFeedLoading} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors">{isItemsInFeedLoading ? 'Fetching...' : 'Fetch Items in Feed'}</button>
                                        <div className="flex items-center gap-2"><p className="text-sm text-[var(--color-text-secondary)]">or</p><label htmlFor="csv-upload-iif" className="text-sm text-[var(--color-accent-secondary)] hover:brightness-90 font-semibold cursor-pointer">Upload CSV</label><input id="csv-upload-iif" type="file" accept=".csv" onChange={handleItemsInFeedFileUpload} className="hidden" /></div>
                                    </div>
                                    {itemsInFeedError && <div className="bg-[var(--color-negative-bg)] border border-[var(--color-negative)] text-[var(--color-negative)] p-3 rounded-lg text-sm mt-4" role="alert">{itemsInFeedError}</div>}
                                </div>

                                {/* 5. Feed Status */}
                                <div className="border-b border-white/20 pb-8">
                                    <h3 className="text-xl font-bold text-[var(--color-accent-secondary)] mb-4">Google Sheets Connection for Feed Status</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label htmlFor="fs-sheet-id" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Spreadsheet ID</label><input id="fs-sheet-id" type="text" value={feedStatusSheetId} onChange={e => setFeedStatusSheetId(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Spreadsheet ID" /></div>
                                        <div><label htmlFor="fs-sheet-name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sheet (Tab) Name</label><input id="fs-sheet-name" type="text" value={feedStatusSheetName} onChange={e => setFeedStatusSheetName(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Sheet Name" /></div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                                        <button onClick={() => handleFetchFeedStatusData()} disabled={isFeedStatusLoading} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors">{isFeedStatusLoading ? 'Fetching...' : 'Fetch Feed Status'}</button>
                                        <div className="flex items-center gap-2"><p className="text-sm text-[var(--color-text-secondary)]">or</p><label htmlFor="csv-upload-fs" className="text-sm text-[var(--color-accent-secondary)] hover:brightness-90 font-semibold cursor-pointer">Upload CSV</label><input id="csv-upload-fs" type="file" accept=".csv" onChange={handleFeedStatusFileUpload} className="hidden" /></div>
                                    </div>
                                    {feedStatusError && <div className="bg-[var(--color-negative-bg)] border border-[var(--color-negative)] text-[var(--color-negative)] p-3 rounded-lg text-sm mt-4" role="alert">{feedStatusError}</div>}
                                </div>

                                {/* 6. Percent Approved */}
                                <div className="border-b border-white/20 pb-8">
                                    <h3 className="text-xl font-bold text-[var(--color-accent-secondary)] mb-4">Google Sheets Connection for Percent Approved</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label htmlFor="pa-sheet-id" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Spreadsheet ID</label><input id="pa-sheet-id" type="text" value={percentApprovedSheetId} onChange={e => setPercentApprovedSheetId(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Spreadsheet ID" /></div>
                                        <div><label htmlFor="pa-sheet-name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sheet (Tab) Name</label><input id="pa-sheet-name" type="text" value={percentApprovedSheetName} onChange={e => setPercentApprovedSheetName(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Sheet Name" /></div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                                        <button onClick={() => handleFetchPercentApprovedData()} disabled={isPercentApprovedLoading} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors">{isPercentApprovedLoading ? 'Fetching...' : 'Fetch Percent Approved'}</button>
                                        <div className="flex items-center gap-2"><p className="text-sm text-[var(--color-text-secondary)]">or</p><label htmlFor="csv-upload-pa" className="text-sm text-[var(--color-accent-secondary)] hover:brightness-90 font-semibold cursor-pointer">Upload CSV</label><input id="csv-upload-pa" type="file" accept=".csv" onChange={handlePercentApprovedFileUpload} className="hidden" /></div>
                                    </div>
                                    {percentApprovedError && <div className="bg-[var(--color-negative-bg)] border border-[var(--color-negative)] text-[var(--color-negative)] p-3 rounded-lg text-sm mt-4" role="alert">{percentApprovedError}</div>}
                                </div>

                                {/* 7. Store Status */}
                                <div className="border-b border-white/20 pb-8">
                                    <h3 className="text-xl font-bold text-[var(--color-accent-secondary)] mb-4">Google Sheets Connection for Store Status</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label htmlFor="ss-sheet-id" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Spreadsheet ID</label><input id="ss-sheet-id" type="text" value={storeStatusSheetId} onChange={e => setStoreStatusSheetId(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Spreadsheet ID" /></div>
                                        <div><label htmlFor="ss-sheet-name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sheet (Tab) Name</label><input id="ss-sheet-name" type="text" value={storeStatusSheetName} onChange={e => setStoreStatusSheetName(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Sheet Name" /></div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                                        <button onClick={() => handleFetchStoreStatusData()} disabled={isStoreStatusLoading} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors">{isStoreStatusLoading ? 'Fetching...' : 'Fetch Store Status'}</button>
                                        <div className="flex items-center gap-2"><p className="text-sm text-[var(--color-text-secondary)]">or</p><label htmlFor="csv-upload-ss" className="text-sm text-[var(--color-accent-secondary)] hover:brightness-90 font-semibold cursor-pointer">Upload CSV</label><input id="csv-upload-ss" type="file" accept=".csv" onChange={handleStoreStatusFileUpload} className="hidden" /></div>
                                    </div>
                                    {storeStatusError && <div className="bg-[var(--color-negative-bg)] border border-[var(--color-negative)] text-[var(--color-negative)] p-3 rounded-lg text-sm mt-4" role="alert">{storeStatusError}</div>}
                                </div>

                                {/* 8. Store Changes */}
                                <div className="border-b border-white/20 pb-8">
                                    <h3 className="text-xl font-bold text-[var(--color-accent-secondary)] mb-4">Google Sheets Connection for Store Changes</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label htmlFor="sc-sheet-id" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Spreadsheet ID</label><input id="sc-sheet-id" type="text" value={storeChangesSheetId} onChange={e => setStoreChangesSheetId(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Spreadsheet ID" /></div>
                                        <div><label htmlFor="sc-sheet-name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sheet (Tab) Name</label><input id="sc-sheet-name" type="text" value={storeChangesSheetName} onChange={e => setStoreChangesSheetName(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Sheet Name" /></div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                                        <button onClick={() => handleFetchStoreChangesData()} disabled={isStoreChangesLoading} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors">{isStoreChangesLoading ? 'Fetching...' : 'Fetch Store Changes'}</button>
                                        <div className="flex items-center gap-2"><p className="text-sm text-[var(--color-text-secondary)]">or</p><label htmlFor="csv-upload-sc" className="text-sm text-[var(--color-accent-secondary)] hover:brightness-90 font-semibold cursor-pointer">Upload CSV</label><input id="csv-upload-sc" type="file" accept=".csv" onChange={handleStoreChangesFileUpload} className="hidden" /></div>
                                    </div>
                                    {storeChangesError && <div className="bg-[var(--color-negative-bg)] border border-[var(--color-negative)] text-[var(--color-negative)] p-3 rounded-lg text-sm mt-4" role="alert">{storeChangesError}</div>}
                                </div>

                                {/* 9. Budget Status */}
                                <div className="border-b border-white/20 pb-8">
                                    <h3 className="text-xl font-bold text-[var(--color-accent-secondary)] mb-4">Google Sheets Connection for Budget Status</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label htmlFor="bs-sheet-id" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Spreadsheet ID</label><input id="bs-sheet-id" type="text" value={budgetStatusSheetId} onChange={e => setBudgetStatusSheetId(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Spreadsheet ID" /></div>
                                        <div><label htmlFor="bs-sheet-name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sheet (Tab) Name</label><input id="bs-sheet-name" type="text" value={budgetStatusSheetName} onChange={e => setBudgetStatusSheetName(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Sheet Name" /></div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                                        <button onClick={() => handleFetchBudgetStatusData()} disabled={isBudgetStatusLoading} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors">{isBudgetStatusLoading ? 'Fetching...' : 'Fetch Budget Status'}</button>
                                        <div className="flex items-center gap-2"><p className="text-sm text-[var(--color-text-secondary)]">or</p><label htmlFor="csv-upload-bs" className="text-sm text-[var(--color-accent-secondary)] hover:brightness-90 font-semibold cursor-pointer">Upload CSV</label><input id="csv-upload-bs" type="file" accept=".csv" onChange={handleBudgetStatusFileUpload} className="hidden" /></div>
                                    </div>
                                    {budgetStatusError && <div className="bg-[var(--color-negative-bg)] border border-[var(--color-negative)] text-[var(--color-negative)] p-3 rounded-lg text-sm mt-4" role="alert">{budgetStatusError}</div>}
                                </div>

                                {/* 10. Revolution Links */}
                                <div className="border-b border-white/20 pb-8">
                                    <h3 className="text-xl font-bold text-[var(--color-accent-secondary)] mb-4">Google Sheets Connection for Revolution Links</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label htmlFor="rl-sheet-id" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Spreadsheet ID</label><input id="rl-sheet-id" type="text" value={revolutionLinksSheetId} onChange={e => setRevolutionLinksSheetId(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Spreadsheet ID" /></div>
                                        <div><label htmlFor="rl-sheet-name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sheet (Tab) Name</label><input id="rl-sheet-name" type="text" value={revolutionLinksSheetName} onChange={e => setRevolutionLinksSheetName(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Sheet Name" /></div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                                        <button onClick={() => handleFetchRevolutionLinksData()} disabled={isRevolutionLinksLoading} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors">{isRevolutionLinksLoading ? 'Fetching...' : 'Fetch Revolution Links'}</button>
                                        <div className="flex items-center gap-2"><p className="text-sm text-[var(--color-text-secondary)]">or</p><label htmlFor="csv-upload-rl" className="text-sm text-[var(--color-accent-secondary)] hover:brightness-90 font-semibold cursor-pointer">Upload CSV</label><input id="csv-upload-rl" type="file" accept=".csv" onChange={handleRevolutionLinksFileUpload} className="hidden" /></div>
                                    </div>
                                    {revolutionLinksError && <div className="bg-[var(--color-negative-bg)] border border-[var(--color-negative)] text-[var(--color-negative)] p-3 rounded-lg text-sm mt-4" role="alert">{revolutionLinksError}</div>}
                                </div>

                                {/* 11. Google Search Console */}
                                <div className="border-b border-white/20 pb-8">
                                    <h3 className="text-xl font-bold text-[var(--color-accent-secondary)] mb-4">Google Sheets Connection for Google Search Console</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label htmlFor="gsc-sheet-id" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Spreadsheet ID</label><input id="gsc-sheet-id" type="text" value={googleSearchConsoleSheetId} onChange={e => setGoogleSearchConsoleSheetId(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Spreadsheet ID" /></div>
                                        <div><label htmlFor="gsc-sheet-name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sheet (Tab) Name</label><input id="gsc-sheet-name" type="text" value={googleSearchConsoleSheetName} onChange={e => setGoogleSearchConsoleSheetName(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Sheet Name" /></div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                                        <button onClick={() => handleFetchGoogleSearchConsoleData()} disabled={isGoogleSearchConsoleLoading} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors">{isGoogleSearchConsoleLoading ? 'Fetching...' : 'Fetch Google Search Console'}</button>
                                        <div className="flex items-center gap-2"><p className="text-sm text-[var(--color-text-secondary)]">or</p><label htmlFor="csv-upload-gsc" className="text-sm text-[var(--color-accent-secondary)] hover:brightness-90 font-semibold cursor-pointer">Upload CSV</label><input id="csv-upload-gsc" type="file" accept=".csv" onChange={handleGoogleSearchConsoleFileUpload} className="hidden" /></div>
                                    </div>
                                    {googleSearchConsoleError && <div className="bg-[var(--color-negative-bg)] border border-[var(--color-negative)] text-[var(--color-negative)] p-3 rounded-lg text-sm mt-4" role="alert">{googleSearchConsoleError}</div>}
                                </div>

                                {/* 12. Google Analytics */}
                                <div className="border-b border-white/20 pb-8">
                                    <h3 className="text-xl font-bold text-[var(--color-accent-secondary)] mb-4">Google Sheets Connection for Google Analytics</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label htmlFor="ga-sheet-id" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Spreadsheet ID</label><input id="ga-sheet-id" type="text" value={googleAnalyticsSheetId} onChange={e => setGoogleAnalyticsSheetId(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Spreadsheet ID" /></div>
                                        <div><label htmlFor="ga-sheet-name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sheet (Tab) Name</label><input id="ga-sheet-name" type="text" value={googleAnalyticsSheetName} onChange={e => setGoogleAnalyticsSheetName(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Sheet Name" /></div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                                        <button onClick={() => handleFetchGoogleAnalyticsData()} disabled={isGoogleAnalyticsLoading} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors">{isGoogleAnalyticsLoading ? 'Fetching...' : 'Fetch Google Analytics'}</button>
                                        <div className="flex items-center gap-2"><p className="text-sm text-[var(--color-text-secondary)]">or</p><label htmlFor="csv-upload-ga" className="text-sm text-[var(--color-accent-secondary)] hover:brightness-90 font-semibold cursor-pointer">Upload CSV</label><input id="csv-upload-ga" type="file" accept=".csv" onChange={handleGoogleAnalyticsFileUpload} className="hidden" /></div>
                                    </div>
                                    {googleAnalyticsError && <div className="bg-[var(--color-negative-bg)] border border-[var(--color-negative)] text-[var(--color-negative)] p-3 rounded-lg text-sm mt-4" role="alert">{googleAnalyticsError}</div>}
                                </div>

                                {/* 13. Google Ads */}
                                <div className="border-b border-white/20 pb-8">
                                    <h3 className="text-xl font-bold text-[var(--color-accent-secondary)] mb-4">Google Sheets Connection for Google Ads</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label htmlFor="gads-sheet-id" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Spreadsheet ID</label><input id="gads-sheet-id" type="text" value={googleAdsSheetId} onChange={e => setGoogleAdsSheetId(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Spreadsheet ID" /></div>
                                        <div><label htmlFor="gads-sheet-name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sheet (Tab) Name</label><input id="gads-sheet-name" type="text" value={googleAdsSheetName} onChange={e => setGoogleAdsSheetName(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Enter Sheet Name" /></div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                                        <button onClick={() => handleFetchGoogleAdsData()} disabled={isGoogleAdsLoading} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors">{isGoogleAdsLoading ? 'Fetching...' : 'Fetch Google Ads'}</button>
                                        <div className="flex items-center gap-2"><p className="text-sm text-[var(--color-text-secondary)]">or</p><label htmlFor="csv-upload-gads" className="text-sm text-[var(--color-accent-secondary)] hover:brightness-90 font-semibold cursor-pointer">Upload CSV</label><input id="csv-upload-gads" type="file" accept=".csv" onChange={handleGoogleAdsFileUpload} className="hidden" /></div>
                                    </div>
                                    {googleAdsError && <div className="bg-[var(--color-negative-bg)] border border-[var(--color-negative)] text-[var(--color-negative)] p-3 rounded-lg text-sm mt-4" role="alert">{googleAdsError}</div>}
                                </div>

                                {/* 14. Users Data */}
                                <div className="pb-8">
                                    <h3 className="text-xl font-bold text-[var(--color-accent-secondary)] mb-4">Google Sheets Connection for Users Data</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Spreadsheet ID</label><input type="text" value={performanceSheetId} readOnly className="w-full bg-[var(--color-input-bg)] opacity-50 border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Uses main Website Data sheet ID" /></div>
                                        <div><label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sheet (Tab) Name</label><input type="text" value="Users" readOnly className="w-full bg-[var(--color-input-bg)] opacity-50 border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" placeholder="Fixed: Users" /></div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                                        <button onClick={() => handleFetchUsersData()} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors">Fetch Users Data</button>
                                        <p className="text-sm text-[var(--color-text-secondary)]">Note: Uses "Users" tab from main Website Data spreadsheet</p>
                                    </div>
                                </div>                        </div>
                        <div className="p-4 bg-black/20 rounded-b-xl flex justify-end">
                            <button onClick={() => setIsConnectionsModalOpen(false)} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-2 px-6 rounded-lg transition-colors">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <header className="sticky-header bg-gradient-to-r from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)]">
                <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-20">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        {currentPath !== '/' && (
                            <button
                                onClick={() => navigate(-1)}
                                className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                            >
                                &larr; Back
                            </button>
                        )}
                         {headerTitle && (
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-secondary)] text-transparent bg-clip-text truncate">
                                {headerTitle}
                            </h1>
                         )}
                    </div>
                        {/* Contact Info for Client Dashboard */}
                        {currentPath === TOOL_ROUTES.client && selectedClient && keyContactForClient && (
                            <div className="flex items-center justify-center gap-3 text-sm mx-4">
                                {keyContactForClient["PPC"] && (
                                    <span className="bg-[var(--color-card-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)] px-3 py-1.5 rounded-lg font-medium shadow-sm">
                                        {keyContactForClient["PPC"]}
                                    </span>
                                )}
                                {keyContactForClient["PDM"] && (
                                    <span className="bg-[var(--color-card-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)] px-3 py-1.5 rounded-lg font-medium shadow-sm">
                                        {keyContactForClient["PDM"]}
                                    </span>
                                )}
                                {keyContactForClient["Hubspot Contact Name"] && (
                                    <span className="bg-[var(--color-card-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)] px-3 py-1.5 rounded-lg font-medium shadow-sm">
                                        {keyContactForClient["Hubspot Contact Name"]}
                                    </span>
                                )}
                                {keyContactForClient["Hubspot Contact Phone"] && (
                                    <span className="bg-[var(--color-card-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)] px-3 py-1.5 rounded-lg font-medium shadow-sm">
                                        {keyContactForClient["Hubspot Contact Phone"]}
                                    </span>
                                )}
                            </div>
                        )}


                    <div className="flex items-center gap-2">
                        {/* Conditionally render client/group selectors based on the active route */}
                        {(currentPath === TOOL_ROUTES.client || currentPath === TOOL_ROUTES.brand_comparison) && clients.length > 0 && (
                                <div className="relative" ref={clientSelectorRef}>
                                    <button
                                        onClick={() => setIsClientDropdownOpen(prev => !prev)}
                                        className="bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5 w-52 text-left flex justify-between items-center hover:border-[var(--color-accent)] transition-colors"
                                    >
                                        <span className="truncate">
                                            {currentPath === TOOL_ROUTES.brand_comparison 
                                                ? (toolStates.brand_comparison.selectedClientName || 'Select Client') 
                                                : (selectedClient || 'Select a Client')}
                                        </span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-[var(--color-text-secondary)] transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                    {isClientDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-lg">
                                            <div className="p-2">
                                                <input
                                                    type="text"
                                                    value={clientSearchQuery}
                                                    onChange={e => setClientSearchQuery(e.target.value)}
                                                    onFocus={() => setIsClientDropdownOpen(true)}
                                                    placeholder="Search clients..."
                                                    className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2"
                                                    autoFocus
                                                />
                                            </div>
                                            <ul className="max-h-[28rem] overflow-y-auto">
                                                {(() => {
                                                    let listToRender = filteredClients;
                                                    // If Brand Comparison is active and a brand is selected, filter the list
                                                    if (currentPath === TOOL_ROUTES.brand_comparison && toolStates.brand_comparison.selectedBrand) {
                                                        const brandClients = accountDetailsData
                                                            .filter(c => c.Brands?.includes(toolStates.brand_comparison.selectedBrand))
                                                            .map(c => c.ClientName);
                                                        listToRender = listToRender.filter(c => brandClients.includes(c));
                                                    }
                                                    
                                                    return listToRender.length > 0 ? (
                                                        listToRender.map(client => (
                                                            <li
                                                                key={client}
                                                                onClick={() => {
                                                                    if (currentPath === TOOL_ROUTES.brand_comparison) {
                                                                        handleToolStateChange('brand_comparison', { selectedClientName: client });
                                                                    } else {
                                                                        updateSelectedClient(client);
                                                                    }
                                                                    setIsClientDropdownOpen(false);
                                                                }}
                                                                className="px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-black/30 cursor-pointer"
                                                            >
                                                                {client}
                                                            </li>
                                                        ))
                                                    ) : (
                                                        <li className="px-4 py-2 text-sm text-[var(--color-text-secondary)]">No clients found.</li>
                                                    );
                                                })()}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                        )}

                        {currentPath === TOOL_ROUTES.multi_client && autoGroups.length > 0 && (
                            <div className="relative" ref={groupSelectorRef}>
                                 <button
                                    onClick={() => setIsGroupDropdownOpen(prev => !prev)}
                                    className="bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5 w-52 text-left flex justify-between items-center hover:border-[var(--color-accent)] transition-colors"
                                >
                                    <span className="truncate">{selectedAutoGroup || 'Select an Auto Group'}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-[var(--color-text-secondary)] transition-transform ${isGroupDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </button>
                                {isGroupDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-lg">
                                        <div className="p-2">
                                            <input
                                                type="text"
                                                value={groupSearchQuery}
                                                onChange={e => setGroupSearchQuery(e.target.value)}
                                                onFocus={() => setIsGroupDropdownOpen(true)}
                                                placeholder="Search groups..."
                                                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2"
                                                autoFocus
                                            />
                                        </div>
                                        <ul className="max-h-[28rem] overflow-y-auto">
                                            {filteredGroups.length > 0 ? (
                                                filteredGroups.map(group => (
                                                    <li
                                                        key={group}
                                                        onClick={() => {
                                                            updateSelectedAutoGroup(group);
                                                            setIsGroupDropdownOpen(false);
                                                            setGroupSearchQuery('');
                                                        }}
                                                        className="px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-black/30 cursor-pointer"
                                                    >
                                                        {group}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="px-4 py-2 text-sm text-[var(--color-text-secondary)]">No groups found.</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                         {currentPath !== '/' && (
                            <button
                                onClick={handleBackToTools}
                                className="bg-slate-600 hover:bg-slate-500 text-white p-2.5 rounded-lg transition-colors"
                                aria-label="Back to Main Menu"
                                title="Back to Main Menu"
                            >
                               <HomeIcon />
                            </button>
                        )}
                        <div className="relative">
                             <button
                                onClick={handleToggleDashboards}
                                className="bg-slate-600 hover:bg-slate-500 text-white p-2.5 rounded-lg transition-colors"
                                aria-label="Open Dashboards Menu"
                                title="Dashboards"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                   <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            </button>
                            {isDashboardsOpen && <DashboardsPopover onClose={handleToggleDashboards} onSelectTool={handleSelectToolAndClose} quickLinks={quickLinks} onToggleQuickLink={handleToggleQuickLink} />}
                        </div>
                        <div className="relative">
                            <button
                                onClick={handleToggleTools}
                                className="bg-slate-600 hover:bg-slate-500 text-white p-2.5 rounded-lg transition-colors"
                                aria-label="Open Tools Menu"
                                title="Tools"
                            >
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            </button>
                            {isToolsOpen && <ToolsPopover onClose={handleToggleTools} onSelectTool={handleSelectToolAndClose} quickLinks={quickLinks} onToggleQuickLink={handleToggleQuickLink} />}
                        </div>
                        
                        <button
                            onClick={isSignedIn ? handleSignOut : handleSignIn}
                            disabled={!tokenClient}
                            className={`bg-slate-600 hover:bg-slate-500 p-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                isSignedIn 
                                    ? (syncStatus === 'error' ? 'text-red-400' : 'text-green-400') 
                                    : 'text-red-400'
                            }`}
                            title={
                                !tokenClient ? 'Initializing Google Sign-In...' : 
                                (!isSignedIn ? 'Sign in with Google to enable write access' : 
                                    (syncStatus === 'syncing' ? 'Saving settings...' : 
                                     syncStatus === 'success' ? 'Settings saved to Drive' : 
                                     syncStatus === 'error' ? 'Error saving settings' : 
                                     'Google Account Connected (Sign Out)')
                                )
                            }
                        >
                            {isSignedIn && syncStatus === 'syncing' ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : isSignedIn && syncStatus === 'success' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 19">
                                    <path fillRule="evenodd" d="M8.842 18.083a8.8 8.8 0 0 1-8.65-8.948 8.841 8.841 0 0 1 8.8-8.652h.153a8.464 8.464 0 0 1 5.7 2.257l-2.193 2.038A5.27 5.27 0 0 0 9.09 3.4a5.882 5.882 0 0 0-.2 11.76h.124a5.091 5.091 0 0 0 5.248-4.057L14.3 11H9V8h8.342A8.8 8.8 0 0 1 8.842 18.083Z" clipRule="evenodd"/>
                                </svg>
                            )}
                        </button>
                        <div className="relative">
                           <button onClick={handleToggleAlerts} className="bg-slate-600 hover:bg-slate-500 text-white p-2.5 rounded-lg transition-colors relative" aria-label={`View notifications (${alertCount} available)`} title="Notifications">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3-3z" /></svg>
                                {alertCount > 0 && (
                                     <span className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white ${alertsSeen ? 'bg-blue-500' : 'bg-[var(--color-negative)]'}`}>
                                        {alertCount}
                                     </span>
                                )}
                           </button>
                            {isAlertsOpen && <AlertsPopover onClose={handleToggleAlerts} closedStores={closedStores} recentChanges={recentChanges} oldFeeds={oldFeeds} onSelectClient={handleSelectClientFromToolView} />}
                        </div>
                        <button onClick={() => setIsConnectionsModalOpen(true)} className="bg-slate-600 hover:bg-slate-500 text-white p-2.5 rounded-lg transition-colors" title="Data Connections"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg></button>
                        <button onClick={() => setIsThemeSelectorOpen(true)} className="bg-slate-600 hover:bg-slate-500 text-white p-2.5 rounded-lg transition-colors" title="Change Theme"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                        <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                <Routes>
                    <Route path="/" element={
                        <WelcomeScreen 
                            onSelectTool={handleSelectTool} 
                            allPerformanceData={allData} 
                            allAccountDetails={accountDetailsData}
                            quickLinks={quickLinks}
                            setQuickLinks={setQuickLinks}
                            userName={loggedInUserName}
                        />
                    } />
                    <Route path="/dashboards/client" element={renderClientDashboard()} />
                    <Route path="/dashboards/multi-client" element={renderMultiClientDashboard()} />
                    <Route path="/dashboards/manager" element={<ManagerDashboard allPerformanceData={allData} allAccountDetails={accountDetailsData} allKeyContactsData={keyContactsData} onSelectClient={handleSelectClientFromToolView} theme={currentTheme} toolState={toolStates.manager_dashboard} onStateChange={(newState) => handleToolStateChange('manager_dashboard', newState)} />} />
                    
                    {/* Analysis Tools */}
                    <Route path="/tools/analysis/budget-status" element={<BudgetStatusTool allAccountDetails={accountDetailsData} allBudgetStatusData={budgetStatusData} allKeyContactsData={keyContactsData} onSelectClient={handleSelectClientFromToolView} toolState={toolStates.budget_status} onStateChange={(newState) => handleToolStateChange('budget_status', newState)} />} />
                    <Route path="/tools/analysis/revenue" element={<MetricComparisonTool allPerformanceData={allData} allAccountDetails={accountDetailsData} allKeyContactsData={keyContactsData} onSelectClient={handleSelectClientFromToolView} theme={currentTheme} toolState={toolStates.revenue_tool} onStateChange={(newState) => handleToolStateChange('revenue_tool', newState)} />} />
                    <Route path="/tools/analysis/brand-comparison" element={<BrandComparisonTool allPerformanceData={allData} allAccountDetails={accountDetailsData} allGoogleAdsData={googleAdsData} allBudgetStatusData={budgetStatusData} theme={currentTheme} allGoogleAnalyticsData={googleAnalyticsData} toolState={toolStates.brand_comparison} onStateChange={(newState) => handleToolStateChange('brand_comparison', newState)} />} />
                    <Route path="/tools/analysis/feed-health" element={<FeedHealthTool allAccountDetails={accountDetailsData} allFeedStatusData={feedStatusData} allPercentApprovedData={percentApprovedData} allRevolutionLinksData={revolutionLinksData} allItemsInFeedData={itemsInFeedData} theme={currentTheme} toolState={toolStates.feed_health} onStateChange={(newState) => handleToolStateChange('feed_health', newState)} />} />
                    <Route path="/tools/analysis/medium-comparison" element={<MediumComparisonTool allGoogleAnalyticsData={googleAnalyticsData} theme={currentTheme} allAccountDetails={accountDetailsData} toolState={toolStates.medium_comparison} onStateChange={(newState) => handleToolStateChange('medium_comparison', newState)} />} />
                    
                    {/* Workflow Tools */}
                    <Route path="/tools/workflow/seo-titles" element={<CustomSeoTitlesTool allAccountDetails={accountDetailsData} allRevolutionLinksData={revolutionLinksData} gapiClient={gapiClient} isSignedIn={isSignedIn} mainSheetId={performanceSheetId} toolState={toolStates.custom_titles} onStateChange={(newState) => handleToolStateChange('custom_titles', newState)} />} />
                    <Route path="/tools/workflow/bulk-url" element={<BulkUrlOpenerTool allAccountDetails={accountDetailsData} allRevolutionLinksData={revolutionLinksData} toolState={toolStates.bulk_url_opener} onStateChange={(newState) => handleToolStateChange('bulk_url_opener', newState)} />} />
                    <Route path="/tools/workflow/strategy-notes" element={<StrategyNotesTool allKeyContactsData={keyContactsData} onSelectClient={handleSelectClientFromToolView} toolState={toolStates.strategy_notes} onStateChange={(newState) => handleToolStateChange('strategy_notes', newState)} gapiClient={gapiClient} isSignedIn={isSignedIn} notesData={strategyNotesData} isLoading={isStrategyNotesLoading} error={strategyNotesError} onRefresh={handleFetchStrategyNotes} onUpdateNoteLocally={handleUpdateStrategyNoteLocally} />} />
                    <Route path="/tools/workflow/google-ads-robot" element={<GoogleAdsRobotTool allAccountDetails={accountDetailsData} gapiClient={gapiClient} isSignedIn={isSignedIn} toolState={toolStates.google_ads_robot} onStateChange={(newState) => handleToolStateChange('google_ads_robot', newState)} />} />
                    <Route path="/tools/workflow/polaris-msrp" element={<PolarisMSRPUpdater gapiClient={gapiClient} isSignedIn={isSignedIn} />} />
                    <Route path="/tools/workflow/tag-creator" element={<TagCreatorTool allAccountDetails={accountDetailsData} allRevolutionLinksData={revolutionLinksData} toolState={toolStates.tag_creator} onStateChange={(newState) => handleToolStateChange('tag_creator', newState)} />} />
                    <Route path="/tools/workflow/search-page-creator" element={<SearchPageCreatorTool allAccountDetails={accountDetailsData} allRevolutionLinksData={revolutionLinksData} toolState={toolStates.search_page_creator} onStateChange={(newState) => handleToolStateChange('search_page_creator', newState)} />} />
                    <Route path="/tools/workflow/free-shipping" element={<FreeShippingTool allAccountDetails={accountDetailsData} allRevolutionLinksData={revolutionLinksData} toolState={toolStates.free_shipping_tool} onStateChange={(newState) => handleToolStateChange('free_shipping_tool', newState)} />} />
                    <Route path="/tools/workflow/category-page-creator" element={<CategoryPageCreatorTool allAccountDetails={accountDetailsData} allRevolutionLinksData={revolutionLinksData} toolState={toolStates.category_page_creator} onStateChange={(newState) => handleToolStateChange('category_page_creator', newState)} />} />
                    <Route path="/tools/workflow/product-availability" element={<ProductAvailabilityTool allAccountDetails={accountDetailsData} allRevolutionLinksData={revolutionLinksData} toolState={toolStates.product_availability} onStateChange={(newState) => handleToolStateChange('product_availability', newState)} />} />
                    <Route path="/tools/workflow/file-uploader" element={<FileUploaderTool gapiClient={gapiClient} />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    );
};

export default App;
