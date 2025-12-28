import React, { useState, useMemo } from 'react';
import { AccountDetailsRecord, MerchantCenterPromotion } from '../types';
import MerchantCenterPromotionModal from './MerchantCenterPromotionModal';

interface MerchantCenterPlaygroundProps {
    allAccountDetails?: AccountDetailsRecord[];
}

const MerchantCenterPlayground: React.FC<MerchantCenterPlaygroundProps> = ({ allAccountDetails }) => {
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [merchantId, setMerchantId] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [performanceData, setPerformanceData] = useState<any>(null);
    const [feedData, setFeedData] = useState<any>(null);
    const [promotionsData, setPromotionsData] = useState<MerchantCenterPromotion[]>([]);
    const [deletingPromoId, setDeletingPromoId] = useState<string | null>(null);
    const [editingPromotion, setEditingPromotion] = useState<MerchantCenterPromotion | null>(null);

    const clientOptions = useMemo(() => {
        if (!allAccountDetails) return [];
        return allAccountDetails
            .filter(client => client.GMC)
            .map(client => ({
                name: client.ClientName,
                gmcId: client.GMC
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allAccountDetails]);

    const handleClientChange = (clientName: string) => {
        setSelectedClient(clientName);
        const client = clientOptions.find(c => c.name === clientName);
        if (client) {
            setMerchantId(client.gmcId);
        }
    };

    const fetchMerchantCenterData = async () => {
        if (!merchantId) {
            setError('Please provide a Merchant ID');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const [perfResponse, feedResponse, promosResponse] = await Promise.all([
                fetch('http://localhost:3002/api/merchant-center/product-performance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ merchantId, dateRange: '30' })
                }),
                fetch('http://localhost:3002/api/merchant-center/feed-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ merchantId })
                }),
                fetch('http://localhost:3002/api/merchant-center/promotions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ merchantId })
                })
            ]);

            const perfData = await perfResponse.json();
            const feedDataResponse = await feedResponse.json();
            const promosData = await promosResponse.json();

            if (!perfData.success || !feedDataResponse.success || !promosData.success) {
                throw new Error(perfData.error || feedDataResponse.error || promosData.error || 'Failed to fetch data');
            }

            setPerformanceData(perfData.performance);
            setFeedData(feedDataResponse.feedStatus);
            setPromotionsData(promosData.promotions || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num: number) => {
        return num?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '0';
    };

    const formatCurrency = (num: number) => {
        return `$${num?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`;
    };

    const handleDeletePromotion = async (promotionId: string) => {
        if (!confirm('Are you sure you want to delete this promotion?')) return;

        setDeletingPromoId(promotionId);
        try {
            const response = await fetch(`http://localhost:3002/api/merchant-center/promotions/${promotionId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ merchantId })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to delete promotion');
            }

            // Remove from local state
            setPromotionsData(prev => prev.filter(p => p.id !== promotionId));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete promotion');
        } finally {
            setDeletingPromoId(null);
        }
    };

    const handleUpdatePromotion = async (promotionId: string, promotion: Partial<MerchantCenterPromotion>) => {
        try {
            const response = await fetch(`http://localhost:3002/api/merchant-center/promotions/${promotionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ merchantId, promotion })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to update promotion');
            }

            // Refresh promotions data
            const promosResponse = await fetch('http://localhost:3002/api/merchant-center/promotions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ merchantId })
            });
            const promosData = await promosResponse.json();
            setPromotionsData(promosData.promotions || []);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update promotion');
            throw err;
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getStatusColor = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'live':
            case 'approved':
                return 'text-green-400';
            case 'pending':
                return 'text-yellow-400';
            case 'rejected':
            case 'disapproved':
                return 'text-red-400';
            default:
                return 'text-gray-400';
        }
    };

    const getPromotionValue = (promo: MerchantCenterPromotion) => {
        if (promo.percentOff) {
            return `${promo.percentOff}% OFF`;
        }
        if (promo.moneyOffAmount) {
            return `$${promo.moneyOffAmount.value} OFF`;
        }
        return 'Special Offer';
    };

    const getPromotionStatus = (promo: MerchantCenterPromotion): string => {
        // Check if promotion is expired based on end date
        if (promo.promotionEffectiveTimePeriod?.endTime) {
            const endDate = new Date(promo.promotionEffectiveTimePeriod.endTime);
            if (endDate < new Date()) {
                return 'expired';
            }
        }

        // Check if promotion hasn't started yet
        if (promo.promotionEffectiveTimePeriod?.startTime) {
            const startDate = new Date(promo.promotionEffectiveTimePeriod.startTime);
            if (startDate > new Date()) {
                return 'scheduled';
            }
        }

        // Check destination statuses
        if (promo.promotionStatus?.destinationStatuses && promo.promotionStatus.destinationStatuses.length > 0) {
            const status = promo.promotionStatus.destinationStatuses[0].status;
            if (status) return status.toLowerCase();
        }

        // Check for issues - if there are issues, it's likely pending or disapproved
        const hasIssues = (promo.promotionStatus?.itemLevelIssues?.length || 0) > 0;
        if (hasIssues) {
            return 'pending';
        }

        // If active time period and no issues, assume live
        const now = new Date();
        if (promo.promotionEffectiveTimePeriod?.startTime && promo.promotionEffectiveTimePeriod?.endTime) {
            const startDate = new Date(promo.promotionEffectiveTimePeriod.startTime);
            const endDate = new Date(promo.promotionEffectiveTimePeriod.endTime);
            if (now >= startDate && now <= endDate) {
                return 'live';
            }
        }

        return 'unknown';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
                    🛒 Merchant Center Playground
                </h1>
                <p className="text-[var(--color-text-secondary)]">
                    View product feed health and performance metrics from Google Merchant Center
                </p>
            </div>

            {/* Client Selection */}
            <div className="bg-[var(--color-card-bg)] rounded-lg p-6 mb-6 border border-[var(--color-border)]">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                    Select Client
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            Client
                        </label>
                        <select
                            value={selectedClient}
                            onChange={(e) => handleClientChange(e.target.value)}
                            className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
                        >
                            <option value="">-- Select a client --</option>
                            {clientOptions.map(client => (
                                <option key={client.name} value={client.name}>
                                    {client.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                            Merchant ID
                        </label>
                        <input
                            type="text"
                            value={merchantId}
                            onChange={(e) => setMerchantId(e.target.value)}
                            placeholder="Enter Merchant ID"
                            className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <button
                        onClick={fetchMerchantCenterData}
                        disabled={loading || !merchantId}
                        className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg"
                    >
                        {loading ? 'Loading...' : 'Fetch Data'}
                    </button>
                </div>
                {error && (
                    <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}
            </div>

            {/* Feed Health */}
            {feedData && (
                <div className="bg-[var(--color-card-bg)] rounded-lg p-6 mb-6 border border-[var(--color-border)]">
                    <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                        📦 Feed Health
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
                            <div className="text-[var(--color-text-secondary)] text-sm mb-1">Total Products</div>
                            <div className="text-3xl font-bold text-white">{formatNumber(feedData.totalProducts)}</div>
                        </div>
                        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
                            <div className="text-[var(--color-text-secondary)] text-sm mb-1">Active</div>
                            <div className="text-3xl font-bold text-green-400">{formatNumber(feedData.activeProducts)}</div>
                            <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                                {feedData.approvalRate?.toFixed(1)}%
                            </div>
                        </div>
                        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
                            <div className="text-[var(--color-text-secondary)] text-sm mb-1">Disapproved</div>
                            <div className="text-3xl font-bold text-red-400">{formatNumber(feedData.disapprovedProducts)}</div>
                        </div>
                        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
                            <div className="text-[var(--color-text-secondary)] text-sm mb-1">Pending</div>
                            <div className="text-3xl font-bold text-yellow-400">{formatNumber(feedData.pendingProducts)}</div>
                        </div>
                    </div>

                    {feedData.topIssues && feedData.topIssues.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Top Issues</h3>
                            <div className="space-y-2">
                                {feedData.topIssues.map((issue: any, idx: number) => (
                                    <div key={idx} className="bg-[var(--color-bg-secondary)] rounded-lg p-3 flex justify-between items-center">
                                        <span className="text-[var(--color-text-primary)]">{issue.description}</span>
                                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                                            {issue.count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Performance Data */}
            {performanceData && (
                <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
                    <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                        📊 Performance (Last 30 Days)
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
                            <div className="text-[var(--color-text-secondary)] text-sm mb-1">Impressions</div>
                            <div className="text-3xl font-bold text-white">{formatNumber(performanceData.totalImpressions)}</div>
                        </div>
                        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
                            <div className="text-[var(--color-text-secondary)] text-sm mb-1">Clicks</div>
                            <div className="text-3xl font-bold text-white">{formatNumber(performanceData.totalClicks)}</div>
                            <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                                CTR: {performanceData.avgCTR?.toFixed(2)}%
                            </div>
                        </div>
                        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
                            <div className="text-[var(--color-text-secondary)] text-sm mb-1">Conversions</div>
                            <div className="text-3xl font-bold text-white">{formatNumber(performanceData.totalConversions)}</div>
                            <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                                Rate: {performanceData.conversionRate?.toFixed(2)}%
                            </div>
                        </div>
                        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
                            <div className="text-[var(--color-text-secondary)] text-sm mb-1">Conv. Value</div>
                            <div className="text-3xl font-bold text-white">{formatCurrency(performanceData.totalConversionValue)}</div>
                        </div>
                    </div>

                    {performanceData.products && performanceData.products.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
                                Top Products ({performanceData.products.length})
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-[var(--color-bg-secondary)] rounded-lg">
                                    <thead>
                                        <tr className="border-b border-[var(--color-border)]">
                                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Product</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Impressions</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Clicks</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">CTR</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Conversions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {performanceData.products.slice(0, 10).map((product: any, idx: number) => (
                                            <tr key={idx} className="border-b border-[var(--color-border)]">
                                                <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                                                    <div className="font-medium">{product.title || product.offerId}</div>
                                                    <div className="text-xs text-[var(--color-text-secondary)]">{product.brand}</div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{formatNumber(product.impressions)}</td>
                                                <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{formatNumber(product.clicks)}</td>
                                                <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{product.ctr?.toFixed(2)}%</td>
                                                <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{formatNumber(product.conversions)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Promotions Data */}
            <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)] mt-6">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
                    🎁 Active Promotions {promotionsData.length > 0 && `(${promotionsData.length})`}
                </h2>
                {promotionsData.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-4xl mb-2">🎁</div>
                        <div className="text-[var(--color-text-secondary)]">No active promotions found</div>
                        <div className="text-xs text-[var(--color-text-secondary)] mt-2">
                            Create promotions in Google Merchant Center to see them here
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {promotionsData.map((promo) => {
                            const mainStatus = getPromotionStatus(promo);
                            const hasIssues = (promo.promotionStatus?.itemLevelIssues?.length || 0) > 0;

                            return (
                                <div
                                    key={promo.id}
                                    className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] overflow-hidden"
                                >
                                    {/* Header Section */}
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">
                                                        {promo.longTitle}
                                                    </h3>
                                                    <span className="px-2 py-1 bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs font-semibold rounded">
                                                        {getPromotionValue(promo)}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-[var(--color-text-secondary)]">Promo Code: </span>
                                                        <span className="text-[var(--color-text-primary)] font-mono">
                                                            {promo.genericRedemptionCode || promo.promotionId}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[var(--color-text-secondary)]">ID: </span>
                                                        <span className="text-[var(--color-text-primary)] font-mono text-xs">
                                                            {promo.promotionId}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Schedule */}
                                                <div className="mt-3 flex items-center gap-2 text-sm">
                                                    <span className="text-[var(--color-text-secondary)]">📅</span>
                                                    <span className="text-[var(--color-text-primary)]">
                                                        {formatDate(promo.promotionEffectiveTimePeriod?.startTime)} - {formatDate(promo.promotionEffectiveTimePeriod?.endTime)}
                                                    </span>
                                                </div>

                                                {/* Status Badges */}
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <span className={`px-2 py-1 bg-black/20 rounded text-xs font-semibold ${getStatusColor(mainStatus)}`}>
                                                        Status: {mainStatus.toUpperCase()}
                                                    </span>
                                                    {hasIssues && (
                                                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-semibold">
                                                            ⚠️ {promo.promotionStatus?.itemLevelIssues?.length} Issue(s)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => setEditingPromotion(promo)}
                                                    className="px-3 py-1.5 bg-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/30 text-[var(--color-accent)] text-xs font-semibold rounded transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePromotion(promo.id)}
                                                    disabled={deletingPromoId === promo.id}
                                                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-400 text-xs font-semibold rounded transition-colors"
                                                >
                                                    {deletingPromoId === promo.id ? 'Deleting...' : 'Delete'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Edit Promotion Modal */}
            {editingPromotion && (
                <MerchantCenterPromotionModal
                    promotion={editingPromotion}
                    onClose={() => setEditingPromotion(null)}
                    onSave={async (updatedPromotion) => {
                        await handleUpdatePromotion(editingPromotion.id, updatedPromotion);
                        setEditingPromotion(null);
                    }}
                />
            )}
        </div>
    );
};

export default MerchantCenterPlayground;
