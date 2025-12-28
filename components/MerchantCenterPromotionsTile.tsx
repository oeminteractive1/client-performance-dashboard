import React, { useState } from 'react';
import { MerchantCenterPromotion } from '../types';
import MerchantCenterPromotionModal from './MerchantCenterPromotionModal';

interface MerchantCenterPromotionsTileProps {
    promotions: MerchantCenterPromotion[] | null;
    onDeletePromotion: (promotionId: string) => Promise<void>;
    onUpdatePromotion: (promotionId: string, promotion: Partial<MerchantCenterPromotion>) => Promise<void>;
}

const MerchantCenterPromotionsTile: React.FC<MerchantCenterPromotionsTileProps> = ({
    promotions,
    onDeletePromotion,
    onUpdatePromotion
}) => {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingPromotion, setEditingPromotion] = useState<MerchantCenterPromotion | null>(null);

    const handleDelete = async (promotionId: string) => {
        if (!confirm('Are you sure you want to delete this promotion?')) return;

        setDeletingId(promotionId);
        try {
            await onDeletePromotion(promotionId);
        } finally {
            setDeletingId(null);
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

    if (!promotions || promotions.length === 0) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="text-4xl mb-2">🎁</div>
                    <div className="text-[var(--color-text-secondary)]">No active promotions</div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4">
            <div className="space-y-3">
                {promotions.map((promo) => {
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
                                            onClick={() => handleDelete(promo.id)}
                                            disabled={deletingId === promo.id}
                                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-400 text-xs font-semibold rounded transition-colors"
                                        >
                                            {deletingId === promo.id ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Edit Promotion Modal */}
            {editingPromotion && (
                <MerchantCenterPromotionModal
                    promotion={editingPromotion}
                    onClose={() => setEditingPromotion(null)}
                    onSave={async (updatedPromotion) => {
                        await onUpdatePromotion(editingPromotion.id, updatedPromotion);
                        setEditingPromotion(null);
                    }}
                />
            )}
        </div>
    );
};

export default MerchantCenterPromotionsTile;
