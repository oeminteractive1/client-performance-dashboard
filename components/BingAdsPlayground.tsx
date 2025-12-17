import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AccountDetailsRecord } from '../types';

interface BingAdsPlaygroundProps {
    allAccountDetails?: AccountDetailsRecord[];
}

interface MockCampaign {
    id: string;
    name: string;
    status: 'Active' | 'Paused' | 'Removed';
    type: 'Search' | 'Shopping' | 'DynamicSearchAds';
    budget: number;
    cost: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    ctr: number;
    cpc: number;
    roas: number;
}

// ROAS info graphic component
const RoasInfoGraphic: React.FC<{ roas: number }> = ({ roas }) => {
    const roasText = roas > 0 ? roas.toFixed(2) : 'N/A';

    const getROASColor = () => {
        if (roas >= 4) return 'bg-green-100 text-green-800 border-green-200';
        if (roas >= 2) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        if (roas > 0) return 'bg-red-100 text-red-800 border-red-200';
        return 'bg-gray-100 text-gray-600 border-gray-200';
    };

    return (
        <div className="flex flex-col items-center w-20 h-16 justify-center">
            <div className={`px-3 py-1 rounded-lg text-lg font-semibold border ${getROASColor()}`}>
                {roasText}
            </div>
        </div>
    );
};

// Cost info graphic component
const CostInfoGraphic: React.FC<{ cost: number }> = ({ cost }) => {
    const costText = `$${cost.toFixed(2)}`;

    return (
        <div className="flex flex-col items-center w-24 h-16 justify-center">
            <div className="px-3 py-1 rounded-lg text-lg font-semibold border bg-blue-100 text-blue-800 border-blue-200">
                {costText}
            </div>
        </div>
    );
};

// Budget info graphic component
const BudgetInfoGraphic: React.FC<{ budget: number }> = ({ budget }) => {
    const budgetText = `$${budget.toFixed(2)}`;

    return (
        <div className="flex flex-col items-center w-32 h-16 justify-center">
            <div className="text-base text-[var(--color-text-secondary)] text-center leading-tight mb-1">
                Daily Budget
            </div>
            <div className="px-4 py-1 rounded-lg text-lg font-semibold border bg-emerald-100 text-emerald-800 border-emerald-200">
                {budgetText}
            </div>
        </div>
    );
};

