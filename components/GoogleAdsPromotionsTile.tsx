import React from 'react';
import { GoogleAdsPromotion } from '../types';

interface GoogleAdsPromotionsTileProps {
    promotions: GoogleAdsPromotion[] | null;
}

const GoogleAdsPromotionsTile: React.FC<GoogleAdsPromotionsTileProps> = ({ promotions }) => {
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getStatusColor = (status?: string) => {
        switch (status?.toUpperCase()) {
            case 'ENABLED':
                return 'text-green-400';
            case 'PAUSED':
                return 'text-yellow-400';
            case 'REMOVED':
                return 'text-red-400';
            default:
                return 'text-gray-400';
        }
    };

    const getPromotionValue = (promo: GoogleAdsPromotion) => {
        if (promo.percentOff) {
            return `${promo.percentOff}% OFF`;
        }
        if (promo.moneyAmountOff) {
            return `$${promo.moneyAmountOff} OFF`;
        }
        return 'Special Offer';
    };

    if (!promotions || promotions.length === 0) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="text-4xl mb-2">🎁</div>
                    <div className="text-[var(--color-text-secondary)]">No active promotions</div>
                    <div className="text-xs text-[var(--color-text-secondary)] mt-2">
                        Create promotion assets in Google Ads to see them here
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4">
            <div className="space-y-3">
                {promotions.map((promo, index) => (
                    <div
                        key={promo.resourceName || index}
                        className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                {/* Title and Value Badge */}
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-base font-semibold text-[var(--color-text-primary)] truncate">
                                        {promo.name || 'Unnamed Promotion'}
                                    </h3>
                                    <span className="px-2 py-1 bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs font-semibold rounded whitespace-nowrap">
                                        {getPromotionValue(promo)}
                                    </span>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    {promo.promotionCode && (
                                        <div>
                                            <span className="text-[var(--color-text-secondary)]">Code: </span>
                                            <span className="text-[var(--color-text-primary)] font-mono">
                                                {promo.promotionCode}
                                            </span>
                                        </div>
                                    )}

                                    {promo.occasion && (
                                        <div>
                                            <span className="text-[var(--color-text-secondary)]">Occasion: </span>
                                            <span className="text-[var(--color-text-primary)]">
                                                {promo.occasion.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    )}

                                    {(promo.startDate || promo.endDate) && (
                                        <div className="col-span-2">
                                            <span className="text-[var(--color-text-secondary)]">📅 </span>
                                            <span className="text-[var(--color-text-primary)]">
                                                {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                                            </span>
                                        </div>
                                    )}

                                    {promo.campaignName && (
                                        <div className="col-span-2">
                                            <span className="text-[var(--color-text-secondary)]">Campaign: </span>
                                            <span className="text-[var(--color-text-primary)] text-xs">
                                                {promo.campaignName}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Status Badge */}
                                <div className="mt-3">
                                    <span className={`px-2 py-1 bg-black/20 rounded text-xs font-semibold ${getStatusColor(promo.status)}`}>
                                        {promo.status?.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GoogleAdsPromotionsTile;
