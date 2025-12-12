
import React, { useMemo } from 'react';
import { AccountDetailsRecord, ClientDataRecord, KeyContactRecord, Theme, MetricComparisonToolState } from '../types';
import ChartGridItem from './ChartGridItem';
import ChartWrapper from './ChartWrapper';
import type { ChartOptions } from 'chart.js';

const monthMap: { [key: string]: number } = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
const formatValue = (value: number | undefined, type: 'currency' | 'percent' | 'number' | 'roas') => {
    if (value === undefined || isNaN(value) || !isFinite(value)) value = 0;
    switch (type) {
        case 'currency': return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        case 'percent': return `${value.toFixed(1)}%`;
        case 'number': return value.toLocaleString();
        case 'roas': return `${value.toFixed(1)}x`;
    }
};

const kpiDefs: { [key: string]: { title: string; metric: keyof ClientDataRecord; format: 'currency' | 'percent' | 'number' | 'roas'; higherIsBetter: boolean } } = {
    revenue: { title: 'Revenue', metric: 'Revenue', format: 'currency', higherIsBetter: true },
    orders: { title: 'Orders', metric: 'Orders', format: 'number', higherIsBetter: true },
    profit: { title: 'Profit', metric: 'Profit', format: 'currency', higherIsBetter: true },
    roas: { title: 'ROAS', metric: 'ROAS', format: 'roas', higherIsBetter: true },
    aov: { title: 'AOV', metric: 'AOV', format: 'currency', higherIsBetter: true },
    sessions: { title: 'Sessions', metric: 'Sessions', format: 'number', higherIsBetter: true },
    conv_rate: { title: 'Conv. Rate', metric: 'Conv_Rate', format: 'percent', higherIsBetter: true },
    ppc_spend: { title: 'PPC Spend', metric: 'PPC_Spend', format: 'currency', higherIsBetter: false },
};

type TimeRange = '3m' | '6m' | '12m' | '24m';

interface ClientWithPerformance extends AccountDetailsRecord {
    performanceData: ClientDataRecord[];
    metricChange: number;
}

interface MetricComparisonToolProps {
    allPerformanceData: ClientDataRecord[];
    allAccountDetails: AccountDetailsRecord[];
    allKeyContactsData: KeyContactRecord[];
    onSelectClient: (clientName: string) => void;
    theme: Theme;
    toolState: MetricComparisonToolState;
    onStateChange: (newState: Partial<MetricComparisonToolState>) => void;
}

const calculateProjectedMonth = (record: ClientDataRecord | null): ClientDataRecord => {
    if (!record) return {} as ClientDataRecord;
    const daysOfData = record.Days_of_Data;
    if (typeof daysOfData === 'number' && daysOfData > 0) {
        const date = new Date(record.Year, monthMap[record.Month.substring(0, 3)]);
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        if (daysOfData < daysInMonth) {
            const projectionFactor = daysInMonth / daysOfData;
            const pRev = (record.Revenue || 0) * projectionFactor;
            const pOrd = (record.Orders || 0) * projectionFactor;
            const pPro = (record.Profit || 0) * projectionFactor;
            const pPPC = (record.PPC_Spend || 0) * projectionFactor;
            const pSess = (record.Sessions || 0) * projectionFactor;

            return {
                ...record, Revenue: pRev, Orders: pOrd, Profit: pPro, PPC_Spend: pPPC, Sessions: pSess,
                AOV: pOrd > 0 ? pRev / pOrd : 0,
                ROAS: pPPC > 0 ? pRev / pPPC : 0,
                Conv_Rate: pSess > 0 ? (pOrd / pSess) * 100 : 0,
            };
        }
    }
    return record;
};


