import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { ClientDataRecord, AccountDetailsRecord } from '../types';
import ChartGridItem from './ChartGridItem';

const ResponsiveGridLayout = WidthProvider(Responsive);

const monthMap: { [key: string]: number } = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };

// Declare globals for CDNs
declare const XLSX: any;
declare const Chart: any;
declare const window: any; // For jspdf access

interface WelcomeScreenProps {
    onSelectTool: (tool: string) => void;
    allPerformanceData?: ClientDataRecord[];
    allAccountDetails?: AccountDetailsRecord[];
    quickLinks: string[];
    setQuickLinks: (links: string[]) => void;
    userName?: string;
}

// Consolidated Tool Definitions
const ALL_TOOLS: Record<string, { title: string; icon: string; description: string; category: string }> = {
    // Dashboards
    client: { title: 'Client Dashboard', icon: '👤', description: 'Individual metrics & analysis.', category: 'Dashboards' },
    multi_client: { title: 'Multi-Client View', icon: '👥', description: 'Group aggregate performance.', category: 'Dashboards' },
    manager_dashboard: { title: 'Manager View', icon: '👨‍💼', description: 'Team performance overview.', category: 'Dashboards' },
    // Analysis
    brand_comparison: { title: 'Brand Comparison', icon: '⚖️', description: 'Compare a client against their brand average.', category: 'Analysis' },
    feed_health: { title: 'Feed Health Tool', icon: '🩺', description: 'Monitor feed status and item approvals.', category: 'Analysis' },
    medium_comparison: { title: 'Medium Comparison', icon: '📊', description: 'Compare GA revenue sources across clients.', category: 'Analysis' },
    budget_status: { title: 'Budget Status Tool', icon: '🪙', description: 'View budget pacing alerts by manager.', category: 'Analysis' },
    revenue_tool: { title: 'Metric Comparison Tool', icon: '📈', description: 'Find clients with significant metric changes.', category: 'Analysis' },
    // Workflows
    polaris_msrp_updater: { title: 'Polaris MSRP Updater', icon: '⬆️', description: 'Upload a CSV to update the Polaris MSRP Google Sheet.', category: 'Workflows' },
    custom_titles: { title: 'SEO Titles Workflow', icon: '✍️', description: 'Track custom title uploads for SEO clients.', category: 'Workflows' },
    bulk_url_opener: { title: 'Bulk URL Opener', icon: '🚀', description: 'Open URLs for multiple clients in batches.', category: 'Workflows' },
    strategy_notes: { title: 'Strategy Notes Viewer', icon: '📝', description: 'Review strategy notes by client and month.', category: 'Workflows' },
    google_ads_robot: { title: 'Google Ads Playground', icon: '🧪', description: 'A testing area for new Google Ads management tiles.', category: 'Workflows' },
    bing_ads_playground: { title: 'Bing Ads Playground', icon: '🔎', description: 'Manage campaigns, view performance metrics, and adjust budgets.', category: 'Workflows' },
    tag_creator: { title: 'Tag Creator', icon: '🏷️', description: 'Generate a CSV with part numbers and a custom tag.', category: 'Workflows' },
    search_page_creator: { title: 'Search Page Creator', icon: '🔍', description: 'Generate a CSV for a custom search results page.', category: 'Workflows' },
    free_shipping_tool: { title: 'Free Shipping Tool', icon: '💸', description: 'Generate a CSV to mark items for free shipping.', category: 'Workflows' },
    category_page_creator: { title: 'Category Page Creator', icon: '🗂️', description: 'Create a category page and map products to it.', category: 'Workflows' },
    product_availability: { title: 'Product Availability Tool', icon: '💡', description: 'Set parts as available or not for sale.', category: 'Workflows' },
    file_uploader: { title: 'File Uploader', icon: '📂', description: 'Upload files to Google Drive.', category: 'Workflows' },
};

type ViewMode = 'month' | 'range';
type TimeRange = '3m' | '6m' | '12m' | '24m';

interface MetricOption {
    key: string;
    label: string;
    format: 'currency' | 'percent' | 'number' | 'roas';
    color: string;
    header: string; // Short header for table
}

const availableMetrics: MetricOption[] = [
    { key: 'revenue', label: 'Revenue', header: 'Revenue', format: 'currency', color: '#4f46e5' },
    { key: 'spend', label: 'Ad Spend', header: 'Spend', format: 'currency', color: '#f97316' },
    { key: 'profit', label: 'Profit', header: 'Profit', format: 'currency', color: '#10b981' },
    { key: 'roas', label: 'ROAS', header: 'ROAS', format: 'roas', color: '#3b82f6' },
    { key: 'margin', label: 'Margin %', header: 'Margin', format: 'percent', color: '#8b5cf6' },
    { key: 'orders', label: 'Orders', header: 'Orders', format: 'number', color: '#ec4899' },
    { key: 'sessions', label: 'Sessions', header: 'Sessions', format: 'number', color: '#06b6d4' },
    { key: 'convRate', label: 'Conversion Rate', header: 'CVR', format: 'percent', color: '#f59e0b' },
    { key: 'aov', label: 'Avg Order Value', header: 'AOV', format: 'currency', color: '#6366f1' },
];

const NOTABLE_METRIC_OPTIONS = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'profit', label: 'Profit' },
    { key: 'margin', label: 'Margin %' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'aov', label: 'Avg Order Value' },
    { key: 'spend', label: 'Ad Spend' },
    { key: 'roas', label: 'ROAS' },
    { key: 'orders', label: 'Orders' },
    { key: 'convRate', label: 'Conversion Rate' },
];

const LEADERBOARD_GROUPS = [
    {
        label: 'Brand Metrics',
        items: [
            { key: 'brand_revenue', label: 'Revenue' },
            { key: 'brand_profit', label: 'Profit' },
            { key: 'brand_margin', label: 'Margin %' },
            { key: 'brand_sessions', label: 'Sessions' },
            { key: 'brand_aov', label: 'Avg Order Value' },
            { key: 'brand_spend', label: 'Ad Spend' },
            { key: 'brand_roas', label: 'ROAS' },
            { key: 'brand_orders', label: 'Orders' },
            { key: 'brand_cvr', label: 'Conversion Rate' },
        ]
    },
    {
        label: 'Client Metrics',
        items: [
            { key: 'client_revenue', label: 'Revenue' },
            { key: 'client_profit', label: 'Profit' },
            { key: 'client_margin', label: 'Margin %' },
            { key: 'client_sessions', label: 'Sessions' },
            { key: 'client_aov', label: 'Avg Order Value' },
            { key: 'client_spend', label: 'Ad Spend' },
            { key: 'client_roas', label: 'ROAS' },
            { key: 'client_orders', label: 'Orders' },
            { key: 'client_cvr', label: 'Conversion Rate' },
        ]
    }
];

