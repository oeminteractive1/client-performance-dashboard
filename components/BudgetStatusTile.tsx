import React from 'react';
import { BudgetStatusRecord, AccountDetailsRecord } from '../types';

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '$0.00';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatCompactCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '$0';
    return `$${Math.round(value).toLocaleString()}`;
};

const formatPercentage = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0.00%';
    return `${value.toFixed(2)}%`;
};

const formatCompactPercentage = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0%';
    return `${value.toFixed(0)}%`;
};


interface RadialProgressBudgetProps {
    percentSpent: number;
    projectedSpend: number;
    targetSpend: number;
}

const RadialProgressBudget: React.FC<RadialProgressBudgetProps> = ({ percentSpent, projectedSpend, targetSpend }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentSpent / 100) * circumference;

    const getProjectedColor = () => {
        const difference = Math.abs(projectedSpend - targetSpend);
        if (difference > 20) {
            return 'text-[var(--color-negative)]'; // Red for >20% deviation
        } else if (difference >= 10) {
            return 'text-[var(--color-warning)]'; // Yellow for 10-20% deviation
        } else {
            return 'text-[var(--color-positive)]'; // Green for <10% deviation
        }
    };

    const colorClass = getProjectedColor();

    return (
        <div className="relative h-36 w-36">
            <svg className="h-full w-full" viewBox="0 0 120 120">
                <circle className="text-[var(--color-border)]" strokeWidth="12" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" />
                <circle
                    className={colorClass}
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="60"
                    cy="60"
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className={`text-3xl font-bold ${colorClass}`}>{formatCompactPercentage(projectedSpend)}</span>
                <span className="text-xs font-semibold text-[var(--color-text-secondary)] -mt-1">Projected</span>
            </div>
        </div>
    );
};

const DetailRow: React.FC<{ label: string; value: string; valueColorClass?: string }> = ({ label, value, valueColorClass = 'text-[var(--color-text-primary)]' }) => (
    <div className="flex justify-between items-baseline text-sm">
        <span className="text-[var(--color-text-secondary)]">{label}</span>
        <span className={`font-semibold ${valueColorClass}`}>{value}</span>
    </div>
);

interface BudgetStatusTileProps {
    budgetStatus: BudgetStatusRecord;
    accountDetails: AccountDetailsRecord | null;
}

const BudgetStatusTile: React.FC<BudgetStatusTileProps> = ({ budgetStatus, accountDetails }) => {
    const { 
        ppcBudget, googleSpend, bingSpend, percentSpent, targetSpend, 
        projectedTotalSpend, spend2DaysAgo, yesterdaySpend, recDailyBudget 
    } = budgetStatus;
    
    const googleAdsLink = accountDetails?.['Google Ads'];
    const hasGoogleAdsLink = googleAdsLink && googleAdsLink.trim() !== '' && googleAdsLink.trim() !== '-';

    const bingAdsLink = accountDetails?.Bing;
    const hasBingAdsLink = bingAdsLink && bingAdsLink.trim() !== '' && bingAdsLink.trim() !== '-';

    return (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow h-full items-start">
            {/* Radial Chart Column */}
            <div className="md:col-span-1 flex flex-col items-center justify-center text-center py-4 border-r-0 md:border-r border-[var(--color-border)] pr-0 md:pr-6">
                <RadialProgressBudget percentSpent={percentSpent} projectedSpend={projectedTotalSpend} targetSpend={targetSpend} />
                <p className="font-semibold text-lg mt-3 text-[var(--color-text-primary)]">{formatPercentage(percentSpent)}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">of budget spent</p>
            </div>

            {/* Details Column */}
            <div className="md:col-span-2 space-y-3 flex flex-col justify-center">
                <DetailRow label="Total Budget" value={formatCompactCurrency(ppcBudget)} />
                <DetailRow label="Target Spend" value={formatPercentage(targetSpend)} valueColorClass="text-cyan-300" />
                
                <div className="pt-2 mt-2 border-t border-[var(--color-border)] space-y-3">
                    {hasGoogleAdsLink ? (
                        <a href={googleAdsLink.startsWith('http') ? googleAdsLink : `https://${googleAdsLink}`} target="_blank" rel="noopener noreferrer" className="block hover:bg-[var(--color-input-bg)] p-1.5 -m-1.5 rounded-md transition-colors duration-200">
                            <DetailRow label="Google Spend 🔗" value={formatCurrency(googleSpend)} />
                        </a>
                    ) : (
                        <DetailRow label="Google Spend" value={formatCurrency(googleSpend)} />
                    )}
                    {hasBingAdsLink ? (
                        <a href={bingAdsLink.startsWith('http') ? bingAdsLink : `https://${bingAdsLink}`} target="_blank" rel="noopener noreferrer" className="block hover:bg-[var(--color-input-bg)] p-1.5 -m-1.5 rounded-md transition-colors duration-200">
                             <DetailRow label="Bing Spend 🔗" value={formatCurrency(bingSpend)} />
                        </a>
                    ) : (
                         <DetailRow label="Bing Spend" value={formatCurrency(bingSpend)} />
                    )}
                </div>
                
                <div className="pt-2 mt-2 border-t border-[var(--color-border)]">
                    <DetailRow label="Yesterday's Spend" value={formatCurrency(yesterdaySpend)} />
                    <DetailRow label="Spend 2 days ago" value={formatCurrency(spend2DaysAgo)} />
                </div>

                 <div className="pt-2 mt-2 border-t border-[var(--color-border)]">
                    <DetailRow label="Reco. Daily Budget" value={formatCurrency(recDailyBudget)} valueColorClass="text-[var(--color-warning)] font-bold" />
                 </div>
            </div>
        </div>
    );
};

export default BudgetStatusTile;