const MetricComparisonTool: React.FC<MetricComparisonToolProps> = ({ allPerformanceData, allAccountDetails, allKeyContactsData, onSelectClient, theme, toolState, onStateChange }) => {
    const { role: selectedRole, manager: selectedManager, threshold, chartTimeRange, selectedMetric } = toolState;

    const managers = useMemo(() => {
        if (!selectedRole) return [];
        const managerNames = allKeyContactsData
            .map(contact => contact[selectedRole])
            .filter(Boolean) as string[];
        return ['All Clients', ...[...new Set(managerNames)].sort()];
    }, [selectedRole, allKeyContactsData]);

    const { increasingClients, decreasingClients } = useMemo(() => {
        if (!selectedManager) {
            return { increasingClients: [], decreasingClients: [] };
        }

        let clientsForManager: AccountDetailsRecord[];

        if (selectedManager === 'All Clients') {
            const clientsWithPerformanceData = new Set(allPerformanceData.map(d => d.ClientName));
            clientsForManager = allAccountDetails.filter(client => clientsWithPerformanceData.has(client.ClientName));
        } else {
            const clientNamesForManager = new Set(
                allKeyContactsData
                    .filter(contact => contact[selectedRole as 'PPC' | 'PDM'] === selectedManager)
                    .map(contact => contact.ClientName)
            );
            clientsForManager = allAccountDetails.filter(client => clientNamesForManager.has(client.ClientName));
        }
        
        const clientDataByName = allPerformanceData.reduce((acc, record) => {
            if (!acc[record.ClientName]) acc[record.ClientName] = [];
            acc[record.ClientName].push(record);
            return acc;
        }, {} as { [key: string]: ClientDataRecord[] });

        const metricDef = kpiDefs[selectedMetric];
        if (!metricDef) return { increasingClients: [], decreasingClients: [] };

        const alerts = clientsForManager.map(client => {
            const clientPerformance = clientDataByName[client.ClientName];
            if (!clientPerformance || clientPerformance.length < 2) return null;

            const sortedData = [...clientPerformance].sort((a, b) => new Date(b.Year, monthMap[b.Month.substring(0, 3)]).getTime() - new Date(a.Year, monthMap[a.Month.substring(0, 3)]).getTime());
            
            const latestMonthProjected = calculateProjectedMonth(sortedData[0]);
            const previousMonthData = sortedData[1];
            if (!previousMonthData) return null;

            const currentMetricValue = latestMonthProjected[metricDef.metric] as number;
            const previousMetricValue = previousMonthData[metricDef.metric] as number;

            if (previousMetricValue === 0) return null;

            const metricChange = (currentMetricValue - previousMetricValue) / previousMetricValue;
            
            if (Math.abs(metricChange) >= threshold) {
                return { ...client, performanceData: sortedData, metricChange };
            }
            return null;
        }).filter((c): c is ClientWithPerformance => c !== null);

        const increasing = alerts.filter(c => c.metricChange > 0).sort((a, b) => b.metricChange - a.metricChange);
        const decreasing = alerts.filter(c => c.metricChange < 0).sort((a, b) => a.metricChange - b.metricChange);
            
        return { increasingClients: increasing, decreasingClients: decreasing };

    }, [selectedManager, selectedRole, threshold, selectedMetric, allKeyContactsData, allAccountDetails, allPerformanceData]);
    
    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onStateChange({
            role: e.target.value as 'PPC' | 'PDM' | '',
            manager: '',
        });
    };

    if (allAccountDetails.length === 0 || allKeyContactsData.length === 0 || allPerformanceData.length === 0) {
        return <div className="text-center p-8 bg-black/20 rounded-lg"><h2 className="text-xl font-semibold mb-2">Data Required</h2><p className="text-[var(--color-text-secondary)]">Please load Client Info, Key Contacts, and Website Data to use this tool.</p></div>;
    }

    const getHeaderLink = (client: AccountDetailsRecord) => (
        <button onClick={() => onSelectClient(client.ClientName)} className="text-sm font-semibold text-[var(--color-text-accent)] hover:brightness-90 inline-flex items-center gap-1.5">
            View Dashboard
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </button>
    );

    const getMetricChartConfig = (clientPerformance: ClientDataRecord[], timeRange: TimeRange, metricKey: string) => {
        const metricDef = kpiDefs[metricKey];
        if (!metricDef) return null;
        
        const chronologicalData = [...clientPerformance].reverse();
        const dataWithProjection = chronologicalData.map((record, index) => {
            if (index === chronologicalData.length - 1) {
                const projectedRecord = calculateProjectedMonth(record);
                if (projectedRecord !== record) return { ...projectedRecord, isProjection: true };
            }
            return { ...record, isProjection: false };
        });

        const monthsToShow = { '3m': 3, '6m': 6, '12m': 12, '24m': 24 }[timeRange] || 12;
        const timeSeries = dataWithProjection.slice(-monthsToShow);
        if (timeSeries.length === 0) return null;

        const labels = timeSeries.map(d => `${d.Month.substring(0, 3)} '${String(d.Year).slice(-2)}${d.isProjection ? ' (Proj.)' : ''}`);
        const metricData = timeSeries.map(d => d[metricDef.metric] as number);

        const { colors } = theme;
        const backgroundColors = timeSeries.map((d, index) => {
            if (d.isProjection) return colors['--color-accent'];
            if (index === timeSeries.length - 2) return colors['--color-accent-secondary'];
            return 'rgba(148, 163, 184, 0.2)';
        });

        const options: ChartOptions<'bar'> = {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => formatValue(context.parsed.y, metricDef.format) } },
                datalabels: { display: false },
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: colors['--color-text-secondary'], callback: (v) => formatValue(v as number, metricDef.format) }, grid: { color: colors['--color-border'] } },
                x: { ticks: { color: colors['--color-text-secondary'] }, grid: { display: false } },
            },
        } as any;

        return { data: { labels, datasets: [{ label: metricDef.title, data: metricData, backgroundColor: backgroundColors }] }, options, type: 'bar' as const };
    };

    return (
        <section className="flex flex-col gap-8">
            <div className="bg-[var(--color-card-bg)] backdrop-blur-sm rounded-xl border border-[var(--color-border)] shadow-lg p-6">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4 text-center">💸 Metric Comparison Tool</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
                    <div><label htmlFor="role-sel" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Role</label><select id="role-sel" value={selectedRole} onChange={handleRoleChange} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5"><option value="">Select Role</option><option value="PPC">PPC Manager</option><option value="PDM">PDM</option></select></div>
                    <div><label htmlFor="mgr-sel" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Manager</label><select id="mgr-sel" value={selectedManager} onChange={e => onStateChange({ manager: e.target.value })} disabled={!selectedRole} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5 disabled:opacity-50"><option value="">Select Manager</option>{managers.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                    <div><label htmlFor="met-sel" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Metric</label><select id="met-sel" value={selectedMetric} onChange={e => onStateChange({ selectedMetric: e.target.value })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5">{Object.entries(kpiDefs).map(([k, d]) => <option key={k} value={k}>{d.title}</option>)}</select></div>
                    <div><label htmlFor="thr-sel" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Alert Threshold</label><select id="thr-sel" value={threshold} onChange={e => onStateChange({ threshold: parseFloat(e.target.value) })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5"><option value={0}>No Threshold (Show All)</option><option value={0.05}>+/- 5%</option><option value={0.10}>+/- 10%</option><option value={0.15}>+/- 15%</option><option value={0.20}>+/- 20%</option></select></div>
                    <div><label htmlFor="time-sel" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Chart Time Range</label><select id="time-sel" value={chartTimeRange} onChange={e => onStateChange({ chartTimeRange: e.target.value as TimeRange })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5"><option value="3m">3 Months</option><option value="6m">6 Months</option><option value="12m">12 Months</option><option value="24m">2 Years</option></select></div>
                </div>
            </div>

            {selectedManager && (
                (increasingClients.length > 0 || decreasingClients.length > 0) ? (
                    <div className="flex flex-col gap-12">
                        {increasingClients.length > 0 && (
                            <div>
                                <h3 className="text-2xl font-bold text-center mb-6 text-[var(--color-positive)]">📈 Increasing</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {increasingClients.map(client => {
                                        const chartConfig = getMetricChartConfig(client.performanceData, chartTimeRange, selectedMetric);
                                        const metricDef = kpiDefs[selectedMetric];
                                        const subtitle = `Projected ${metricDef.title.toLowerCase()} up ${(client.metricChange * 100).toFixed(1)}% vs. last month`;
                                        const isGood = metricDef.higherIsBetter;
                                        return (
                                            <div key={client.ClientName} style={{minHeight: '350px'}}>
                                                <ChartGridItem title={client.ClientName} subtitle={subtitle} headerControls={getHeaderLink(client)}>
                                                    {chartConfig ? (
                                                        <div className="h-full relative">
                                                            <div className={`absolute top-0 right-0 z-10 text-lg font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg ${isGood ? 'bg-[var(--color-positive-bg)] text-[var(--color-positive)]' : 'bg-[var(--color-negative-bg)] text-[var(--color-negative)]'}`}>
                                                                ▲ {(client.metricChange * 100).toFixed(1)}%
                                                            </div>
                                                            <ChartWrapper type={chartConfig.type} data={chartConfig.data} options={chartConfig.options} />
                                                        </div>
                                                    ) : <p>Not enough data for chart.</p>}
                                                </ChartGridItem>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                        {decreasingClients.length > 0 && (
                            <div>
                                <h3 className="text-2xl font-bold text-center mb-6 text-[var(--color-negative)]">📉 Decreasing</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {decreasingClients.map(client => {
                                        const chartConfig = getMetricChartConfig(client.performanceData, chartTimeRange, selectedMetric);
                                        const metricDef = kpiDefs[selectedMetric];
                                        const subtitle = `Projected ${metricDef.title.toLowerCase()} down ${(Math.abs(client.metricChange) * 100).toFixed(1)}% vs. last month`;
                                        const isGood = !metricDef.higherIsBetter;
                                        return (
                                            <div key={client.ClientName} style={{minHeight: '350px'}}>
                                                <ChartGridItem title={client.ClientName} subtitle={subtitle} headerControls={getHeaderLink(client)}>
                                                    {chartConfig ? (
                                                        <div className="h-full relative">
                                                            <div className={`absolute top-0 right-0 z-10 text-lg font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg ${isGood ? 'bg-[var(--color-positive-bg)] text-[var(--color-positive)]' : 'bg-[var(--color-negative-bg)] text-[var(--color-negative)]'}`}>
                                                                ▼ {(client.metricChange * 100).toFixed(1)}%
                                                            </div>
                                                            <ChartWrapper type={chartConfig.type} data={chartConfig.data} options={chartConfig.options} />
                                                        </div>
                                                    ) : <p>Not enough data for chart.</p>}
                                                </ChartGridItem>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center p-8 bg-black/20 rounded-lg">
                        <h2 className="text-xl font-semibold mb-2">All Clear!</h2>
                        <p className="text-[var(--color-text-secondary)]">No clients for {selectedManager} have a projected {kpiDefs[selectedMetric].title.toLowerCase()} change greater than {(threshold * 100).toFixed(0)}%.</p>
                    </div>
                )
            )}
        </section>
    );
};
export default MetricComparisonTool;
