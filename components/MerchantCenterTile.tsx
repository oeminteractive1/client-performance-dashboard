import React from 'react';
import { MerchantCenterPerformanceData, MerchantCenterFeedStatus } from '../types';

interface MerchantCenterTileProps {
    performance: MerchantCenterPerformanceData | null;
    feedStatus: MerchantCenterFeedStatus | null;
    viewMode: 'summary' | 'details';
}

const formatNumber = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0';
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '$0';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const formatPercentage = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0%';
    return `${value.toFixed(1)}%`;
};

const StatCard: React.FC<{ label: string; value: string; sublabel?: string }> = ({ label, value, sublabel }) => (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
        <div className="text-[var(--color-text-secondary)] text-sm mb-1">{label}</div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {sublabel && <div className="text-xs text-[var(--color-text-secondary)] mt-1">{sublabel}</div>}
    </div>
);

const MerchantCenterTile: React.FC<MerchantCenterTileProps> = ({ performance, feedStatus, viewMode }) => {
    if (!performance && !feedStatus) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <div className="text-center text-[var(--color-text-secondary)]">
                    <p className="text-lg mb-2">No Merchant Center data available</p>
                    <p className="text-sm">Configure Merchant Center ID in Data Connections</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full p-6 overflow-y-auto">
            {/* Feed Health Section */}
            {feedStatus && (
                <div className="mb-6">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                        <span className="mr-2">📦</span> Feed Health
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard
                            label="Total Products"
                            value={formatNumber(feedStatus.totalProducts)}
                        />
                        <StatCard
                            label="Active"
                            value={formatNumber(feedStatus.activeProducts)}
                            sublabel={formatPercentage(feedStatus.approvalRate)}
                        />
                        <StatCard
                            label="Disapproved"
                            value={formatNumber(feedStatus.disapprovedProducts)}
                        />
                        <StatCard
                            label="Pending"
                            value={formatNumber(feedStatus.pendingProducts)}
                        />
                    </div>

                    {/* Top Issues */}
                    {feedStatus.topIssues && feedStatus.topIssues.length > 0 && (
                        <div className="mt-4 bg-[var(--color-bg-secondary)] rounded-lg p-4">
                            <div className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
                                Top Feed Issues
                            </div>
                            <div className="space-y-2">
                                {feedStatus.topIssues.slice(0, 3).map((issue, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <span className="text-[var(--color-text-primary)]">{issue.description}</span>
                                        <span className="text-[var(--color-negative)] font-semibold">{issue.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Performance Section */}
            {performance && (
                <div>
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                        <span className="mr-2">📊</span> Performance (Last 30 Days)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <StatCard
                            label="Impressions"
                            value={formatNumber(performance.totalImpressions)}
                        />
                        <StatCard
                            label="Clicks"
                            value={formatNumber(performance.totalClicks)}
                            sublabel={`CTR: ${formatPercentage(performance.avgCTR)}`}
                        />
                        <StatCard
                            label="Conversions"
                            value={formatNumber(performance.totalConversions)}
                            sublabel={`Rate: ${formatPercentage(performance.conversionRate)}`}
                        />
                        <StatCard
                            label="Conv. Value"
                            value={formatCurrency(performance.totalConversionValue)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MerchantCenterTile;
