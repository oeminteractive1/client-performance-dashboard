import React, { useState, useMemo } from 'react';
import { BingAdsRecord } from '../types';

type ViewMode = 'time' | 'month';
type TimeRange = '1' | '3' | '6' | '9' | '12';

interface BingAdsTileProps {
    allData: BingAdsRecord[];
    viewMode: ViewMode;
    timeRange: TimeRange;
    selectedMonth: string;
}

const BingAdsTile: React.FC<BingAdsTileProps> = ({ allData, viewMode, timeRange, selectedMonth }) => {
    // Aggregate data for time range mode
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

        // Sum up all metrics across the time range
        const aggregated = relevantData.reduce((acc, record) => {
            acc.Cost += record.Cost || 0;
            acc.Revenue += (record.Cost || 0) * (record.ROAS || 0);
            acc.Clicks += record.Clicks || 0;
            acc.Conversions += record.Conversions || 0;
            return acc;
        }, { Cost: 0, Revenue: 0, Clicks: 0, Conversions: 0 });

        // Calculate averages from aggregated data
        const ROAS = aggregated.Cost > 0 ? aggregated.Revenue / aggregated.Cost : 0;
        const AvgCPC = aggregated.Clicks > 0 ? aggregated.Cost / aggregated.Clicks : 0;

        return {
            cost: aggregated.Cost,
            avgCPC: AvgCPC,
            roas: ROAS,
            conversions: aggregated.Conversions,
        };
    }, [allData, timeRange, viewMode]);

    // Monthly data for month mode
    const monthlyData = useMemo(() => {
        if (viewMode !== 'month' || !allData || !selectedMonth) {
            return null;
        }
        const record = allData.find(d => d.Date === selectedMonth);
        if (!record) return null;

        return {
            cost: record.Cost || 0,
            avgCPC: record.AvgCPC || 0,
            roas: record.ROAS || 0,
            conversions: record.Conversions || 0,
        };
    }, [allData, selectedMonth, viewMode]);

    const processedData = viewMode === 'time' ? aggregatedData : monthlyData;

    if (!processedData) {
        return (
            <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
                <div className="text-center">
                    <p>No Bing Ads data available</p>
                    <p className="text-xs">Check Data Connections</p>
                </div>
            </div>
        );
    }

    const { cost, avgCPC, roas, conversions } = processedData;

    return (
        <div className="h-full flex items-center justify-center p-6">
            <div className="w-full">
                {/* Single Performance Table */}
                <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6">
                    <div className="grid grid-cols-2 gap-6">
                        {/* Cost */}
                        <div>
                            <div className="text-[var(--color-text-secondary)] text-sm mb-1">Cost</div>
                            <div className="text-3xl font-bold text-white">${cost.toFixed(0)}</div>
                        </div>

                        {/* Avg. CPC */}
                        <div>
                            <div className="text-[var(--color-text-secondary)] text-sm mb-1">Avg. CPC</div>
                            <div className="text-3xl font-bold text-white">${avgCPC.toFixed(2)}</div>
                        </div>

                        {/* ROAS */}
                        <div>
                            <div className="text-[var(--color-text-secondary)] text-sm mb-1">ROAS</div>
                            <div className="text-3xl font-bold text-white">{roas.toFixed(2)}x</div>
                        </div>

                        {/* Conversions */}
                        <div>
                            <div className="text-[var(--color-text-secondary)] text-sm mb-1">Conversions</div>
                            <div className="text-3xl font-bold text-white">{conversions.toFixed(0)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BingAdsTile;
