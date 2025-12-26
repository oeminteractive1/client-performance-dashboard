import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { ClientDataRecord, AccountDetailsRecord, ItemsInFeedDataPoint, Theme, FeedStatus, PercentApprovedRecord, StoreStatusRecord, StoreChangesRecord, BudgetStatusRecord, KeyContactRecord, RevolutionLinksRecord, GoogleSearchConsoleRecord, GoogleAnalyticsRecord, GoogleAdsRecord, BingAdsRecord, CurrentStatusRecord } from '../types';
import ChartWrapper from './ChartWrapper';
import ChartGridItem from './ChartGridItem';
import KpiGridItem from './KPIGridItem';
import ContactsTile from './AccountDetails';
import ChatWithData from './ChatWithData';
import FeedStatusTile from './FeedStatusTile';
import StoreStatusTile from './StoreStatusTile';
import BudgetStatusTile from './BudgetStatusTile';
import TopOrganicPerformanceTile from './TopOrganicPerformanceTile';
import SnapshotAndLinksTile from './SnapshotAndLinksTile';
import GoogleAnalyticsTile from './GoogleAnalyticsTile';
import GoogleAdsTile from './GoogleAdsTile';
import BingAdsTile from './BingAdsTile';

const ResponsiveGridLayout = WidthProvider(Responsive);

const monthMap: { [key: string]: number } = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };

type TimeRange = '3m' | '6m' | '12m' | '24m';
type GoogleAdsTimeRange = '1' | '3' | '6' | '9' | '12';

// --- Overview Tile Definitions ---
const allOverviewTileDefs: { [key: string]: { title: string; subtitle?: string } } = {
    snapshot_and_links: { title: '📊 Dashboard Snapshot & Links' },
    budget_status: { title: '💰 Budget Status', subtitle: 'Spend & Pacing Overview' },
    feed_status: { title: '📜 Feed Health', subtitle: 'Approval & Update Status' },
    store_status: { title: '🏪 Store Health' },
    items_in_feed: { title: '🛍️ Items in Feed' },
    google_ads: { title: '📢 Google Ads Performance', subtitle: 'Parts vs. Accessories' },
    organic_search: { title: '📈 Organic Impressions & Clicks', subtitle: 'From Google Search Console' },
    google_analytics: { title: '📈 Google Analytics', subtitle: 'Revenue by Medium' },
    organic_details: { title: '🔍 Top Organic Performance', subtitle: 'Pages & Search Queries' },
    bing_ads: { title: '🔵 Bing Ads Performance' },
};
const allOverviewTileIds = Object.keys(allOverviewTileDefs);
const defaultVisibleOverviewTileIds = ['snapshot_and_links', 'budget_status', 'feed_status', 'store_status', 'items_in_feed', 'google_ads', 'organic_search', 'google_analytics', 'organic_details', 'bing_ads'];
const initialOverviewLayouts = {
    lg: [
        // Row 1
        { i: 'snapshot_and_links', x: 0, y: 0, w: 1, h: 1 },
        { i: 'store_status', x: 1, y: 0, w: 1, h: 1 },
        // Row 2
        { i: 'feed_status', x: 0, y: 1, w: 1, h: 1 },
        { i: 'budget_status', x: 1, y: 1, w: 1, h: 1 },
        // Row 3
        { i: 'items_in_feed', x: 0, y: 2, w: 1, h: 1 },
        { i: 'organic_search', x: 1, y: 2, w: 1, h: 1 },
        // Row 4
        { i: 'google_analytics', x: 0, y: 3, w: 1, h: 1, minH: 1 },
        { i: 'google_ads', x: 1, y: 3, w: 1, h: 1, minH: 1 },
        // Row 5
        { i: 'organic_details', x: 0, y: 4, w: 2, h: 1, minH: 1 },
        // Row 6
        { i: 'bing_ads', x: 0, y: 5, w: 1, h: 1 },
    ],
};

// --- KPI Grid Definitions ---
const initialKpiLayouts = {
    lg: [
        { i: 'revenue', x: 0, y: 0, w: 1, h: 1, isResizable: false }, { i: 'orders', x: 1, y: 0, w: 1, h: 1, isResizable: false },
        { i: 'roas', x: 2, y: 0, w: 1, h: 1, isResizable: false }, { i: 'aov', x: 3, y: 0, w: 1, h: 1, isResizable: false },
        { i: 'profit', x: 0, y: 1, w: 1, h: 1, isResizable: false }, { i: 'sessions', x: 1, y: 1, w: 1, h: 1, isResizable: false },
        { i: 'ppc_spend', x: 2, y: 1, w: 1, h: 1, isResizable: false }, { i: 'conv_rate', x: 3, y: 1, w: 1, h: 1, isResizable: false },
    ],
};
const allKpiIds = ['revenue', 'orders', 'roas', 'aov', 'profit', 'sessions', 'ppc_spend', 'conv_rate'];
const defaultVisibleKpiIds = ['revenue', 'orders', 'roas', 'aov', 'profit', 'sessions', 'ppc_spend', 'conv_rate'];


// --- Chart Grid Definitions ---
const initialChartLayouts = {
    lg: [
      { i: 'revenue_orders', x: 0, y: 0, w: 1, h: 1 }, { i: 'sessions', x: 1, y: 0, w: 1, h: 1 },
      { i: 'ppc_roas', x: 0, y: 1, w: 1, h: 1 }, { i: 'ppc_revenue', x: 1, y: 1, w: 1, h: 1 },
      { i: 'aov_conv_rate', x: 0, y: 2, w: 1, h: 1 }, { i: 'canceled_fulfillment', x: 1, y: 2, w: 1, h: 1 },
      { i: 'profit_margin_per_order', x: 0, y: 3, w: 1, h: 1 }, { i: 'canceled_solo', x: 1, y: 3, w: 1, h: 1 },
      { i: 'revenue_solo', x: 0, y: 4, w: 1, h: 1 }, { i: 'profit', x: 1, y: 4, w: 1, h: 1 },
      { i: 'aov', x: 0, y: 5, w: 1, h: 1 }, { i: 'conv_rate', x: 1, y: 5, w: 1, h: 1 },
      { i: 'orders_solo', x: 0, y: 6, w: 1, h: 1 }, { i: 'ppc_spend_solo', x: 1, y: 6, w: 1, h: 1 },
      { i: 'roas_solo', x: 0, y: 7, w: 1, h: 1 }, { i: 'fulfillment_solo', x: 1, y: 7, w: 1, h: 1 },
    ],
};
const allChartIds = initialChartLayouts.lg.map(l => l.i);
const defaultVisibleChartIds = ['revenue_orders', 'sessions', 'ppc_roas', 'ppc_revenue', 'aov_conv_rate', 'canceled_fulfillment', 'profit_margin_per_order'];


// --- Table Column Definitions ---
const allTableColumnDefs: { [key: string]: { header: string; dataKey: keyof ClientDataRecord, format?: 'currency' | 'percent' | 'number' | 'days' | 'roas' } } = {
    month: { header: 'Month', dataKey: 'Month' },
    revenue: { header: 'Revenue', dataKey: 'Revenue', format: 'currency' },
    profit: { header: 'Profit', dataKey: 'Profit', format: 'currency' },
    orders: { header: 'Orders', dataKey: 'Orders', format: 'number' },
    ppc_spend: { header: 'PPC Spend', dataKey: 'PPC_Spend', format: 'currency' },
    roas: { header: 'ROAS', dataKey: 'ROAS', format: 'roas' },
    cancel_rate: { header: 'Cancel Rate', dataKey: 'Canceled', format: 'percent' },
    sessions: { header: 'Sessions', dataKey: 'Sessions', format: 'number' },
    conv_rate: { header: 'Conv. Rate', dataKey: 'Conv_Rate', format: 'percent' },
    aov: { header: 'AOV', dataKey: 'AOV', format: 'currency' },
    avg_fulfillment: { header: 'Avg Fulfillment', dataKey: 'Avg_Fulfillment', format: 'days' },
    pricing_changes: { header: 'Pricing Changes', dataKey: 'Pricing_Changes' },
    shipping_changes: { header: 'Shipping Changes', dataKey: 'Shipping_Changes' },
    strategy_notes: { header: 'Strategy Notes', dataKey: 'Strategy_Notes' },
    other_notes: { header: 'Other Notes', dataKey: 'Other_Notes' },
};
const defaultVisibleTableColumns = Object.keys(allTableColumnDefs);


const formatValue = (value: number, type: 'currency' | 'percent' | 'number' | 'days' | 'roas') => {
    if (isNaN(value) || !isFinite(value)) value = 0;
    switch (type) {
        case 'currency': return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        case 'percent': return `${value.toFixed(1)}%`;
        case 'number': return value.toLocaleString();
        case 'days': return `${value.toFixed(1)} days`;
        case 'roas': return `${value.toFixed(1)}x`;
    }
};

