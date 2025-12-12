import React, { useMemo, useState } from 'react';
import { GoogleAnalyticsRecord, Theme } from '../types';
import ChartWrapper from './ChartWrapper';

type TimeRange = '3m' | '6m' | '12m' | '24m';
type DataType = 'revenue' | 'sessions' | 'orders' | 'convRate';

interface GoogleAnalyticsTileProps {
    view: 'snapshot' | 'line' | 'bar';
    snapshotData: GoogleAnalyticsRecord | null;
    trendData: GoogleAnalyticsRecord[] | null;
    timeRange: TimeRange;
    theme: Theme;
}

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '$0';
    return `$${Math.round(value).toLocaleString('en-US')}`;
};

const formatNumber = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0';
    return Math.round(value).toLocaleString('en-US'); 
};

const formatPercentage = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0.0%';
    return `${value.toFixed(1)}%`;
};

const formatPercentageAsRate = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0.0%';
    return `${value.toFixed(1)}%`;
};


const GoogleAnalyticsTile: React.FC<GoogleAnalyticsTileProps> = ({ view, snapshotData, trendData, timeRange, theme }) => {
    const [dataType, setDataType] = useState<DataType>('revenue');

    const snapshotMemo = useMemo(() => {
        if (!snapshotData) return { mediums: [], totalValue: 0, chartConfig: null };

        const { 
            Revenue, Sessions, Orders, ConvRate,
            RevenuePercentOrganic, RevenuePercentDirect, RevenuePercentPPC, RevenuePercentReferral,
            SessionsPercentOrganic, SessionsPercentDirect, SessionsPercentPPC, SessionsPercentReferral,
            OrdersPercentOrganic, OrdersPercentDirect, OrdersPercentPPC, OrdersPercentReferral,
            ConvRatePercentOrganic, ConvRatePercentDirect, ConvRatePercentPPC, ConvRatePercentReferral,
        } = snapshotData;
        
        const orderedColors = [
            '#A78BFA', // Purple for Organic
            '#2DD4BF', // Teal for Direct
            '#f59e0b', // Orange for PPC
            '#3b82f6', // Blue for Referral
        ];

        if (dataType === 'convRate') {
            const mediums = [
                { name: 'Organic', value: ConvRatePercentOrganic || 0, orders: Orders * ((OrdersPercentOrganic || 0) / 100), color: orderedColors[0] },
                { name: 'Direct', value: ConvRatePercentDirect || 0, orders: Orders * ((OrdersPercentDirect || 0) / 100), color: orderedColors[1] },
                { name: 'PPC', value: ConvRatePercentPPC || 0, orders: Orders * ((OrdersPercentPPC || 0) / 100), color: orderedColors[2] },
                { name: 'Referral', value: ConvRatePercentReferral || 0, orders: Orders * ((OrdersPercentReferral || 0) / 100), color: orderedColors[3] },
            ];
            
            // The chart shows the distribution of orders, which is the context for CVR.
            const chartDataValues = [
                OrdersPercentOrganic || 0,
                OrdersPercentDirect || 0,
                OrdersPercentPPC || 0,
                OrdersPercentReferral || 0,
            ];

            const config = {
                labels: mediums.map(m => m.name),
                datasets: [{
                    data: chartDataValues,
                    backgroundColor: orderedColors,
                    borderColor: theme.colors['--color-bg-primary'],
                    borderWidth: 5,
                }]
            };

            return { mediums, totalValue: ConvRate, chartConfig: config };
        }

        let totalValue: number, pOrganic: number, pDirect: number, pPPC: number, pReferral: number;

        switch(dataType) {
            case 'orders':
                totalValue = Orders; pOrganic = OrdersPercentOrganic; pDirect = OrdersPercentDirect; pPPC = OrdersPercentPPC; pReferral = OrdersPercentReferral; break;
            case 'sessions':
                totalValue = Sessions; pOrganic = SessionsPercentOrganic; pDirect = SessionsPercentDirect; pPPC = SessionsPercentPPC; pReferral = SessionsPercentReferral; break;
            case 'revenue':
            default:
                totalValue = Revenue; pOrganic = RevenuePercentOrganic; pDirect = RevenuePercentDirect; pPPC = RevenuePercentPPC; pReferral = RevenuePercentReferral; break;
        }
        
        const rawMediums = [
            { name: 'Organic', percent: pOrganic },
            { name: 'Direct', percent: pDirect },
            { name: 'PPC', percent: pPPC },
            { name: 'Referral', percent: pReferral },
        ];
        
        const totalPercent = rawMediums.reduce((sum, m) => sum + (m.percent || 0), 0);
        
        if (totalValue > 0 && totalPercent < 1) {
            const mediums = [{
                name: 'Unspecified',
                displayPercent: 100,
                value: totalValue,
                color: theme.colors['--color-text-secondary'],
            }];
            
            const config = {
                labels: ['Unspecified'],
                datasets: [{
                    data: [100],
                    backgroundColor: [theme.colors['--color-text-secondary']],
                    borderColor: theme.colors['--color-bg-primary'],
                    borderWidth: 5,
                }]
            };

            return { mediums, totalValue, chartConfig: config };
        }
        
        const factor = totalPercent > 0 ? 100 / totalPercent : 0;
        
        const mediums = rawMediums.map((m, i) => ({
            name: m.name,
            displayPercent: m.percent || 0,
            chartPercent: (m.percent || 0) * factor,
            value: totalValue * ((m.percent || 0) / 100),
            color: orderedColors[i],
        }));
        
        const config = {
            labels: mediums.map(m => m.name),
            datasets: [{
                data: mediums.map(m => m.chartPercent),
                backgroundColor: mediums.map(m => m.color),
                borderColor: theme.colors['--color-bg-primary'],
                borderWidth: 5,
            }]
        };

        return { mediums, totalValue, chartConfig: config };

    }, [snapshotData, theme, dataType]);
    
    const trendDataMemo = useMemo(() => {
        if (!trendData || trendData.length === 0) return null;

        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const historicalData = trendData.filter(d => new Date(d.Date) < startOfCurrentMonth);

        let monthsToShow: number;
        switch (timeRange) {
            case '3m': monthsToShow = 3; break;
            case '6m': monthsToShow = 6; break;
            case '24m': monthsToShow = 24; break;
            case '12m': default: monthsToShow = 12; break;
        }

        const slicedData = historicalData.slice(-monthsToShow);

        if (slicedData.length === 0) return null;
        
        const labels = slicedData.map(d => new Date(d.Date).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }));
        
        const metricKeys: Record<DataType, { total: keyof GoogleAnalyticsRecord, organic: keyof GoogleAnalyticsRecord, direct: keyof GoogleAnalyticsRecord, ppc: keyof GoogleAnalyticsRecord, referral: keyof GoogleAnalyticsRecord }> = {
            revenue: { total: 'Revenue', organic: 'RevenuePercentOrganic', direct: 'RevenuePercentDirect', ppc: 'RevenuePercentPPC', referral: 'RevenuePercentReferral' },
            sessions: { total: 'Sessions', organic: 'SessionsPercentOrganic', direct: 'SessionsPercentDirect', ppc: 'SessionsPercentPPC', referral: 'SessionsPercentReferral' },
            orders: { total: 'Orders', organic: 'OrdersPercentOrganic', direct: 'OrdersPercentDirect', ppc: 'OrdersPercentPPC', referral: 'OrdersPercentReferral' },
            convRate: { total: 'ConvRate', organic: 'ConvRatePercentOrganic', direct: 'ConvRatePercentDirect', ppc: 'ConvRatePercentPPC', referral: 'ConvRatePercentReferral' }
        };

        const currentKeys = metricKeys[dataType];
        const monthlyTotals = slicedData.map(d => (d[currentKeys.total] as number) || 0);

        const colors = { Organic: '#A78BFA', Direct: '#2DD4BF', PPC: '#f59e0b', Referral: '#3b82f6' };
        
        const createDataset = (medium: 'Organic' | 'Direct' | 'PPC' | 'Referral', key: keyof GoogleAnalyticsRecord) => ({
            label: medium,
            data: slicedData.map(d => ((d[currentKeys.total] as number) || 0) * (((d[key] as number) || 0) / 100)),
            backgroundColor: colors[medium],
            borderColor: colors[medium],
        });

        const datasets = [ createDataset('Organic', currentKeys.organic), createDataset('Direct', currentKeys.direct), createDataset('PPC', currentKeys.ppc), createDataset('Referral', currentKeys.referral) ];

        return { labels, datasets, monthlyTotals };

    }, [trendData, timeRange, theme, dataType]);

    if (view === 'snapshot') {
        const { mediums, totalValue, chartConfig } = snapshotMemo;
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: { display: false } },
            events: [],
        };

        if (!chartConfig) {
            return <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">No Analytics Data Available for this month.</div>;
        }

        const totalLabel = dataType === 'revenue' ? 'Total Revenue' : dataType === 'sessions' ? 'Total Sessions' : dataType === 'orders' ? 'Total Orders' : 'Overall CVR';
        const dataButtons: {key: DataType, label: string}[] = [
            { key: 'revenue', label: 'Revenue' },
            { key: 'sessions', label: 'Sessions' },
            { key: 'orders', label: 'Orders' },
            { key: 'convRate', label: 'Conv. Rate' },
        ];

        return (
            <div className="flex flex-col md:flex-row h-full items-center gap-8 p-4">
                <div className="relative h-64 w-64 flex-shrink-0">
                    <ChartWrapper type="doughnut" data={chartConfig} options={chartOptions as any} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                        <span className="text-4xl font-bold text-[var(--color-text-primary)]">
                             {dataType === 'revenue' ? formatCurrency(totalValue)
                                : dataType === 'convRate' ? formatPercentageAsRate(totalValue)
                                : formatNumber(totalValue)
                            }
                        </span>
                        <span className="text-sm text-[var(--color-text-secondary)] mt-1">{totalLabel}</span>
                    </div>
                </div>
    
                <div className="flex-grow w-full">
                    <div className="grid grid-cols-2 gap-2 mb-6">
                        {dataButtons.map(button => (
                             <button 
                                key={button.key}
                                onClick={() => setDataType(button.key)} 
                                className={`w-full text-center px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${dataType === button.key ? 'bg-[var(--color-accent)] text-white' : 'bg-black/20 text-[var(--color-text-secondary)] hover:bg-white/10'}`}>
                                {button.label}
                            </button>
                        ))}
                    </div>

                    <ul className="space-y-4">
                        {mediums.map((medium: any, index: number) => (
                            <li key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: medium.color }}></span>
                                    <span className="text-md font-semibold text-[var(--color-text-primary)]">{medium.name}</span>
                                </div>
                                <div className="text-right">
                                    {dataType === 'convRate' ? (
                                        <>
                                            <p className="font-bold text-md text-[var(--color-text-primary)]">{formatPercentageAsRate(medium.value)}</p>
                                            <p className="text-xs text-[var(--color-text-secondary)]">
                                                {`${formatNumber(medium.orders)} ${Math.round(medium.orders) === 1 ? 'Order' : 'Orders'}`}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="font-bold text-md text-[var(--color-text-primary)]">{formatPercentage(medium.displayPercent)}</p>
                                            <p className="text-xs text-[var(--color-text-secondary)]">
                                                {dataType === 'revenue' ? formatCurrency(medium.value) : formatNumber(medium.value)}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    }

    if (view === 'line' || view === 'bar') {
        if (!trendDataMemo) {
            return <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">No Analytics Trend Data Available.</div>;
        }
        
        const formatForDataType = (value: any) => {
            switch(dataType) {
                case 'revenue': return formatCurrency(value);
                case 'sessions': return formatNumber(value);
                case 'orders': return formatNumber(value);
                case 'convRate': return formatPercentageAsRate(value);
                default: return value;
            }
        };

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' as const, labels: { color: theme.colors['--color-text-secondary'], padding: 20, } },
                tooltip: {
                    callbacks: {
                        label: function(context: any) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.y !== null) { label += formatForDataType(context.parsed.y); }
                            return label;
                        }
                    }
                },
                datalabels: { display: false }
            },
            scales: {
                x: { ticks: { color: theme.colors['--color-text-secondary'] }, grid: { display: false } },
                y: { beginAtZero: true, ticks: { color: theme.colors['--color-text-secondary'], callback: formatForDataType }, grid: { color: theme.colors['--color-border'] } }
            }
        };

        if (view === 'line') {
            const lineChartOptions = { ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, stacked: true } } };
            const lineChartData = {
                labels: trendDataMemo.labels,
                datasets: trendDataMemo.datasets.map(ds => ({ ...ds, backgroundColor: `${ds.backgroundColor}33`, fill: true, tension: 0.4 })),
            };
            return <div className="h-full w-full p-4"><ChartWrapper type="line" data={lineChartData} options={lineChartOptions as any} /></div>;
        }

        if (view === 'bar') {
            const barChartOptions = {
                ...commonOptions,
                plugins: {
                    ...commonOptions.plugins,
                    datalabels: {
                        display: true,
                        formatter: (value: number, context: any) => {
                            if (!trendDataMemo) return '';
                            const total = trendDataMemo.monthlyTotals[context.dataIndex];
                            if (total === 0 || value === 0) return '';
                            const percentage = (value / total) * 100;
                            if (percentage < 8) return '';
                            return `${percentage.toFixed(0)}%`;
                        },
                        color: '#fff',
                        font: { weight: 'bold' as 'bold' },
                    },
                },
                scales: { ...commonOptions.scales, x: { ...commonOptions.scales.x, stacked: true }, y: { ...commonOptions.scales.y, stacked: true } }
            };
            return <div className="h-full w-full p-4"><ChartWrapper type="bar" data={{ labels: trendDataMemo.labels, datasets: trendDataMemo.datasets }} options={barChartOptions as any} /></div>;
        }
    }
    
    return null;
};

export default GoogleAnalyticsTile;