import React, { useState, useEffect } from 'react';
import { MerchantCenterPromotion } from '../types';

interface MerchantCenterPromotionModalProps {
    promotion: MerchantCenterPromotion;
    onClose: () => void;
    onSave: (updatedPromotion: Partial<MerchantCenterPromotion>) => Promise<void>;
}

const MerchantCenterPromotionModal: React.FC<MerchantCenterPromotionModalProps> = ({
    promotion,
    onClose,
    onSave
}) => {
    const [formData, setFormData] = useState({
        longTitle: promotion.longTitle || '',
        genericRedemptionCode: promotion.genericRedemptionCode || '',
        percentOff: promotion.percentOff?.toString() || '',
        moneyOffValue: promotion.moneyOffAmount?.value || '',
        moneyOffCurrency: promotion.moneyOffAmount?.currency || 'USD',
        minimumPurchaseValue: promotion.minimumPurchaseAmount?.value || '',
        minimumPurchaseCurrency: promotion.minimumPurchaseAmount?.currency || 'USD',
        startTime: promotion.promotionEffectiveTimePeriod?.startTime
            ? promotion.promotionEffectiveTimePeriod.startTime.split('T')[0]
            : '',
        endTime: promotion.promotionEffectiveTimePeriod?.endTime
            ? promotion.promotionEffectiveTimePeriod.endTime.split('T')[0]
            : '',
        offerType: promotion.offerType || 'GENERIC_CODE',
        productApplicability: promotion.productApplicability || 'ALL_PRODUCTS',
        redemptionChannel: promotion.redemptionChannel?.[0] || 'ONLINE',
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const mainStatus = promotion.promotionStatus?.destinationStatuses?.[0]?.status || 'unknown';
    const hasIssues = (promotion.promotionStatus?.itemLevelIssues?.length || 0) > 0;

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const handleSave = async () => {
        // Validation
        if (!formData.longTitle.trim()) {
            setError('Title is required');
            return;
        }
        if (!formData.genericRedemptionCode.trim()) {
            setError('Promotion code is required');
            return;
        }
        if (!formData.percentOff && !formData.moneyOffValue) {
            setError('Either percent off or money off amount is required');
            return;
        }
        if (!formData.startTime || !formData.endTime) {
            setError('Start and end dates are required');
            return;
        }

        setSaving(true);
        setError('');

        try {
            // Build the updated promotion object
            const updatedPromotion: Partial<MerchantCenterPromotion> = {
                longTitle: formData.longTitle,
                genericRedemptionCode: formData.genericRedemptionCode,
                offerType: formData.offerType,
                productApplicability: formData.productApplicability,
                redemptionChannel: [formData.redemptionChannel],
                promotionEffectiveTimePeriod: {
                    startTime: new Date(formData.startTime).toISOString(),
                    endTime: new Date(formData.endTime).toISOString()
                }
            };

            // Add discount value
            if (formData.percentOff) {
                updatedPromotion.percentOff = parseFloat(formData.percentOff);
            } else if (formData.moneyOffValue) {
                updatedPromotion.moneyOffAmount = {
                    value: formData.moneyOffValue,
                    currency: formData.moneyOffCurrency
                };
            }

            // Add minimum purchase if provided
            if (formData.minimumPurchaseValue) {
                updatedPromotion.minimumPurchaseAmount = {
                    value: formData.minimumPurchaseValue,
                    currency: formData.minimumPurchaseCurrency
                };
            }

            await onSave(updatedPromotion);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save promotion');
        } finally {
            setSaving(false);
        }
    };

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
            <div
                className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] p-6 flex items-center justify-between">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                            Edit Promotion
                        </h2>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-[var(--color-text-secondary)]">ID:</span>
                            <span className="text-[var(--color-text-primary)] font-mono">{promotion.promotionId}</span>
                            <span className={`ml-4 px-2 py-1 bg-black/20 rounded text-xs font-semibold ${getStatusColor(mainStatus)}`}>
                                {mainStatus.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[var(--color-text-secondary)] hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Issues Section */}
                {hasIssues && (
                    <div className="bg-red-500/10 border-y border-red-500/30 p-4">
                        <h3 className="text-sm font-semibold text-red-400 mb-2">
                            ⚠️ Issues ({promotion.promotionStatus?.itemLevelIssues?.length})
                        </h3>
                        <div className="space-y-2">
                            {promotion.promotionStatus?.itemLevelIssues?.map((issue, idx) => (
                                <div key={idx} className="text-sm">
                                    <div className="font-semibold text-red-400">{issue.code}</div>
                                    {issue.description && (
                                        <div className="text-[var(--color-text-secondary)] text-xs">{issue.description}</div>
                                    )}
                                    {issue.detail && (
                                        <div className="text-[var(--color-text-secondary)] text-xs mt-1">{issue.detail}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Form */}
                <div className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Basic Information</h3>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                Title *
                            </label>
                            <input
                                type="text"
                                value={formData.longTitle}
                                onChange={e => handleInputChange('longTitle', e.target.value)}
                                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg p-3"
                                placeholder="e.g., Save 20% on Orders Over $100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                Promotion Code *
                            </label>
                            <input
                                type="text"
                                value={formData.genericRedemptionCode}
                                onChange={e => handleInputChange('genericRedemptionCode', e.target.value.toUpperCase())}
                                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg p-3 font-mono"
                                placeholder="e.g., SAVE20"
                            />
                        </div>
                    </div>

                    {/* Discount Value */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Discount</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                    Percent Off
                                </label>
                                <input
                                    type="number"
                                    value={formData.percentOff}
                                    onChange={e => {
                                        handleInputChange('percentOff', e.target.value);
                                        if (e.target.value) handleInputChange('moneyOffValue', '');
                                    }}
                                    className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg p-3"
                                    placeholder="e.g., 20"
                                    min="0"
                                    max="100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                    Money Off
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={formData.moneyOffValue}
                                        onChange={e => {
                                            handleInputChange('moneyOffValue', e.target.value);
                                            if (e.target.value) handleInputChange('percentOff', '');
                                        }}
                                        className="flex-1 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg p-3"
                                        placeholder="e.g., 10"
                                        min="0"
                                    />
                                    <select
                                        value={formData.moneyOffCurrency}
                                        onChange={e => handleInputChange('moneyOffCurrency', e.target.value)}
                                        className="bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg px-3"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                Minimum Purchase Amount
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={formData.minimumPurchaseValue}
                                    onChange={e => handleInputChange('minimumPurchaseValue', e.target.value)}
                                    className="flex-1 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg p-3"
                                    placeholder="e.g., 100"
                                    min="0"
                                />
                                <select
                                    value={formData.minimumPurchaseCurrency}
                                    onChange={e => handleInputChange('minimumPurchaseCurrency', e.target.value)}
                                    className="bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg px-3"
                                >
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Schedule */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Schedule</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                    Start Date *
                                </label>
                                <input
                                    type="date"
                                    value={formData.startTime}
                                    onChange={e => handleInputChange('startTime', e.target.value)}
                                    className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg p-3"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                    End Date *
                                </label>
                                <input
                                    type="date"
                                    value={formData.endTime}
                                    onChange={e => handleInputChange('endTime', e.target.value)}
                                    className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg p-3"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Product Settings */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Product Settings</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                    Product Applicability
                                </label>
                                <select
                                    value={formData.productApplicability}
                                    onChange={e => handleInputChange('productApplicability', e.target.value)}
                                    className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg p-3"
                                >
                                    <option value="ALL_PRODUCTS">All Products</option>
                                    <option value="SPECIFIC_PRODUCTS">Specific Products</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                                    Redemption Channel
                                </label>
                                <select
                                    value={formData.redemptionChannel}
                                    onChange={e => handleInputChange('redemptionChannel', e.target.value)}
                                    className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg p-3"
                                >
                                    <option value="ONLINE">Online</option>
                                    <option value="IN_STORE">In Store</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] p-6 flex items-center justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-[var(--color-bg-primary)] hover:bg-black/40 text-[var(--color-text-secondary)] rounded-lg font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MerchantCenterPromotionModal;