const getHeatmapStyle = (value: number, stats: { min: number; max: number } | undefined, isPositiveMetric: boolean, theme: Theme): React.CSSProperties => {
    const isDarkTheme = ['cosmic-ink', 'starlight', 'sunset'].includes(theme.id);
    const fontColor = isDarkTheme ? '#FFFFFF' : '#000000';

    const style: React.CSSProperties = { color: fontColor };

    if (typeof value !== 'number' || !isFinite(value) || !stats || stats.min === stats.max) {
        return style;
    }

    if (value <= 0 && isPositiveMetric) {
        style.backgroundColor = 'rgba(248, 113, 113, 0.4)';
        return style;
    }

    const { min, max } = stats;
    let percent = (value - min) / (max - min);

    if (!isPositiveMetric) {
        percent = 1 - percent;
    }
    
    let colorRgb, alpha;

    if (percent < 0.5) {
        colorRgb = '248, 113, 113';
        alpha = 0.1 + (0.6 * (1 - (percent * 2)));
    } 
    else {
        colorRgb = '74, 222, 128';
        alpha = 0.1 + (0.6 * ((percent - 0.5) * 2));
    }

    style.backgroundColor = `rgba(${colorRgb}, ${alpha})`;
    
    return style;
};


const DEFAULT_SYSTEM_PROMPT = `You are an expert marketing data analyst.
- **IMPORTANT PERSONALITY INSTRUCTION:** You have already greeted the user with a quirky, retro "DataBot 3000" persona. For ALL of your responses now, you MUST be a standard, serious, and professional data analyst. Do NOT use any slang or quirky personality in your answers.
- **Formatting:** ALWAYS use Markdown for your responses. Use lists, bold text, and other formatting to make your answers super clear and easy to read.
- **Analysis:** Base all your answers strictly on the JSON data provided. Be insightful and provide actionable advice when asked. Do not just repeat the data; explain what it means. When providing analysis, be direct and professional.`;

