import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ClientDataRecord, AccountDetailsRecord, Theme, AllGoogleAdsData, AllBudgetStatusData, AllGoogleAnalyticsData, BrandComparisonToolState } from '../types';
import ChartWrapper from './ChartWrapper';

// --- Helper Functions ---
const monthMap: { [key: string]: number } = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
const shortToLongMonth: { [key: string]: string } = { 'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April', 'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August', 'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December' };
const formatValue = (value: number | string | undefined, type: 'currency' | 'percent' | 'number' | 'days' | 'roas' | 'string' | 'decimal'): string => {
    if (value === undefined || value === null || value === '') return '-';
    if (type === 'string') {
        const strValue = String(value);
        if (strValue.length > 30) {
            return strValue.substring(0, 27) + '...';
        }
        return strValue;
    }

    let numValue: number;
    if (typeof value === 'string') {
        numValue = parseFloat(value.replace(/[$,]/g, ''));
    } else {
        numValue = value;
    }

    if (typeof numValue !== 'number' || isNaN(numValue) || !isFinite(numValue)) return '-';

    switch (type) {
        case 'currency': return `$${numValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        case 'percent': return `${numValue.toFixed(1)}%`;
        case 'number': return numValue.toLocaleString();
        case 'days': return `${numValue.toFixed(1)} days`;
        case 'roas': return `${numValue.toFixed(1)}x`;
        case 'decimal': return numValue.toFixed(2);
        default: return String(value);
    }
};

// --- KPI Definitions ---
const kpiDefs: { [key: string]: { title: string; format: 'currency' | 'percent' | 'number' | 'days' | 'roas' | 'string' | 'decimal'; higherIsBetter: boolean } } = {
    ClientName: { title: 'Client', format: 'string', higherIsBetter: false },
    revenue: { title: 'Revenue', format: 'currency', higherIsBetter: true },
    sessions: { title: 'Sessions', format: 'number', higherIsBetter: true },
    conv_rate: { title: 'Conv. Rate', format: 'percent', higherIsBetter: true },
    aov: { title: 'AOV', format: 'currency', higherIsBetter: true },
    orders: { title: 'Orders', format: 'number', higherIsBetter: true },
    gads_roas: { title: 'GAds ROAS', format: 'roas', higherIsBetter: true },
    website_roas: { title: 'Website ROAS', format: 'roas', higherIsBetter: true },
    cancellation_rate: { title: 'Cancel Rate', format: 'percent', higherIsBetter: false },
    ppc_budget: { title: 'PPC Budget', format: 'currency', higherIsBetter: true },
    profit: { title: 'Profit', format: 'currency', higherIsBetter: true },
    ppc_spend: { title: 'PPC Spend', format: 'currency', higherIsBetter: false },
    ppc_session_percent: { title: 'PPC Session %', format: 'percent', higherIsBetter: true },
    organic_session_percent: { title: 'Organic Session %', format: 'percent', higherIsBetter: true },
    avg_fulfillment: { title: 'Avg Fulfillment', format: 'days', higherIsBetter: false },
    state: { title: 'State', format: 'string', higherIsBetter: false },
    shippingMethods: { title: 'Shipping Methods', format: 'string', higherIsBetter: false },
    signatureSurcharge: { title: 'Signature Surcharge', format: 'currency', higherIsBetter: false },
    hazmatSurcharge: { title: 'Hazmat Surcharge', format: 'currency', higherIsBetter: false },
    allowPOBox: { title: 'Allow PO Box', format: 'string', higherIsBetter: false },
    handlingFee: { title: 'Handling Fee', format: 'decimal', higherIsBetter: false },
    TAndC: { title: 'T&C', format: 'string', higherIsBetter: false },
    FitmentVerification: { title: 'Fitment Verification', format: 'string', higherIsBetter: false },
    RequiredField: { title: 'Required Field', format: 'string', higherIsBetter: false },
};

const numericalKpiKeys = ['revenue', 'sessions', 'conv_rate', 'aov', 'orders', 'gads_roas', 'website_roas', 'cancellation_rate', 'ppc_budget', 'profit', 'ppc_spend', 'ppc_session_percent', 'organic_session_percent', 'avg_fulfillment', 'signatureSurcharge', 'hazmatSurcharge', 'handlingFee'];
const stringKpiKeys = ['state', 'shippingMethods', 'allowPOBox', 'TAndC', 'FitmentVerification', 'RequiredField'];
const allKpiKeys = ['ClientName', ...numericalKpiKeys, ...stringKpiKeys];
const defaultVisibleKpiKeys = ['ClientName', 'revenue', 'sessions', 'conv_rate', 'aov', 'orders', 'gads_roas', 'website_roas', 'cancellation_rate'];

// --- Sub-Components ---
interface ComparisonCardProps {
    title: string;
    clientValue: number | undefined;
    brandValue: number | undefined;
    format: 'currency' | 'percent' | 'number' | 'days' | 'roas' | 'string' | 'decimal';
    higherIsBetter: boolean;
}

const ComparisonCard: React.FC<ComparisonCardProps> = ({ title, clientValue, brandValue, format, higherIsBetter }) => {
    const diff = useMemo(() => {
        if (typeof clientValue !== 'number' || typeof brandValue !== 'number' || brandValue === 0) {
            return { text: 'N/A', color: 'text-[var(--color-text-secondary)]', bg: 'bg-black/20' };
        }
        const percentageDiff = ((clientValue - brandValue) / brandValue) * 100;
        const isGood = higherIsBetter ? percentageDiff >= 0 : percentageDiff <= 0;
        
        return {
            text: `${percentageDiff > 0 ? '+' : ''}${percentageDiff.toFixed(0)}%`,
            color: isGood ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]',
            bg: isGood ? 'bg-[var(--color-positive-bg)]' : 'bg-[var(--color-negative-bg)]',
        };
    }, [clientValue, brandValue, higherIsBetter]);

    return (
        <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] rounded-xl p-5 shadow-2xl border border-[var(--color-border)] flex flex-col justify-between">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">{title}</h3>
            <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                    <span className="text-sm text-[var(--color-text-secondary)]">Client</span>
                    <span className="text-2xl font-bold text-[var(--color-text-primary)]">{formatValue(clientValue, format)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                    <span className="text-sm text-[var(--color-text-secondary)]">Brand Avg.</span>
                    <span className="text-2xl font-bold text-[var(--color-text-secondary)]">{formatValue(brandValue, format)}</span>
                </div>
            </div>
            <div className={`mt-4 text-center text-lg font-bold p-2 rounded-lg ${diff.bg} ${diff.color}`}>
                {diff.text}
            </div>
        </div>
    );
};

// --- Main Tool Component ---
interface BrandComparisonToolProps {
    allPerformanceData: ClientDataRecord[];
    allAccountDetails: AccountDetailsRecord[];
    allGoogleAdsData: AllGoogleAdsData;
    allBudgetStatusData: AllBudgetStatusData;
    allGoogleAnalyticsData: AllGoogleAnalyticsData;
    theme: Theme;
    toolState: BrandComparisonToolState;
    onStateChange: (newState: Partial<BrandComparisonToolState>) => void;
}

const BrandComparisonTool: React.FC<BrandComparisonToolProps> = ({ allPerformanceData, allAccountDetails, allGoogleAdsData, allBudgetStatusData, allGoogleAnalyticsData, theme, toolState, onStateChange }) => {
    const { selectedBrand, selectedClientName, clientsForAverage, comparisonMode, viewMode, timeRange, selectedMonthYear } = toolState;
    
    const [brands, setBrands] = useState<string[]>([]);
    const [clientsForBrand, setClientsForBrand] = useState<AccountDetailsRecord[]>([]);
    const [isClientListCollapsed, setIsClientListCollapsed] = useState(true);
    const [availableMonths, setAvailableMonths] = useState<string[]>([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
    const settingsButtonRef = useRef<HTMLButtonElement>(null);
    const settingsPopoverRef = useRef<HTMLDivElement>(null);

    
    const [visibleKpiKeys, setVisibleKpiKeys] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('brand-comparison-visible-kpis-v2');
            return saved ? JSON.parse(saved) : defaultVisibleKpiKeys;
        } catch {
            return defaultVisibleKpiKeys;
        }
    });

    useEffect(() => {
        localStorage.setItem('brand-comparison-visible-kpis-v2', JSON.stringify(visibleKpiKeys));
    }, [visibleKpiKeys]);

    useEffect(() => {
        const allBrands = allAccountDetails.flatMap(c => c.Brands ? c.Brands.split(',').map(b => b.trim()) : []);
        const uniqueBrands = [...new Set(allBrands.filter(Boolean))].sort();
        setBrands(uniqueBrands);
    }, [allAccountDetails]);

    useEffect(() => {
        if (selectedBrand) {
            const clients = allAccountDetails.filter(c => c.Brands?.split(',').map(b => b.trim()).includes(selectedBrand));
            setClientsForBrand(clients);

            const clientNames = clients.map(c => c.ClientName);
            const relevantData = allPerformanceData.filter(d => clientNames.includes(d.ClientName));
            const months = [...new Set(relevantData.map(d => `${d.Month.substring(0,3)} ${d.Year}`))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            setAvailableMonths(months);

            onStateChange({
                clientsForAverage: clients.map(c => ({ name: c.ClientName, checked: true })),
                selectedClientName: clients.some(c => c.ClientName === selectedClientName) ? selectedClientName : (clients[0]?.ClientName || ''),
                selectedMonthYear: months.includes(selectedMonthYear) ? selectedMonthYear : (months[0] || '')
            });
            setIsClientListCollapsed(true);
        } else {
            setClientsForBrand([]);
             onStateChange({
                clientsForAverage: [],
                selectedClientName: '',
                selectedMonthYear: ''
            });
            setAvailableMonths([]);
        }
    }, [selectedBrand, allAccountDetails, allPerformanceData]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                settingsPopoverRef.current && !settingsPopoverRef.current.contains(event.target as Node) &&
                settingsButtonRef.current && !settingsButtonRef.current.contains(event.target as Node)
            ) {
                setIsSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleClientToggle = (clientName: string) => {
        onStateChange({
            clientsForAverage: clientsForAverage.map(client => (client.name === clientName ? { ...client, checked: !client.checked } : client))
        });
    };

    const handleVisibleKpiToggle = (kpiKey: string) => {
        setVisibleKpiKeys(prev => {
            const newSet = new Set(prev);
            if (newSet.has(kpiKey)) {
                newSet.delete(kpiKey);
            } else {
                newSet.add(kpiKey);
            }
            return allKpiKeys.filter(key => newSet.has(key)); // Preserve order
        });
    };

    const processedData = useMemo(() => {
        return clientsForBrand.map(client => {
            const clientName = client.ClientName;
            let dataPoint: Record<string, any> = { ClientName: clientName };

            const perfData = allPerformanceData.filter(d => d.ClientName === clientName);
            const gaData = allGoogleAnalyticsData[clientName] || [];
            const gadsData = allGoogleAdsData[clientName] || [];
            const budgetData = allBudgetStatusData[clientName];

            if (viewMode === 'month' && selectedMonthYear) {
                const [monthStr, yearStr] = selectedMonthYear.split(' ');
                const perfRecord = perfData.find(d => d.Month.startsWith(monthStr) && String(d.Year) === yearStr);
                const gaRecord = gaData.find(d => new Date(d.Date).toLocaleString('default', { month: 'short', year: 'numeric' }) === `${monthStr} ${yearStr}`);
                const gadsRecord = gadsData.find(d => new Date(d.Date).toLocaleString('default', { month: 'short', year: 'numeric' }) === `${monthStr} ${yearStr}`);
                
                if (perfRecord) {
                    dataPoint.revenue = perfRecord.Revenue;
                    dataPoint.sessions = perfRecord.Sessions;
                    dataPoint.orders = perfRecord.Orders;
                    dataPoint.profit = perfRecord.Profit;
                    dataPoint.ppc_spend = perfRecord.PPC_Spend;
                    dataPoint.avg_fulfillment = perfRecord.Avg_Fulfillment;
                    dataPoint.conv_rate = perfRecord.Conv_Rate;
                    dataPoint.aov = perfRecord.AOV;
                    dataPoint.cancellation_rate = perfRecord.Canceled;
                    dataPoint.website_roas = (perfRecord.PPC_Spend ?? 0) > 0 ? (perfRecord.Revenue ?? 0) / perfRecord.PPC_Spend! : 0;
                }
                if (gaRecord) {
                    dataPoint.ppc_session_percent = gaRecord.SessionsPercentPPC;
                    dataPoint.organic_session_percent = gaRecord.SessionsPercentOrganic;
                }
                if (gadsRecord) dataPoint.gads_roas = gadsRecord.PartsROAS;
                if (budgetData) dataPoint.ppc_budget = budgetData.ppcBudget;

            } else { // timeline view
                const months = parseInt(timeRange, 10);
                const today = new Date();
                const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                const startDate = new Date(endDate);
                startDate.setMonth(startDate.getMonth() - (months - 1));
                startDate.setDate(1);

                const filterByDate = (d: { Date: string } | { Month: string, Year: number }) => {
                    const recordDate = 'Date' in d ? new Date(d.Date) : new Date(d.Year, monthMap[d.Month.substring(0, 3)]);
                    return recordDate >= startDate && recordDate <= endDate;
                };

                const relevantPerf = perfData.filter(filterByDate);
                const relevantGa = gaData.filter(filterByDate);
                const relevantGads = gadsData.filter(filterByDate);

                if (relevantPerf.length > 0) {
                    const perfTotals = relevantPerf.reduce((acc, r) => {
                        acc.revenue += r.Revenue || 0;
                        acc.sessions += r.Sessions || 0;
                        acc.orders += r.Orders || 0;
                        acc.profit += r.Profit || 0;
                        acc.ppc_spend += r.PPC_Spend || 0;
                        acc.orders_canceled += r.Orders_Canceled || 0;
                        acc.avg_fulfillment += r.Avg_Fulfillment || 0;
                        return acc;
                    }, { revenue: 0, sessions: 0, orders: 0, profit: 0, ppc_spend: 0, orders_canceled: 0, avg_fulfillment: 0 });
                    
                    dataPoint = {
                        ...dataPoint,
                        revenue: perfTotals.revenue,
                        sessions: perfTotals.sessions,
                        orders: perfTotals.orders,
                        profit: perfTotals.profit,
                        ppc_spend: perfTotals.ppc_spend,
                        conv_rate: perfTotals.sessions > 0 ? (perfTotals.orders / perfTotals.sessions) * 100 : 0,
                        aov: perfTotals.orders > 0 ? perfTotals.revenue / perfTotals.orders : 0,
                        website_roas: perfTotals.ppc_spend > 0 ? perfTotals.revenue / perfTotals.ppc_spend : 0,
                        cancellation_rate: perfTotals.orders > 0 ? (perfTotals.orders_canceled / perfTotals.orders) * 100 : 0,
                        avg_fulfillment: relevantPerf.length > 0 ? perfTotals.avg_fulfillment / relevantPerf.length : 0,
                    };
                }
                 if (relevantGa.length > 0) {
                    const gaTotals = relevantGa.reduce((acc, r) => {
                        acc.totalSessions += r.Sessions || 0;
                        acc.ppcSessions += (r.Sessions || 0) * ((r.SessionsPercentPPC || 0) / 100);
                        acc.organicSessions += (r.Sessions || 0) * ((r.SessionsPercentOrganic || 0) / 100);
                        return acc;
                    }, { totalSessions: 0, ppcSessions: 0, organicSessions: 0 });

                    dataPoint.ppc_session_percent = gaTotals.totalSessions > 0 ? (gaTotals.ppcSessions / gaTotals.totalSessions) * 100 : 0;
                    dataPoint.organic_session_percent = gaTotals.totalSessions > 0 ? (gaTotals.organicSessions / gaTotals.totalSessions) * 100 : 0;
                }
                if (relevantGads.length > 0) {
                    const gadsTotals = relevantGads.reduce((acc, r) => {
                        acc.cost += r.PartsCost || 0;
                        acc.revenue += (r.PartsCost || 0) * (r.PartsROAS || 0);
                        return acc;
                    }, { cost: 0, revenue: 0 });
                    dataPoint.gads_roas = gadsTotals.cost > 0 ? gadsTotals.revenue / gadsTotals.cost : 0;
                }
                 if (budgetData) dataPoint.ppc_budget = budgetData.ppcBudget;
            }

            // Add non-time-series data from account details
            dataPoint = { ...dataPoint, ...client };
            return dataPoint;
        });
    }, [clientsForBrand, viewMode, selectedMonthYear, timeRange, allPerformanceData, allGoogleAnalyticsData, allGoogleAdsData, allBudgetStatusData, allAccountDetails]);

    const brandAverage = useMemo(() => {
        const clientsToAverage = clientsForAverage.filter(c => c.checked).map(c => c.name);
        const dataToAverage = processedData.filter(d => clientsToAverage.includes(d.ClientName));
        if (dataToAverage.length === 0) return {};

        const avg: Record<string, number> = {};
        numericalKpiKeys.forEach(key => {
            const values = dataToAverage.map(d => d[key]).filter(v => typeof v === 'number' && isFinite(v));
            if (values.length > 0) {
                avg[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
            }
        });
        return avg;
    }, [processedData, clientsForAverage]);

    const clientDataForComparison = useMemo(() => {
        return processedData.find(d => d.ClientName === selectedClientName);
    }, [processedData, selectedClientName]);

    const sortedTableData = useMemo(() => {
        const data = [...processedData];
        if (sortConfig) {
            data.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
                }
                if (typeof valA === 'string' && typeof valB === 'string') {
                    return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
                return 0;
            });
        }
        return data;
    }, [processedData, sortConfig]);

    const columnStats = useMemo(() => {
        const stats: { [key: string]: { min: number; max: number } } = {};
        if (processedData.length === 0) return stats;
        numericalKpiKeys.forEach(key => {
            const values = processedData.map(d => d[key]).filter((v): v is number => typeof v === 'number' && isFinite(v));
            if (values.length > 0) {
                stats[key] = { min: Math.min(...values), max: Math.max(...values) };
            }
        });
        return stats;
    }, [processedData]);

    const getHeatmapStyle = (key: string, value: number | undefined): React.CSSProperties => {
        if (typeof value !== 'number' || !isFinite(value)) return {};
        const stats = columnStats[key];
        const def = kpiDefs[key];
        if (!stats || !def || stats.min === stats.max) return {};
        
        let percent = (value - stats.min) / (stats.max - stats.min);
        if (!def.higherIsBetter) percent = 1 - percent;
        
        const isDarkTheme = ['cosmic-ink', 'starlight', 'sunset'].includes(theme.id);
        const fontColor = isDarkTheme ? '#FFFFFF' : '#000000';
    
        let colorRgb, alpha;
        if (percent < 0.5) {
            colorRgb = '248, 113, 113'; // Red
            alpha = 0.1 + (0.5 * (1 - (percent * 2)));
        } else {
            colorRgb = '74, 222, 128'; // Green
            alpha = 0.1 + (0.5 * ((percent - 0.5) * 2));
        }
        return { backgroundColor: `rgba(${colorRgb}, ${alpha})`, color: fontColor };
    };

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    return (
        <main className="flex flex-col gap-8">
            {/* --- Controls Section --- */}
            <section className="bg-[var(--color-card-bg)] backdrop-blur-sm rounded-xl border border-[var(--color-border)] shadow-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Brand Selection */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">1. Select a Brand</label>
                        <select
                            value={selectedBrand}
                            onChange={e => onStateChange({ selectedBrand: e.target.value })}
                            className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5"
                        >
                            <option value="">-- Select Brand --</option>
                            {brands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>

                    {/* View Mode */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">2. Select View Mode</label>
                        <div className="flex items-center bg-black/20 p-1 rounded-lg">
                            <button onClick={() => onStateChange({ viewMode: 'month' })} className={`px-4 py-1.5 w-full text-sm font-semibold rounded-md transition-colors ${viewMode === 'month' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>Month</button>
                            <button onClick={() => onStateChange({ viewMode: 'timeline' })} className={`px-4 py-1.5 w-full text-sm font-semibold rounded-md transition-colors ${viewMode === 'timeline' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>Time Range</button>
                        </div>
                    </div>

                    {/* Time Period Selection */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">3. Select Period</label>
                        {viewMode === 'month' ? (
                            <select
                                value={selectedMonthYear}
                                onChange={e => onStateChange({ selectedMonthYear: e.target.value })}
                                disabled={availableMonths.length === 0}
                                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5 disabled:opacity-50"
                            >
                                <option value="">-- Select Month --</option>
                                {availableMonths.map(m => <option key={m} value={m}>{shortToLongMonth[m.split(' ')[0]]} {m.split(' ')[1]}</option>)}
                            </select>
                        ) : (
                            <select
                                value={timeRange}
                                onChange={e => onStateChange({ timeRange: e.target.value as '3' | '6' | '12' })}
                                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5"
                            >
                                <option value="3">Last 3 Full Months</option>
                                <option value="6">Last 6 Full Months</option>
                                <option value="12">Last 12 Full Months</option>
                            </select>
                        )}
                    </div>
                </div>
                {selectedBrand && (
                    <div className="mt-6">
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">4. Select Comparison Mode</label>
                        <div className="flex items-center bg-black/20 p-1 rounded-lg max-w-sm">
                            <button onClick={() => onStateChange({ comparisonMode: 'clientVsBrand' })} className={`px-4 py-1.5 w-full text-sm font-semibold rounded-md transition-colors ${comparisonMode === 'clientVsBrand' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>Client vs. Brand</button>
                            <button onClick={() => onStateChange({ comparisonMode: 'allClients' })} className={`px-4 py-1.5 w-full text-sm font-semibold rounded-md transition-colors ${comparisonMode === 'allClients' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>All Clients Table</button>
                        </div>
                    </div>
                )}
            </section>

            {/* --- Data Display Section --- */}
            {selectedBrand && (
                <section>
                    {comparisonMode === 'clientVsBrand' && (
                        <div>
                            <div className="mb-6 flex items-center gap-4">
                                <label htmlFor="client-selector" className="text-sm font-medium text-[var(--color-text-secondary)]">Comparing:</label>
                                <select
                                    id="client-selector"
                                    value={selectedClientName}
                                    onChange={e => onStateChange({ selectedClientName: e.target.value })}
                                    className="bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] p-2.5"
                                >
                                    {clientsForBrand.map(c => <option key={c.ClientName} value={c.ClientName}>{c.ClientName}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {visibleKpiKeys.filter(k => numericalKpiKeys.includes(k)).map(key => {
                                    const def = kpiDefs[key];
                                    if (!def) return null;
                                    return (
                                        <ComparisonCard
                                            key={key}
                                            title={def.title}
                                            clientValue={clientDataForComparison?.[key]}
                                            brandValue={brandAverage[key]}
                                            format={def.format as any}
                                            higherIsBetter={def.higherIsBetter}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                     {comparisonMode === 'allClients' && (
                        <div>
                            <div className="flex justify-end mb-4 relative">
                                <button ref={settingsButtonRef} onClick={() => setIsSettingsOpen(prev => !prev)} className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" /></svg>
                                    Display Options
                                </button>
                                {isSettingsOpen && (
                                    <div ref={settingsPopoverRef} className="absolute top-full mt-2 z-20 w-80 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl p-4">
                                        <h4 className="font-semibold mb-3">Visible Columns</h4>
                                        <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                                            {allKpiKeys.map(key => (
                                                <label key={key} className="flex items-center gap-2 p-1 rounded hover:bg-black/20 cursor-pointer">
                                                    <input type="checkbox" checked={visibleKpiKeys.includes(key)} onChange={() => handleVisibleKpiToggle(key)} className="h-4 w-4 rounded bg-slate-700 border-slate-500 text-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]" />
                                                    <span className="text-sm">{kpiDefs[key]?.title || key}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm whitespace-nowrap">
                                    <thead className="sticky-header bg-[var(--color-bg-secondary)]">
                                        <tr>
                                            {visibleKpiKeys.map(key => {
                                                const def = kpiDefs[key];
                                                if (!def) return null;
                                                return (
                                                    <th key={key} className="p-3 font-semibold uppercase text-[var(--color-text-secondary)] tracking-wider text-left first:sticky first:left-0 first:z-20 first:bg-[var(--color-bg-secondary)]">
                                                        <button onClick={() => requestSort(key)} className="flex items-center gap-1">
                                                            {def.title}
                                                            {sortConfig?.key === key && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                                                        </button>
                                                    </th>
                                                )
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {sortedTableData.map(client => (
                                            <tr key={client.ClientName} className="group hover:bg-[var(--color-bg-secondary)] transition-colors">
                                                {visibleKpiKeys.map(key => {
                                                    const def = kpiDefs[key];
                                                    if (!def) return null;
                                                    const value = client[key];
                                                    const style = getHeatmapStyle(key, value);
                                                    return (
                                                        <td key={key} style={style} className="p-3 first:sticky first:left-0 first:z-10 first:bg-[var(--color-bg-primary)] group-hover:first:bg-[var(--color-bg-secondary)]">
                                                            {formatValue(value, def.format)}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </section>
            )}

        </main>
    );
};

export default BrandComparisonTool;
