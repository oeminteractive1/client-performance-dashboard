

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { ClientDataRecord, AccountDetailsRecord, Theme } from '../types';
import ChartWrapper from './ChartWrapper';
import ChartGridItem from './ChartGridItem';
import KpiGridItem from './KPIGridItem';

const ResponsiveGridLayout = WidthProvider(Responsive);

const monthMap: { [key: string]: number } = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };

type TimeRange = '3m' | '6m' | '12m' | '24m';

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
      { i: 'ppc_roas', x: 0, y: 1, w: 1, h: 1 }, { i: 'aov_conv_rate', x: 1, y: 1, w: 1, h: 1 },
      { i: 'canceled_fulfillment', x: 0, y: 2, w: 1, h: 1 }, { i: 'profit_margin_per_order', x: 1, y: 2, w: 1, h: 1 },
      { i: 'canceled_solo', x: 0, y: 3, w: 1, h: 1 }, { i: 'revenue_solo', x: 1, y: 3, w: 1, h: 1 },
      { i: 'profit', x: 0, y: 4, w: 1, h: 1 }, { i: 'aov', x: 1, y: 4, w: 1, h: 1 },
      { i: 'conv_rate', x: 0, y: 5, w: 1, h: 1 },
    ],
};
const allChartIds = initialChartLayouts.lg.map(l => l.i);
const defaultVisibleChartIds = ['revenue_orders', 'sessions', 'ppc_roas', 'aov_conv_rate', 'canceled_fulfillment', 'profit_margin_per_order', 'canceled_solo', 'revenue_solo'];


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
};
const defaultVisibleTableColumns = ['month', 'revenue', 'profit', 'orders', 'ppc_spend', 'roas', 'cancel_rate', 'sessions', 'conv_rate', 'aov'];


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

interface MultiClientDashboardProps {
    allPerformanceData: ClientDataRecord[];
    allAccountDetails: AccountDetailsRecord[];
    lastUpdated: Date | null;
    theme: Theme;
    isModalOpen: boolean;
    setIsModalOpen: (isOpen: boolean) => void;
    selectedAutoGroup: string;
}