interface DashboardProps {
    clientData: ClientDataRecord[];
    lastUpdated: Date | null;
    accountDetails: AccountDetailsRecord | null;
    keyContact: KeyContactRecord | null;
    itemsInFeedData: ItemsInFeedDataPoint[] | null;
    theme: Theme;
    feedStatus: FeedStatus | null;
    percentApprovedData: PercentApprovedRecord | null;
    storeStatus: StoreStatusRecord | null;
    currentStatus: CurrentStatusRecord | null;
    onUpdateCurrentStatus: (clientName: string, newStatus: string) => Promise<boolean>;
    storeChanges: StoreChangesRecord | null;
    budgetStatus: BudgetStatusRecord | null;
    revolutionLinks: RevolutionLinksRecord | null;
    googleSearchConsoleData: GoogleSearchConsoleRecord[] | null;
    googleAnalyticsData: GoogleAnalyticsRecord[] | null;
    googleAdsData: GoogleAdsRecord[] | null;
    bingAdsData: BingAdsRecord[] | null;
    isModalOpen: boolean;
    setIsModalOpen: (isOpen: boolean) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ clientData, lastUpdated, accountDetails, keyContact, itemsInFeedData, theme, feedStatus, percentApprovedData, storeStatus, currentStatus, onUpdateCurrentStatus, storeChanges, budgetStatus, revolutionLinks, googleSearchConsoleData, googleAnalyticsData, googleAdsData, bingAdsData, isModalOpen, setIsModalOpen }) => {
    
    // State for layouts
    const [overviewLayouts, setOverviewLayouts] = useState(() => {
        try {
            const saved = localStorage.getItem('dashboard-overview-layouts-v9');
            return saved ? JSON.parse(saved) : initialOverviewLayouts;
        } catch (e) { return initialOverviewLayouts; }
    });

    const [kpiLayouts, setKpiLayouts] = useState(() => {
        try {
            const saved = localStorage.getItem('dashboard-kpi-layouts-v9');
            return saved ? JSON.parse(saved) : initialKpiLayouts;
        } catch (e) { return initialKpiLayouts; }
    });

    const [chartLayouts, setChartLayouts] = useState(() => {
        try {
            const saved = localStorage.getItem('dashboard-chart-layouts-v8');
            return saved ? JSON.parse(saved) : initialChartLayouts;
        } catch (e) { return initialChartLayouts; }
    });

    // State for visible items
    const [selectedOverviewTiles, setSelectedOverviewTiles] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('dashboard-selected-overview-v6');
            return saved ? JSON.parse(saved) : defaultVisibleOverviewTileIds;
        } catch (e) { return defaultVisibleOverviewTileIds; }
    });

    const [selectedKpis, setSelectedKpis] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('dashboard-selected-kpis-v9');
            return saved ? JSON.parse(saved) : defaultVisibleKpiIds;
        } catch (e) { return defaultVisibleKpiIds; }
    });

    const [selectedCharts, setSelectedCharts] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('dashboard-selected-charts-v7');
            return saved ? JSON.parse(saved) : defaultVisibleChartIds;
        } catch (e) { return defaultVisibleChartIds; }
    });

    const [selectedTableColumns, setSelectedTableColumns] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('dashboard-selected-table-cols-v3');
            let columns = saved ? JSON.parse(saved) : defaultVisibleTableColumns;
            
            // Ensure permanent columns are always present
            const permanentCols = ['month', 'cancel_rate'];
            permanentCols.forEach(pCol => {
                if (!columns.includes(pCol)) {
                    const monthIndex = columns.indexOf('month');
                    if (pCol === 'cancel_rate' && monthIndex !== -1) {
                         columns.splice(monthIndex + 1, 0, pCol); // Add after month
                    } else {
                        columns.unshift(pCol); // Add to beginning
                    }
                }
            });

            return columns;
        } catch (e) { return defaultVisibleTableColumns; }
    });


    // State for time ranges
    const [chartTimeRange, setChartTimeRange] = useState<TimeRange>(() => (localStorage.getItem('dashboard-chart-time-range-v6') as TimeRange) || '12m');
    const [tableTimeRange, setTableTimeRange] = useState<TimeRange>(() => (localStorage.getItem('dashboard-table-time-range-v5') as TimeRange) || '12m');
    const [merchantTimeRange, setMerchantTimeRange] = useState<TimeRange>(() => (localStorage.getItem('dashboard-merchant-time-range-v1') as TimeRange) || '12m');
    const [organicSearchTimeRange, setOrganicSearchTimeRange] = useState<TimeRange>(() => (localStorage.getItem('dashboard-organic-search-time-range-v1') as TimeRange) || '12m');
    const [gaTimeRange, setGaTimeRange] = useState<TimeRange>(() => (localStorage.getItem('dashboard-ga-time-range-v1') as TimeRange) || '12m');
    const [googleAdsTimeRange, setGoogleAdsTimeRange] = useState<GoogleAdsTimeRange>(() => (localStorage.getItem('dashboard-google-ads-time-range-v1') as GoogleAdsTimeRange) || '3');
    const [googleAdsViewMode, setGoogleAdsViewMode] = useState<'time' | 'month'>(() => (localStorage.getItem('dashboard-google-ads-view-mode-v1') as 'time' | 'month') || 'time');
    const [googleAdsSelectedMonth, setGoogleAdsSelectedMonth] = useState<string>(() => localStorage.getItem('dashboard-google-ads-selected-month-v1') || '');

    const [bingAdsTimeRange, setBingAdsTimeRange] = useState<GoogleAdsTimeRange>(() => (localStorage.getItem('dashboard-bing-ads-time-range-v1') as GoogleAdsTimeRange) || '3');
    const [bingAdsViewMode, setBingAdsViewMode] = useState<'time' | 'month'>(() => (localStorage.getItem('dashboard-bing-ads-view-mode-v1') as 'time' | 'month') || 'time');
    const [bingAdsSelectedMonth, setBingAdsSelectedMonth] = useState<string>(() => localStorage.getItem('dashboard-bing-ads-selected-month-v1') || '');

    // State for organic details tile
    const [selectedOrganicMonth, setSelectedOrganicMonth] = useState<string>('');
    const [selectedGaMonth, setSelectedGaMonth] = useState<string>('');
    const [gaView, setGaView] = useState<'snapshot' | 'line' | 'bar'>('snapshot');


    // UI state
    const [isAiChatCollapsed, setIsAiChatCollapsed] = useState(true);

    // State for table sorting
    const [sortConfig, setSortConfig] = useState<{ key: keyof ClientDataRecord; direction: 'ascending' | 'descending' } | null>(null);

    const requestSort = (key: keyof ClientDataRecord) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const [scaleYAxisToZero, setScaleYAxisToZero] = useState<boolean>(() => localStorage.getItem('dashboard-scale-y-axis-v1') !== 'false');
    const [scaleMerchantYAxisToZero, setScaleMerchantYAxisToZero] = useState<boolean>(() => localStorage.getItem('dashboard-merchant-scale-y-axis-v1') !== 'false');
    const [scaleOrganicSearchYAxisToZero, setScaleOrganicSearchYAxisToZero] = useState<boolean>(() => localStorage.getItem('dashboard-organic-search-scale-y-axis-v1') !== 'false');

    // State for AI Chat prompt settings
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState<string>(() => localStorage.getItem('ai-chat-system-prompt') || DEFAULT_SYSTEM_PROMPT);
    const [editablePrompt, setEditablePrompt] = useState<string>(systemPrompt);

    // Table column reordering state
    const [draggedCol, setDraggedCol] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    // Persist state to localStorage
    useEffect(() => { localStorage.setItem('dashboard-overview-layouts-v9', JSON.stringify(overviewLayouts)); }, [overviewLayouts]);
    useEffect(() => { localStorage.setItem('dashboard-kpi-layouts-v9', JSON.stringify(kpiLayouts)); }, [kpiLayouts]);
    useEffect(() => { localStorage.setItem('dashboard-chart-layouts-v8', JSON.stringify(chartLayouts)); }, [chartLayouts]);
    useEffect(() => { localStorage.setItem('dashboard-selected-overview-v6', JSON.stringify(selectedOverviewTiles)); }, [selectedOverviewTiles]);
    useEffect(() => { localStorage.setItem('dashboard-selected-kpis-v9', JSON.stringify(selectedKpis)); }, [selectedKpis]);
    useEffect(() => { localStorage.setItem('dashboard-selected-charts-v7', JSON.stringify(selectedCharts)); }, [selectedCharts]);
    useEffect(() => { localStorage.setItem('dashboard-selected-table-cols-v3', JSON.stringify(selectedTableColumns)); }, [selectedTableColumns]);
    useEffect(() => { localStorage.setItem('dashboard-chart-time-range-v6', chartTimeRange); }, [chartTimeRange]);
    useEffect(() => { localStorage.setItem('dashboard-table-time-range-v5', tableTimeRange); }, [tableTimeRange]);
    useEffect(() => { localStorage.setItem('dashboard-scale-y-axis-v1', String(scaleYAxisToZero)); }, [scaleYAxisToZero]);
    useEffect(() => { localStorage.setItem('dashboard-merchant-time-range-v1', merchantTimeRange); }, [merchantTimeRange]);
    useEffect(() => { localStorage.setItem('dashboard-merchant-scale-y-axis-v1', String(scaleMerchantYAxisToZero)); }, [scaleMerchantYAxisToZero]);
    useEffect(() => { localStorage.setItem('dashboard-organic-search-time-range-v1', organicSearchTimeRange); }, [organicSearchTimeRange]);
    useEffect(() => { localStorage.setItem('dashboard-organic-search-scale-y-axis-v1', String(scaleOrganicSearchYAxisToZero)); }, [scaleOrganicSearchYAxisToZero]);
    useEffect(() => { localStorage.setItem('dashboard-ga-time-range-v1', gaTimeRange); }, [gaTimeRange]);
    useEffect(() => { localStorage.setItem('dashboard-google-ads-time-range-v1', googleAdsTimeRange); }, [googleAdsTimeRange]);
    useEffect(() => { localStorage.setItem('dashboard-google-ads-view-mode-v1', googleAdsViewMode); }, [googleAdsViewMode]);
    useEffect(() => { localStorage.setItem('dashboard-google-ads-selected-month-v1', googleAdsSelectedMonth); }, [googleAdsSelectedMonth]);
    useEffect(() => { localStorage.setItem('dashboard-bing-ads-time-range-v1', bingAdsTimeRange); }, [bingAdsTimeRange]);
    useEffect(() => { localStorage.setItem('dashboard-bing-ads-view-mode-v1', bingAdsViewMode); }, [bingAdsViewMode]);
    useEffect(() => { localStorage.setItem('dashboard-bing-ads-selected-month-v1', bingAdsSelectedMonth); }, [bingAdsSelectedMonth]);
    useEffect(() => { localStorage.setItem('ai-chat-system-prompt', systemPrompt); }, [systemPrompt]);

    // Sync editable prompt state when modal opens
    useEffect(() => {
        if (isPromptModalOpen) {
            setEditablePrompt(systemPrompt);
        }
    }, [isPromptModalOpen, systemPrompt]);

    // Handler to save the edited prompt
    const handleSavePrompt = useCallback(() => {
        setSystemPrompt(editablePrompt);
        setIsPromptModalOpen(false);
    }, [editablePrompt]);


    // Set default month for details tiles when data loads
    useEffect(() => {
        if (googleSearchConsoleData && googleSearchConsoleData.length > 0) {
            setSelectedOrganicMonth(googleSearchConsoleData[googleSearchConsoleData.length - 1].Date);
        } else {
            setSelectedOrganicMonth('');
        }
    }, [googleSearchConsoleData]);

    useEffect(() => {
        if (googleAnalyticsData && googleAnalyticsData.length > 0) {
            setSelectedGaMonth(googleAnalyticsData[googleAnalyticsData.length - 1].Date);
        } else {
            setSelectedGaMonth('');
        }
    }, [googleAnalyticsData]);

    useEffect(() => {
        if (googleAdsData && googleAdsData.length > 0) {
            const availableMonths = googleAdsData.map(d => d.Date);
            // If the saved month is no longer valid (e.g., data changed), or not set, pick the latest one.
            if (!googleAdsSelectedMonth || !availableMonths.includes(googleAdsSelectedMonth)) {
                setGoogleAdsSelectedMonth(googleAdsData[googleAdsData.length - 1].Date);
            }
        }
    }, [googleAdsData, googleAdsSelectedMonth]);

    useEffect(() => {
        if (bingAdsData && bingAdsData.length > 0) {
            const availableMonths = bingAdsData.map(d => d.Date);
            // If the saved month is no longer valid (e.g., data changed), or not set, pick the latest one.
            if (!bingAdsSelectedMonth || !availableMonths.includes(bingAdsSelectedMonth)) {
                setBingAdsSelectedMonth(bingAdsData[bingAdsData.length - 1].Date);
            }
        }
    }, [bingAdsData, bingAdsSelectedMonth]);

    const createLayoutChangeHandler = (setLayouts: React.Dispatch<React.SetStateAction<any>>) => (layout: any, allLayouts: any) => {
        setLayouts(prevLayouts => {
            const newFullLayouts = JSON.parse(JSON.stringify(prevLayouts));
            Object.keys(allLayouts).forEach(breakpoint => {
                if (allLayouts[breakpoint] && newFullLayouts[breakpoint]) {
                    allLayouts[breakpoint].forEach((newItem: { i: string }) => {
                        const index = newFullLayouts[breakpoint].findIndex((i: any) => i.i === newItem.i);
                        if (index !== -1) newFullLayouts[breakpoint][index] = newItem;
                    });
                }
            });
            return newFullLayouts;
        });
    };
    
    const onOverviewLayoutChange = useCallback(createLayoutChangeHandler(setOverviewLayouts), []);
    const onKpiLayoutChange = useCallback(createLayoutChangeHandler(setKpiLayouts), []);
    const onChartLayoutChange = useCallback(createLayoutChangeHandler(setChartLayouts), []);

    const createSelectionChangeHandler = (allIds: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => (id: string, isChecked: boolean) => {
        setSelected(prev => {
            const newSelection = new Set(prev);
            if (isChecked) newSelection.add(id); else newSelection.delete(id);
            // Ensure the order is preserved from the original definition
            return allIds.filter(i => newSelection.has(i));
        });
    };

    const handleOverviewTileSelectionChange = useCallback(createSelectionChangeHandler(allOverviewTileIds, setSelectedOverviewTiles), []);
    const handleKpiSelectionChange = useCallback(createSelectionChangeHandler(allKpiIds, setSelectedKpis), []);
    const handleChartSelectionChange = useCallback(createSelectionChangeHandler(allChartIds, setSelectedCharts), []);
    const handleTableColumnSelectionChange = useCallback(createSelectionChangeHandler(Object.keys(allTableColumnDefs), setSelectedTableColumns), []);
    
    // --- Column Drag Handlers ---
    const handleColDragStart = useCallback((e: React.DragEvent<HTMLTableCellElement>, colId: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', colId);
        setDraggedCol(colId);
    }, []);
    const handleColDragOver = useCallback((e: React.DragEvent<HTMLTableCellElement>, colId: string) => {
        e.preventDefault();
        if (colId !== dragOverCol) {
            setDragOverCol(colId);
        }
    }, [dragOverCol]);
    const handleColDrop = useCallback((e: React.DragEvent<HTMLTableCellElement>, targetColId: string) => {
        e.preventDefault();
        if (draggedCol && draggedCol !== targetColId) {
            const newCols = [...selectedTableColumns];
            const draggedIndex = newCols.indexOf(draggedCol);
            const targetIndex = newCols.indexOf(targetColId);
            
            const [removed] = newCols.splice(draggedIndex, 1);
            newCols.splice(targetIndex, 0, removed);
            setSelectedTableColumns(newCols);
        }
        setDraggedCol(null);
        setDragOverCol(null);
    }, [draggedCol, selectedTableColumns]);
     const handleColDragEnd = useCallback(() => {
        setDraggedCol(null);
        setDragOverCol(null);
    }, []);

    const projectionData = useMemo(() => {
        if (!clientData || clientData.length === 0) return null;

        const sortedData = [...clientData].sort((a, b) => new Date(b.Year, monthMap[b.Month.substring(0, 3)]).getTime() - new Date(a.Year, monthMap[a.Month.substring(0, 3)]).getTime());
        const latestMonthDataRaw = sortedData[0];
        if (!latestMonthDataRaw) return null;

        let displayMonthData: ClientDataRecord = { ...latestMonthDataRaw };
        let isProjected = false;

        const daysOfData = latestMonthDataRaw.Days_of_Data;
        if (typeof daysOfData === 'number' && daysOfData > 0) {
            const date = new Date(latestMonthDataRaw.Year, monthMap[latestMonthDataRaw.Month.substring(0, 3)]);
            const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

            if (daysOfData < daysInMonth) {
                isProjected = true;
                const projectionFactor = daysInMonth / daysOfData;
                
                const projectedRevenue = latestMonthDataRaw.Revenue * projectionFactor,
                      projectedOrders = latestMonthDataRaw.Orders * projectionFactor,
                      projectedProfit = latestMonthDataRaw.Profit * projectionFactor,
                      projectedPpcSpend = (latestMonthDataRaw.PPC_Spend || 0) * projectionFactor,
                      projectedSessions = latestMonthDataRaw.Sessions * projectionFactor,
                      projectedOrdersCanceled = (latestMonthDataRaw.Orders_Canceled || 0) * projectionFactor;

                displayMonthData = {
                    ...latestMonthDataRaw,
                    Revenue: projectedRevenue,
                    Orders: projectedOrders,
                    Profit: projectedProfit,
                    PPC_Spend: projectedPpcSpend,
                    Sessions: projectedSessions,
                    Orders_Canceled: projectedOrdersCanceled,
                    Canceled: projectedOrders > 0 ? (projectedOrdersCanceled / projectedOrders) * 100 : 0,
                    AOV: projectedOrders > 0 ? projectedRevenue / projectedOrders : 0,
                    ROAS: projectedPpcSpend > 0 ? projectedRevenue / projectedPpcSpend : 0,
                    Conv_Rate: projectedSessions > 0 ? (projectedOrders / projectedSessions) * 100 : 0,
                    Profit_Margin: projectedRevenue > 0 ? (projectedProfit / projectedRevenue) * 100 : 0,
                    Profit_Per_Order: projectedOrders > 0 ? projectedProfit / projectedOrders : 0,
                };
            }
        }
        
        const latestDate = new Date(displayMonthData.Year, monthMap[displayMonthData.Month.substring(0, 3)]);
        const prevMonthDate = new Date(latestDate.getFullYear(), latestDate.getMonth() - 1, 1);
        const prevYearDate = new Date(latestDate.getFullYear() - 1, latestDate.getMonth(), 1);

        const previousMonthData = sortedData.find(d => d.Year === prevMonthDate.getFullYear() && monthMap[d.Month.substring(0, 3)] === prevMonthDate.getMonth());
        const lastYearMonthData = sortedData.find(d => d.Year === prevYearDate.getFullYear() && monthMap[d.Month.substring(0, 3)] === prevYearDate.getMonth());

        return { displayMonthData, previousMonthData, lastYearMonthData, isProjected, latestMonthDataRaw };

    }, [clientData]);

    const processedTableData = useMemo(() => {
        let monthsToShow: number;
        switch (tableTimeRange) {
            case '3m': monthsToShow = 3; break;
            case '6m': monthsToShow = 6; break;
            case '12m': monthsToShow = 12; break;
            case '24m':
            default: monthsToShow = 24; break;
        }
    
        const dateSortedData = [...clientData].sort((a, b) => new Date(b.Year, monthMap[b.Month.substring(0, 3)]).getTime() - new Date(a.Year, monthMap[a.Month.substring(0, 3)]).getTime());
        
        if (dateSortedData.length === 0) return [];

        let tableData: ClientDataRecord[] = [...dateSortedData];

        if (projectionData?.isProjected) {
            const projectionRow: ClientDataRecord = {
                ...projectionData.displayMonthData,
                Month: `${projectionData.displayMonthData.Month} (Proj.)`,
                isProjection: true,
            };

            const actualsRow: ClientDataRecord = {
                ...projectionData.latestMonthDataRaw,
                Month: `${projectionData.latestMonthDataRaw.Month} (Actuals)`,
                isActuals: true,
            };
            
            tableData.splice(0, 1, actualsRow, projectionRow);
        }

        // Apply sorting if configured, but keep special rows at the top
        if (sortConfig) {
            const specialRows = tableData.filter(d => d.isProjection || d.isActuals);
            const regularRows = tableData.filter(d => !d.isProjection && !d.isActuals);

            regularRows.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];

                if (valA === undefined || valA === null) return 1;
                if (valB === undefined || valB === null) return -1;
                
                if (sortConfig.key === 'Month') {
                    const dateA = new Date(a.Year, monthMap[a.Month.substring(0, 3)]);
                    const dateB = new Date(b.Year, monthMap[b.Month.substring(0, 3)]);
                    if (dateA < dateB) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (dateA > dateB) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                }

                if (typeof valA === 'string' && typeof valB === 'string') {
                    return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }

                if (Number(valA) < Number(valB)) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (Number(valA) > Number(valB)) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });

            tableData = [...specialRows, ...regularRows];
        }
    
        return tableData.slice(0, monthsToShow);
    }, [clientData, tableTimeRange, projectionData, sortConfig]);

    const timeSeriesData = useMemo(() => {
        if (!clientData || clientData.length === 0) return null;

        const today = new Date();
        today.setDate(1); 
        today.setMonth(today.getMonth() - 1); 
        const endDate = today; 

        let monthsToShow: number;
        switch (chartTimeRange) {
            case '3m': monthsToShow = 3; break;
            case '6m': monthsToShow = 6; break;
            case '24m': monthsToShow = 24; break;
            case '12m':
            default: monthsToShow = 12; break;
        }

        const startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - (monthsToShow - 1));

        const filteredData = clientData.filter(d => {
            const recordDate = new Date(d.Year, monthMap[d.Month.substring(0, 3)]);
            return recordDate >= startDate && recordDate <= endDate;
        }).sort((a, b) => 
            new Date(a.Year, monthMap[a.Month.substring(0, 3)]).getTime() -
            new Date(b.Year, monthMap[b.Month.substring(0, 3)]).getTime()
        );

        if (filteredData.length === 0) return null;

        const labels = filteredData.map(d => `${d.Month.substring(0, 3)} ${d.Year}`);
        const extract = (key: keyof ClientDataRecord, defaultValue: number = 0) => filteredData.map(d => (d[key] as number) || defaultValue);

        return {
            labels, Revenue: extract('Revenue'), Profit: extract('Profit'), Orders: extract('Orders'), Sessions: extract('Sessions'),
            PPC_Spend: extract('PPC_Spend'), AOV: extract('AOV'), Conv_Rate: extract('Conv_Rate'), Canceled: extract('Canceled'),
            Avg_Fulfillment: extract('Avg_Fulfillment'), ROAS: extract('ROAS'), Profit_Margin: extract('Profit_Margin'),
            Profit_Per_Order: extract('Profit_Per_Order'), Pricing_Changes: filteredData.map(d => d.Pricing_Changes),
            Shipping_Changes: filteredData.map(d => d.Shipping_Changes), Strategy_Notes: filteredData.map(d => d.Strategy_Notes), Other_Notes: filteredData.map(d => d.Other_Notes),
        };
    }, [clientData, chartTimeRange]);

    const itemsInFeedChartData = useMemo(() => {
        if (!itemsInFeedData || itemsInFeedData.length === 0) return null;
    
        let daysToShow: number;
        switch (merchantTimeRange) {
            case '3m': daysToShow = 90; break;
            case '6m': daysToShow = 180; break;
            case '24m': daysToShow = 730; break;
            case '12m':
            default: daysToShow = 365; break;
        }
    
        // itemsInFeedData is already sorted by date
        const slicedData = itemsInFeedData.slice(-daysToShow);
        
        if (slicedData.length === 0) return null;
    
        return {
            labels: slicedData.map(d => d.date.toLocaleDateString('en-CA')), // YYYY-MM-DD
            counts: slicedData.map(d => d.count),
        };
    }, [itemsInFeedData, merchantTimeRange]);

    const organicSearchChartData = useMemo(() => {
        if (!googleSearchConsoleData || googleSearchConsoleData.length === 0) return null;

        let monthsToShow: number;
        switch (organicSearchTimeRange) {
            case '3m': monthsToShow = 3; break;
            case '6m': monthsToShow = 6; break;
            case '24m': monthsToShow = 24; break;
            case '12m':
            default: monthsToShow = 12; break;
        }
    
        // googleSearchConsoleData is already sorted by date
        const slicedData = googleSearchConsoleData.slice(-monthsToShow);

        if (slicedData.length === 0) return null;

        return {
            labels: slicedData.map(d => new Date(d.Date).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })),
            impressions: slicedData.map(d => d.Impressions),
            clicks: slicedData.map(d => d.Clicks),
        };
    }, [googleSearchConsoleData, organicSearchTimeRange]);
    
    const organicDetailsDataForSelectedMonth = useMemo(() => {
        if (!googleSearchConsoleData || !selectedOrganicMonth) return null;
        return googleSearchConsoleData.find(d => d.Date === selectedOrganicMonth) || null;
    }, [googleSearchConsoleData, selectedOrganicMonth]);

    const googleAnalyticsDataForSelectedMonth = useMemo(() => {
        if (!googleAnalyticsData || !selectedGaMonth) return null;
        return googleAnalyticsData.find(d => d.Date === selectedGaMonth) || null;
    }, [googleAnalyticsData, selectedGaMonth]);

    const getChange = (current: number, previous: number | undefined) => {
        if (previous === undefined || previous === 0) {
            return { value: 'N/A', positive: true };
        }
        const change = ((current - previous) / previous) * 100;
        return {
            value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
            positive: change >= 0
        };
    };

    const positiveMetrics: (keyof ClientDataRecord)[] = ['Revenue', 'Profit', 'Orders', 'Sessions', 'Conv_Rate', 'AOV', 'ROAS'];

    const columnStats = useMemo(() => {
        const stats: { [key: string]: { min: number; max: number; } } = {};
        const dataToAnalyze = processedTableData.filter(d => !d.isProjection && !d.isActuals);
        if (dataToAnalyze.length === 0) return stats;

        const colorableColumns = Object.values(allTableColumnDefs)
            .filter(def => ['currency', 'percent', 'number', 'roas', 'days'].includes(def.format || ''))
            .map(def => def.dataKey);

        colorableColumns.forEach(key => {
            const values = dataToAnalyze
                .map(row => row[key] as number)
                .filter(v => typeof v === 'number' && isFinite(v));
            
            if (values.length > 1) {
                stats[key] = {
                    min: Math.min(...values),
                    max: Math.max(...values),
                };
            }
        });
        return stats;
    }, [processedTableData]);


    const { fullChartDefs, visibleChartDefs } = useMemo(() => {
        const { colors } = theme;
        const chartDefs: any[] = [];
        if (timeSeriesData) {
             const getChartOptions = (formatType: any, scaleToZero: boolean) => ({
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, datalabels: { display: false } },
                scales: {
                    y: { beginAtZero: scaleToZero, ticks: { color: colors['--color-text-secondary'], callback: (value: any) => formatValue(value, formatType) }, grid: { color: colors['--color-border'] } },
                    x: { ticks: { color: colors['--color-text-secondary'] }, grid: { display: false } }
                }
            } as any);
             const getDualAxisOptions = (y1Fmt: any, y2Fmt: any, y1Color: string, y2Color: string, scale: boolean) => ({
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'top', labels: { color: colors['--color-text-secondary'] } }, datalabels: { display: false } },
                scales: {
                    y: { type: 'linear', display: true, position: 'left', beginAtZero: scale, ticks: { color: y1Color, callback: (v: any) => formatValue(v, y1Fmt) }, grid: { color: colors['--color-border'] } },
                    y1: { type: 'linear', display: true, position: 'right', beginAtZero: scale, ticks: { color: y2Color, callback: (v: any) => formatValue(v, y2Fmt) }, grid: { drawOnChartArea: false } },
                    x: { ticks: { color: colors['--color-text-secondary'] }, grid: { display: false } }
                }
            } as any);
             chartDefs.push(...[
                { id: 'revenue_orders', title: '💰 Revenue & Orders', labels: timeSeriesData.labels, datasets: [ { label: 'Revenue', data: timeSeriesData.Revenue, yAxisID: 'y', borderColor: colors['--color-accent'], backgroundColor: `color-mix(in srgb, ${colors['--color-accent']} 20%, transparent)`, borderWidth: 2, fill: true, tension: 0.4 }, { label: 'Orders', data: timeSeriesData.Orders, yAxisID: 'y1', borderColor: colors['--color-accent-secondary'], backgroundColor: `color-mix(in srgb, ${colors['--color-accent-secondary']} 20%, transparent)`, borderWidth: 2, fill: true, tension: 0.4 } ], options: getDualAxisOptions('currency', 'number', colors['--color-accent'], colors['--color-accent-secondary'], scaleYAxisToZero), },
                { id: 'ppc_roas', title: '🎯 PPC Spend & ROAS', labels: timeSeriesData.labels, datasets: [ { label: 'PPC Spend', data: timeSeriesData.PPC_Spend, yAxisID: 'y', borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.2)', borderWidth: 2, fill: true, tension: 0.4 }, { label: 'ROAS', data: timeSeriesData.ROAS, yAxisID: 'y1', borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 2, fill: true, tension: 0.4 } ], options: getDualAxisOptions('currency', 'roas', '#f97316', '#3b82f6', scaleYAxisToZero), },
                { id: 'ppc_revenue', title: '💸 PPC Spend vs. Revenue', labels: timeSeriesData.labels, datasets: [ { label: 'Revenue', data: timeSeriesData.Revenue, yAxisID: 'y', borderColor: colors['--color-accent'], backgroundColor: `color-mix(in srgb, ${colors['--color-accent']} 20%, transparent)`, borderWidth: 2, fill: true, tension: 0.4 }, { label: 'PPC Spend', data: timeSeriesData.PPC_Spend, yAxisID: 'y1', borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.2)', borderWidth: 2, fill: true, tension: 0.4 } ], options: getDualAxisOptions('currency', 'currency', colors['--color-accent'], '#f97316', scaleYAxisToZero), },
                { id: 'canceled_fulfillment', title: '🚚 Canceled & Fulfillment', labels: timeSeriesData.labels, datasets: [ { label: 'Canceled', data: timeSeriesData.Canceled, yAxisID: 'y', borderColor: colors['--color-negative'], backgroundColor: `color-mix(in srgb, ${colors['--color-negative']} 20%, transparent)`, borderWidth: 2, fill: true, tension: 0.4 }, { label: 'Avg Fulfillment', data: timeSeriesData.Avg_Fulfillment, yAxisID: 'y1', borderColor: '#d946ef', backgroundColor: 'rgba(217, 70, 239, 0.2)', borderWidth: 2, fill: true, tension: 0.4 } ], options: getDualAxisOptions('percent', 'days', colors['--color-negative'], '#d946ef', scaleYAxisToZero), },
                { id: 'aov_conv_rate', title: '🛒 AOV & Conv. Rate', labels: timeSeriesData.labels, datasets: [ { label: 'AOV', data: timeSeriesData.AOV, yAxisID: 'y', borderColor: '#eab308', backgroundColor: 'rgba(234, 179, 8, 0.2)', borderWidth: 2, fill: true, tension: 0.4 }, { label: 'Conv. Rate', data: timeSeriesData.Conv_Rate, yAxisID: 'y1', borderColor: '#4fc3f7', backgroundColor: 'rgba(79, 195, 247, 0.2)', borderWidth: 2, fill: true, tension: 0.4 } ], options: getDualAxisOptions('currency', 'percent', '#eab308', '#4fc3f7', scaleYAxisToZero), },
                { id: 'profit_margin_per_order', title: '💹 Profit Margin & Profit/Order', labels: timeSeriesData.labels, datasets: [ { label: 'Profit Margin', data: timeSeriesData.Profit_Margin, yAxisID: 'y', borderColor: colors['--color-positive'], backgroundColor: `color-mix(in srgb, ${colors['--color-positive']} 20%, transparent)`, borderWidth: 2, fill: true, tension: 0.4 }, { label: 'Profit/Order', data: timeSeriesData.Profit_Per_Order, yAxisID: 'y1', borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 2, fill: true, tension: 0.4 } ], options: getDualAxisOptions('percent', 'currency', colors['--color-positive'], '#f59e0b', scaleYAxisToZero), },
                { id: 'profit', title: '💵 Profit', labels: timeSeriesData.labels, datasets: [{ label: 'Profit', data: timeSeriesData.Profit, borderColor: colors['--color-positive'], backgroundColor: `color-mix(in srgb, ${colors['--color-positive']} 20%, transparent)`, borderWidth: 2, fill: true, tension: 0.4 }], options: getChartOptions('currency', scaleYAxisToZero) },
                { id: 'sessions', title: '👥 Sessions', labels: timeSeriesData.labels, datasets: [{ label: 'Sessions', data: timeSeriesData.Sessions, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 2, fill: true, tension: 0.4 }], options: getChartOptions('number', scaleYAxisToZero) },
                { id: 'aov', title: '🛒 Avg. Order Value', labels: timeSeriesData.labels, datasets: [{ label: 'AOV', data: timeSeriesData.AOV, borderColor: '#eab308', backgroundColor: 'rgba(234, 179, 8, 0.2)', borderWidth: 2, fill: true, tension: 0.4 }], options: getChartOptions('currency', scaleYAxisToZero) },
                { id: 'conv_rate', title: '📈 Conversion Rate', labels: timeSeriesData.labels, datasets: [{ label: 'Conv. Rate', data: timeSeriesData.Conv_Rate, borderColor: '#4fc3f7', backgroundColor: 'rgba(79, 195, 247, 0.2)', borderWidth: 2, fill: true, tension: 0.4 }], options: getChartOptions('percent', scaleYAxisToZero) },
                { id: 'revenue_solo', title: '💰 Revenue', labels: timeSeriesData.labels, datasets: [{ label: 'Revenue', data: timeSeriesData.Revenue, borderColor: colors['--color-accent'], backgroundColor: `color-mix(in srgb, ${colors['--color-accent']} 20%, transparent)`, borderWidth: 2, fill: true, tension: 0.4 }], options: getChartOptions('currency', scaleYAxisToZero) },
                { id: 'orders_solo', title: '📦 Orders', labels: timeSeriesData.labels, datasets: [{ label: 'Orders', data: timeSeriesData.Orders, borderColor: colors['--color-accent-secondary'], backgroundColor: `color-mix(in srgb, ${colors['--color-accent-secondary']} 20%, transparent)`, borderWidth: 2, fill: true, tension: 0.4 }], options: getChartOptions('number', scaleYAxisToZero) },
                { id: 'ppc_spend_solo', title: '💸 PPC Spend', labels: timeSeriesData.labels, datasets: [{ label: 'PPC Spend', data: timeSeriesData.PPC_Spend, borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.2)', borderWidth: 2, fill: true, tension: 0.4 }], options: getChartOptions('currency', scaleYAxisToZero) },
                { id: 'roas_solo', title: '🎯 ROAS', labels: timeSeriesData.labels, datasets: [{ label: 'ROAS', data: timeSeriesData.ROAS, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 2, fill: true, tension: 0.4 }], options: getChartOptions('roas', scaleYAxisToZero) },
                { id: 'fulfillment_solo', title: '🚚 Avg. Fulfillment', labels: timeSeriesData.labels, datasets: [{ label: 'Avg Fulfillment', data: timeSeriesData.Avg_Fulfillment, borderColor: '#d946ef', backgroundColor: 'rgba(217, 70, 239, 0.2)', borderWidth: 2, fill: true, tension: 0.4 }], options: getChartOptions('days', scaleYAxisToZero) },
                { id: 'canceled_solo', title: '❌ Canceled Rate', labels: timeSeriesData.labels, datasets: [{ label: 'Canceled', data: timeSeriesData.Canceled, borderColor: colors['--color-negative'], backgroundColor: `color-mix(in srgb, ${colors['--color-negative']} 20%, transparent)`, borderWidth: 2, fill: true, tension: 0.4 }], options: getChartOptions('percent', scaleYAxisToZero) },
            ]);
        }
        return { fullChartDefs: chartDefs, visibleChartDefs: chartDefs.filter(c => selectedCharts.includes(c.id)) };
    }, [timeSeriesData, selectedCharts, scaleYAxisToZero, theme.colors]);

    const fullKpiDefs = { revenue: { i: '💰', t: 'Revenue', m: 'Revenue', f: 'currency' }, orders: { i: '📦', t: 'Orders', m: 'Orders', f: 'number' }, profit: { i: '💵', t: 'Profit', m: 'Profit', f: 'currency' }, sessions: { i: '👥', t: 'Sessions', m: 'Sessions', f: 'number' }, ppc_spend: { i: '💸', t: 'PPC Spend', m: 'PPC_Spend', f: 'currency' }, roas: { i: '🎯', t: 'ROAS', m: 'ROAS', f: 'roas' }, aov: { i: '🛒', t: 'AOV', m: 'AOV', f: 'currency' }, conv_rate: { i: '📈', t: 'Conv. Rate', m: 'Conv_Rate', f: 'percent' }, };
    const visibleKpiDefs = Object.entries(fullKpiDefs).filter(([id]) => selectedKpis.includes(id));

    const fullOverviewTileDefs = {
        snapshot_and_links: { comp: <SnapshotAndLinksTile clientData={clientData} revolutionLinks={revolutionLinks} storeChanges={storeChanges} /> },
        budget_status: { comp: budgetStatus ? <BudgetStatusTile budgetStatus={budgetStatus} accountDetails={accountDetails} /> : null, date: budgetStatus?.ClientName ? new Date() : null },
        feed_status: { comp: feedStatus ? <FeedStatusTile feedStatus={feedStatus} percentApprovedData={percentApprovedData} accountDetails={accountDetails} revolutionLinks={revolutionLinks} /> : null, date: feedStatus?.lastChecked || percentApprovedData?.date },
        store_status: { comp: storeStatus ? <StoreStatusTile storeStatus={storeStatus} accountDetails={accountDetails} currentStatus={currentStatus} onUpdateStatus={onUpdateCurrentStatus} /> : null, date: storeStatus?.date },
        items_in_feed: { comp: itemsInFeedChartData ? <ChartWrapper type="line" data={{ labels: itemsInFeedChartData.labels, datasets: [{ label: 'Items', data: itemsInFeedChartData.counts, borderColor: theme.colors['--color-accent-secondary'], backgroundColor: `color-mix(in srgb, ${theme.colors['--color-accent-secondary']} 20%, transparent)`, borderWidth: 2, fill: true, tension: 0.4 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { display: false } }, scales: { y: { beginAtZero: scaleMerchantYAxisToZero, ticks: { color: theme.colors['--color-text-secondary'], callback: (v: any) => v.toLocaleString() }, grid: { color: theme.colors['--color-border'] } }, x: { ticks: { color: theme.colors['--color-text-secondary'], maxTicksLimit: 8 }, grid: { display: false } } } }} /> : null },
        google_ads: { comp: googleAdsData ? <GoogleAdsTile allData={googleAdsData} viewMode={googleAdsViewMode} timeRange={googleAdsTimeRange} selectedMonth={googleAdsSelectedMonth} /> : null },
        organic_search: { comp: organicSearchChartData ? <ChartWrapper type="line" data={{ labels: organicSearchChartData.labels, datasets: [{ label: 'Impressions', yAxisID: 'y', data: organicSearchChartData.impressions, borderColor: theme.colors['--color-accent-secondary'], backgroundColor: `color-mix(in srgb, ${theme.colors['--color-accent-secondary']} 20%, transparent)`, borderWidth: 2, fill: true, tension: 0.4 }, { label: 'Clicks', yAxisID: 'y1', data: organicSearchChartData.clicks, borderColor: theme.colors['--color-accent'], backgroundColor: `color-mix(in srgb, ${theme.colors['--color-accent']} 20%, transparent)`, borderWidth: 2, fill: true, tension: 0.4 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top', labels: { color: theme.colors['--color-text-secondary'] } }, datalabels: { display: false } }, scales: { y: { type: 'linear', display: true, position: 'left', beginAtZero: scaleOrganicSearchYAxisToZero, ticks: { color: theme.colors['--color-text-secondary'], callback: (v: any) => v.toLocaleString() }, grid: { color: theme.colors['--color-border'] } }, y1: { type: 'linear', display: true, position: 'right', beginAtZero: scaleOrganicSearchYAxisToZero, ticks: { color: theme.colors['--color-text-secondary'], callback: (v: any) => v.toLocaleString() }, grid: { drawOnChartArea: false } }, x: { ticks: { color: theme.colors['--color-text-secondary'], maxTicksLimit: 12 }, grid: { display: false } } } }} /> : null },
        google_analytics: { comp: googleAnalyticsData ? <GoogleAnalyticsTile view={gaView} snapshotData={googleAnalyticsDataForSelectedMonth} trendData={googleAnalyticsData} timeRange={gaTimeRange} theme={theme} /> : null },
        organic_details: { comp: organicDetailsDataForSelectedMonth ? <TopOrganicPerformanceTile data={organicDetailsDataForSelectedMonth} accountDetails={accountDetails} /> : null },
        bing_ads: { comp: bingAdsData ? <BingAdsTile allData={bingAdsData} viewMode={bingAdsViewMode} timeRange={bingAdsTimeRange} selectedMonth={bingAdsSelectedMonth} /> : null },
    };

    const getTileDate = (id: string) => {
        const tile = (fullOverviewTileDefs as any)[id];
        if (tile && tile.date) return tile.date;
    
        if (id === 'google_analytics' && googleAnalyticsData && googleAnalyticsData.length > 0) {
            const latestRecord = googleAnalyticsData[googleAnalyticsData.length - 1];
            const dateString = latestRecord.DateRan || latestRecord.Date;
            if (dateString) return new Date(dateString);
        }
        
        if (id === 'google_ads' && googleAdsData && googleAdsData.length > 0) {
            const latestRecord = googleAdsData[googleAdsData.length - 1];
            const dateString = latestRecord.DateRan || latestRecord.Date;
            if (dateString) return new Date(dateString);
        }
        
        // Fallback for all these tiles to the general last updated time
        if ((id === 'google_ads' || id === 'google_analytics' || id === 'organic_search' || id === 'organic_details') && lastUpdated) return lastUpdated;
        
        return undefined;
    };

    return (
        <main className="flex flex-col gap-12">
            {isModalOpen && (
                 <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
                     <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-2xl w-full max-w-4xl">
                         <div className="p-5 border-b border-[var(--color-border)] flex justify-between items-center"><h3 className="text-xl font-semibold text-[var(--color-text-primary)]">Customize Dashboard</h3><button onClick={() => setIsModalOpen(false)} aria-label="Close" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                         <div className="p-6 max-h-[70vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                            <div>
                                 <h4 className="text-lg font-semibold mb-4 text-[var(--color-text-accent)]">⭐ Overview Tiles</h4>
                                <div className="space-y-3">{Object.entries(allOverviewTileDefs).map(([id, def]) => (<label key={id} className="flex items-center space-x-3 bg-black/20 p-3 rounded-lg hover:bg-black/30 cursor-pointer transition-colors"><input type="checkbox" className="h-5 w-5 rounded bg-slate-700 border-slate-500 text-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]" checked={selectedOverviewTiles.includes(id)} onChange={(e) => handleOverviewTileSelectionChange(id, e.target.checked)} /><span className="text-[var(--color-text-primary)] select-none text-sm">{def.title}</span></label>))}</div>
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold mb-4 text-[var(--color-text-accent)]">📈 KPI Tiles</h4>
                                <div className="space-y-3">{Object.entries(fullKpiDefs).map(([id, def]) => (<label key={id} className="flex items-center space-x-3 bg-black/20 p-3 rounded-lg hover:bg-black/30 cursor-pointer transition-colors"><input type="checkbox" className="h-5 w-5 rounded bg-slate-700 border-slate-500 text-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]" checked={selectedKpis.includes(id)} onChange={(e) => handleKpiSelectionChange(id, e.target.checked)} /><span className="text-[var(--color-text-primary)] select-none">{def.i} {def.t}</span></label>))}</div>
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold mb-4 text-[var(--color-text-accent)]">📊 Chart Tiles</h4>
                                <div className="space-y-3">{fullChartDefs.map(chart => (<label key={chart.id} className="flex items-center space-x-3 bg-black/20 p-3 rounded-lg hover:bg-black/30 cursor-pointer transition-colors"><input type="checkbox" className="h-5 w-5 rounded bg-slate-700 border-slate-500 text-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]" checked={selectedCharts.includes(chart.id)} onChange={(e) => handleChartSelectionChange(chart.id, e.target.checked)} /><span className="text-[var(--color-text-primary)] select-none text-sm">{chart.title}</span></label>))}</div>
                            </div>
                            <div className="md:col-span-3">
                                <h4 className="text-lg font-semibold mt-2 mb-4 text-[var(--color-text-accent)]">📋 Table Columns</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {Object.entries(allTableColumnDefs).map(([id, def]) => {
                                        const isPermanent = ['month', 'cancel_rate'].includes(id);
                                        return ( <label key={id} className={`flex items-center space-x-3 bg-black/20 p-3 rounded-lg transition-colors ${isPermanent ? 'cursor-not-allowed opacity-70' : 'hover:bg-black/30 cursor-pointer'}`}><input type="checkbox" className="h-5 w-5 rounded bg-slate-700 border-slate-500 text-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50" checked={selectedTableColumns.includes(id)} onChange={(e) => handleTableColumnSelectionChange(id, e.target.checked)} disabled={isPermanent} /><span className="text-[var(--color-text-primary)] select-none text-sm">{def.header}</span></label> )
                                    })}
                                </div>
                            </div>
                         </div>
                         <div className="p-4 bg-black/20 rounded-b-xl flex justify-end"><button onClick={() => setIsModalOpen(false)} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-2 px-6 rounded-lg transition-colors">Done</button></div>
                     </div>
                 </div>
            )}

            {isPromptModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
                    <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-2xl w-full max-w-2xl">
                        <div className="p-5 border-b border-[var(--color-border)] flex justify-between items-center">
                            <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">Edit System Prompt</h3>
                            <button onClick={() => setIsPromptModalOpen(false)} aria-label="Close" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                                This is the base instruction given to the AI on every request. You can edit its personality, instructions, and analysis focus here.
                            </p>
                            <textarea
                                value={editablePrompt}
                                onChange={(e) => setEditablePrompt(e.target.value)}
                                className="w-full h-80 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-3 font-mono"
                                aria-label="System Prompt Editor"
                            />
                        </div>
                        <div className="p-4 bg-black/20 rounded-b-xl flex justify-end gap-4">
                            <button onClick={() => setIsPromptModalOpen(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleSavePrompt} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-2 px-6 rounded-lg transition-colors">Save</button>
                        </div>
                    </div>
                </div>
            )}

            <section>
                <div className="text-2xl text-center font-semibold mb-6 text-[var(--color-text-primary)]">
                    Client Overview
                </div>
                <ResponsiveGridLayout className="layout" layouts={overviewLayouts} onLayoutChange={onOverviewLayoutChange} breakpoints={{lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0}} cols={{lg: 2, md: 2, sm: 1, xs: 1, xxs: 1}} rowHeight={400} draggableHandle=".drag-handle" isDraggable={true} isResizable={true}>
                    {selectedOverviewTiles.map(id => {
                        const def = allOverviewTileDefs[id];
                        const tileContent = (fullOverviewTileDefs as any)[id]?.comp;

                        let headerControls = null;
                        if (id === 'items_in_feed') {
                            headerControls = (<select value={merchantTimeRange} onChange={e => setMerchantTimeRange(e.target.value as TimeRange)} aria-label="Select time range for items in feed chart" className="text-xs bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] p-1.5"><option value="3m">3 Months</option><option value="6m">6 Months</option><option value="12m">12 Months</option><option value="24m">2 Years</option></select>);
                        } else if (id === 'organic_search') {
                            headerControls = (<select value={organicSearchTimeRange} onChange={e => setOrganicSearchTimeRange(e.target.value as TimeRange)} aria-label="Select time range for GSC chart" className="text-xs bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] p-1.5"><option value="3m">3 Months</option><option value="6m">6 Months</option><option value="12m">12 Months</option><option value="24m">2 Years</option></select>);
                        } else if (id === 'organic_details' && googleSearchConsoleData) {
                            headerControls = (<select value={selectedOrganicMonth} onChange={e => setSelectedOrganicMonth(e.target.value)} aria-label="Select month for GSC details" className="text-xs bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] p-1.5">{[...googleSearchConsoleData].reverse().map(d => <option key={d.Date} value={d.Date}>{new Date(d.Date).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</option>)}</select>);
                        } else if (id === 'google_analytics' && googleAnalyticsData) {
                            headerControls = (
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-black/20 p-1 rounded-lg">
                                        <button onClick={() => setGaView('snapshot')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${gaView === 'snapshot' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>Snapshot</button>
                                        <button onClick={() => setGaView('line')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${gaView === 'line' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>Trend</button>
                                        <button onClick={() => setGaView('bar')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${gaView === 'bar' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>Stacked</button>
                                    </div>
                                    {gaView === 'snapshot' ? (
                                        <select value={selectedGaMonth} onChange={e => setSelectedGaMonth(e.target.value)} aria-label="Select month for GA details" className="text-xs bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] p-1.5">{[...googleAnalyticsData].reverse().map(d => <option key={d.Date} value={d.Date}>{new Date(d.Date).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</option>)}</select>
                                    ) : (
                                        <select value={gaTimeRange} onChange={e => setGaTimeRange(e.target.value as TimeRange)} aria-label="Select time range for GA chart" className="text-xs bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] p-1.5"><option value="3m">3 Months</option><option value="6m">6 Months</option><option value="12m">12 Months</option><option value="24m">2 Years</option></select>
                                    )}
                                </div>
                            );
                        } else if (id === 'google_ads') {
                            headerControls = (
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-black/20 p-1 rounded-lg">
                                        <button onClick={() => setGoogleAdsViewMode('time')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${googleAdsViewMode === 'time' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>Time Range</button>
                                        <button onClick={() => setGoogleAdsViewMode('month')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${googleAdsViewMode === 'month' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>Month</button>
                                    </div>
                                    {googleAdsViewMode === 'time' ? (
                                        <select value={googleAdsTimeRange} onChange={e => setGoogleAdsTimeRange(e.target.value as GoogleAdsTimeRange)} aria-label="Select time range for Google Ads tile" className="text-xs bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] p-1.5">
                                            <option value="1">Last Month</option>
                                            <option value="3">Last 3 Months</option>
                                            <option value="6">Last 6 Months</option>
                                            <option value="9">Last 9 Months</option>
                                            <option value="12">Last 12 Months</option>
                                        </select>
                                    ) : (
                                        <select value={googleAdsSelectedMonth} onChange={e => setGoogleAdsSelectedMonth(e.target.value)} aria-label="Select month for Google Ads tile" className="text-xs bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] p-1.5">
                                            {googleAdsData && [...googleAdsData].reverse().map(d => <option key={d.Date} value={d.Date}>{new Date(d.Date).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</option>)}
                                        </select>
                                    )}
                                </div>
                            );
                        } else if (id === 'bing_ads') {
                            headerControls = (
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-black/20 p-1 rounded-lg">
                                        <button onClick={() => setBingAdsViewMode('time')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${bingAdsViewMode === 'time' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>Time Range</button>
                                        <button onClick={() => setBingAdsViewMode('month')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${bingAdsViewMode === 'month' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>Month</button>
                                    </div>
                                    {bingAdsViewMode === 'time' ? (
                                        <select value={bingAdsTimeRange} onChange={e => setBingAdsTimeRange(e.target.value as GoogleAdsTimeRange)} aria-label="Select time range for Bing Ads tile" className="text-xs bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] p-1.5">
                                            <option value="1">Last Month</option>
                                            <option value="3">Last 3 Months</option>
                                            <option value="6">Last 6 Months</option>
                                            <option value="9">Last 9 Months</option>
                                            <option value="12">Last 12 Months</option>
                                        </select>
                                    ) : (
                                        <select value={bingAdsSelectedMonth} onChange={e => setBingAdsSelectedMonth(e.target.value)} aria-label="Select month for Bing Ads tile" className="text-xs bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] p-1.5">
                                            {bingAdsData && [...bingAdsData].reverse().map(d => <option key={d.Date} value={d.Date}>{new Date(d.Date).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</option>)}
                                        </select>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <div key={id}>
                                <ChartGridItem title={def.title} subtitle={def.subtitle} headerControls={headerControls}>
                                    {tileContent ? tileContent : (
                                        <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
                                            <div className="text-center">
                                                <p>Data Not Available</p>
                                                <p className="text-xs">Check Connections</p>
                                            </div>
                                        </div>
                                    )}
                                </ChartGridItem>
                            </div>
                        )
                    })}
                </ResponsiveGridLayout>
            </section>
            
             {/* --- KPI SECTION --- */}
            <section>
                <div className="text-2xl text-center font-semibold mb-6 text-[var(--color-text-primary)] flex items-center justify-center gap-4">
                    <span>{projectionData?.isProjected ? `${projectionData.displayMonthData.Month} Monthly Projection` : `${projectionData?.displayMonthData.Month} Performance`}</span>
                    {projectionData?.isProjected && (
                        <div className="group relative flex items-center">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--color-text-accent)]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                             <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max hidden group-hover:block bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] text-xs rounded py-1 px-2 shadow-lg z-10">Based on {projectionData?.latestMonthDataRaw.Days_of_Data} days of data</span>
                        </div>
                    )}
                </div>
                {projectionData ? (
                    <ResponsiveGridLayout className="layout" layouts={kpiLayouts} onLayoutChange={onKpiLayoutChange} breakpoints={{lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0}} cols={{lg: 4, md: 4, sm: 2, xs: 1, xxs: 1}} rowHeight={220} draggableHandle=".drag-handle" isDraggable={true} isResizable={true}>
                        {visibleKpiDefs.map(([id, def]) => {
                            const { displayMonthData, previousMonthData, lastYearMonthData } = projectionData;
                            const metricKey = def.m as keyof ClientDataRecord;
                            const currentVal = displayMonthData[metricKey] as number, prevVal = previousMonthData?.[metricKey] as number | undefined, yearVal = lastYearMonthData?.[metricKey] as number | undefined;
                            const mom = getChange(currentVal, prevVal), yoy = getChange(currentVal, yearVal);
                            const isPositive = mom.value !== 'N/A' ? mom.positive : yoy.positive;
                            const changes = [ { ...mom, label: `vs ${previousMonthData?.Month.substring(0,3) || 'Prev'}`}, { ...yoy, label: `vs ${lastYearMonthData?.Month.substring(0,3) || ''} ${lastYearMonthData?.Year || ''}`} ];
                            return (
                                <div key={id}>
                                    <KpiGridItem 
                                        icon={def.i}
                                        title={def.t}
                                        positive={isPositive} 
                                        value={formatValue(currentVal, def.f as any)} 
                                        changes={changes} 
                                    />
                                </div>
                            );
                        })}
                    </ResponsiveGridLayout>
                ) : (
                    <div className="text-center p-8 bg-black/20 rounded-lg"><p className="text-[var(--color-text-secondary)]">No performance data available for the latest month.</p></div>
                )}
            </section>
            
            {/* --- AI CHAT SECTION --- */}
            <section>
                <button onClick={() => setIsAiChatCollapsed(prev => !prev)} className="w-full text-left text-xl font-semibold mb-4 flex items-center justify-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform ${isAiChatCollapsed ? 'rotate-0' : 'rotate-90'}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    <span>Chat with your Data</span>
                    <button onClick={(e) => { e.stopPropagation(); setIsPromptModalOpen(true); }} className="p-1.5 rounded-full hover:bg-black/20 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" title="Edit System Prompt">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    </button>
                </button>
                {!isAiChatCollapsed && (
                    <ChatWithData clientData={clientData} accountDetails={accountDetails} systemPrompt={systemPrompt} googleAnalyticsData={googleAnalyticsData} />
                )}
            </section>

             {/* --- CHART SECTION --- */}
            <section>
                <div className="flex items-center justify-center gap-4 mb-6">
                    <h2 className="text-2xl text-center font-semibold text-[var(--color-text-primary)]">Performance Trends</h2>
                    <select value={chartTimeRange} onChange={(e) => setChartTimeRange(e.target.value as TimeRange)} aria-label="Select time range for charts" className="text-sm bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-1.5"><option value="3m">3 Months</option><option value="6m">6 Months</option><option value="12m">12 Months</option><option value="24m">2 Years</option></select>
                    <label className="flex items-center space-x-2 text-sm text-[var(--color-text-secondary)] cursor-pointer"><input type="checkbox" checked={scaleYAxisToZero} onChange={(e) => setScaleYAxisToZero(e.target.checked)} className="h-4 w-4 rounded bg-slate-700 border-slate-500 text-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]" /><span>Scale to 0</span></label>
                </div>
                {visibleChartDefs.length > 0 ? (
                    <ResponsiveGridLayout className="layout" layouts={chartLayouts} onLayoutChange={onChartLayoutChange} breakpoints={{lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0}} cols={{lg: 2, md: 2, sm: 1, xs: 1, xxs: 1}} rowHeight={300} draggableHandle=".drag-handle" isDraggable={true} isResizable={true}>
                        {visibleChartDefs.map(chart => (<div key={chart.id}><ChartGridItem title={chart.title}><div className="h-full"><ChartWrapper type="line" data={{ labels: chart.labels, datasets: chart.datasets }} options={chart.options} /></div></ChartGridItem></div>))}
                    </ResponsiveGridLayout>
                ) : (
                    <div className="text-center p-8 bg-black/20 rounded-lg"><p className="text-[var(--color-text-secondary)]">No charts selected. Use the customize button to add charts.</p></div>
                )}
            </section>
            
            {/* --- TABLE SECTION --- */}
            <section className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] rounded-xl p-6 shadow-2xl border border-[var(--color-border)]">
                <div className="flex items-center justify-center gap-4 mb-4">
                    <h2 className="text-2xl text-center font-semibold text-[var(--color-text-primary)]">📋 Performance Data</h2>
                    <select value={tableTimeRange} onChange={(e) => setTableTimeRange(e.target.value as TimeRange)} aria-label="Select time range for table" className="text-sm bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-1.5">
                        <option value="3m">3 Months</option>
                        <option value="6m">6 Months</option>
                        <option value="12m">12 Months</option>
                        <option value="24m">2 Years</option>
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm whitespace-nowrap">
                        <thead className="bg-[var(--color-bg-secondary)]">
                            <tr>
                                {selectedTableColumns.map(colId => {
                                    const def = allTableColumnDefs[colId as keyof typeof allTableColumnDefs];
                                    if (!def) return null;
                                    const isMonthCol = colId === 'month';
                                    return <th key={colId} draggable onDragStart={(e) => handleColDragStart(e, colId)} onDragOver={(e) => handleColDragOver(e, colId)} onDrop={(e) => handleColDrop(e, colId)} onDragEnd={handleColDragEnd} className={`p-3 font-semibold uppercase text-[var(--color-text-secondary)] tracking-wider ${colId !== 'month' ? 'text-center' : 'text-left'} cursor-grab ${draggedCol === colId ? 'opacity-50' : ''} ${dragOverCol === colId ? 'bg-black/30' : ''} ${isMonthCol ? 'sticky left-0 z-20 bg-[var(--color-bg-secondary)]' : ''}`}><button onClick={() => requestSort(def.dataKey as any)} className="w-full text-inherit">{def.header}</button></th>
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {processedTableData.map((d, index) => (
                                <tr key={index} className="group hover:bg-[var(--color-bg-secondary)] transition-colors">
                                    {selectedTableColumns.map(colId => {
                                        const def = allTableColumnDefs[colId as keyof typeof allTableColumnDefs];
                                        if (!def) return null;
                                        const value = d[def.dataKey];
                                        const isMonthCol = colId === 'month';
                                        let displayValue: React.ReactNode = '-';
                                        if (value !== undefined && value !== null) {
                                            if (def.format && typeof value === 'number') { displayValue = formatValue(value, def.format); } 
                                            else if (String(value).trim() !== '') { displayValue = String(value); }
                                        }
                                        let cellStyle: React.CSSProperties = {};
                                        if (def.format && typeof value === 'number') {
                                            const isPositive = positiveMetrics.includes(def.dataKey);
                                            cellStyle = getHeatmapStyle(value, columnStats[def.dataKey], isPositive, theme);
                                        }
                                        
                                        const stickyClasses = isMonthCol ? 'sticky left-0 z-10' : '';
                                        let cellBgClass = '';
                                        if (d.isProjection) { cellBgClass = 'projection-cell'; } 
                                        else if (d.isActuals) { cellBgClass = 'actuals-cell'; } 
                                        else if (isMonthCol) { cellBgClass = 'bg-[var(--color-bg-primary)] group-hover:bg-[var(--color-bg-secondary)]'; }
                                        else { cellBgClass = 'bg-transparent'; }

                                        return <td key={colId} style={cellStyle} className={`p-3 ${colId !== 'month' ? 'text-center' : 'text-left'} font-medium ${stickyClasses} ${cellBgClass}`}>{displayValue}</td>
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
             <footer className="text-center py-6 mt-8 border-t border-[var(--color-border)]"><p className="text-[var(--color-text-secondary)]">Last Updated: <span className="font-semibold">{lastUpdated ? lastUpdated.toLocaleString() : 'N/A'}</span></p></footer>
        </main>
    );
};

export default Dashboard;