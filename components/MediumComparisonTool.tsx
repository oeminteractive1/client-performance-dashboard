import React, { useState, useMemo, useEffect } from 'react';
import { AllGoogleAnalyticsData, GoogleAnalyticsRecord, Theme, AccountDetailsRecord, MediumComparisonToolState } from '../types';
import ChartGridItem from './ChartGridItem';
import GoogleAnalyticsTile from './GoogleAnalyticsTile';

// --- Type Definitions ---
interface MediumComparisonToolProps {
    allAccountDetails: AccountDetailsRecord[];
    allGoogleAnalyticsData: AllGoogleAnalyticsData;
    theme: Theme;
    toolState: MediumComparisonToolState;
    onStateChange: (newState: Partial<MediumComparisonToolState>) => void;
}

type Medium = 'Organic' | 'Direct' | 'PPC' | 'Referral';
type TimeRange = '3' | '6' | '12';

interface DisplayData {
    clientName: string;
    gaRecord: GoogleAnalyticsRecord;
    sortValue: number;
}

// --- Main Component ---
const MediumComparisonTool: React.FC<MediumComparisonToolProps> = ({ allGoogleAnalyticsData, theme, allAccountDetails, toolState, onStateChange }) => {
    
    const { viewMode, timeRange, selectedMonth, selectedMedium, sortOrder } = toolState;
    
    // State for new controls
    const [availableMonths, setAvailableMonths] = useState<string[]>([]);

    // Populate available months for the dropdown
    useEffect(() => {
        const allMonths = new Set<string>();
        Object.values(allGoogleAnalyticsData).forEach(clientData => {
            if (clientData) {
                clientData.forEach(record => {
                    allMonths.add(record.Date);
                });
            }
        });
        const sortedMonths = Array.from(allMonths).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        setAvailableMonths(sortedMonths);
        if (sortedMonths.length > 0 && !selectedMonth) {
            onStateChange({ selectedMonth: sortedMonths[0] });
        }
    }, [allGoogleAnalyticsData, selectedMonth, onStateChange]);


    // --- Main Data Processing and Sorting Logic ---
    const clientDataForDisplay = useMemo(() => {
        const clientsWithGa = allAccountDetails
            .map(c => c.ClientName)
            .filter(clientName => allGoogleAnalyticsData[clientName] && allGoogleAnalyticsData[clientName].length > 0);

        const mediumKeyMap: Record<Medium, keyof GoogleAnalyticsRecord> = {
            'Organic': 'RevenuePercentOrganic',
            'Direct': 'RevenuePercentDirect',
            'PPC': 'RevenuePercentPPC',
            'Referral': 'RevenuePercentReferral',
        };

        const displayDataList: DisplayData[] = clientsWithGa.map(clientName => {
            let gaRecord: GoogleAnalyticsRecord | null = null;
            let sortValue = 0;

            if (viewMode === 'month') {
                const record = allGoogleAnalyticsData[clientName].find(d => d.Date === selectedMonth);
                if (record) {
                    gaRecord = record;
                    if (selectedMedium) {
                        sortValue = (record[mediumKeyMap[selectedMedium]] as number) || 0;
                    }
                }
            } else { // timeline view
                const months = parseInt(timeRange, 10);
                const today = new Date();
                const endDate = new Date(today.getFullYear(), today.getMonth(), 0); // End of last month
                const startDate = new Date(endDate);
                startDate.setMonth(startDate.getMonth() - (months - 1));
                startDate.setDate(1);

                const relevantData = allGoogleAnalyticsData[clientName].filter(d => {
                    const recordDate = new Date(d.Date);
                    return recordDate >= startDate && recordDate <= endDate;
                });

                if (relevantData.length > 0) {
                    const totals = relevantData.reduce((acc, r) => {
                        acc.totalRevenue += r.Revenue || 0;
                        acc.totalSessions += r.Sessions || 0;
                        acc.totalOrders += r.Orders || 0;
                        acc.organicRevenue += (r.Revenue || 0) * ((r.RevenuePercentOrganic || 0) / 100);
                        acc.directRevenue += (r.Revenue || 0) * ((r.RevenuePercentDirect || 0) / 100);
                        acc.ppcRevenue += (r.Revenue || 0) * ((r.RevenuePercentPPC || 0) / 100);
                        acc.referralRevenue += (r.Revenue || 0) * ((r.RevenuePercentReferral || 0) / 100);
                        acc.organicSessions += (r.Sessions || 0) * ((r.SessionsPercentOrganic || 0) / 100);
                        acc.directSessions += (r.Sessions || 0) * ((r.SessionsPercentDirect || 0) / 100);
                        acc.ppcSessions += (r.Sessions || 0) * ((r.SessionsPercentPPC || 0) / 100);
                        acc.referralSessions += (r.Sessions || 0) * ((r.SessionsPercentReferral || 0) / 100);
                        acc.organicOrders += (r.Orders || 0) * ((r.OrdersPercentOrganic || 0) / 100);
                        acc.directOrders += (r.Orders || 0) * ((r.OrdersPercentDirect || 0) / 100);
                        acc.ppcOrders += (r.Orders || 0) * ((r.OrdersPercentPPC || 0) / 100);
                        acc.referralOrders += (r.Orders || 0) * ((r.OrdersPercentReferral || 0) / 100);
                        return acc;
                    }, { totalRevenue: 0, totalSessions: 0, totalOrders: 0, organicRevenue: 0, directRevenue: 0, ppcRevenue: 0, referralRevenue: 0, organicSessions: 0, directSessions: 0, ppcSessions: 0, referralSessions: 0, organicOrders: 0, directOrders: 0, ppcOrders: 0, referralOrders: 0 });

                    const aggregatedRecord: GoogleAnalyticsRecord = {
                        ClientName: clientName,
                        PropertyID: '',
                        Date: `Last ${months} Months`,
                        Revenue: totals.totalRevenue,
                        RevenuePercentOrganic: totals.totalRevenue > 0 ? (totals.organicRevenue / totals.totalRevenue) * 100 : 0,
                        RevenuePercentDirect: totals.totalRevenue > 0 ? (totals.directRevenue / totals.totalRevenue) * 100 : 0,
                        RevenuePercentPPC: totals.totalRevenue > 0 ? (totals.ppcRevenue / totals.totalRevenue) * 100 : 0,
                        RevenuePercentReferral: totals.totalRevenue > 0 ? (totals.referralRevenue / totals.totalRevenue) * 100 : 0,
                        Sessions: totals.totalSessions,
                        SessionsPercentOrganic: totals.totalSessions > 0 ? (totals.organicSessions / totals.totalSessions) * 100 : 0,
                        SessionsPercentDirect: totals.totalSessions > 0 ? (totals.directSessions / totals.totalSessions) * 100 : 0,
                        SessionsPercentPPC: totals.totalSessions > 0 ? (totals.ppcSessions / totals.totalSessions) * 100 : 0,
                        SessionsPercentReferral: totals.totalSessions > 0 ? (totals.referralSessions / totals.totalSessions) * 100 : 0,
                        Orders: totals.totalOrders,
                        OrdersPercentOrganic: totals.totalOrders > 0 ? (totals.organicOrders / totals.totalOrders) * 100 : 0,
                        OrdersPercentDirect: totals.totalOrders > 0 ? (totals.directOrders / totals.totalOrders) * 100 : 0,
                        OrdersPercentPPC: totals.totalOrders > 0 ? (totals.ppcOrders / totals.totalOrders) * 100 : 0,
                        OrdersPercentReferral: totals.totalOrders > 0 ? (totals.referralOrders / totals.totalOrders) * 100 : 0,
                        ConvRate: totals.totalSessions > 0 ? (totals.totalOrders / totals.totalSessions) * 100 : 0,
                        ConvRatePercentOrganic: totals.organicSessions > 0 ? (totals.organicOrders / totals.organicSessions) * 100 : 0,
                        ConvRatePercentDirect: totals.directSessions > 0 ? (totals.directOrders / totals.directSessions) * 100 : 0,
                        ConvRatePercentPPC: totals.ppcSessions > 0 ? (totals.ppcOrders / totals.ppcSessions) * 100 : 0,
                        ConvRatePercentReferral: totals.referralSessions > 0 ? (totals.referralOrders / totals.referralSessions) * 100 : 0,
                        SessionDuration: '',
                        BounceRate: 0,
                        DateRan: '',
                    };

                    gaRecord = aggregatedRecord;
                    if (selectedMedium) {
                        sortValue = (aggregatedRecord[mediumKeyMap[selectedMedium]] as number) || 0;
                    }
                }
            }
            
            return { clientName, gaRecord, sortValue };

        }).filter((d): d is DisplayData & { gaRecord: GoogleAnalyticsRecord } => d.gaRecord !== null);

        // Sort the final array
        if (selectedMedium) {
            displayDataList.sort((a, b) => {
                return sortOrder === 'descending' ? b.sortValue - a.sortValue : a.sortValue - b.sortValue;
            });
        } else {
             displayDataList.sort((a, b) => a.clientName.localeCompare(b.clientName));
        }

        return displayDataList;

    }, [allGoogleAnalyticsData, viewMode, selectedMonth, timeRange, selectedMedium, sortOrder, allAccountDetails]);
    
    // --- Main Render ---
    if (Object.keys(allGoogleAnalyticsData).length === 0) {
        return <div className="text-center p-8 bg-black/20 rounded-lg"><h2 className="text-xl font-semibold mb-2">Data Required</h2><p className="text-[var(--color-text-secondary)]">Please load Google Analytics data to use this tool.</p></div>;
    }

    return (
        <main className="flex flex-col gap-8">
            {/* Controls Section */}
            <section className="bg-[var(--color-card-bg)] backdrop-blur-sm rounded-xl border border-[var(--color-border)] shadow-lg p-6">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4 text-center">Comparison Setup</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">View Mode</label>
                        <div className="flex items-center bg-black/20 p-1 rounded-lg">
                            <button onClick={() => onStateChange({ viewMode: 'month' })} className={`px-4 py-1.5 w-full text-sm font-semibold rounded-md transition-colors ${viewMode === 'month' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>Month</button>
                            <button onClick={() => onStateChange({ viewMode: 'timeline' })} className={`px-4 py-1.5 w-full text-sm font-semibold rounded-md transition-colors ${viewMode === 'timeline' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-white/10'}`}>Time Range</button>
                        </div>
                    </div>

                    <div>
                         <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Period</label>
                         {viewMode === 'month' ? (
                            <select value={selectedMonth} onChange={e => onStateChange({ selectedMonth: e.target.value })} disabled={availableMonths.length === 0} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5 disabled:opacity-50">
                                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        ) : (
                            <select value={timeRange} onChange={e => onStateChange({ timeRange: e.target.value as TimeRange })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5">
                                <option value="3">Last 3 Full Months</option>
                                <option value="6">Last 6 Full Months</option>
                                <option value="12">Last 12 Full Months</option>
                            </select>
                        )}
                    </div>

                    <div>
                        <label htmlFor="medium-selector" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sort by Medium</label>
                        <select
                            id="medium-selector"
                            value={selectedMedium}
                            onChange={e => onStateChange({ selectedMedium: e.target.value as Medium | '' })}
                            className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5"
                        >
                            <option value="">Alphabetical (Default)</option>
                            <option value="Organic">Organic</option>
                            <option value="Direct">Direct</option>
                            <option value="PPC">PPC</option>
                            <option value="Referral">Referral</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="sort-order-selector" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Sort Order</label>
                        <select
                            id="sort-order-selector"
                            value={sortOrder}
                            onChange={e => onStateChange({ sortOrder: e.target.value as 'descending' | 'ascending' })}
                            disabled={!selectedMedium}
                            className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5 disabled:opacity-50"
                        >
                            <option value="descending">Descending</option>
                            <option value="ascending">Ascending</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Client Dashboards Section */}
            <section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {clientDataForDisplay.map(({ clientName, gaRecord }) => (
                        <div key={clientName} style={{ minHeight: '350px' }}>
                            <ChartGridItem title={clientName} subtitle={gaRecord.Date}>
                                <GoogleAnalyticsTile
                                    view="snapshot"
                                    snapshotData={gaRecord}
                                    trendData={null}
                                    timeRange="3m"
                                    theme={theme}
                                />
                            </ChartGridItem>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
};

export default MediumComparisonTool;