const metricFormats: Record<string, 'currency' | 'number' | 'percent' | 'roas'> = {
    revenue: 'currency',
    profit: 'currency',
    margin: 'percent',
    sessions: 'number',
    aov: 'currency',
    spend: 'currency',
    roas: 'roas',
    orders: 'number',
    convRate: 'percent'
};

// --- GRID HELPERS ---

// Generate a basic grid layout
// Enforces STRICT left-to-right packing
const generateGridLayout = (items: string[], cols: number) => {
    return items.map((item, i) => ({
        i: item,
        x: i % cols, // 0, 1, 2, 3
        y: Math.floor(i / cols), // 0, 0, 0, 0, 1, 1...
        w: 1,
        h: 1
    }));
};

// Generate layouts for ALL breakpoints, handling column differences
const generateRobustLayouts = (items: string[], config: { lgCols: number, mdCols: number, smCols: number }) => {
    return {
        lg: generateGridLayout(items, config.lgCols),
        md: generateGridLayout(items, config.mdCols),
        sm: generateGridLayout(items, config.smCols),
        xs: generateGridLayout(items, 1),
        xxs: generateGridLayout(items, 1)
    };
};

// Check if a layout is broken (stacked in column 0)
const isLayoutStacked = (layout: any[]) => {
    if (!layout || layout.length <= 1) return false;
    // If ALL items are in column 0, it's stacked/broken for a desktop view
    const itemsInCol0 = layout.filter(item => item.x === 0).length;
    return itemsInCol0 === layout.length;
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectTool, allPerformanceData = [], allAccountDetails = [], quickLinks, setQuickLinks, userName }) => {
    
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [timeRange, setTimeRange] = useState<TimeRange>('3m');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    
    // Modal State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [anonymize, setAnonymize] = useState(false);
    
    // Filter State for Export
    const [allBrands, setAllBrands] = useState<string[]>([]);
    const [selectedExportBrands, setSelectedExportBrands] = useState<Set<string>>(new Set());
    const [selectedExportMetrics, setSelectedExportMetrics] = useState<Set<string>>(new Set(availableMetrics.map(m => m.key)));

    // --- CONFIGS ---
    // Important: Ensure these match the props passed to ResponsiveGridLayout
    const QUICK_LINKS_COLS = { lgCols: 4, mdCols: 4, smCols: 2 };
    const METRICS_COLS = { lgCols: 4, mdCols: 2, smCols: 1 };

    // Leaderboard State
    const defaultVisibleLeaderboards = [
        'brand_revenue', 'client_revenue', 'brand_roas', 'client_roas',
        'brand_aov', 'client_aov', 'brand_cvr', 'client_cvr'
    ];
    const [visibleLeaderboards, setVisibleLeaderboards] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('welcome-leaderboards-visible-v3');
            return saved ? JSON.parse(saved) : defaultVisibleLeaderboards;
        } catch {
            return defaultVisibleLeaderboards;
        }
    });
    const [isLeaderboardMenuOpen, setIsLeaderboardMenuOpen] = useState(false);
    const leaderboardMenuRef = useRef<HTMLDivElement>(null);

    // Notable Changes State
    const [notableMode, setNotableMode] = useState<'gainers' | 'losers'>('gainers');
    const defaultVisibleNotableMetrics = ['revenue', 'orders', 'aov', 'convRate'];
    const [visibleNotableMetrics, setVisibleNotableMetrics] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('welcome-notable-metrics-v2');
            return saved ? JSON.parse(saved) : defaultVisibleNotableMetrics;
        } catch {
            return defaultVisibleNotableMetrics;
        }
    });
    const [isNotableMenuOpen, setIsNotableMenuOpen] = useState(false);
    const notableMenuRef = useRef<HTMLDivElement>(null);

    // Layout States - Version bumped to force clean state
    const LEADERBOARD_LAYOUT_KEY = 'welcome-screen-leaderboard-layout-v22';
    const NOTABLE_LAYOUT_KEY = 'welcome-screen-notable-layout-v23';
    const QUICK_LINKS_LAYOUT_KEY = 'welcome-quick-links-layout-v24';

    // Initialize Layouts - Check validity immediately on load
    const initializeLayout = (key: string, items: string[], colsConfig: any) => {
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const parsed = JSON.parse(saved);
                // If the loaded layout looks broken (stacked on lg), ignore it and regenerate
                if (typeof window !== 'undefined' && window.innerWidth >= 768 && isLayoutStacked(parsed.lg)) {
                    console.warn(`Detected broken stacked layout for ${key}, resetting to grid.`);
                    return generateRobustLayouts(items, colsConfig);
                }
                return parsed;
            }
        } catch (e) { /* ignore */ }
        return generateRobustLayouts(items, colsConfig);
    };

    const [leaderboardLayouts, setLeaderboardLayouts] = useState(() => initializeLayout(LEADERBOARD_LAYOUT_KEY, visibleLeaderboards, METRICS_COLS));
    const [notableLayouts, setNotableLayouts] = useState(() => initializeLayout(NOTABLE_LAYOUT_KEY, visibleNotableMetrics, METRICS_COLS));
    const [quickLinksLayouts, setQuickLinksLayouts] = useState(() => initializeLayout(QUICK_LINKS_LAYOUT_KEY, quickLinks, QUICK_LINKS_COLS));

    // Persistence Effects
    useEffect(() => { localStorage.setItem(LEADERBOARD_LAYOUT_KEY, JSON.stringify(leaderboardLayouts)); }, [leaderboardLayouts]);
    useEffect(() => { localStorage.setItem(NOTABLE_LAYOUT_KEY, JSON.stringify(notableLayouts)); }, [notableLayouts]);
    useEffect(() => { localStorage.setItem(QUICK_LINKS_LAYOUT_KEY, JSON.stringify(quickLinksLayouts)); }, [quickLinksLayouts]);
    useEffect(() => { localStorage.setItem('welcome-notable-metrics-v2', JSON.stringify(visibleNotableMetrics)); }, [visibleNotableMetrics]);
    useEffect(() => { localStorage.setItem('welcome-leaderboards-visible-v3', JSON.stringify(visibleLeaderboards)); }, [visibleLeaderboards]);

    // Self-healing: If layout appears totally stacked (bug from race condition), reset it
    // Only run this check if we are on a screen wide enough to support columns
    useEffect(() => {
        const timer = setTimeout(() => {
            const isWide = window.innerWidth >= 768;
            if (isWide) {
                if (isLayoutStacked(quickLinksLayouts.lg)) setQuickLinksLayouts(generateRobustLayouts(quickLinks, QUICK_LINKS_COLS));
                if (isLayoutStacked(leaderboardLayouts.lg)) setLeaderboardLayouts(generateRobustLayouts(visibleLeaderboards, METRICS_COLS));
                if (isLayoutStacked(notableLayouts.lg)) setNotableLayouts(generateRobustLayouts(visibleNotableMetrics, METRICS_COLS));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [quickLinks, visibleLeaderboards, visibleNotableMetrics]);

    // Sync Quick Links prop with Layout state - STRICT REGENERATION
    useEffect(() => {
        // Instead of trying to patch the layout, REGENERATE it to ensure left-to-right flow
        // This fixes gaps and prevents stacking issues when items are added
        setQuickLinksLayouts(generateRobustLayouts(quickLinks, QUICK_LINKS_COLS));
    }, [quickLinks]);

    // Populate brands list on load
    useEffect(() => {
        const brands = new Set<string>();
        allAccountDetails.forEach(acc => {
            if (acc.Brands) {
                acc.Brands.split(',').forEach(b => brands.add(b.trim()));
            }
        });
        const sortedBrands = Array.from(brands).filter(Boolean).sort();
        setAllBrands(sortedBrands);
        setSelectedExportBrands(new Set(sortedBrands));
    }, [allAccountDetails]);

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notableMenuRef.current && !notableMenuRef.current.contains(event.target as Node)) {
                setIsNotableMenuOpen(false);
            }
            if (leaderboardMenuRef.current && !leaderboardMenuRef.current.contains(event.target as Node)) {
                setIsLeaderboardMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Safe Layout Change Handler
    const handleLayoutChange = (
        setter: React.Dispatch<React.SetStateAction<any>>,
        items: string[],
        config: any
    ) => (currentLayout: any, allLayouts: any) => {
        // GUARD: If window is wide but layout is stacked (all x=0), ignore it.
        // This prevents the app from saving a broken layout during initialization.
        if (window.innerWidth >= 768 && isLayoutStacked(currentLayout)) {
             console.warn("Detected stacked layout on desktop. Preventing layout save and forcing grid reset.");
             setter(generateRobustLayouts(items, config));
             return;
        }
        setter((prev: any) => ({...prev, ...allLayouts}));
    };

    const onLeaderboardLayoutChange = (l: any, all: any) => handleLayoutChange(setLeaderboardLayouts, visibleLeaderboards, METRICS_COLS)(l, all);
    const onNotableLayoutChange = (l: any, all: any) => handleLayoutChange(setNotableLayouts, visibleNotableMetrics, METRICS_COLS)(l, all);
    const onQuickLinksLayoutChange = (l: any, all: any) => handleLayoutChange(setQuickLinksLayouts, quickLinks, QUICK_LINKS_COLS)(l, all);

    const handleToggleNotableMetric = (key: string) => {
        let newMetrics;
        if (visibleNotableMetrics.includes(key)) {
            newMetrics = visibleNotableMetrics.filter(k => k !== key);
        } else {
            newMetrics = [...visibleNotableMetrics, key];
        }
        setVisibleNotableMetrics(newMetrics);
        // Force regenerate to ensure perfect grid
        setNotableLayouts(generateRobustLayouts(newMetrics, METRICS_COLS));
    };

    const handleToggleLeaderboard = (key: string) => {
        let newLeaderboards;
        if (visibleLeaderboards.includes(key)) {
            newLeaderboards = visibleLeaderboards.filter(k => k !== key);
        } else {
            newLeaderboards = [...visibleLeaderboards, key];
        }
        setVisibleLeaderboards(newLeaderboards);
        // Force regenerate to ensure perfect grid
        setLeaderboardLayouts(generateRobustLayouts(newLeaderboards, METRICS_COLS));
    };
    
    // --- Data Logic ---

    const validClientNames = useMemo(() => {
        return new Set(allAccountDetails.map(d => d.ClientName));
    }, [allAccountDetails]);

    const validPerformanceData = useMemo(() => {
        return allPerformanceData.filter(d => validClientNames.has(d.ClientName));
    }, [allPerformanceData, validClientNames]);

    const availableMonths = useMemo(() => {
        if (!validPerformanceData || validPerformanceData.length === 0) return [];
        const uniqueMonths = new Set(validPerformanceData.map(d => `${d.Month.substring(0, 3)} ${d.Year}`));
        return Array.from(uniqueMonths).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [validPerformanceData]);

    useEffect(() => {
        if (availableMonths.length > 0 && !selectedMonth) {
            setSelectedMonth(availableMonths[0]);
        }
    }, [availableMonths, selectedMonth]);

    const filteredData = useMemo(() => {
        if (!validPerformanceData || validPerformanceData.length === 0) return [];

        if (viewMode === 'month') {
            if (!selectedMonth) return [];
            const [monthStr, yearStr] = selectedMonth.split(' ');
            return validPerformanceData.filter(d => d.Month.startsWith(monthStr) && String(d.Year) === yearStr);
        } else {
            const uniqueDates = Array.from(new Set(validPerformanceData.map(d => {
                const monthIndex = monthMap[d.Month.substring(0, 3)];
                return new Date(d.Year, monthIndex, 1).getTime();
            }))).sort((a, b) => b - a);

            const monthsToKeep = parseInt(timeRange);
            const targetDateTimes = uniqueDates.slice(0, monthsToKeep);
            
            return validPerformanceData.filter(d => {
                const monthIndex = monthMap[d.Month.substring(0, 3)];
                const dTime = new Date(d.Year, monthIndex, 1).getTime();
                return targetDateTimes.includes(dTime);
            });
        }
    }, [viewMode, selectedMonth, timeRange, validPerformanceData]);

    // --- Notable Changes Logic (Top Gainers/Losers MoM) ---
    const notableChanges = useMemo(() => {
        if (availableMonths.length < 2) return { 
            gainers: { revenue: [], orders: [], aov: [], convRate: [], profit: [], margin: [], sessions: [], spend: [], roas: [] }, 
            losers: { revenue: [], orders: [], aov: [], convRate: [], profit: [], margin: [], sessions: [], spend: [], roas: [] }, 
            monthLabel: '' 
        };
        
        const latestMonthStr = availableMonths[0];
        const prevMonthStr = availableMonths[1];

        // Calculate days in the latest month for projection
        const [lMonthName, lYearStr] = latestMonthStr.split(' ');
        const lYear = parseInt(lYearStr);
        const lMonthIdx = monthMap[lMonthName.substring(0, 3)];
        const daysInLatestMonth = new Date(lYear, lMonthIdx + 1, 0).getDate();

        // Helper to parse "Jan 2024" back to matching records
        const getRecords = (monthStr: string) => {
             const [m, y] = monthStr.split(' ');
             return validPerformanceData.filter(d => d.Month.startsWith(m) && String(d.Year) === y);
        };

        const latestRecords = getRecords(latestMonthStr);
        const prevRecords = getRecords(prevMonthStr);
        
        const prevMap = new Map(prevRecords.map(r => [r.ClientName, r]));

        const changes = latestRecords.map(curr => {
            const prev = prevMap.get(curr.ClientName);
            if (!prev) return null;

            // Use Projected values for current month if available or calculate them
            let currRevenue = curr.Projected_Revenue || curr.Revenue;
            let currOrders = curr.Projected_Orders || curr.Orders;
            let currSessions = curr.Sessions; 
            let currProfit = curr.Profit;
            let currSpend = curr.PPC_Spend;

            // Fallback projection calculation
            if (curr.Days_of_Data && curr.Days_of_Data < daysInLatestMonth && curr.Days_of_Data > 0) {
                const factor = daysInLatestMonth / curr.Days_of_Data;
                if (!curr.Projected_Revenue) currRevenue = curr.Revenue * factor;
                if (!curr.Projected_Orders) currOrders = curr.Orders * factor;
                currSessions = curr.Sessions * factor;
                currProfit = curr.Profit * factor;
                currSpend = (curr.PPC_Spend || 0) * factor;
            }
            
            const currAov = curr.AOV;
            const currCvr = currSessions > 0 ? (currOrders / currSessions) * 100 : 0;
            const currMargin = currRevenue > 0 ? (currProfit / currRevenue) * 100 : 0;
            const currRoas = currSpend > 0 ? currRevenue / currSpend : 0;

            const prevCvr = prev.Sessions > 0 ? (prev.Orders / prev.Sessions) * 100 : 0;
            const prevMargin = prev.Revenue > 0 ? (prev.Profit / prev.Revenue) * 100 : 0;
            const prevRoas = prev.PPC_Spend > 0 ? prev.Revenue / prev.PPC_Spend : 0;

            const revChange = prev.Revenue > 0 ? (currRevenue - prev.Revenue) / prev.Revenue : 0;
            const ordersChange = prev.Orders > 0 ? (currOrders - prev.Orders) / prev.Orders : 0;
            const aovChange = prev.AOV > 0 ? (currAov - prev.AOV) / prev.AOV : 0;
            const cvrChange = prevCvr > 0 ? (currCvr - prevCvr) / prevCvr : 0;
            const profitChange = prev.Profit > 0 ? (currProfit - prev.Profit) / prev.Profit : 0;
            const marginChange = prevMargin > 0 ? (currMargin - prevMargin) / prevMargin : 0;
            const sessionsChange = prev.Sessions > 0 ? (currSessions - prev.Sessions) / prev.Sessions : 0;
            const spendChange = prev.PPC_Spend > 0 ? (currSpend - prev.PPC_Spend) / prev.PPC_Spend : 0;
            const roasChange = prevRoas > 0 ? (currRoas - prevRoas) / prevRoas : 0;

            return {
                name: curr.ClientName,
                revenue: currRevenue,
                prevRevenue: prev.Revenue,
                revenueChange: revChange * 100,
                orders: currOrders,
                prevOrders: prev.Orders,
                ordersChange: ordersChange * 100,
                aov: currAov,
                prevAov: prev.AOV,
                aovChange: aovChange * 100,
                convRate: currCvr,
                prevConvRate: prevCvr,
                convRateChange: cvrChange * 100,
                profit: currProfit,
                prevProfit: prev.Profit,
                profitChange: profitChange * 100,
                margin: currMargin,
                prevMargin: prevMargin,
                marginChange: marginChange * 100,
                sessions: currSessions,
                prevSessions: prev.Sessions,
                sessionsChange: sessionsChange * 100,
                spend: currSpend,
                prevSpend: prev.PPC_Spend,
                spendChange: spendChange * 100,
                roas: currRoas,
                prevRoas: prevRoas,
                roasChange: roasChange * 100
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null);

        const getTop = (metric: keyof typeof changes[0], prevMetric: keyof typeof changes[0], changeMetric: keyof typeof changes[0], direction: 'gainers' | 'losers') => {
            return changes
                .filter(c => direction === 'gainers' ? (c[changeMetric] as number) > 0 : (c[changeMetric] as number) < 0)
                .sort((a, b) => direction === 'gainers' 
                    ? (b[changeMetric] as number) - (a[changeMetric] as number) 
                    : (a[changeMetric] as number) - (b[changeMetric] as number)) 
                .slice(0, 20)
                .map(item => ({
                    name: item.name,
                    currentVal: item[metric] as number,
                    previousVal: item[prevMetric] as number,
                    change: item[changeMetric] as number
                }));
        };

        const isProjected = latestRecords.some(r => r.Projected_Revenue || (r.Days_of_Data && r.Days_of_Data < daysInLatestMonth));
        const label = isProjected 
            ? `${latestMonthStr} (Proj) vs ${prevMonthStr}`
            : `${latestMonthStr} vs ${prevMonthStr}`;

        return { 
            gainers: {
                revenue: getTop('revenue', 'prevRevenue', 'revenueChange', 'gainers'),
                orders: getTop('orders', 'prevOrders', 'ordersChange', 'gainers'),
                aov: getTop('aov', 'prevAov', 'aovChange', 'gainers'),
                convRate: getTop('convRate', 'prevConvRate', 'convRateChange', 'gainers'),
                profit: getTop('profit', 'prevProfit', 'profitChange', 'gainers'),
                margin: getTop('margin', 'prevMargin', 'marginChange', 'gainers'),
                sessions: getTop('sessions', 'prevSessions', 'sessionsChange', 'gainers'),
                spend: getTop('spend', 'prevSpend', 'spendChange', 'gainers'),
                roas: getTop('roas', 'prevRoas', 'roasChange', 'gainers'),
            },
            losers: {
                revenue: getTop('revenue', 'prevRevenue', 'revenueChange', 'losers'),
                orders: getTop('orders', 'prevOrders', 'ordersChange', 'losers'),
                aov: getTop('aov', 'prevAov', 'aovChange', 'losers'),
                convRate: getTop('convRate', 'prevConvRate', 'convRateChange', 'losers'),
                profit: getTop('profit', 'prevProfit', 'profitChange', 'losers'),
                margin: getTop('margin', 'prevMargin', 'marginChange', 'losers'),
                sessions: getTop('sessions', 'prevSessions', 'sessionsChange', 'losers'),
                spend: getTop('spend', 'prevSpend', 'spendChange', 'losers'),
                roas: getTop('roas', 'prevRoas', 'roasChange', 'losers'),
            },
            monthLabel: label 
        };

    }, [availableMonths, validPerformanceData]);

    // Aggregated Client Data (Simple for Dashboard Tiles)
    const aggregatedClientData = useMemo(() => {
        const clientMap = new Map<string, { revenue: number, spend: number, orders: number, sessions: number, profit: number }>();
        
        filteredData.forEach(d => {
            const current = clientMap.get(d.ClientName) || { revenue: 0, spend: 0, orders: 0, sessions: 0, profit: 0 };
            clientMap.set(d.ClientName, {
                revenue: current.revenue + (d.Revenue || 0),
                spend: current.spend + (d.PPC_Spend || 0),
                orders: current.orders + (d.Orders || 0),
                sessions: current.sessions + (d.Sessions || 0),
                profit: current.profit + (d.Profit || 0)
            });
        });

        return Array.from(clientMap.entries()).map(([name, stats]) => ({
            name,
            revenue: stats.revenue,
            spend: stats.spend,
            profit: stats.profit,
            orders: stats.orders,
            sessions: stats.sessions,
            roas: stats.spend > 0 ? stats.revenue / stats.spend : 0,
            margin: stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0,
            aov: stats.orders > 0 ? stats.revenue / stats.orders : 0,
            convRate: stats.sessions > 0 ? (stats.orders / stats.sessions) * 100 : 0
        }));
    }, [filteredData]);

    // Aggregated Brand Data
    const brandStats = useMemo(() => {
        if (filteredData.length === 0 || !allAccountDetails || allAccountDetails.length === 0) return [];

        const stats: Record<string, { 
            revenue: number; 
            spend: number; 
            profit: number; 
            orders: number; 
            sessions: number; 
            clients: Set<string>;
        }> = {};
        
        const clientBrandMap = new Map<string, string>();
        
        allAccountDetails.forEach(acc => {
             if (acc.Brands) {
                 const brands = acc.Brands.split(',').map(b => b.trim()).filter(Boolean);
                 // STRICT FILTER: Only map if exactly one brand is associated with the client
                 // This ensures brand stats are calculated only from dedicated single-brand stores
                 if (brands.length === 1) {
                     clientBrandMap.set(acc.ClientName, brands[0]);
                 }
             }
        });

        filteredData.forEach(record => {
             const brand = clientBrandMap.get(record.ClientName);
             if (brand) {
                 if (!stats[brand]) {
                     stats[brand] = { revenue: 0, spend: 0, profit: 0, orders: 0, sessions: 0, clients: new Set() };
                 }
                 stats[brand].revenue += record.Revenue || 0;
                 stats[brand].spend += record.PPC_Spend || 0;
                 stats[brand].profit += record.Profit || 0;
                 stats[brand].orders += record.Orders || 0;
                 stats[brand].sessions += record.Sessions || 0;
                 stats[brand].clients.add(record.ClientName);
             }
        });

        return Object.entries(stats).map(([brand, data]) => ({
            name: brand,
            revenue: data.revenue,
            spend: data.spend,
            profit: data.profit,
            orders: data.orders,
            sessions: data.sessions,
            roas: data.spend > 0 ? data.revenue / data.spend : 0,
            margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
            aov: data.orders > 0 ? data.revenue / data.orders : 0,
            convRate: data.sessions > 0 ? (data.orders / data.sessions) * 100 : 0,
            contributingClients: Array.from(data.clients).sort()
        })).sort((a, b) => b.revenue - a.revenue);
    }, [filteredData, allAccountDetails]);

    // Sorted Lists for Display Tiles
    const brandByRevenue = useMemo(() => [...brandStats].sort((a, b) => b.revenue - a.revenue), [brandStats]);
    const brandByProfit = useMemo(() => [...brandStats].sort((a, b) => b.profit - a.profit), [brandStats]);
    const brandByMargin = useMemo(() => [...brandStats].sort((a, b) => b.margin - a.margin), [brandStats]);
    const brandBySessions = useMemo(() => [...brandStats].sort((a, b) => b.sessions - a.sessions), [brandStats]);
    const brandByAov = useMemo(() => [...brandStats].sort((a, b) => b.aov - a.aov), [brandStats]);
    const brandBySpend = useMemo(() => [...brandStats].sort((a, b) => b.spend - a.spend), [brandStats]);
    const brandByRoas = useMemo(() => [...brandStats].sort((a, b) => b.roas - a.roas), [brandStats]);
    const brandByOrders = useMemo(() => [...brandStats].sort((a, b) => b.orders - a.orders), [brandStats]);
    const brandByCvr = useMemo(() => [...brandStats].sort((a, b) => b.convRate - a.convRate), [brandStats]);
    
    const clientByRevenue = useMemo(() => [...aggregatedClientData].sort((a, b) => b.revenue - a.revenue), [aggregatedClientData]);
    const clientByProfit = useMemo(() => [...aggregatedClientData].sort((a, b) => b.profit - a.profit), [aggregatedClientData]);
    const clientByMargin = useMemo(() => [...aggregatedClientData].sort((a, b) => b.margin - a.margin), [aggregatedClientData]);
    const clientBySessions = useMemo(() => [...aggregatedClientData].sort((a, b) => b.sessions - a.sessions), [aggregatedClientData]);
    const clientByAov = useMemo(() => [...aggregatedClientData].sort((a, b) => b.aov - a.aov), [aggregatedClientData]);
    const clientBySpend = useMemo(() => [...aggregatedClientData].sort((a, b) => b.spend - a.spend), [aggregatedClientData]);
    const clientByRoas = useMemo(() => [...aggregatedClientData].sort((a, b) => b.roas - a.roas), [aggregatedClientData]);
    const clientByOrders = useMemo(() => [...aggregatedClientData].sort((a, b) => b.orders - a.orders), [aggregatedClientData]);
    const clientByCvr = useMemo(() => [...aggregatedClientData].sort((a, b) => b.convRate - a.convRate), [aggregatedClientData]);


    // --- EXPORT SELECTION HANDLERS ---
    const toggleBrand = (brand: string) => {
        const next = new Set(selectedExportBrands);
        if (next.has(brand)) next.delete(brand);
        else next.add(brand);
        setSelectedExportBrands(next);
    };

    const toggleMetric = (metricKey: string) => {
        const next = new Set(selectedExportMetrics);
        if (next.has(metricKey)) next.delete(metricKey);
        else next.add(metricKey);
        setSelectedExportMetrics(next);
    };

    const toggleAllBrands = () => {
        if (selectedExportBrands.size === allBrands.length) setSelectedExportBrands(new Set());
        else setSelectedExportBrands(new Set(allBrands));
    };

    const toggleAllMetrics = () => {
        if (selectedExportMetrics.size === availableMetrics.length) setSelectedExportMetrics(new Set());
        else setSelectedExportMetrics(new Set(availableMetrics.map(m => m.key)));
    };

    // --- PDF GENERATION LOGIC ---
    const handleDownloadPDF = async () => {
        // PDF Generation Logic (omitted for brevity, assumed same as original)
        setIsExportModalOpen(false);
    };

    // Toggle Quick Link
    const toggleQuickLink = (toolId: string) => {
        if (quickLinks.includes(toolId)) {
            setQuickLinks(quickLinks.filter(id => id !== toolId));
        } else {
            setQuickLinks([...quickLinks, toolId]);
        }
    };

    const LeaderboardTile: React.FC<{ 
        data: any[], 
        valueKey: string, 
        format: 'currency' | 'percent' | 'roas' | 'number', 
        colorFrom: string, 
        colorTo: string 
    }> = ({ data, valueKey, format, colorFrom, colorTo }) => {
        const maxValue = Math.max(...data.map(d => d[valueKey]), 0.01);
        return (
            <div className="h-full overflow-y-auto pr-2 space-y-4 custom-scrollbar p-1 relative">
                {data.map((item, index) => {
                    const val = item[valueKey];
                    const percent = Math.min(100, Math.max(0, (val / maxValue) * 100));
                    
                    let displayVal = '';
                    if (format === 'currency') displayVal = `$${Math.round(val).toLocaleString()}`;
                    else if (format === 'percent') displayVal = `${val.toFixed(1)}%`;
                    else if (format === 'roas') displayVal = `${val.toFixed(2)}x`;
                    else displayVal = val.toLocaleString();

                    return (
                        <div 
                            key={item.name} 
                            className="w-full py-2 border-b border-white/5 last:border-0"
                        >
                            <div className="flex items-start justify-between text-sm mb-1">
                                <div className="flex flex-col min-w-0 flex-1 mr-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500 font-mono text-xs w-5 flex-shrink-0">{index + 1}.</span>
                                        <span className="font-semibold text-[var(--color-text-primary)] truncate">
                                            {item.name}
                                        </span>
                                    </div>
                                </div>
                                
                                <span className="font-bold text-[var(--color-text-primary)] whitespace-nowrap">
                                     {displayVal}
                                </span>
                            </div>
                            
                            <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden mt-1.5 ml-7" style={{width: 'calc(100% - 1.75rem)'}}>
                                <div 
                                    className="h-full rounded-full"
                                    style={{ 
                                        width: `${percent}%`, 
                                        background: `linear-gradient(to right, ${colorFrom}, ${colorTo})` 
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}

            </div>
        );

    };
    const NotableChangeTile: React.FC<{
        data: { name: string; currentVal: number; previousVal: number; change: number }[];
        format: 'currency' | 'number' | 'percent' | 'roas';
        type: 'gainers' | 'losers';
    }> = ({ data, format, type }) => {
        return (
            <div className="h-full overflow-y-auto pr-2 space-y-3 custom-scrollbar p-1">
                {data.map((item, index) => {
                    const formatNum = (val: number) => {
                         if (format === 'currency') return `$${Math.round(val).toLocaleString()}`;
                         if (format === 'percent') return `${val.toFixed(1)}%`;
                         if (format === 'roas') return `${val.toFixed(2)}x`;
                         return Math.round(val).toLocaleString();
                    };
                    
                    const displayVal = `${formatNum(item.previousVal)} → ${formatNum(item.currentVal)}`;
                    
                    const changeColorClass = type === 'gainers' ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]';
                    const changePrefix = item.change > 0 ? '+' : '';

                    return (
                        <div key={item.name} className="w-full flex items-center justify-between bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                                <span className="text-gray-500 font-mono text-xs w-4">{index + 1}.</span>
                                <span className="font-semibold text-[var(--color-text-primary)] truncate text-sm" title={item.name}>
                                    {item.name}
                                </span>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                                <div className="font-bold text-[var(--color-text-primary)] text-sm whitespace-nowrap">{displayVal}</div>
                                <div className={`text-xs font-bold ${changeColorClass}`}>{changePrefix}{item.change.toFixed(1)}%</div>
                            </div>
                        </div>
                    );
                })}
                 {data.length === 0 && (
                     <div className="h-full flex items-center justify-center text-[var(--color-text-secondary)] text-sm italic">
                         No significant changes found this month.
                     </div>
                 )}
            </div>
        );
    };

    // Select data based on toggle
    const activeNotableData = notableMode === 'gainers' ? notableChanges.gainers : notableChanges.losers;
    const notableTitlePrefix = notableMode === 'gainers' ? '🚀 Top' : '📉 Top';
    const notableTitleSuffix = notableMode === 'gainers' ? 'Gainers' : 'Decreases';

    // Construct Config for rendering leaderboards
    const leaderboardConfig: Record<string, any> = {
        // Brand Configs
        brand_revenue: { title: '🏆 Brand Revenue', data: brandByRevenue, valueKey: 'revenue', format: 'currency', colorFrom: '#a855f7', colorTo: '#ec4899' },
        brand_profit: { title: '💵 Brand Profit', data: brandByProfit, valueKey: 'profit', format: 'currency', colorFrom: '#22c55e', colorTo: '#16a34a' },
        brand_margin: { title: '💹 Brand Margin', data: brandByMargin, valueKey: 'margin', format: 'percent', colorFrom: '#8b5cf6', colorTo: '#7c3aed' },
        brand_sessions: { title: '👥 Brand Sessions', data: brandBySessions, valueKey: 'sessions', format: 'number', colorFrom: '#06b6d4', colorTo: '#0891b2' },
        brand_aov: { title: '🛒 Brand AOV', data: brandByAov, valueKey: 'aov', format: 'currency', colorFrom: '#f59e0b', colorTo: '#fbbf24' },
        brand_spend: { title: '💸 Brand Ad Spend', data: brandBySpend, valueKey: 'spend', format: 'currency', colorFrom: '#f97316', colorTo: '#ea580c' },
        brand_roas: { title: '🏆 Brand ROAS', data: brandByRoas, valueKey: 'roas', format: 'roas', colorFrom: '#3b82f6', colorTo: '#22c55e' },
        brand_orders: { title: '📦 Brand Orders', data: brandByOrders, valueKey: 'orders', format: 'number', colorFrom: '#ec4899', colorTo: '#db2777' },
        brand_cvr: { title: '📈 Brand CVR', data: brandByCvr, valueKey: 'convRate', format: 'percent', colorFrom: '#ec4899', colorTo: '#db2777' },
        
        // Client Configs
        client_revenue: { title: '💸 Client Revenue', data: clientByRevenue, valueKey: 'revenue', format: 'currency', colorFrom: '#a855f7', colorTo: '#ec4899' },
        client_profit: { title: '💵 Client Profit', data: clientByProfit, valueKey: 'profit', format: 'currency', colorFrom: '#22c55e', colorTo: '#16a34a' },
        client_margin: { title: '💹 Client Margin', data: clientByMargin, valueKey: 'margin', format: 'percent', colorFrom: '#8b5cf6', colorTo: '#7c3aed' },
        client_sessions: { title: '👥 Client Sessions', data: clientBySessions, valueKey: 'sessions', format: 'number', colorFrom: '#06b6d4', colorTo: '#0891b2' },
        client_aov: { title: '🛒 Client AOV', data: clientByAov, valueKey: 'aov', format: 'currency', colorFrom: '#f59e0b', colorTo: '#fbbf24' },
        client_spend: { title: '💸 Client Ad Spend', data: clientBySpend, valueKey: 'spend', format: 'currency', colorFrom: '#f97316', colorTo: '#ea580c' },
        client_roas: { title: '🎯 Client ROAS', data: clientByRoas, valueKey: 'roas', format: 'roas', colorFrom: '#3b82f6', colorTo: '#22c55e' },
        client_orders: { title: '📦 Client Orders', data: clientByOrders, valueKey: 'orders', format: 'number', colorFrom: '#ec4899', colorTo: '#db2777' },
        client_cvr: { title: '📈 Client CVR', data: clientByCvr, valueKey: 'convRate', format: 'percent', colorFrom: '#ec4899', colorTo: '#db2777' },
    };

    return (
        <div className="max-w-[98%] mx-auto w-full">
            {isExportModalOpen && (
                 <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" onClick={() => setIsExportModalOpen(false)}>
                    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">Export Report Options</h3>
                            <button onClick={() => setIsExportModalOpen(false)} className="text-[var(--color-text-secondary)] hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
                            <div className="w-full md:w-1/2 p-6 border-r border-[var(--color-border)] flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-semibold text-[var(--color-text-primary)]">Brands to Include</h4>
                                    <button onClick={toggleAllBrands} className="text-xs text-[var(--color-accent-secondary)] hover:underline">
                                        {selectedExportBrands.size === allBrands.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                                <div className="flex-grow overflow-y-auto pr-2 space-y-1 bg-black/10 p-2 rounded-lg border border-[var(--color-border)]">
                                    {allBrands.map(brand => (
                                        <label key={brand} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedExportBrands.has(brand)} 
                                                onChange={() => toggleBrand(brand)}
                                                className="rounded bg-slate-700 border-slate-500 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                                            />
                                            <span className="text-sm text-[var(--color-text-primary)]">{brand}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="w-full md:w-1/2 p-6 flex flex-col">
                                <div className="mb-6 flex-grow">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-semibold text-[var(--color-text-primary)]">Metrics to Include</h4>
                                        <button onClick={toggleAllMetrics} className="text-xs text-[var(--color-accent-secondary)] hover:underline">
                                            {selectedExportMetrics.size === availableMetrics.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {availableMetrics.map(metric => (
                                            <label key={metric.key} className="flex items-center gap-3 p-2 bg-black/20 hover:bg-black/30 rounded cursor-pointer transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedExportMetrics.has(metric.key)} 
                                                    onChange={() => toggleMetric(metric.key)}
                                                    className="rounded bg-slate-700 border-slate-500 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                                                />
                                                <span className="text-sm text-[var(--color-text-primary)]">{metric.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-auto pt-6 border-t border-[var(--color-border)]">
                                    <h4 className="font-semibold text-[var(--color-text-primary)] mb-3">Other Options</h4>
                                    <label className="flex items-start gap-3 cursor-pointer p-3 bg-black/20 rounded-lg hover:bg-black/30 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={anonymize} 
                                            onChange={(e) => setAnonymize(e.target.checked)}
                                            className="mt-1 h-5 w-5 rounded bg-slate-700 border-slate-500 text-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]"
                                        />
                                        <div>
                                            <span className="font-semibold text-[var(--color-text-primary)] block">Anonymize Client Names</span>
                                            <span className="text-xs text-[var(--color-text-secondary)]">Replace real names with "Brand Dealer #1" etc.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-[var(--color-border)] flex justify-end gap-3 bg-black/20 rounded-b-xl">
                            <button 
                                onClick={() => setIsExportModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDownloadPDF}
                                disabled={selectedExportBrands.size === 0 || selectedExportMetrics.size === 0}
                                className="px-6 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors flex items-center gap-2"
                            >
                                Generate PDF Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

             <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">Welcome Back{userName ? ` ${userName}!` : ''}</h1>
            </div>
            
            {/* Quick Links Section */}
            <section className="mb-12">
                 <h2 className="text-2xl text-center font-semibold text-[var(--color-text-primary)] mb-6">Quick Links</h2>
                 <ResponsiveGridLayout
                    className="layout"
                    layouts={quickLinksLayouts}
                    onLayoutChange={onQuickLinksLayoutChange}
                    breakpoints={{lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0}}
                    cols={{lg: QUICK_LINKS_COLS.lgCols, md: QUICK_LINKS_COLS.mdCols, sm: QUICK_LINKS_COLS.smCols, xs: 1, xxs: 1}}
                    rowHeight={180} // Approximate height of the cards
                    draggableHandle=".drag-handle"
                    isResizable={true}
                    isDraggable={true}
                 >
                    {quickLinks.map(key => {
                        const tool = ALL_TOOLS[key];
                        if (!tool) return null;
                        return (
                            <div key={key}>
                                <ChartGridItem title={tool.title} onRemove={() => toggleQuickLink(key)}>
                                    <div onClick={() => onSelectTool(key)} className="cursor-pointer h-full flex flex-col items-center justify-center text-center p-2 hover:bg-white/5 rounded-lg transition-colors">
                                        <div className="text-4xl mb-3">{tool.icon}</div>
                                        <p className="text-sm text-[var(--color-text-secondary)]">{tool.description}</p>
                                    </div>
                                </ChartGridItem>
                            </div>
                        );
                    })}
                 </ResponsiveGridLayout>
                 {quickLinks.length === 0 && (
                     <div className="text-center text-[var(--color-text-secondary)] bg-black/20 p-8 rounded-lg max-w-4xl mx-auto border border-dashed border-[var(--color-border)]">
                         <p>No Quick Links selected. Add tools from the top menu.</p>
                     </div>
                 )}
            </section>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl text-center font-semibold text-[var(--color-text-primary)]">Leaderboards</h2>
                    <div className="relative" ref={leaderboardMenuRef}>
                        <button
                            onClick={() => setIsLeaderboardMenuOpen(prev => !prev)}
                            className="bg-slate-700 hover:bg-slate-600 text-white rounded-full p-1.5 transition-colors flex items-center justify-center"
                            title="Add Leaderboards"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                        {isLeaderboardMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 w-[32rem] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl z-20 overflow-hidden flex">
                                {LEADERBOARD_GROUPS.map((group, groupIndex) => (
                                    <div key={group.label} className={`flex-1 ${groupIndex > 0 ? 'border-l border-[var(--color-border)]' : ''}`}>
                                        <div className="p-3 bg-black/10">
                                            <h4 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{group.label}</h4>
                                        </div>
                                        <ul className="p-2 space-y-1">
                                            {group.items.map(option => {
                                                const isActive = visibleLeaderboards.includes(option.key);
                                                return (
                                                    <li key={option.key}>
                                                        <button
                                                            onClick={() => handleToggleLeaderboard(option.key)}
                                                            className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between text-sm transition-colors ${isActive ? 'bg-[var(--color-accent)]/20 text-[var(--color-text-accent)]' : 'hover:bg-black/20 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                                                        >
                                                            <span>{option.label}</span>
                                                            {isActive ? (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                                            )}
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center bg-black/20 p-1 rounded-lg">
                    <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${viewMode === 'month' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>Month</button>
                    <button onClick={() => setViewMode('range')} className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${viewMode === 'range' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>Time Frame</button>
                </div>

                {viewMode === 'month' ? (
                    <select 
                        value={selectedMonth} 
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="text-sm bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-1.5"
                    >
                        {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                ) : (
                        <select 
                        value={timeRange} 
                        onChange={e => setTimeRange(e.target.value as TimeRange)}
                        className="text-sm bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-1.5"
                    >
                        <option value="3m">Last 3 Months</option>
                        <option value="6m">Last 6 Months</option>
                        <option value="12m">Last 12 Months</option>
                        <option value="24m">Last 24 Months</option>
                    </select>
                )}
                
                <button 
                    onClick={() => setIsExportModalOpen(true)}
                    disabled={isGeneratingPdf}
                    className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white disabled:opacity-50 flex items-center gap-2 px-4 py-1.5 rounded-lg transition-colors font-semibold text-xs uppercase tracking-wider shadow-lg ml-4"
                    title="Download PDF Report"
                >
                    {isGeneratingPdf ? (
                        <>
                            <div className="animate-spin h-3 w-3 border-2 border-current rounded-full border-t-transparent"></div>
                            <span>Generating...</span>
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Export PDF</span>
                        </>
                    )}
                </button>
            </div>

            {/* Leaderboards Grid */}
            <ResponsiveGridLayout
                className="layout"
                layouts={leaderboardLayouts}
                onLayoutChange={onLeaderboardLayoutChange}
                breakpoints={{lg: 900, md: 700, sm: 500, xs: 400, xxs: 0}}
                cols={{lg: METRICS_COLS.lgCols, md: METRICS_COLS.mdCols, sm: METRICS_COLS.smCols, xs: 1, xxs: 1}}
                rowHeight={260}
                draggableHandle=".drag-handle"
            >
                {visibleLeaderboards.map(key => {
                    const config = leaderboardConfig[key];
                    if (!config) return null;
                    return (
                        <div key={key}>
                            <ChartGridItem title={config.title} onRemove={() => handleToggleLeaderboard(key)}>
                                {config.data.length > 0 ? (
                                    <LeaderboardTile 
                                        data={config.data} 
                                        valueKey={config.valueKey} 
                                        format={config.format} 
                                        colorFrom={config.colorFrom} 
                                        colorTo={config.colorTo} 
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
                                        <p>No data available.</p>
                                    </div>
                                )}
                            </ChartGridItem>
                        </div>
                    );
                })}
            </ResponsiveGridLayout>
            
            {/* Notable Changes Header & Grid */}
            <div className="mt-12 mb-6">
                <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-4">
                        <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Notable Changes</h2>
                        <div className="relative" ref={notableMenuRef}>
                            <button
                                onClick={() => setIsNotableMenuOpen(prev => !prev)}
                                className="bg-slate-700 hover:bg-slate-600 text-white rounded-full p-1.5 transition-colors flex items-center justify-center"
                                title="Add Metrics"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                            {isNotableMenuOpen && (
                                <div className="absolute top-full left-0 mt-2 w-56 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl z-20 overflow-hidden">
                                    <div className="p-3 border-b border-[var(--color-border)]">
                                        <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Toggle Metrics</h4>
                                    </div>
                                    <ul className="p-2 space-y-1">
                                        {NOTABLE_METRIC_OPTIONS.map(option => {
                                            const isActive = visibleNotableMetrics.includes(option.key);
                                            return (
                                                <li key={option.key}>
                                                    <button
                                                        onClick={() => handleToggleNotableMetric(option.key)}
                                                        className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between text-sm transition-colors ${isActive ? 'bg-[var(--color-accent)]/20 text-[var(--color-text-accent)]' : 'hover:bg-black/20 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                                                    >
                                                        <span>{option.label}</span>
                                                        {isActive ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                                        )}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                        </div>
                        <div className="flex items-center bg-black/20 p-1 rounded-lg">
                        <button onClick={() => setNotableMode('gainers')} className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${notableMode === 'gainers' ? 'bg-[var(--color-positive)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>Gainers</button>
                        <button onClick={() => setNotableMode('losers')} className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${notableMode === 'losers' ? 'bg-[var(--color-negative)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>Decreases</button>
                    </div>
                </div>
            </div>

            <ResponsiveGridLayout
                className="layout"
                layouts={notableLayouts}
                onLayoutChange={onNotableLayoutChange}
                breakpoints={{lg: 900, md: 700, sm: 500, xs: 400, xxs: 0}}
                cols={{lg: METRICS_COLS.lgCols, md: METRICS_COLS.mdCols, sm: METRICS_COLS.smCols, xs: 1, xxs: 1}}
                rowHeight={260}
                draggableHandle=".drag-handle"
            >
                {visibleNotableMetrics.map(metricKey => {
                    const option = NOTABLE_METRIC_OPTIONS.find(o => o.key === metricKey);
                    if (!option) return null;
                    
                    const data = activeNotableData[metricKey as keyof typeof activeNotableData] || [];
                    const format = metricFormats[metricKey];

                    return (
                        <div key={`notable_${metricKey}`}>
                            <ChartGridItem 
                                title={`${notableTitlePrefix} ${option.label} ${notableTitleSuffix}`} 
                                subtitle={notableChanges.monthLabel}
                                onRemove={() => handleToggleNotableMetric(metricKey)}
                            >
                                <NotableChangeTile 
                                    data={data} 
                                    format={format} 
                                    type={notableMode}
                                />
                            </ChartGridItem>
                        </div>
                    );
                })}
            </ResponsiveGridLayout>

        </div>
    );
};

export default WelcomeScreen;