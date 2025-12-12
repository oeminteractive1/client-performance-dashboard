
import React, { useState, useMemo, useEffect } from 'react';
import { GoogleAdsRecord } from '../types';

const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '$0';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const formatAvgCPC = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '$0.00';
    return `$${value.toFixed(2)}`;
}

const formatROAS = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0x';
    return `${value.toFixed(2)}x`;
};

const formatPercentage = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0%';
    return `${value.toFixed(1)}%`;
};

const formatNumber = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0';
    return value.toLocaleString();
};

const StatDisplay: React.FC<{ label: string; value: string; }> = ({ label, value }) => (
    <div>
        <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
        <p className="text-xl font-bold text-[var(--color-text-primary)]">{value}</p>
    </div>
);

const BudgetProgress: React.FC<{ label: string; value: number }> = ({ label, value }) => {
    const clampedValue = Math.min(Math.max(value, 0), 100);
    const colorClass = value > 100 ? 'bg-[var(--color-negative)]' : value > 90 ? 'bg-amber-500' : 'bg-[var(--color-accent)]';

    return (
        <div>
            <div className="flex justify-between items-baseline mb-1">
                <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">{formatPercentage(value)}</p>
            </div>
            <div className="w-full bg-black/30 rounded-full h-2.5">
                <div 
                    className={`${colorClass} h-2.5 rounded-full transition-all duration-500`} 
                    style={{ width: `${clampedValue}%` }}
                ></div>
            </div>
        </div>
    );
};

type TimeRange = '1' | '3' | '6' | '9' | '12';
type ViewMode = 'time' | 'month';

interface GoogleAdsTileProps {
    allData: GoogleAdsRecord[] | null;
    viewMode: ViewMode;
    timeRange: TimeRange;
    selectedMonth: string;
}

const GoogleAdsTile: React.FC<GoogleAdsTileProps> = ({ allData, viewMode, timeRange, selectedMonth }) => {
    const aggregatedData = useMemo(() => {
        if (viewMode !== 'time' || !allData || allData.length === 0) {
            return null;
        }

        // Exclude the current, partial month from time range calculations
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const fullMonthsData = allData.filter(record => {
            const recordDate = new Date(record.Date);
            const recordMonth = recordDate.getMonth();
            const recordYear = recordDate.getFullYear();
            return !(recordYear === currentYear && recordMonth === currentMonth);
        });

        const months = parseInt(timeRange, 10);
        const relevantData = fullMonthsData.slice(-months);

        if (relevantData.length === 0) {
            return null;
        }

        const aggregated = relevantData.reduce((acc, record) => {
            acc.PartsCost += record.PartsCost || 0;
            acc.AccCost += record.AccCost || 0;
            acc.PartsRevenue += (record.PartsCost || 0) * (record.PartsROAS || 0);
            acc.AccRevenue += (record.AccCost || 0) * (record.AccROAS || 0);
            acc.PartsClicks += record.PartsClicks || 0;
            acc.AccClicks += record.AccClicks || 0;
            acc.PartsConversions += record.PartsConversions || 0;
            acc.AccConversions += record.AccConversions || 0;
            return acc;
        }, { PartsCost: 0, AccCost: 0, PartsRevenue: 0, AccRevenue: 0, PartsClicks: 0, AccClicks: 0, PartsConversions: 0, AccConversions: 0 });

        const PartsROAS = aggregated.PartsCost > 0 ? aggregated.PartsRevenue / aggregated.PartsCost : 0;
        const AccROAS = aggregated.AccCost > 0 ? aggregated.AccRevenue / aggregated.AccCost : 0;
        const PartsAvgCPC = aggregated.PartsClicks > 0 ? aggregated.PartsCost / aggregated.PartsClicks : 0;
        const AccAvgCPC = aggregated.AccClicks > 0 ? aggregated.AccCost / aggregated.AccClicks : 0;
        
        return { PartsCost: aggregated.PartsCost, PartsROAS, AccCost: aggregated.AccCost, AccROAS, PartsAvgCPC, AccAvgCPC, PartsConversions: aggregated.PartsConversions, AccConversions: aggregated.AccConversions };
    }, [allData, timeRange, viewMode]);

    const monthlyData = useMemo(() => {
        if (viewMode !== 'month' || !allData || !selectedMonth) {
            return null;
        }
        const record = allData.find(d => d.Date === selectedMonth);
        if (!record) return null;
        
        return {
            PartsCost: record.PartsCost,
            PartsROAS: record.PartsROAS,
            AccCost: record.AccCost,
            AccROAS: record.AccROAS,
            PartsAvgCPC: record.PartsAvgCPC,
            AccAvgCPC: record.AccAvgCPC,
            PartsConversions: record.PartsConversions,
            AccConversions: record.AccConversions,
        };
    }, [allData, selectedMonth, viewMode]);

    const displayData = viewMode === 'time' ? aggregatedData : monthlyData;

    if (!displayData) {
        return <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">No Google Ads data available for the selected period.</div>;
    }

    const { PartsCost = 0, PartsROAS = 0, AccCost = 0, AccROAS = 0, PartsAvgCPC = 0, AccAvgCPC = 0, PartsConversions = 0, AccConversions = 0 } = displayData;
    const totalCost = PartsCost + AccCost;
    const partsPercentOfCost = totalCost > 0 ? (PartsCost / totalCost) * 100 : 0;
    const accPercentOfCost = totalCost > 0 ? (AccCost / totalCost) * 100 : 0;
    
    return (
        <div className="flex flex-col h-full p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow">
                {/* Parts Column */}
                <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-[var(--color-accent-secondary)] mb-4 text-center">Parts</h3>
                    <div className="bg-black/20 p-4 rounded-lg flex-grow flex flex-col justify-between">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-6 mb-auto">
                            <StatDisplay label="Cost" value={formatCurrency(PartsCost)} />
                            <StatDisplay label="Avg. CPC" value={formatAvgCPC(PartsAvgCPC)} />
                            <StatDisplay label="ROAS" value={formatROAS(PartsROAS)} />
                            <StatDisplay label="Conversions" value={formatNumber(PartsConversions)} />
                        </div>
                        <div className="mt-6">
                            <BudgetProgress label="% of Total Cost" value={partsPercentOfCost} />
                        </div>
                    </div>
                </div>

                {/* Accessories Column */}
                <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-amber-400 mb-4 text-center">Accessories</h3>
                    <div className="bg-black/20 p-4 rounded-lg flex-grow flex flex-col justify-between">
                         <div className="grid grid-cols-2 gap-x-4 gap-y-6 mb-auto">
                            <StatDisplay label="Cost" value={formatCurrency(AccCost)} />
                            <StatDisplay label="Avg. CPC" value={formatAvgCPC(AccAvgCPC)} />
                            <StatDisplay label="ROAS" value={formatROAS(AccROAS)} />
                            <StatDisplay label="Conversions" value={formatNumber(AccConversions)} />
                        </div>
                        <div className="mt-6">
                            <BudgetProgress label="% of Total Cost" value={accPercentOfCost} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoogleAdsTile;