const MultiClientDashboard: React.FC<MultiClientDashboardProps> = ({ allPerformanceData, allAccountDetails, lastUpdated, theme, isModalOpen, setIsModalOpen, selectedAutoGroup }) => {
    
    // State for layouts and selections from localStorage
    const [kpiLayouts, setKpiLayouts] = useState(() => { try { const s = localStorage.getItem('mc-kpi-layouts-v1'); return s ? JSON.parse(s) : initialKpiLayouts; } catch (e) { return initialKpiLayouts; } });
    const [chartLayouts, setChartLayouts] = useState(() => { try { const s = localStorage.getItem('mc-chart-layouts-v2'); return s ? JSON.parse(s) : initialChartLayouts; } catch (e) { return initialChartLayouts; } });
    const [selectedKpis, setSelectedKpis] = useState<string[]>(() => { try { const s = localStorage.getItem('mc-selected-kpis-v1'); return s ? JSON.parse(s) : defaultVisibleKpiIds; } catch (e) { return defaultVisibleKpiIds; } });
    const [selectedCharts, setSelectedCharts] = useState<string[]>(() => { try { const s = localStorage.getItem('mc-selected-charts-v2'); return s ? JSON.parse(s) : defaultVisibleChartIds; } catch (e) { return defaultVisibleChartIds; } });
    const [selectedTableColumns, setSelectedTableColumns] = useState<string[]>(() => { try { const s = localStorage.getItem('mc-selected-table-cols'); return s ? JSON.parse(s) : defaultVisibleTableColumns; } catch (e) { return defaultVisibleTableColumns; } });
    const [chartTimeRange, setChartTimeRange] = useState<TimeRange>(() => (localStorage.getItem('mc-chart-time-range') as TimeRange) || '12m');
    const [tableTimeRange, setTableTimeRange] = useState<TimeRange>(() => (localStorage.getItem('mc-table-time-range') as TimeRange) || '12m');
    const [scaleYAxisToZero, setScaleYAxisToZero] = useState<boolean>(() => localStorage.getItem('mc-scale-y-axis') === 'true');
    
    // Data selection state
    const [groupName, setGroupName] = useState<string>(selectedAutoGroup);
    const [clientsInGroup, setClientsInGroup] = useState<{ name: string; checked: boolean }[]>([]);
    const [isAddClientPopoverOpen, setIsAddClientPopoverOpen] = useState(false);
    const [addClientSearch, setAddClientSearch] = useState('');
    const addClientRef = useRef<HTMLDivElement>(null);

    // Persist state to localStorage
    useEffect(() => { localStorage.setItem('mc-kpi-layouts-v1', JSON.stringify(kpiLayouts)); }, [kpiLayouts]);
    useEffect(() => { localStorage.setItem('mc-chart-layouts-v2', JSON.stringify(chartLayouts)); }, [chartLayouts]);
    useEffect(() => { localStorage.setItem('mc-selected-kpis-v1', JSON.stringify(selectedKpis)); }, [selectedKpis]);
    useEffect(() => { localStorage.setItem('mc-selected-charts-v2', JSON.stringify(selectedCharts)); }, [selectedCharts]);
    useEffect(() => { localStorage.setItem('mc-selected-table-cols', JSON.stringify(selectedTableColumns)); }, [selectedTableColumns]);
    useEffect(() => { localStorage.setItem('mc-chart-time-range', chartTimeRange); }, [chartTimeRange]);
    useEffect(() => { localStorage.setItem('mc-table-time-range', tableTimeRange); }, [tableTimeRange]);
    useEffect(() => { localStorage.setItem('mc-scale-y-axis', String(scaleYAxisToZero)); }, [scaleYAxisToZero]);

    // Update client list when a group is selected via props
    useEffect(() => {
        if (selectedAutoGroup) {
            const clients = allAccountDetails
                .filter(d => d.AutoGroup === selectedAutoGroup)
                .map(d => ({ name: d.ClientName, checked: true }));
            setClientsInGroup(clients);
            setGroupName(selectedAutoGroup);
        } else {
            setClientsInGroup([]);
            setGroupName('No Group Selected');
        }
    }, [selectedAutoGroup, allAccountDetails]);

    // Handle clicks outside the add client popover
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addClientRef.current && !addClientRef.current.contains(event.target as Node)) {
                setIsAddClientPopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleClientToggle = (clientName: string) => {
        setClientsInGroup(prev =>
            prev.map(client =>
                client.name === clientName ? { ...client, checked: !client.checked } : client
            )
        );
    };

    const handleAddClient = (clientName: string) => {
        if (clientsInGroup.some(c => c.name === clientName)) return; // Prevent duplicates

        setClientsInGroup(prev => 
            [...prev, { name: clientName, checked: true }]
            .sort((a, b) => a.name.localeCompare(b.name)) // Keep list sorted
        );
        setGroupName('Custom Group');
        setIsAddClientPopoverOpen(false);
        setAddClientSearch('');
    };

    const availableClientsToAdd = useMemo(() => {
        const currentClientNames = new Set(clientsInGroup.map(c => c.name));
        
        // Use the comprehensive client list from the Website Data sheet
        const allClientsFromPerformance = [...new Set(allPerformanceData.map(d => d.ClientName))];

// FIX: Add explicit types to array method parameters to avoid `unknown` type errors.
        return allClientsFromPerformance
            .filter(clientName => !currentClientNames.has(clientName))
            .filter((clientName: string) => clientName.toLowerCase().includes(addClientSearch.toLowerCase()))
            .sort((a: string, b: string) => a.localeCompare(b))
            .map(clientName => ({ ClientName: clientName })); // Map to the object structure expected by the render logic

    }, [clientsInGroup, allPerformanceData, addClientSearch]);


    // --- Main Data Aggregation Logic ---
    const aggregatedClientData = useMemo(() => {
        const selectedClientNames = clientsInGroup.filter(c => c.checked).map(c => c.name);
        if (selectedClientNames.length === 0) return [];

        const relevantData = allPerformanceData.filter(d => selectedClientNames.includes(d.ClientName));
        
// FIX: Add explicit types to array method parameters to avoid `unknown` type errors.
        const groupedByMonth = (relevantData as ClientDataRecord[]).reduce((acc, record: ClientDataRecord) => {
            const key = `${record.Month}-${record.Year}`;
            if (!acc[key]) { acc[key] = []; }
            acc[key].push(record);
            return acc;
        }, {} as Record<string, ClientDataRecord[]>);
        
// FIX: Add explicit types to array method parameters to avoid `unknown` type errors.
        const aggregated = (Object.values(groupedByMonth) as ClientDataRecord[][]).map((monthGroup: ClientDataRecord[]) => {
            const totals = monthGroup.reduce((acc, record) => {
                acc.Orders += record.Orders || 0;
                acc.Revenue += record.Revenue || 0;
                acc.Profit += record.Profit || 0;
                acc.PPC_Spend += record.PPC_Spend || 0;
                acc.Sessions += record.Sessions || 0;
                acc.Orders_Canceled += record.Orders_Canceled || 0;
                acc.Avg_Fulfillment += record.Avg_Fulfillment || 0;
                return acc;
            }, { Orders: 0, Revenue: 0, Profit: 0, PPC_Spend: 0, Sessions: 0, Orders_Canceled: 0, Avg_Fulfillment: 0 });

            const firstRecord = monthGroup[0];
            const numClientsInGroup = new Set(monthGroup.map(d => d.ClientName)).size;

            return {
                ...firstRecord, ...totals,
                Canceled: totals.Orders > 0 ? (totals.Orders_Canceled / totals.Orders) * 100 : 0,
                Avg_Fulfillment: numClientsInGroup > 0 ? totals.Avg_Fulfillment / numClientsInGroup : 0,
                ROAS: totals.PPC_Spend > 0 ? totals.Revenue / totals.PPC_Spend : 0,
                AOV: totals.Orders > 0 ? totals.Revenue / totals.Orders : 0,
                Conv_Rate: totals.Sessions > 0 ? (totals.Orders / totals.Sessions) * 100 : 0,
                Profit_Margin: totals.Revenue > 0 ? (totals.Profit / totals.Revenue) * 100 : 0,
                Profit_Per_Order: totals.Orders > 0 ? totals.Profit / totals.Orders : 0,
                ClientName: selectedAutoGroup,
            } as ClientDataRecord;
        });

        return aggregated.sort((a, b) => new Date(b.Year, monthMap[b.Month.substring(0, 3)]).getTime() - new Date(a.Year, monthMap[a.Month.substring(0, 3)]).getTime());
    }, [clientsInGroup, allPerformanceData, selectedAutoGroup]);

    const projectionData = useMemo(() => {
        if (!aggregatedClientData || aggregatedClientData.length === 0) return null;

        const latestMonthDataRaw = aggregatedClientData[0];
        if (!latestMonthDataRaw) return null;

        let displayMonthData: ClientDataRecord = { ...latestMonthDataRaw };
        let isProjected = false;
        let projectionInfo = '';

        const selectedClientNames = clientsInGroup.filter(c => c.checked).map(c => c.name);
        const latestMonthOriginalRecords = allPerformanceData.filter(d => 
            selectedClientNames.includes(d.ClientName) && 
            d.Month === latestMonthDataRaw.Month && 
            d.Year === latestMonthDataRaw.Year
        );
        
        const recordWithDays = latestMonthOriginalRecords.find(r => r.Days_of_Data && r.Days_of_Data > 0);
        const daysOfData = recordWithDays ? recordWithDays.Days_of_Data : undefined;

        if (typeof daysOfData === 'number' && daysOfData > 0) {
            const date = new Date(latestMonthDataRaw.Year, monthMap[latestMonthDataRaw.Month.substring(0, 3)]);
            const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

            if (daysOfData < daysInMonth) {
                isProjected = true;
                projectionInfo = `Based on ${daysOfData} days of data`;
                const projectionFactor = daysInMonth / daysOfData;
                
                const projectedRevenue = latestMonthDataRaw.Revenue * projectionFactor, projectedOrders = latestMonthDataRaw.Orders * projectionFactor,
                      projectedProfit = latestMonthDataRaw.Profit * projectionFactor, projectedPpcSpend = latestMonthDataRaw.PPC_Spend * projectionFactor,
                      projectedSessions = latestMonthDataRaw.Sessions * projectionFactor;

                displayMonthData = {
                    ...latestMonthDataRaw, Revenue: projectedRevenue, Orders: projectedOrders, Profit: projectedProfit,
                    PPC_Spend: projectedPpcSpend, Sessions: projectedSessions,
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

        const previousMonthData = aggregatedClientData.find(d => d.Year === prevMonthDate.getFullYear() && monthMap[d.Month.substring(0, 3)] === prevMonthDate.getMonth());
        const lastYearMonthData = aggregatedClientData.find(d => d.Year === prevYearDate.getFullYear() && monthMap[d.Month.substring(0, 3)] === prevYearDate.getMonth());

        return { displayMonthData, previousMonthData, lastYearMonthData, isProjected, projectionInfo, latestMonthDataRaw };

    }, [aggregatedClientData, clientsInGroup, allPerformanceData]);

    // Filtered data for charts and tables based on time range
    const timeSeriesData = useMemo(() => {
        // Need at least 2 months of data for a trend. We exclude the latest month.
        if (!aggregatedClientData || aggregatedClientData.length < 2) return null;
    
        // Exclude the most recent month from trends, as it's used for projection KPIs.
        const historicalData = aggregatedClientData.slice(1);
    
        let monthsToShow: number;
        switch (chartTimeRange) {
            case '3m': monthsToShow = 3; break;
            case '6m': monthsToShow = 6; break;
            case '24m': monthsToShow = 24; break;
            case '12m': default: monthsToShow = 12; break;
        }
        const filtered = historicalData.slice(0, monthsToShow).reverse();
    
        if (filtered.length === 0) return null;
    
        const labels = filtered.map(d => `${d.Month.substring(0, 3)} ${d.Year}`);
        const extract = (key: keyof ClientDataRecord) => filtered.map(d => (d[key] as number) || 0);
    
        return {
            labels,
            Revenue: extract('Revenue'),
            Profit: extract('Profit'),
            Orders: extract('Orders'),
            Sessions: extract('Sessions'),
            PPC_Spend: extract('PPC_Spend'),
            AOV: extract('AOV'),
            Conv_Rate: extract('Conv_Rate'),
            Canceled: extract('Canceled'),
            Avg_Fulfillment: extract('Avg_Fulfillment'),
            ROAS: extract('ROAS'),
            Profit_Margin: extract('Profit_Margin'),
            Profit_Per_Order: extract('Profit_Per_Order'),
        };
    }, [aggregatedClientData, chartTimeRange]);

    const processedTableData = useMemo(() => {
        let monthsToShow: number;
        switch (tableTimeRange) {
            case '3m': monthsToShow = 3; break;
            case '6m': monthsToShow = 6; break;
            case '12m': monthsToShow = 12; break;
            case '24m': default: monthsToShow = 24; break;
        }
    
        if (aggregatedClientData.length === 0) return [];

        // Process historical data first to get change indicators
        let tableData: ClientDataRecord[] = aggregatedClientData.map((currentRow, index, arr) => {
            const prevRow = arr[index + 1];
            const changes: { [key: string]: 'positive' | 'negative' | 'neutral' } = {};
            const positiveMetrics: (keyof ClientDataRecord)[] = ['Revenue', 'Profit', 'Orders', 'Sessions', 'Conv_Rate', 'AOV', 'ROAS'];
            const negativeMetrics: (keyof ClientDataRecord)[] = ['Canceled', 'Avg_Fulfillment'];
    
            if (prevRow) {
                [...positiveMetrics, ...negativeMetrics].forEach(key => {
                    const currentVal = Number(currentRow[key] ?? 0);
                    const prevVal = Number(prevRow[key] ?? 0);
    
                    if (currentVal === prevVal || prevVal === 0) {
                        changes[key] = 'neutral';
                        return;
                    }
                    if (positiveMetrics.includes(key)) {
                        changes[key] = currentVal > prevVal ? 'positive' : 'negative';
                    } else if (negativeMetrics.includes(key)) {
                        changes[key] = currentVal < prevVal ? 'positive' : 'negative';
                    }
                });
            }
            return { ...currentRow, changes };
        });

        // If there's a projection, create and inject the projection row and an actuals row
        if (projectionData?.isProjected) {
            const prevMonthData = aggregatedClientData[1]; // The month before the latest raw month
            
            const projectionRow: ClientDataRecord = {
                ...projectionData.displayMonthData,
                Month: `${projectionData.displayMonthData.Month} (Proj.)`,
                isProjection: true,
                changes: {} as { [key: string]: 'positive' | 'negative' | 'neutral' },
            };
            
            if (prevMonthData) {
                const changes: { [key: string]: 'positive' | 'negative' | 'neutral' } = {};
                const positiveMetrics: (keyof ClientDataRecord)[] = ['Revenue', 'Profit', 'Orders', 'Sessions', 'Conv_Rate', 'AOV', 'ROAS'];
                const negativeMetrics: (keyof ClientDataRecord)[] = ['Canceled', 'Avg_Fulfillment'];
                [...positiveMetrics, ...negativeMetrics].forEach(key => {
                    const currentVal = Number(projectionRow[key] ?? 0);
                    const prevVal = Number(prevMonthData[key] ?? 0);
    
                    if (currentVal === prevVal || prevVal === 0) {
                        changes[key] = 'neutral';
                        return;
                    }
                    if (positiveMetrics.includes(key)) {
                        changes[key] = currentVal > prevVal ? 'positive' : 'negative';
                    } else if (negativeMetrics.includes(key)) {
                        changes[key] = currentVal < prevVal ? 'positive' : 'negative';
                    }
                });
                projectionRow.changes = changes;
            }

            const actualsRow: ClientDataRecord = {
                ...projectionData.latestMonthDataRaw,
                Month: `${projectionData.latestMonthDataRaw.Month} (Actuals)`,
                isActuals: true,
                changes: tableData[0].changes, // Use MoM changes from original latest month
            };
            
            // Replace the original latest month row with the new actuals and projection rows
            tableData.splice(0, 1, actualsRow, projectionRow);
        }
    
        return tableData.slice(0, monthsToShow);
    }, [aggregatedClientData, tableTimeRange, projectionData]);

    // Chart definitions
    const { fullChartDefs, visibleChartDefs } = useMemo(() => {
        const { colors } = theme;
        const chartDefs: any[] = [];
        if (timeSeriesData) {
            const getChartOptions = (formatType: any, scaleToZero: boolean) => ({ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { display: false } }, scales: { y: { beginAtZero: scaleToZero, ticks: { color: colors['--color-text-secondary'], callback: (value: any) => formatValue(value, formatType) }, grid: { color: colors['--color-border'] } }, x: { ticks: { color: colors['--color-text-secondary'] }, grid: { display: false } } } });
            const getDualAxisOptions = (y1Fmt: any, y2Fmt: any, y1Color: string, y2Color: string, scale: boolean) => ({ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top', labels: { color: colors['--color-text-secondary'] } }, datalabels: { display: false } }, scales: { y: { type: 'linear', display: true, position: 'left', beginAtZero: scale, ticks: { color: y1Color, callback: (v: any) => formatValue(v, y1Fmt) }, grid: { color: colors['--color-border'] } }, y1: { type: 'linear', display: true, position: 'right', beginAtZero: scale, ticks: { color: y2Color, callback: (v: any) => formatValue(v, y2Fmt) }, grid: { drawOnChartArea: false } }, x: { ticks: { color: colors['--color-text-secondary'] }, grid: { display: false } } } });
            chartDefs.push(...[
                { id: 'revenue_orders', title: '💰 Revenue & Orders', labels: timeSeriesData.labels, datasets: [ { label: 'Revenue', data: timeSeriesData.Revenue, yAxisID: 'y', borderColor: colors['--color-accent'], backgroundColor: `color-mix(in srgb, ${colors['--color-accent']} 20%, transparent)` }, { label: 'Orders', data: timeSeriesData.Orders, yAxisID: 'y1', borderColor: colors['--color-accent-secondary'], backgroundColor: `color-mix(in srgb, ${colors['--color-accent-secondary']} 20%, transparent)` } ], options: getDualAxisOptions('currency', 'number', colors['--color-accent'], colors['--color-accent-secondary'], scaleYAxisToZero), },
                { id: 'ppc_roas', title: '🎯 PPC Spend & ROAS', labels: timeSeriesData.labels, datasets: [ { label: 'PPC Spend', data: timeSeriesData.PPC_Spend, yAxisID: 'y', borderColor: '#f97316', backgroundColor: 'color-mix(in srgb, #f97316 20%, transparent)' }, { label: 'ROAS', data: timeSeriesData.ROAS, yAxisID: 'y1', borderColor: '#3b82f6', backgroundColor: 'color-mix(in srgb, #3b82f6 20%, transparent)' } ], options: getDualAxisOptions('currency', 'roas', '#f97316', '#3b82f6', scaleYAxisToZero), },
                { id: 'canceled_fulfillment', title: '🚚 Canceled & Fulfillment', labels: timeSeriesData.labels, datasets: [ { label: 'Canceled', data: timeSeriesData.Canceled, yAxisID: 'y', borderColor: colors['--color-negative'], backgroundColor: `color-mix(in srgb, ${colors['--color-negative']} 20%, transparent)` }, { label: 'Avg Fulfillment', data: timeSeriesData.Avg_Fulfillment, yAxisID: 'y1', borderColor: '#d946ef', backgroundColor: 'color-mix(in srgb, #d946ef 20%, transparent)' } ], options: getDualAxisOptions('percent', 'days', colors['--color-negative'], '#d946ef', scaleYAxisToZero), },
                { id: 'aov_conv_rate', title: '🛒 AOV & Conv. Rate', labels: timeSeriesData.labels, datasets: [ { label: 'AOV', data: timeSeriesData.AOV, yAxisID: 'y', borderColor: '#eab308', backgroundColor: 'color-mix(in srgb, #eab308 20%, transparent)' }, { label: 'Conv. Rate', data: timeSeriesData.Conv_Rate, yAxisID: 'y1', borderColor: '#4fc3f7', backgroundColor: 'color-mix(in srgb, #4fc3f7 20%, transparent)' } ], options: getDualAxisOptions('currency', 'percent', '#eab308', '#4fc3f7', scaleYAxisToZero), },
                { id: 'profit_margin_per_order', title: '💹 Profit Margin & Profit/Order', labels: timeSeriesData.labels, datasets: [ { label: 'Profit Margin', data: timeSeriesData.Profit_Margin, yAxisID: 'y', borderColor: colors['--color-positive'], backgroundColor: `color-mix(in srgb, ${colors['--color-positive']} 20%, transparent)` }, { label: 'Profit/Order', data: timeSeriesData.Profit_Per_Order, yAxisID: 'y1', borderColor: '#f59e0b', backgroundColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' } ], options: getDualAxisOptions('percent', 'currency', colors['--color-positive'], '#f59e0b', scaleYAxisToZero), },
                { id: 'profit', title: '💵 Profit', labels: timeSeriesData.labels, datasets: [{ label: 'Profit', data: timeSeriesData.Profit, borderColor: colors['--color-positive'], backgroundColor: `color-mix(in srgb, ${colors['--color-positive']} 20%, transparent)` }], options: getChartOptions('currency', scaleYAxisToZero) },
                { id: 'sessions', title: '👥 Sessions', labels: timeSeriesData.labels, datasets: [{ label: 'Sessions', data: timeSeriesData.Sessions, borderColor: '#3b82f6', backgroundColor: 'color-mix(in srgb, #3b82f6 20%, transparent)' }], options: getChartOptions('number', scaleYAxisToZero) },
                { id: 'aov', title: '🛒 Avg. Order Value', labels: timeSeriesData.labels, datasets: [{ label: 'AOV', data: timeSeriesData.AOV, borderColor: '#eab308', backgroundColor: 'color-mix(in srgb, #eab308 20%, transparent)' }], options: getChartOptions('currency', scaleYAxisToZero) },
                { id: 'conv_rate', title: '📈 Conversion Rate', labels: timeSeriesData.labels, datasets: [{ label: 'Conv. Rate', data: timeSeriesData.Conv_Rate, borderColor: '#4fc3f7', backgroundColor: 'color-mix(in srgb, #4fc3f7 20%, transparent)' }], options: getChartOptions('percent', scaleYAxisToZero) },
                { id: 'revenue_solo', title: '💰 Revenue', labels: timeSeriesData.labels, datasets: [{ label: 'Revenue', data: timeSeriesData.Revenue, borderColor: colors['--color-accent'], backgroundColor: `color-mix(in srgb, ${colors['--color-accent']} 20%, transparent)` }], options: getChartOptions('currency', scaleYAxisToZero) },
                { id: 'canceled_solo', title: '❌ Canceled Rate', labels: timeSeriesData.labels, datasets: [{ label: 'Canceled', data: timeSeriesData.Canceled, borderColor: colors['--color-negative'], backgroundColor: `color-mix(in srgb, ${colors['--color-negative']} 20%, transparent)` }], options: getChartOptions('percent', scaleYAxisToZero) },
            ]);
        }
        return { fullChartDefs: chartDefs, visibleChartDefs: chartDefs.filter(c => selectedCharts.includes(c.id)) };
    }, [timeSeriesData, selectedCharts, scaleYAxisToZero, theme]);

    const getChange = (current: number, previous: number | undefined) => { if (previous === undefined || previous === 0) return { value: 'N/A', positive: true }; const change = ((current - previous) / previous) * 100; return { value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`, positive: change >= 0 }; };
    const getChangeClass = (status: 'positive' | 'negative' | 'neutral' | undefined) => {
        if (status === 'positive') return 'text-[var(--color-positive)]';
        if (status === 'negative') return 'text-[var(--color-negative)]';
        return 'text-[var(--color-text-primary)]';
    };
    const fullKpiDefs = { revenue: { i: '💰', t: 'Revenue', m: 'Revenue', f: 'currency' }, orders: { i: '📦', t: 'Orders', m: 'Orders', f: 'number' }, profit: { i: '💵', t: 'Profit', m: 'Profit', f: 'currency' }, sessions: { i: '👥', t: 'Sessions', m: 'Sessions', f: 'number' }, ppc_spend: { i: '💸', t: 'PPC Spend', m: 'PPC_Spend', f: 'currency' }, roas: { i: '🎯', t: 'ROAS', m: 'ROAS', f: 'roas' }, aov: { i: '🛒', t: 'AOV', m: 'AOV', f: 'currency' }, conv_rate: { i: '📈', t: 'Conv. Rate', m: 'Conv_Rate', f: 'percent' }, };
    
    // --- Layout and selection handlers ---
    const onLayoutChange = (setLayouts: any) => (layout: any, allLayouts: any) => setLayouts(allLayouts);
    
    const createSelectionChangeHandler = (allIds: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => (id: string, isChecked: boolean) => {
        setSelected(prev => {
            const newSelection = new Set(prev);
            if (isChecked) newSelection.add(id); else newSelection.delete(id);
            return allIds.filter(i => newSelection.has(i));
        });
    };

    const handleKpiSelectionChange = createSelectionChangeHandler(allKpiIds, setSelectedKpis);
    const handleChartSelectionChange = createSelectionChangeHandler(allChartIds, setSelectedCharts);
    const handleTableColumnSelectionChange = createSelectionChangeHandler(Object.keys(allTableColumnDefs), setSelectedTableColumns);


    if (allPerformanceData.length === 0 || allAccountDetails.length === 0) {
        return <div className="text-center p-8 bg-black/20 rounded-lg"><h2 className="text-xl font-semibold mb-2">Data Required</h2><p className="text-[var(--color-text-secondary)]">Please load both Website Data and Client Info to use this dashboard.</p></div>;
    }

    return (
        <main className="flex flex-col gap-12">
            {isModalOpen && (
                 <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
                     <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-2xl w-full max-w-4xl">
                         <div className="p-5 border-b border-[var(--color-border)] flex justify-between items-center"><h3 className="text-xl font-semibold text-[var(--color-text-primary)]">Customize Dashboard</h3><button onClick={() => setIsModalOpen(false)} aria-label="Close" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                         <div className="p-6 max-h-[70vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                              <div>
                                 <h4 className="text-lg font-semibold mb-4 text-[var(--color-text-accent)]">📈 KPI Tiles</h4>
                                 <div className="space-y-3">{Object.entries(fullKpiDefs).map(([id, def]) => (<label key={id} className="flex items-center space-x-3 bg-black/20 p-3 rounded-lg hover:bg-black/30 cursor-pointer transition-colors"><input type="checkbox" className="h-5 w-5 rounded bg-slate-700 border-slate-500 text-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]" checked={selectedKpis.includes(id)} onChange={(e) => handleKpiSelectionChange(id, e.target.checked)} /><span className="text-[var(--color-text-primary)] select-none">{def.i} {def.t}</span></label>))}</div>
                             </div>
                              <div>
                                 <h4 className="text-lg font-semibold mb-4 text-[var(--color-text-accent)]">📊 Chart Tiles</h4>
                                 <div className="space-y-3">{fullChartDefs.map(chart => (<label key={chart.id} className="flex items-center space-x-3 bg-black/20 p-3 rounded-lg hover:bg-black/30 cursor-pointer transition-colors"><input type="checkbox" className="h-5 w-5 rounded bg-slate-700 border-slate-500 text-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]" checked={selectedCharts.includes(chart.id)} onChange={(e) => handleChartSelectionChange(chart.id, e.target.checked)} /><span className="text-[var(--color-text-primary)] select-none">{chart.title}</span></label>))}</div>
                             </div>
                             <div className="md:col-span-2">
                                <h4 className="text-lg font-semibold mt-2 mb-4 text-[var(--color-text-accent)]">📋 Table Columns</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {Object.entries(allTableColumnDefs).map(([id, def]) => {
                                        const isPermanent = id === 'month';
                                        return ( <label key={id} className={`flex items-center space-x-3 bg-black/20 p-3 rounded-lg transition-colors ${isPermanent ? 'cursor-not-allowed opacity-70' : 'hover:bg-black/30 cursor-pointer'}`}><input type="checkbox" className="h-5 w-5 rounded bg-slate-700 border-slate-500 text-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50" checked={selectedTableColumns.includes(id)} onChange={(e) => handleTableColumnSelectionChange(id, e.target.checked)} disabled={isPermanent} /><span className="text-[var(--color-text-primary)] select-none text-sm">{def.header}</span></label> )
                                    })}
                                </div>
                            </div>
                         </div>
                         <div className="p-4 bg-black/20 rounded-b-xl flex justify-end"><button onClick={() => setIsModalOpen(false)} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-2 px-6 rounded-lg transition-colors">Done</button></div>
                     </div>
                 </div>
            )}
            
            {selectedAutoGroup && (
                <section className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] rounded-xl p-6 shadow-2xl border border-[var(--color-border)]">
                    {clientsInGroup.length > 0 && (
                        <div ref={addClientRef}>
                            <h3 className="text-lg font-semibold text-[var(--color-text-secondary)] mb-3 flex items-center gap-2 relative">
                                <span>Clients in {groupName} ({clientsInGroup.filter(c=>c.checked).length} selected):</span>
                                <button onClick={() => setIsAddClientPopoverOpen(prev => !prev)} title="Add client to comparison" className="bg-black/20 hover:bg-[var(--color-accent)]/30 rounded-full p-1 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                </button>
                                {isAddClientPopoverOpen && (
                                    <div className="absolute top-full left-0 mt-2 z-20 w-72 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-lg">
                                        <div className="p-2">
                                            <input
                                                type="text"
                                                value={addClientSearch}
                                                onChange={e => setAddClientSearch(e.target.value)}
                                                placeholder="Search to add client..."
                                                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2"
                                                autoFocus
                                            />
                                        </div>
                                        <ul className="max-h-60 overflow-y-auto">
                                            {availableClientsToAdd.length > 0 ? (
                                                availableClientsToAdd.map(client => (
                                                    <li
                                                        key={client.ClientName}
                                                        onClick={() => handleAddClient(client.ClientName)}
                                                        className="px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-black/30 cursor-pointer"
                                                    >
                                                        {client.ClientName}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="px-4 py-2 text-sm text-[var(--color-text-secondary)]">No clients found.</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {clientsInGroup.map(client => (
                                    <label key={client.name} className="flex items-center space-x-3 bg-black/20 p-3 rounded-lg hover:bg-black/30 cursor-pointer transition-colors">
                                        <input type="checkbox" checked={client.checked} onChange={() => handleClientToggle(client.name)} className="h-4 w-4 rounded bg-slate-700 border-slate-500 text-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]" />
                                        <span className="text-sm text-[var(--color-text-primary)] truncate" title={client.name}>{client.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}

             {/* --- KPI SECTION --- */}
            <section>
                <div className="text-2xl text-center font-semibold mb-6 text-[var(--color-text-primary)] flex items-center justify-center gap-4">
                    <span>{projectionData?.isProjected ? `${projectionData.displayMonthData.Month} Projected Totals` : `${projectionData?.displayMonthData.Month} Totals`}</span>
                    {projectionData?.isProjected && (
                        <div className="group relative flex items-center">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--color-text-accent)]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                             <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max hidden group-hover:block bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] text-xs rounded py-1 px-2 shadow-lg z-10">{projectionData.projectionInfo}</span>
                        </div>
                    )}
                </div>
                {projectionData ? (
                    <ResponsiveGridLayout className="layout" layouts={kpiLayouts} onLayoutChange={onLayoutChange(setKpiLayouts)} breakpoints={{lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0}} cols={{lg: 4, md: 4, sm: 2, xs: 1, xxs: 1}} rowHeight={220} draggableHandle=".drag-handle">
                        {Object.entries(fullKpiDefs).filter(([id]) => selectedKpis.includes(id)).map(([id, def]) => {
                            const { displayMonthData, previousMonthData, lastYearMonthData } = projectionData;
                            const metricKey = def.m as keyof ClientDataRecord;
                            const currentVal = displayMonthData[metricKey] as number, prevVal = previousMonthData?.[metricKey] as number | undefined, yearVal = lastYearMonthData?.[metricKey] as number | undefined;
                            const mom = getChange(currentVal, prevVal), yoy = getChange(currentVal, yearVal);
                            const isPositive = mom.value !== 'N/A' ? mom.positive : yoy.positive;
                            const changes = [ { ...mom, label: `vs ${previousMonthData?.Month.substring(0,3) || 'Prev'}`}, { ...yoy, label: `vs ${lastYearMonthData?.Month.substring(0,3) || ''} ${lastYearMonthData?.Year || ''}`} ];
                            return (
                                <div key={id}>
                                    <KpiGridItem icon={def.i} title={def.t} positive={isPositive} value={formatValue(currentVal, def.f as any)} changes={changes} />
                                </div>
                            );
                        })}
                    </ResponsiveGridLayout>
                ) : (
                    <div className="text-center p-8 bg-black/20 rounded-lg"><p className="text-[var(--color-text-secondary)]">Select clients to view aggregated data.</p></div>
                )}
            </section>
            
             {/* --- CHART SECTION --- */}
            <section>
                <div className="flex items-center justify-center gap-4 mb-6">
                    <h2 className="text-2xl text-center font-semibold text-[var(--color-text-primary)]">Aggregated Trends</h2>
                    <select value={chartTimeRange} onChange={(e) => setChartTimeRange(e.target.value as TimeRange)} aria-label="Select time range for charts" className="text-sm bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-1.5"><option value="3m">3 Months</option><option value="6m">6 Months</option><option value="12m">12 Months</option><option value="24m">2 Years</option></select>
                    <label className="flex items-center space-x-2 text-sm text-[var(--color-text-secondary)] cursor-pointer"><input type="checkbox" checked={scaleYAxisToZero} onChange={(e) => setScaleYAxisToZero(e.target.checked)} className="h-4 w-4 rounded bg-slate-700 border-slate-500 text-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]" /><span>Scale to 0</span></label>
                </div>
                {visibleChartDefs.length > 0 ? (
                    <ResponsiveGridLayout className="layout" layouts={chartLayouts} onLayoutChange={onLayoutChange(setChartLayouts)} breakpoints={{lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0}} cols={{lg: 2, md: 2, sm: 1, xs: 1, xxs: 1}} rowHeight={300} draggableHandle=".drag-handle">
                        {visibleChartDefs.map(chart => (<div key={chart.id}><ChartGridItem title={chart.title}><div className="h-full"><ChartWrapper type="line" data={{ labels: chart.labels, datasets: chart.datasets.map((ds: any) => ({ ...ds, borderWidth: 2, fill: true, tension: 0.4 })) }} options={chart.options} /></div></ChartGridItem></div>))}
                    </ResponsiveGridLayout>
                ) : (
                    <div className="text-center p-8 bg-black/20 rounded-lg"><p className="text-[var(--color-text-secondary)]">No charts selected. Use the customize button to add charts.</p></div>
                )}
            </section>
            
            {/* --- TABLE SECTION --- */}
            <section className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] rounded-xl p-6 shadow-2xl border border-[var(--color-border)]">
                <div className="flex items-center justify-center gap-4 mb-4">
                    <h2 className="text-2xl text-center font-semibold text-[var(--color-text-primary)]">📋 Aggregated Data Table</h2>
                    <select value={tableTimeRange} onChange={(e) => setTableTimeRange(e.target.value as TimeRange)} aria-label="Select time range for table" className="text-sm bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-1.5"><option value="3m">3 Months</option><option value="6m">6 Months</option><option value="12m">12 Months</option><option value="24m">2 Years</option></select>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm whitespace-nowrap">
                        <thead className="bg-[var(--color-bg-secondary)]">
                            <tr>
                                {selectedTableColumns.map(colId => {
                                    const def = allTableColumnDefs[colId as keyof typeof allTableColumnDefs];
                                    if (!def) return null;
                                    return <th key={colId} className={`p-3 font-semibold uppercase text-[var(--color-text-secondary)] tracking-wider ${colId !== 'month' ? 'text-center' : 'text-left'}`}>{def.header}</th>
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
                                        let displayValue: React.ReactNode = '-';
                                        if (value !== undefined && value !== null) {
                                            if (def.format && typeof value === 'number') { displayValue = formatValue(value, def.format); } 
                                            else if (String(value).trim() !== '') { displayValue = String(value); }
                                        }
                                        let changeIcon = null;
                                        if (d.changes && d.changes[def.dataKey]) {
                                            const status = d.changes[def.dataKey];
                                            if (status === 'positive') changeIcon = <span className="ml-2 text-[var(--color-positive)]">▲</span>;
                                            if (status === 'negative') changeIcon = <span className="ml-2 text-[var(--color-negative)]">▼</span>;
                                        }
                                        
                                        let cellBgClass = '';
                                        if (d.isProjection) { cellBgClass = 'projection-cell'; } 
                                        else if (d.isActuals) { cellBgClass = 'actuals-cell'; }

                                        return <td key={colId} className={`p-3 ${colId !== 'month' ? 'text-center' : 'text-left'} font-medium ${getChangeClass(d.changes?.[def.dataKey])} ${cellBgClass}`}>{displayValue}{changeIcon}</td>
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
// FIX: Add default export to resolve import error in App.tsx.
export default MultiClientDashboard;