export default function BingAdsPlayground({ allAccountDetails = [] }: BingAdsPlaygroundProps) {
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [campaigns, setCampaigns] = useState<MockCampaign[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timeSpanMode, setTimeSpanMode] = useState<'timespan' | 'month'>('timespan');
    const [selectedTimeSpan, setSelectedTimeSpan] = useState<string>('LastMonth');
    const [selectedMonth, setSelectedMonth] = useState<string>('');

    const monthOptions = useMemo(() => {
        const options = [];
        const now = new Date();
        for (let i = 0; i < 24; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            options.push({ value, label });
        }
        return options;
    }, []);

    // Fetch campaigns from backend when client is selected
    const fetchCampaigns = useCallback(async (clientName: string) => {
        if (!clientName) {
            setCampaigns([]);
            return;
        }

        // Don't fetch if in month mode and no month selected
        if (timeSpanMode === 'month' && !selectedMonth) {
            console.log('⏸️ Skipping fetch: month mode but no month selected');
            return;
        }

        console.log('🚀 Fetching campaigns:', { timeSpanMode, selectedTimeSpan, selectedMonth });
        setLoading(true);
        setError(null);

        try {
            const client = allAccountDetails.find(c => c.ClientName === clientName);
            const accountId = client?.AID;
            const customerId = client?.CID;

            console.log('Client Bing Ads data:', {
                clientName,
                accountId: accountId,
                customerId: customerId,
                bingUrl: client?.Bing,
                timeSpanMode,
                selectedTimeSpan,
                selectedMonth
            });

            if (!accountId || !customerId) {
                throw new Error('Missing Bing Account ID (AID) or Customer ID (CID) for this client');
            }

            // Calculate date range for month mode
            let startDate = null;
            let endDate = null;
            let timeSpan = null;

            if (timeSpanMode === 'month' && selectedMonth) {
                const [year, month] = selectedMonth.split('-').map(Number);
                // Get last day of month without timezone issues
                const lastDayOfMonth = new Date(year, month, 0).getDate();

                // Cap end date at today (Bing Ads doesn't allow future dates)
                const today = new Date();
                const todayYear = today.getFullYear();
                const todayMonth = today.getMonth() + 1;
                const todayDay = today.getDate();

                let endDay = lastDayOfMonth;
                if (year === todayYear && month === todayMonth) {
                    // Current month: use today's date as end date
                    endDay = todayDay;
                } else if (year > todayYear || (year === todayYear && month > todayMonth)) {
                    // Future month: not allowed, but cap at today anyway
                    endDay = todayDay;
                }

                startDate = `${year}-${String(month).padStart(2, '0')}-01`;
                endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
                console.log('📅 Month mode dates:', { startDate, endDate });
            } else {
                timeSpan = selectedTimeSpan;
            }

            const response = await fetch('http://localhost:3002/api/bing-ads/performance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountId: accountId,
                    customerId: customerId,
                    timeSpan: timeSpan,
                    startDate: startDate,
                    endDate: endDate
                })
            });

            if (!response.ok) {
                throw new Error(`Backend not available: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.campaigns && data.campaigns.length > 0) {
                const transformedCampaigns: MockCampaign[] = data.campaigns.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    status: c.status as 'Active' | 'Paused' | 'Removed',
                    type: c.type as 'Search' | 'Shopping' | 'DynamicSearchAds',
                    budget: c.budget,
                    cost: c.cost,
                    impressions: c.impressions,
                    clicks: c.clicks,
                    conversions: c.conversions,
                    revenue: c.revenue,
                    ctr: c.ctr,
                    cpc: c.cpc,
                    roas: c.roas
                }));

                setCampaigns(transformedCampaigns);
                setError(null); // Clear error if successful
            } else {
                throw new Error(data.error || 'No campaigns found');
            }
        } catch (err: any) {
            console.error('Error fetching Bing Ads campaigns:', err);
            setError(`Failed to load campaigns: ${err.message}`);
            setCampaigns([]);
        } finally {
            setLoading(false);
        }
    }, [allAccountDetails, selectedTimeSpan, selectedMonth, timeSpanMode]);

    useEffect(() => {
        fetchCampaigns(selectedClient);
    }, [selectedClient, selectedTimeSpan, selectedMonth, timeSpanMode, fetchCampaigns]);

    const availableClients = useMemo(() => {
        return allAccountDetails
            .filter(client => client.Bing && client.Bing !== 'N/A')
            .map(client => client.ClientName)
            .filter(name => name && name !== 'N/A')
            .sort();
    }, [allAccountDetails]);

    const totals = useMemo(() => {
        return {
            totalBudget: campaigns.reduce((sum, c) => sum + c.budget, 0),
            totalCost: campaigns.reduce((sum, c) => sum + c.cost, 0),
            totalRevenue: campaigns.reduce((sum, c) => sum + c.revenue, 0),
            totalConversions: campaigns.reduce((sum, c) => sum + c.conversions, 0),
            averageRoas: campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + c.roas, 0) / campaigns.length : 0
        };
    }, [campaigns]);

    return (
        <div className="p-6 space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">Bing Ads Playground</h2>
                <p className="text-[var(--color-text-secondary)]">
                    Manage Bing Ads campaigns and view performance metrics.
                </p>
            </div>

            {/* Select A Client Tile */}
            <div className="bg-[var(--color-card-bg)] p-6 rounded-lg border border-[var(--color-border)]">
                <h3 className="text-xl font-semibold mb-4">Select a Client</h3>
                <div className="space-y-4">
                    <select
                        value={selectedClient}
                        onChange={e => setSelectedClient(e.target.value)}
                        className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
                        disabled={loading}
                    >
                        <option value="">-- Select a Client --</option>
                        {availableClients.map(clientName => (
                            <option key={clientName} value={clientName}>
                                {clientName}
                            </option>
                        ))}
                    </select>

                    {/* Time Period Selector */}
                    <div>
                        <div className="flex gap-2 mb-3">
                            <button
                                onClick={() => setTimeSpanMode('timespan')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    timeSpanMode === 'timespan'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                                }`}
                            >
                                Time Span
                            </button>
                            <button
                                onClick={() => setTimeSpanMode('month')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    timeSpanMode === 'month'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                                }`}
                            >
                                Month
                            </button>
                        </div>

                        {timeSpanMode === 'timespan' ? (
                            <select
                                value={selectedTimeSpan}
                                onChange={e => setSelectedTimeSpan(e.target.value)}
                                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
                                disabled={loading}
                            >
                                <option value="LastSevenDays">Last 7 Days</option>
                                <option value="LastMonth">Last 30 Days</option>
                                <option value="LastThreeMonths">Last 90 Days</option>
                                <option value="ThisYear">This Year</option>
                            </select>
                        ) : (
                            <select
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
                                disabled={loading}
                            >
                                <option value="">-- Select a Month --</option>
                                {monthOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {error && (
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded text-sm">
                            {error}
                        </div>
                    )}

                    {loading && (
                        <div className="text-center py-4">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Loading campaigns...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* All Campaigns Tile */}
            {selectedClient && campaigns.length > 0 && !loading && (
                <div className="bg-[var(--color-card-bg)] p-6 rounded-lg border border-[var(--color-border)]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-semibold">
                            All Campaigns ({campaigns.length})
                        </h3>
                    </div>

                    {/* Campaign Performance Graphics */}
                    <div className="flex justify-center items-center gap-8 mb-6 p-4 bg-[var(--color-bg-secondary)] rounded-lg">
                        <BudgetInfoGraphic budget={totals.totalBudget} />
                        <CostInfoGraphic cost={totals.totalCost} />
                        <RoasInfoGraphic roas={totals.averageRoas} />
                    </div>

                    {/* Campaign Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--color-border)]">
                                    <th className="text-left py-3 px-4 text-[var(--color-text-primary)] font-semibold">Campaign</th>
                                    <th className="text-center py-3 px-4 text-[var(--color-text-primary)] font-semibold">Budget</th>
                                    <th className="text-center py-3 px-4 text-[var(--color-text-primary)] font-semibold">ROAS</th>
                                    <th className="text-center py-3 px-4 text-[var(--color-text-primary)] font-semibold">Conversions</th>
                                    <th className="text-center py-3 px-4 text-[var(--color-text-primary)] font-semibold">Cost</th>
                                    <th className="text-center py-3 px-4 text-[var(--color-text-primary)] font-semibold">Trend</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaigns.map((campaign) => (
                                    <tr key={campaign.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]">
                                        <td className="py-4 px-4">
                                            <div className="font-medium text-[var(--color-text-primary)]">
                                                {campaign.name}
                                            </div>
                                            <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                                                <span className={`px-2 py-0.5 rounded text-xs ${
                                                    campaign.status === 'Active'
                                                        ? 'bg-green-100 text-green-800'
                                                        : campaign.status === 'Paused' || campaign.status === 'BudgetPaused'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {campaign.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                                                ${campaign.budget.toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <RoasInfoGraphic roas={campaign.roas} />
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                                                {campaign.conversions.toFixed(1)}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                                                ${campaign.cost.toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <div className="text-sm text-[var(--color-text-secondary)]">
                                                Trend data coming soon
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!selectedClient && (
                <div className="text-center py-12 bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)]">
                    <div className="text-6xl mb-4">🔎</div>
                    <h3 className="text-xl font-semibold mb-2">Select a Client</h3>
                    <p className="text-[var(--color-text-secondary)]">
                        Choose a client from the dropdown above to view their Bing Ads campaign performance.
                    </p>
                </div>
            )}
        </div>
    );
}
