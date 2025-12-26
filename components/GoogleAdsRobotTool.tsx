import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AccountDetailsRecord, GoogleAdsRobotToolState, BudgetStatusRecord, AllBudgetStatusData } from '../types';

// Percentage bar component
const PercentageBar: React.FC<{ percentage: number }> = ({ percentage }) => {
    return (
        <div className="flex flex-col items-center w-20 h-16 justify-center">
            <div className="w-16 h-3 bg-gray-600 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
            <div className="text-lg font-semibold h-4 flex items-center justify-center mt-1">
                {percentage.toFixed(1)}%
            </div>
        </div>
    );
};

// ROAS info graphic component
const RoasInfoGraphic: React.FC<{ costInDollars: number, conversionsValue: number }> = ({ costInDollars, conversionsValue }) => {
    const roas = costInDollars > 0 && conversionsValue > 0 ? (conversionsValue / costInDollars) : 0;
    const roasText = roas > 0 ? roas.toFixed(2) : 'N/A';
    
    // Color coding based on ROAS value
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
const CostInfoGraphic: React.FC<{ costInDollars: number }> = ({ costInDollars }) => {
    const costText = `$${costInDollars.toFixed(2)}`;
    
    return (
        <div className="flex flex-col items-center w-24 h-16 justify-center">
            <div className="px-3 py-1 rounded-lg text-lg font-semibold border bg-blue-100 text-blue-800 border-blue-200">
                {costText}
            </div>
        </div>
    );
};

// Conversions info graphic component
const ConversionsInfoGraphic: React.FC<{ conversions: number }> = ({ conversions }) => {
    const conversionsText = conversions.toFixed(1);
    
    return (
        <div className="flex flex-col items-center w-20 h-16 justify-center">
            <div className="px-3 py-1 rounded-lg text-lg font-semibold border bg-green-100 text-green-800 border-green-200">
                {conversionsText}
            </div>
        </div>
    );
};

// Total Budget info graphic component
const TotalBudgetInfoGraphic: React.FC<{ totalBudgetInDollars: number }> = ({ totalBudgetInDollars }) => {
    const budgetText = `$${totalBudgetInDollars.toFixed(2)}`;
    
    return (
        <div className="flex flex-col items-center w-32 h-16 justify-center">
            <div className="text-base text-[var(--color-text-secondary)] text-center leading-tight mb-1">
                Total Budget
            </div>
            <div className="px-4 py-1 rounded-lg text-lg font-semibold border bg-emerald-100 text-emerald-800 border-emerald-200">
                {budgetText}
            </div>
        </div>
    );
};

// Google Spend info graphic component
const GoogleSpendInfoGraphic: React.FC<{ googleSpend: number }> = ({ googleSpend }) => {
    const spendText = `$${googleSpend.toFixed(2)}`;
    
    return (
        <div className="flex flex-col items-center w-32 h-16 justify-center">
            <div className="text-base text-[var(--color-text-secondary)] text-center leading-tight mb-1">
                Google Spend
            </div>
            <div className="px-4 py-1 rounded-lg text-lg font-semibold border bg-blue-100 text-blue-800 border-blue-200">
                {spendText}
            </div>
        </div>
    );
};

// Target Spend info graphic component
const TargetSpendInfoGraphic: React.FC<{ targetSpend: number }> = ({ targetSpend }) => {
    const targetText = `${targetSpend.toFixed(1)}%`;
    
    return (
        <div className="flex flex-col items-center w-32 h-16 justify-center">
            <div className="text-base text-[var(--color-text-secondary)] text-center leading-tight mb-1">
                Target Spend
            </div>
            <div className="px-4 py-1 rounded-lg text-lg font-semibold border bg-cyan-100 text-cyan-800 border-cyan-200">
                {targetText}
            </div>
        </div>
    );
};

// Yesterday's Spend info graphic component
const YesterdaySpendInfoGraphic: React.FC<{ yesterdaySpend: number }> = ({ yesterdaySpend }) => {
    const spendText = `$${yesterdaySpend.toFixed(2)}`;
    
    return (
        <div className="flex flex-col items-center w-32 h-16 justify-center">
            <div className="text-base text-[var(--color-text-secondary)] text-center leading-tight mb-1">
                Yesterday
            </div>
            <div className="px-4 py-1 rounded-lg text-lg font-semibold border bg-orange-100 text-orange-800 border-orange-200">
                {spendText}
            </div>
        </div>
    );
};

// Percent Spent info graphic component
const PercentSpentInfoGraphic: React.FC<{ percentSpent: number }> = ({ percentSpent }) => {
    const percentText = `${percentSpent.toFixed(1)}%`;
    
    return (
        <div className="flex flex-col items-center w-32 h-16 justify-center">
            <div className="text-base text-[var(--color-text-secondary)] text-center leading-tight mb-1">
                % Spent
            </div>
            <div className="px-4 py-1 rounded-lg text-lg font-semibold border bg-indigo-100 text-indigo-800 border-indigo-200">
                {percentText}
            </div>
        </div>
    );
};

// Projected Total Spend info graphic component
const ProjectedTotalSpendInfoGraphic: React.FC<{ projectedTotalSpend: number }> = ({ projectedTotalSpend }) => {
    const projectedText = `${projectedTotalSpend.toFixed(1)}%`;
    
    return (
        <div className="flex flex-col items-center w-32 h-16 justify-center">
            <div className="text-base text-[var(--color-text-secondary)] text-center leading-tight mb-1">
                Proj. Total Spend
            </div>
            <div className="px-4 py-1 rounded-lg text-lg font-semibold border bg-violet-100 text-violet-800 border-violet-200">
                {projectedText}
            </div>
        </div>
    );
};

// 2 Days Ago Spend info graphic component
const TwoDaysAgoSpendInfoGraphic: React.FC<{ spend2DaysAgo: number }> = ({ spend2DaysAgo }) => {
    const spendText = `$${spend2DaysAgo.toFixed(2)}`;
    
    return (
        <div className="flex flex-col items-center w-32 h-16 justify-center">
            <div className="text-base text-[var(--color-text-secondary)] text-center leading-tight mb-1">
                2 days ago
            </div>
            <div className="px-4 py-1 rounded-lg text-lg font-semibold border bg-amber-100 text-amber-800 border-amber-200">
                {spendText}
            </div>
        </div>
    );
};

// Recommended Daily Budget info graphic component
const RecDailyBudgetInfoGraphic: React.FC<{ recDailyBudget: number }> = ({ recDailyBudget }) => {
    const budgetText = `$${recDailyBudget.toFixed(2)}`;
    
    return (
        <div className="flex flex-col items-center w-32 h-16 justify-center">
            <div className="text-base text-[var(--color-text-secondary)] text-center leading-tight mb-1 whitespace-nowrap">
                Rec. Daily Budget
            </div>
            <div className="px-4 py-1 rounded-lg text-lg font-semibold border bg-yellow-100 text-yellow-800 border-yellow-200">
                {budgetText}
            </div>
        </div>
    );
};

// Budget Recommendation info graphic component
const BudgetRecommendationInfoGraphic: React.FC<{ recDailyBudget: number; totalBudget: number }> = ({ recDailyBudget, totalBudget }) => {
    // Compare daily recommended budget to daily total budget (both are daily amounts)
    const percentageIncrease = totalBudget > 0 ? ((recDailyBudget - totalBudget) / totalBudget) * 100 : 0;
    
    // Determine if increase is needed and color coding
    const needsIncrease = percentageIncrease > 0;
    const displayText = needsIncrease ? `+${percentageIncrease.toFixed(1)}%` : `${percentageIncrease.toFixed(1)}%`;
    
    // Color coding based on recommendation
    const getColorClass = () => {
        if (percentageIncrease > 20) return 'bg-red-100 text-red-800 border-red-200';
        if (percentageIncrease > 10) return 'bg-orange-100 text-orange-800 border-orange-200';
        if (percentageIncrease > 0) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-green-100 text-green-800 border-green-200';
    };
    
    const recommendationText = needsIncrease ? 'Recommend Increasing' : 'Budget Sufficient';
    const dollarIncrease = needsIncrease ? recDailyBudget - totalBudget : 0;
    
    return (
        <div className="flex flex-col items-center w-40 h-20 justify-center">
            <div className="text-base text-[var(--color-text-secondary)] text-center leading-tight mb-1 whitespace-nowrap">
                {recommendationText}
            </div>
            <div className={`px-4 py-1 rounded-lg text-lg font-semibold border ${getColorClass()}`}>
                {displayText}
            </div>
            {needsIncrease && (
                <div className={`px-4 py-1 rounded-lg text-lg font-semibold border mt-1 ${getColorClass()}`}>
                    +${dollarIncrease.toFixed(2)}
                </div>
            )}
        </div>
    );
};

// Campaign Budget Increase Recommendation component (for PMax campaigns only)
const CampaignBudgetIncreaseGraphic: React.FC<{ 
    percentOfTotalCost: number; 
    totalBudgetIncrease: number; 
    campaignName: string;
    currentBudget: number;
    campaignId: string;
    customerId: string;
    onBudgetUpdate: (newBudget: number) => void;
    isLoading: boolean;
}> = ({ percentOfTotalCost, totalBudgetIncrease, campaignName, currentBudget, campaignId, customerId, onBudgetUpdate, isLoading }) => {
    // Calculate this campaign's share of the total increase needed
    const rawCampaignIncrease = (totalBudgetIncrease * percentOfTotalCost) / 100;
    // Always round UP to nearest dollar for increases
    const campaignIncrease = rawCampaignIncrease > 0 ? Math.ceil(rawCampaignIncrease) : rawCampaignIncrease;
    const newBudget = currentBudget + campaignIncrease;
    const percentIncrease = ((campaignIncrease / currentBudget) * 100);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editValue, setEditValue] = useState('');

    const openModal = () => {
        setEditValue(newBudget.toFixed(2));
        setIsModalOpen(true);
    };

    const handleUpdate = async () => {
        const budgetValue = parseFloat(editValue);
        if (budgetValue > 0) {
            await onBudgetUpdate(budgetValue);
            setIsModalOpen(false);
        }
    };
    
    return (
        <>
            <div className="flex flex-col items-center w-28 h-16 justify-center">
                <button 
                    onClick={openModal}
                    disabled={isLoading}
                    className="px-3 py-1 rounded-lg text-sm font-semibold border bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    +${campaignIncrease.toFixed(2)}
                </button>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="bg-slate-800 p-8 rounded-lg border border-slate-600 w-96">
                        <h3 className="text-xl font-semibold mb-6 text-white">Update Campaign Budget</h3>
                        <p className="text-sm text-slate-300 mb-4">{campaignName}</p>
                        
                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">Current Budget:</span>
                                <span className="font-semibold text-white">${currentBudget.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">New Budget:</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    className="bg-slate-700 border border-slate-500 text-white text-sm rounded-lg p-2 w-24 text-right"
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">Increase Amount:</span>
                                <span className="font-semibold text-green-400">+${campaignIncrease.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-300">% Increase:</span>
                                <span className="font-semibold text-purple-400">+{percentIncrease.toFixed(1)}%</span>
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={handleUpdate}
                                disabled={isLoading}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Updating...' : 'Update Budget'}
                            </button>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// Radial Progress Budget component
const RadialProgressBudgetMini: React.FC<{ percentSpent: number; projectedSpend: number }> = ({ percentSpent, projectedSpend }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentSpent / 100) * circumference;

    const getProjectedColor = () => {
        if (projectedSpend >= 110) {
            return 'text-red-400'; // Red for >110% projection
        } else if (projectedSpend >= 100) {
            return 'text-yellow-400'; // Yellow for 100-110% projection
        } else {
            return 'text-green-400'; // Green for <100% projection
        }
    };

    const colorClass = getProjectedColor();

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative h-36 w-36">
                <svg className="h-full w-full" viewBox="0 0 120 120">
                    <circle className="text-gray-600" strokeWidth="12" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" />
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
                    <span className={`text-3xl font-bold ${colorClass}`}>{projectedSpend.toFixed(0)}%</span>
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] -mt-1">Projected</span>
                </div>
            </div>
            <div className="mt-3 text-center">
                <span className="text-lg font-semibold text-[var(--color-text-primary)]">{percentSpent.toFixed(1)}%</span>
                <p className="text-sm text-[var(--color-text-secondary)]">of budget spent</p>
            </div>
        </div>
    );
};

// Budget info graphic component
const BudgetInfoGraphic: React.FC<{ 
    budgetInDollars: number; 
    campaignId: string; 
    campaignName: string;
    customerId: string;
    onBudgetUpdate: (newBudget: number) => void;
    isLoading: boolean;
}> = ({ budgetInDollars, campaignId, campaignName, customerId, onBudgetUpdate, isLoading }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editValue, setEditValue] = useState(budgetInDollars.toFixed(2));
    const [isSaving, setIsSaving] = useState(false);
    
    const handleSave = async () => {
        const newBudget = parseFloat(editValue);
        if (isNaN(newBudget) || newBudget <= 0) {
            alert('Please enter a valid budget amount');
            return;
        }
        
        setIsSaving(true);
        try {
            const response = await fetch('http://localhost:3002/api/campaigns/budget', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customerId: customerId,
                    campaignId: campaignId,
                    budgetAmount: newBudget
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to update budget: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                onBudgetUpdate(newBudget);
                setIsModalOpen(false);
            } else {
                throw new Error(result.error || 'Failed to update budget');
            }
        } catch (error) {
            alert(`Error updating budget: ${error}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditValue(budgetInDollars.toFixed(2));
        setIsModalOpen(false);
    };

    const openModal = () => {
        setEditValue(budgetInDollars.toFixed(2));
        setIsModalOpen(true);
    };

    return (
        <>
            <div className="flex flex-col items-center w-24 h-16 justify-center">
                <div 
                    className="px-3 py-1 rounded-lg text-lg font-semibold border bg-purple-100 text-purple-800 border-purple-200 cursor-pointer hover:bg-purple-200 transition-colors"
                    onClick={openModal}
                    title="Click to edit budget"
                >
                    ${budgetInDollars.toFixed(2)}
                </div>
            </div>

            {/* Budget Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-8 rounded-lg border border-gray-600 w-96 max-w-[90vw] shadow-2xl">
                        <h3 className="text-xl font-semibold mb-4 text-[var(--color-text-primary)]">
                            Edit Campaign Budget
                        </h3>
                        <div className="mb-4">
                            <p className="text-sm text-[var(--color-text-secondary)] mb-2">Campaign:</p>
                            <p className="font-medium text-[var(--color-text-primary)] mb-4">{campaignName}</p>
                            
                            <p className="text-sm text-[var(--color-text-secondary)] mb-2">Current Budget:</p>
                            <p className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">${budgetInDollars.toFixed(2)}</p>
                            
                            <label className="block text-sm font-medium mb-2 text-[var(--color-text-primary)]">
                                New Budget Amount (USD):
                            </label>
                            <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full px-4 py-3 text-lg border rounded-lg bg-[var(--color-input-bg)] border-[var(--color-input-border)] text-[var(--color-text-primary)]"
                                step="0.01"
                                min="0"
                                placeholder="Enter budget amount..."
                                disabled={isSaving || isLoading}
                                autoFocus
                            />
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                Enter the daily budget amount in dollars (e.g., 25.00)
                            </p>
                        </div>
                        
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={handleCancel}
                                disabled={isSaving || isLoading}
                                className="px-6 py-2 border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || isLoading}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Update Budget'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// Simple inline chart component
const MiniChart: React.FC<{ data: {date: string, cost: number, roas: number}[] }> = ({ data }) => {
    if (!data || data.length === 0) return null;
    
    const maxCost = Math.max(...data.map(d => d.cost));
    const maxRoas = Math.max(...data.map(d => d.roas));
    const width = 200;
    const height = 80;
    
    const chartHeight = height - 20; // Reserve 20px for legend at bottom
    const costPoints = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = chartHeight - ((d.cost / maxCost) * (chartHeight * 0.9)) + 5;
        return `${x},${y}`;
    }).join(' ');
    
    const roasPoints = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = chartHeight - ((d.roas / maxRoas) * (chartHeight * 0.9)) + 5;
        return `${x},${y}`;
    }).join(' ');
    
    return (
        <svg width={width} height={height} className="mt-2">
            <defs>
                <linearGradient id="costGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
            </defs>
            
            {/* Cost area */}
            {data.length > 1 && (
                <polygon
                    points={`0,${chartHeight + 5} ${costPoints} ${width},${chartHeight + 5}`}
                    fill="url(#costGradient)"
                />
            )}
            
            {/* Cost line */}
            {data.length > 1 && (
                <polyline
                    points={costPoints}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                />
            )}
            
            {/* ROAS line */}
            {data.length > 1 && (
                <polyline
                    points={roasPoints}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                />
            )}
            
            {/* Legend */}
            <text x="5" y="78" fontSize="10" fill="#3b82f6">Cost</text>
            <text x="40" y="78" fontSize="10" fill="#ef4444">ROAS</text>
        </svg>
    );
};

interface Campaign {
    campaign: {
        id: string;
        name: string;
        status: string;
    };
    campaignBudget: {
        amountMicros: number;
    };
    metrics: {
        clicks: number;
        impressions: number;
        costMicros: number;
        conversions?: number;
        conversionsValue: number;
    };
    dailyData: {
        date: string;
        cost: number;
        roas: number;
        conversionsValue: number;
    }[];
}

interface GoogleAdsRobotToolProps {
    allAccountDetails: AccountDetailsRecord[];
    gapiClient: any;
    isSignedIn: boolean;
    toolState: GoogleAdsRobotToolState;
    onStateChange: (newState: GoogleAdsRobotToolState) => void;
    allBudgetStatusData?: AllBudgetStatusData;
}

const GoogleAdsRobotTool: React.FC<GoogleAdsRobotToolProps> = ({ 
    allAccountDetails, 
    gapiClient, 
    isSignedIn, 
    toolState, 
    onStateChange,
    allBudgetStatusData 
}) => {
    const { selectedClient } = toolState;
    
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [log, setLog] = useState<string[]>([]);
    const [campaignFilter, setCampaignFilter] = useState<'all' | 'pmax' | 'search'>('all');
    const [dateRange, setDateRange] = useState<'7' | '30' | '60' | '90'>('30');
    const [dateMode, setDateMode] = useState<'timespan' | 'month'>('timespan');
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [showRecommendationSummary, setShowRecommendationSummary] = useState(false);
    const [columnOrder, setColumnOrder] = useState(['campaign', 'increaseBudget', 'percentOfTotal', 'budget', 'roas', 'conversions', 'cost', 'trend']);
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
    const [allocationNotes, setAllocationNotes] = useState<string[]>([]);
    const [showAllocationModal, setShowAllocationModal] = useState(false);
    const [performanceByTimeData, setPerformanceByTimeData] = useState<{
        dayOfWeekData: any[];
        hourOfDayData: any[];
    } | null>(null);
    const [isLoadingTimeData, setIsLoadingTimeData] = useState(false);
    const [performanceComparisonData, setPerformanceComparisonData] = useState<any>(null);
    const [isLoadingComparisonData, setIsLoadingComparisonData] = useState(false);
    const [recommendationView, setRecommendationView] = useState<'allocation' | 'amount'>('amount');

    // Get Google Ads ID for selected client
    const getGoogleAdsId = (clientName: string): string | null => {
        if (!clientName) return null;
        
        const client = allAccountDetails.find(c => c.ClientName === clientName);
        if (!client) return null;
        
        const adsId = client['Google Ads ID'];
        if (!adsId) return null;
        
        // Remove hyphens for API usage
        return adsId.replace(/-/g, '');
    };

    const currentGoogleAdsId = useMemo(() => {
        return selectedClient ? getGoogleAdsId(selectedClient) : null;
    }, [selectedClient, allAccountDetails]);

    // Generate month options (last 24 months)
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

    // Auto-fetch campaigns when client or date parameters change
    useEffect(() => {
        if (selectedClient && currentGoogleAdsId) {
            // Only fetch if we have valid date parameters
            if (dateMode === 'timespan' || (dateMode === 'month' && selectedMonth)) {
                fetchCampaigns();
            }
        } else {
            setCampaigns([]);
        }
    }, [selectedClient, currentGoogleAdsId, dateRange, dateMode, selectedMonth]);

    // Get all clients from Settings tab
    const availableClients = useMemo(() => {
        return allAccountDetails
            .map(client => client.ClientName)
            .filter(Boolean)
            .sort();
    }, [allAccountDetails]);

    // Filter campaigns based on type
    const filteredCampaigns = useMemo(() => {
        if (campaignFilter === 'all') return campaigns;
        
        return campaigns.filter(campaign => {
            const name = campaign.campaign.name.toLowerCase();
            if (campaignFilter === 'pmax') {
                return name.includes('perf max') || name.includes('pmax') || name.includes('performance max');
            } else if (campaignFilter === 'search') {
                return name.includes('search') && !name.includes('perf max') && !name.includes('pmax');
            }
            return true;
        });
    }, [campaigns, campaignFilter]);

    // Calculate total cost for percentage calculations
    const totalCost = useMemo(() => {
        return filteredCampaigns.reduce((sum, campaign) => sum + (campaign.metrics.costMicros / 1000000), 0);
    }, [filteredCampaigns]);

    // Calculate total budget for all campaigns
    const totalBudget = useMemo(() => {
        return campaigns.reduce((sum, campaign) => sum + (campaign.campaignBudget.amountMicros / 1000000), 0);
    }, [campaigns]);

    // Get budget status data for selected client
    const budgetStatusForClient = useMemo(() => {
        if (!selectedClient || !allBudgetStatusData) return null;
        return allBudgetStatusData[selectedClient] || null;
    }, [selectedClient, allBudgetStatusData]);

    // Budget Allocation Analysis for Parts vs Accessories
    const budgetAllocationAnalysis = useMemo(() => {
        const pmaxCampaigns = campaigns.filter(campaign => {
            const campaignName = campaign.campaign.name.toLowerCase();
            return campaignName.includes('perf max') || campaignName.includes('pmax') || campaignName.includes('performance max');
        });

        const partsCampaigns = pmaxCampaigns.filter(campaign => 
            campaign.campaign.name.toLowerCase().includes('part')
        );
        
        const accCampaigns = pmaxCampaigns.filter(campaign => 
            campaign.campaign.name.toLowerCase().includes('acc')
        );

        if (partsCampaigns.length === 0 || accCampaigns.length === 0) {
            return null;
        }

        // Calculate average ROAS and budget allocation for each category
        const partsMetrics = partsCampaigns.reduce((acc, campaign) => {
            const cost = campaign.metrics.costMicros / 1000000;
            const revenue = campaign.metrics.conversionsValue;
            const budget = campaign.campaignBudget.amountMicros / 1000000;
            const roas = cost > 0 ? revenue / cost : 0;
            
            return {
                totalCost: acc.totalCost + cost,
                totalRevenue: acc.totalRevenue + revenue,
                totalBudget: acc.totalBudget + budget,
                campaignCount: acc.campaignCount + 1,
                campaigns: [...acc.campaigns, campaign]
            };
        }, { totalCost: 0, totalRevenue: 0, totalBudget: 0, campaignCount: 0, campaigns: [] as any[] });

        const accMetrics = accCampaigns.reduce((acc, campaign) => {
            const cost = campaign.metrics.costMicros / 1000000;
            const revenue = campaign.metrics.conversionsValue;
            const budget = campaign.campaignBudget.amountMicros / 1000000;
            const roas = cost > 0 ? revenue / cost : 0;
            
            return {
                totalCost: acc.totalCost + cost,
                totalRevenue: acc.totalRevenue + revenue,
                totalBudget: acc.totalBudget + budget,
                campaignCount: acc.campaignCount + 1,
                campaigns: [...acc.campaigns, campaign]
            };
        }, { totalCost: 0, totalRevenue: 0, totalBudget: 0, campaignCount: 0, campaigns: [] as any[] });

        const partsAvgROAS = partsMetrics.totalCost > 0 ? partsMetrics.totalRevenue / partsMetrics.totalCost : 0;
        const accAvgROAS = accMetrics.totalCost > 0 ? accMetrics.totalRevenue / accMetrics.totalCost : 0;
        const totalBudgetAllocation = partsMetrics.totalBudget + accMetrics.totalBudget;
        
        const partsPercentAllocation = totalBudgetAllocation > 0 ? (partsMetrics.totalBudget / totalBudgetAllocation) * 100 : 0;
        const accPercentAllocation = totalBudgetAllocation > 0 ? (accMetrics.totalBudget / totalBudgetAllocation) * 100 : 0;

        const roasDiscrepancy = Math.abs(partsAvgROAS - accAvgROAS);
        const hasSignificantDiscrepancy = roasDiscrepancy >= 5;
        
        let recommendation = null;
        if (hasSignificantDiscrepancy) {
            const higherPerformingCategory = partsAvgROAS > accAvgROAS ? 'parts' : 'acc';
            const lowerPerformingCategory = partsAvgROAS > accAvgROAS ? 'acc' : 'parts';
            const fromMetrics = higherPerformingCategory === 'parts' ? accMetrics : partsMetrics;
            const toMetrics = higherPerformingCategory === 'parts' ? partsMetrics : accMetrics;
            
            const shiftAmount = fromMetrics.totalBudget * 0.1; // 10% of lower performing category budget
            
            recommendation = {
                fromCategory: lowerPerformingCategory,
                toCategory: higherPerformingCategory,
                fromROAS: higherPerformingCategory === 'parts' ? accAvgROAS : partsAvgROAS,
                toROAS: higherPerformingCategory === 'parts' ? partsAvgROAS : accAvgROAS,
                shiftAmount,
                fromCampaigns: fromMetrics.campaigns,
                toCampaigns: toMetrics.campaigns,
                roasDiscrepancy
            };
        }

        return {
            parts: {
                avgROAS: partsAvgROAS,
                budgetAllocation: partsPercentAllocation,
                totalBudget: partsMetrics.totalBudget,
                campaignCount: partsMetrics.campaignCount,
                campaigns: partsMetrics.campaigns
            },
            acc: {
                avgROAS: accAvgROAS,
                budgetAllocation: accPercentAllocation,
                totalBudget: accMetrics.totalBudget,
                campaignCount: accMetrics.campaignCount,
                campaigns: accMetrics.campaigns
            },
            roasDiscrepancy,
            hasSignificantDiscrepancy,
            recommendation
        };
    }, [campaigns]);

    const addToLog = (message: string) => {
        setLog(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
    };

    // Column drag and drop handlers
    const handleDragStart = (e: React.DragEvent, columnId: string) => {
        setDraggedColumn(columnId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
        e.preventDefault();
        if (!draggedColumn || draggedColumn === targetColumnId) return;

        const newOrder = [...columnOrder];
        const draggedIndex = newOrder.indexOf(draggedColumn);
        const targetIndex = newOrder.indexOf(targetColumnId);

        // Remove dragged column and insert at target position
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedColumn);

        setColumnOrder(newOrder);
        setDraggedColumn(null);
    };

    const handleDragEnd = () => {
        setDraggedColumn(null);
    };

    // Column definitions
    const columns = {
        campaign: { 
            id: 'campaign', 
            title: 'Campaign', 
            className: 'text-left py-3 px-4 border-r border-[var(--color-border)]' 
        },
        increaseBudget: { 
            id: 'increaseBudget', 
            title: 'Increase Budget', 
            className: 'text-center py-3 px-4 border-r border-[var(--color-border)]' 
        },
        percentOfTotal: { 
            id: 'percentOfTotal', 
            title: '% of Total Cost', 
            className: 'text-center py-3 px-4 border-r border-[var(--color-border)]' 
        },
        budget: { 
            id: 'budget', 
            title: 'Budget', 
            className: 'text-center py-3 px-4 border-r border-[var(--color-border)]' 
        },
        roas: { 
            id: 'roas', 
            title: 'ROAS', 
            className: 'text-center py-3 px-4 border-r border-[var(--color-border)]' 
        },
        conversions: { 
            id: 'conversions', 
            title: 'Conversions', 
            className: 'text-center py-3 px-4 border-r border-[var(--color-border)]' 
        },
        cost: { 
            id: 'cost', 
            title: 'Cost', 
            className: 'text-center py-3 px-4 border-r border-[var(--color-border)]' 
        },
        trend: { 
            id: 'trend', 
            title: 'Trend', 
            className: 'text-center py-3 px-4 border-r border-[var(--color-border)]' 
        }
    };

    // Render cell content based on column type
    const renderCellContent = (columnId: string, campaign: any) => {
        const campaignName = campaign.campaign.name.toLowerCase();
        const isPMax = campaignName.includes('perf max') || campaignName.includes('pmax') || campaignName.includes('performance max');
        const budgetIncrease = budgetStatusForClient && totalBudget > 0 ? 
            budgetStatusForClient.recDailyBudget - totalBudget : 0;

        switch (columnId) {
            case 'campaign':
                return (
                    <div className="flex flex-col gap-2">
                        <h4 className="font-semibold text-[var(--color-text-primary)]">{campaign.campaign.name}</h4>
                        {campaign.campaign.status === 'ENABLED' ? (
                            <button
                                onClick={() => pauseCampaign(campaign.campaign.id)}
                                disabled={isLoading}
                                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors disabled:opacity-50 self-start"
                            >
                                Pause
                            </button>
                        ) : (
                            <button
                                onClick={() => enableCampaign(campaign.campaign.id)}
                                disabled={isLoading}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors disabled:opacity-50 self-start"
                            >
                                Enable
                            </button>
                        )}
                    </div>
                );
            case 'increaseBudget':
                return isPMax && budgetIncrease > 0 ? (
                    <CampaignBudgetIncreaseGraphic 
                        percentOfTotalCost={totalCost > 0 ? ((campaign.metrics.costMicros / 1000000) / totalCost) * 100 : 0}
                        totalBudgetIncrease={budgetIncrease}
                        campaignName={campaign.campaign.name}
                        currentBudget={campaign.campaignBudget.amountMicros / 1000000}
                        campaignId={campaign.campaign.id}
                        customerId={currentGoogleAdsId || ''}
                        onBudgetUpdate={(newBudget) => updateCampaignBudget(campaign.campaign.id, newBudget)}
                        isLoading={isLoading}
                    />
                ) : null;
            case 'percentOfTotal':
                return (
                    <PercentageBar 
                        percentage={totalCost > 0 ? ((campaign.metrics.costMicros / 1000000) / totalCost) * 100 : 0}
                    />
                );
            case 'budget':
                return (
                    <BudgetInfoGraphic 
                        budgetInDollars={campaign.campaignBudget.amountMicros / 1000000}
                        campaignId={campaign.campaign.id}
                        campaignName={campaign.campaign.name}
                        customerId={currentGoogleAdsId || ''}
                        onBudgetUpdate={(newBudget) => updateCampaignBudget(campaign.campaign.id, newBudget)}
                        isLoading={isLoading}
                    />
                );
            case 'roas':
                return (
                    <RoasInfoGraphic 
                        costInDollars={campaign.metrics.costMicros / 1000000}
                        conversionsValue={campaign.metrics.conversionsValue}
                    />
                );
            case 'conversions':
                return (
                    <ConversionsInfoGraphic 
                        conversions={campaign.metrics.conversions || 0}
                    />
                );
            case 'cost':
                return (
                    <CostInfoGraphic 
                        costInDollars={campaign.metrics.costMicros / 1000000}
                    />
                );
            case 'trend':
                return <MiniChart data={campaign.dailyData || []} />;
            default:
                return null;
        }
    };

    const updateCampaignBudget = async (campaignId: string, newBudget: number) => {
        if (!currentGoogleAdsId) {
            throw new Error('No Google Ads ID available');
        }

        try {
            const response = await fetch('http://localhost:3002/api/update-campaign-budget', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customerId: currentGoogleAdsId,
                    campaignId,
                    newBudget
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }

            const result = await response.json();

            // Update local state
            setCampaigns(prev => prev.map(campaign =>
                campaign.campaign.id === campaignId
                    ? { ...campaign, campaignBudget: { amountMicros: newBudget * 1000000 } }
                    : campaign
            ));

            addToLog(`✓ Budget updated for campaign ${campaignId}: $${newBudget}`);
            return result;
        } catch (error) {
            addToLog(`✗ Failed to update budget: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    };

    const fetchPerformanceByTime = useCallback(async () => {
        console.log('fetchPerformanceByTime called with:', { dateMode, selectedMonth, dateRange, selectedClient: toolState.selectedClient });
        setIsLoadingTimeData(true);
        
        let requestBody;
        let logMessage;
        
        if (dateMode === 'month' && selectedMonth) {
            // Month mode: get data for specific month
            const [year, month] = selectedMonth.split('-');
            const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month
            
            requestBody = {
                startDate: startDate.toISOString().split('T')[0].replace(/-/g, ''),
                endDate: endDate.toISOString().split('T')[0].replace(/-/g, ''),
                selectedClient: toolState.selectedClient
            };
            logMessage = `Fetching performance by time data (${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
        } else {
            // Timespan mode: get data for last X days
            requestBody = {
                dateRange: dateRange,
                selectedClient: toolState.selectedClient
            };
            logMessage = `Fetching performance by time data (Last ${dateRange} days)`;
        }
        
        addToLog(logMessage);

        try {
            const response = await fetch('http://localhost:3002/api/performance-by-time', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Backend API error ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error from backend');
            }

            setPerformanceByTimeData({
                dayOfWeekData: result.dayOfWeekData || [],
                hourOfDayData: result.hourOfDayData || []
            });
            
            addToLog(`Loaded performance data: ${result.totalDataPoints} data points from ${result.accountsProcessed} accounts`);
        } catch (error) {
            addToLog(`Error fetching performance by time: ${error}`);
            setPerformanceByTimeData(null);
        } finally {
            setIsLoadingTimeData(false);
        }
    }, [dateMode, selectedMonth, dateRange, toolState.selectedClient]);

    // Auto-fetch performance by time data when date parameters change
    useEffect(() => {
        console.log('Performance by time useEffect triggered:', { dateMode, selectedMonth, dateRange, selectedClient: toolState.selectedClient });
        if (!toolState.selectedClient) {
            console.log('No client selected - clearing performance by time data');
            setPerformanceByTimeData(null);
            return;
        }
        if (dateMode === 'timespan' || (dateMode === 'month' && selectedMonth)) {
            fetchPerformanceByTime();
        } else {
            setPerformanceByTimeData(null);
        }
    }, [dateMode, selectedMonth, dateRange, toolState.selectedClient, fetchPerformanceByTime]);

    const fetchPerformanceComparison = useCallback(async () => {
        if (!toolState.selectedClient) {
            console.log('No client selected for comparison');
            return;
        }

        console.log('Starting fetchPerformanceComparison:', { selectedClient: toolState.selectedClient });
        setIsLoadingComparisonData(true);
        addToLog(`Fetching performance comparison data for ${toolState.selectedClient}`);

        try {
            console.log('Making API call to:', 'http://localhost:3002/api/performance-comparison');
            console.log('Request body:', { selectedClient: toolState.selectedClient });
            
            const response = await fetch('http://localhost:3002/api/performance-comparison', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    selectedClient: toolState.selectedClient
                })
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.log('Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            console.log('Performance comparison data received:', data);
            setPerformanceComparisonData(data);
            addToLog('✓ Performance comparison data loaded successfully');

        } catch (error) {
            console.error('Error fetching performance comparison:', error);
            if (error instanceof TypeError && error.message.includes('fetch')) {
                addToLog(`✗ Network error: Cannot connect to backend server`);
            } else {
                addToLog(`✗ Error fetching performance comparison: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        } finally {
            setIsLoadingComparisonData(false);
        }
    }, [toolState.selectedClient]);

    // Auto-fetch comparison data when client changes
    useEffect(() => {
        if (toolState.selectedClient) {
            fetchPerformanceComparison();
        } else {
            setPerformanceComparisonData(null);
        }
    }, [toolState.selectedClient, fetchPerformanceComparison]);

    const fetchCampaigns = async () => {
        if (!currentGoogleAdsId) {
            addToLog('No Google Ads ID available');
            return;
        }

        setIsLoading(true);
        
        let requestBody;
        let logMessage;
        
        if (dateMode === 'month' && selectedMonth) {
            // Month mode: get data for specific month
            const [year, month] = selectedMonth.split('-');
            const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month
            
            requestBody = {
                customerId: currentGoogleAdsId,
                startDate: startDate.toISOString().split('T')[0].replace(/-/g, ''),
                endDate: endDate.toISOString().split('T')[0].replace(/-/g, '')
            };
            logMessage = `Fetching campaigns for customer ID: ${currentGoogleAdsId} (${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
        } else {
            // Timespan mode: get data for last X days
            requestBody = {
                customerId: currentGoogleAdsId,
                dateRange: dateRange 
            };
            logMessage = `Fetching campaigns for customer ID: ${currentGoogleAdsId} (Last ${dateRange} days)`;
        }
        
        addToLog(logMessage);

        try {
            const response = await fetch('http://localhost:3002/api/campaigns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Backend API error ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error from backend');
            }

            setCampaigns(result.results || []);
            addToLog(`Loaded ${result.results?.length || 0} campaigns`);
        } catch (error) {
            addToLog(`Error fetching campaigns: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    const pauseCampaign = async (campaignId: string) => {
        if (!currentGoogleAdsId) return;

        setIsLoading(true);
        addToLog(`Pausing campaign ${campaignId}`);

        try {
            const response = await fetch('http://localhost:3002/api/campaigns/pause', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    customerId: currentGoogleAdsId,
                    campaignId: campaignId
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Backend API error ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to pause campaign');
            }

            // Update local state
            setCampaigns(prev => prev.map(campaign => 
                campaign.campaign.id === campaignId 
                    ? { ...campaign, campaign: { ...campaign.campaign, status: 'PAUSED' } }
                    : campaign
            ));
            
            addToLog(`Campaign ${campaignId} paused successfully`);
        } catch (error) {
            addToLog(`Error pausing campaign: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    const enableCampaign = async (campaignId: string) => {
        if (!currentGoogleAdsId) return;

        setIsLoading(true);
        addToLog(`Enabling campaign ${campaignId}`);

        try {
            const response = await fetch('http://localhost:3002/api/campaigns/enable', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    customerId: currentGoogleAdsId,
                    campaignId: campaignId
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Backend API error ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to enable campaign');
            }

            // Update local state
            setCampaigns(prev => prev.map(campaign => 
                campaign.campaign.id === campaignId 
                    ? { ...campaign, campaign: { ...campaign.campaign, status: 'ENABLED' } }
                    : campaign
            ));
            
            addToLog(`Campaign ${campaignId} enabled successfully`);
        } catch (error) {
            addToLog(`Error enabling campaign: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    const pauseAllCampaigns = async () => {
        const enabledCampaigns = campaigns.filter(c => c.campaign.status === 'ENABLED');
        if (enabledCampaigns.length === 0) {
            addToLog('No enabled campaigns to pause');
            return;
        }

        setIsLoading(true);
        addToLog(`Pausing ${enabledCampaigns.length} enabled campaigns...`);

        for (const campaign of enabledCampaigns) {
            try {
                const response = await fetch('http://localhost:3002/api/campaigns/pause', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        customerId: currentGoogleAdsId,
                        campaignId: campaign.campaign.id
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Backend API error ${response.status}: ${errorText}`);
                }

                const result = await response.json();
                
                if (result.success) {
                    addToLog(`✓ Paused: ${campaign.campaign.name}`);
                } else {
                    addToLog(`✗ Failed to pause: ${campaign.campaign.name}`);
                }
            } catch (error) {
                addToLog(`✗ Error pausing ${campaign.campaign.name}: ${error}`);
            }
        }

        // Refresh campaigns to get updated statuses
        setTimeout(() => {
            fetchCampaigns();
            setIsLoading(false);
        }, 1000);
    };

    // Authentication guard
    if (!isSignedIn) {
        return (
            <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold mb-4 text-white">Google Ads Playground</h1>
                        <div className="bg-[var(--color-card-bg)] p-8 rounded-lg border border-[var(--color-border)] mt-8">
                            <div className="flex flex-col items-center space-y-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Google Sign-In Required</h2>
                                <p className="text-[var(--color-text-secondary)] text-center max-w-md">
                                    To access the Google Ads Playground and manage campaigns, you need to sign in with your Google account. 
                                    Click the Google icon (G) in the top toolbar to authenticate.
                                </p>
                                <div className="flex items-center space-x-2 text-[var(--color-text-secondary)] text-sm">
                                    <span>Look for the</span>
                                    <div className="bg-slate-600 p-1.5 rounded-lg">
                                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-red-400">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                    </div>
                                    <span>in the toolbar above</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-4 text-white">Google Ads Playground</h1>
                    <p className="text-lg text-[var(--color-text-secondary)]">
                        This is a tool for testing interactions with the Google Ads API. Select a client to view and manage their campaigns.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Actions */}
                    <div className="bg-[var(--color-card-bg)] p-6 rounded-lg border border-[var(--color-border)]">
                        <h3 className="text-xl font-semibold mb-4">Select a Client</h3>
                        <div className="space-y-4 mb-6">
                            <select
                                value={selectedClient}
                                onChange={e => onStateChange({ selectedClient: e.target.value })}
                                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
                            >
                                <option value="">-- Select a Client --</option>
                                {availableClients.map(clientName => (
                                    <option key={clientName} value={clientName}>
                                        {clientName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Date Mode Toggle and Selection */}
                        <div className="mb-6">
                            <div className="flex mb-3">
                                <button
                                    onClick={() => {
                                        setDateMode('timespan');
                                        setSelectedMonth('');
                                    }}
                                    className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                                        dateMode === 'timespan'
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                                    }`}
                                >
                                    Time Span
                                </button>
                                <button
                                    onClick={() => setDateMode('month')}
                                    className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b ${
                                        dateMode === 'month'
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                                    }`}
                                >
                                    Month
                                </button>
                            </div>
                            
                            {dateMode === 'timespan' ? (
                                <select
                                    value={dateRange}
                                    onChange={e => setDateRange(e.target.value as '7' | '30' | '60' | '90')}
                                    className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
                                >
                                    <option value="7">Last 7 Days</option>
                                    <option value="30">Last 30 Days</option>
                                    <option value="60">Last 60 Days</option>
                                    <option value="90">Last 90 Days</option>
                                </select>
                            ) : (
                                <select
                                    value={selectedMonth}
                                    onChange={e => setSelectedMonth(e.target.value)}
                                    className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
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
                        
                        <h4 className="text-lg font-semibold mb-4">Actions</h4>
                        <button
                            onClick={pauseAllCampaigns}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!selectedClient || !currentGoogleAdsId || isLoading || campaigns.filter(c => c.campaign.status === 'ENABLED').length === 0}
                        >
                            {isLoading ? 'Pausing...' : `Pause All Campaigns (${campaigns.filter(c => c.campaign.status === 'ENABLED').length})`}
                        </button>
                    </div>

                    {/* Recommended Changes */}
                    <div className="bg-[var(--color-card-bg)] p-6 rounded-lg border border-[var(--color-border)]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold">Recommended Changes</h3>
                            {budgetAllocationAnalysis?.hasSignificantDiscrepancy && (
                                <div className="flex">
                                    <button
                                        onClick={() => setRecommendationView('amount')}
                                        className={`px-3 py-1 text-sm font-medium rounded-l-lg border ${
                                            recommendationView === 'amount'
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                                        }`}
                                    >
                                        Amount
                                    </button>
                                    <button
                                        onClick={() => setRecommendationView('allocation')}
                                        className={`px-3 py-1 text-sm font-medium rounded-r-lg border-t border-r border-b ${
                                            recommendationView === 'allocation'
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'
                                        }`}
                                    >
                                        Allocation
                                    </button>
                                </div>
                            )}
                        </div>

                        {selectedClient && (() => {
                            // Budget Allocation Recommendation Section
                            const allocationSection = budgetAllocationAnalysis && budgetAllocationAnalysis.hasSignificantDiscrepancy ? (
                                <div className="mt-6 p-4 bg-[var(--color-bg-secondary)] rounded border border-[var(--color-border)]">
                                    <h4 className="font-semibold mb-4">Budget Allocation Recommendation</h4>
                                    
                                    {/* Performance Summary */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-[var(--color-bg-primary)] p-3 rounded border">
                                            <div className="text-sm font-medium text-[var(--color-text-primary)] mb-1">Parts Campaigns</div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-[var(--color-text-secondary)]">ROAS:</span>
                                                <span className="font-semibold text-[var(--color-text-primary)]">{budgetAllocationAnalysis.parts.avgROAS.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-[var(--color-text-secondary)]">Budget %:</span>
                                                <span className="font-semibold text-[var(--color-text-primary)]">{budgetAllocationAnalysis.parts.budgetAllocation.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-[var(--color-bg-primary)] p-3 rounded border">
                                            <div className="text-sm font-medium text-[var(--color-text-primary)] mb-1">Accessories Campaigns</div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-[var(--color-text-secondary)]">ROAS:</span>
                                                <span className="font-semibold text-[var(--color-text-primary)]">{budgetAllocationAnalysis.acc.avgROAS.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-[var(--color-text-secondary)]">Budget %:</span>
                                                <span className="font-semibold text-[var(--color-text-primary)]">{budgetAllocationAnalysis.acc.budgetAllocation.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recommendation */}
                                    {budgetAllocationAnalysis.recommendation && (
                                        <div className="bg-orange-100 border border-orange-200 p-3 rounded mb-4">
                                            <div className="text-sm font-semibold text-orange-800 mb-2">
                                                ⚠️ ROAS Discrepancy Detected: {budgetAllocationAnalysis.roasDiscrepancy.toFixed(1)} points
                                            </div>
                                            <div className="text-sm text-orange-700">
                                                Shift ${budgetAllocationAnalysis.recommendation.shiftAmount.toFixed(2)} (10%) from{' '}
                                                <span className="font-semibold">{budgetAllocationAnalysis.recommendation.fromCategory}</span>{' '}
                                                (ROAS: {budgetAllocationAnalysis.recommendation.fromROAS.toFixed(2)}) to{' '}
                                                <span className="font-semibold">{budgetAllocationAnalysis.recommendation.toCategory}</span>{' '}
                                                (ROAS: {budgetAllocationAnalysis.recommendation.toROAS.toFixed(2)})
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setShowAllocationModal(true)}
                                        disabled={isLoading}
                                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Apply Budget Allocation
                                    </button>
                                </div>
                            ) : null;

                            // Calculate recommendations for all PMax campaigns
                            const budgetIncrease = budgetStatusForClient && totalBudget > 0 ? 
                                budgetStatusForClient.recDailyBudget - totalBudget : 0;
                            
                            const pmaxRecommendations = campaigns.filter(campaign => {
                                const campaignName = campaign.campaign.name.toLowerCase();
                                return campaignName.includes('perf max') || campaignName.includes('pmax') || campaignName.includes('performance max');
                            }).map(campaign => {
                                const percentOfTotal = totalCost > 0 ? ((campaign.metrics.costMicros / 1000000) / totalCost) * 100 : 0;
                                const campaignIncrease = (budgetIncrease * percentOfTotal) / 100;
                                const currentBudget = campaign.campaignBudget.amountMicros / 1000000;
                                // Always round UP to nearest dollar for increases
                                const roundedIncrease = campaignIncrease > 0 ? Math.ceil(campaignIncrease) : campaignIncrease;
                                const newBudget = currentBudget + roundedIncrease;
                                
                                return {
                                    id: campaign.campaign.id,
                                    name: campaign.campaign.name,
                                    currentBudget,
                                    newBudget,
                                    increase: roundedIncrease
                                };
                            }).filter(rec => rec.increase > 0);

                            const recommendedChangesSection = budgetIncrease > 0 && pmaxRecommendations.length > 0 ? (
                                <div className="mt-6 p-4 bg-[var(--color-bg-secondary)] rounded border border-[var(--color-border)]">
                                    <h4 className="font-semibold mb-4">Budget Increase Recommendations</h4>
                                    <div className="space-y-3 mb-4">
                                        {pmaxRecommendations.map(rec => (
                                            <div key={rec.id} className="flex justify-between items-center py-2 px-3 bg-[var(--color-bg-primary)] rounded border">
                                                <span className="font-medium text-sm">{rec.name}</span>
                                                <div className="flex items-center gap-3 text-sm">
                                                    <span className="text-[var(--color-text-secondary)]">${rec.currentBudget.toFixed(2)}</span>
                                                    <span className="text-[var(--color-text-secondary)]">→</span>
                                                    <span className="font-semibold text-green-400">${rec.newBudget.toFixed(2)}</span>
                                                    <span className="text-purple-400 font-semibold">(+${rec.increase.toFixed(2)})</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setShowRecommendationSummary(true)}
                                        disabled={isLoading}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Apply Budget Increases
                                    </button>
                                </div>
                            ) : null;

                            return (
                                <>
                                    {recommendationView === 'allocation' && allocationSection}
                                    {recommendationView === 'amount' && recommendedChangesSection}
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Budget Manager Section */}
                <div className="mt-8 bg-[var(--color-card-bg)] p-6 rounded-lg border border-[var(--color-border)]">
                    <h3 className="text-xl font-semibold mb-6">Budget Manager</h3>
                    <div className="flex justify-between items-start">
                        {/* Left side - Radial Progress */}
                        <div className="flex justify-start">
                            {budgetStatusForClient && (
                                <RadialProgressBudgetMini 
                                    percentSpent={budgetStatusForClient.percentSpent || 0}
                                    projectedSpend={budgetStatusForClient.projectedTotalSpend || 0}
                                />
                            )}
                        </div>
                        
                        {/* Right side - Other metrics */}
                        <div className="flex items-center gap-12">
                            {budgetStatusForClient && (
                                <>
                                    {/* Budget Recommendation */}
                                    <BudgetRecommendationInfoGraphic 
                                        recDailyBudget={budgetStatusForClient.recDailyBudget || 0}
                                        totalBudget={totalBudget}
                                    />
                                    
                                    <TargetSpendInfoGraphic targetSpend={budgetStatusForClient.targetSpend || 0} />
                                    
                                    {/* Stacked Days */}
                                    <div className="flex flex-col gap-4">
                                        <YesterdaySpendInfoGraphic yesterdaySpend={budgetStatusForClient.yesterdaySpend || 0} />
                                        <TwoDaysAgoSpendInfoGraphic spend2DaysAgo={budgetStatusForClient.spend2DaysAgo || 0} />
                                    </div>
                                </>
                            )}
                            
                            {/* Stacked Total Budget and Rec Daily Budget */}
                            <div className="flex flex-col gap-4">
                                <TotalBudgetInfoGraphic totalBudgetInDollars={totalBudget} />
                                {budgetStatusForClient && (
                                    <RecDailyBudgetInfoGraphic recDailyBudget={budgetStatusForClient.recDailyBudget || 0} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Performance by Day and Time Section */}
                <div className="mt-8 bg-[var(--color-card-bg)] p-6 rounded-lg border border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold">Performance by Day and Time</h3>
                    </div>
                    
                    {isLoadingTimeData ? (
                        <div className="text-center py-8">
                            <div className="text-[var(--color-text-secondary)]">
                                Loading performance data{toolState.selectedClient ? ` for ${toolState.selectedClient}` : ' across accounts'}...
                            </div>
                        </div>
                    ) : performanceByTimeData ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {/* Day of Week Chart */}
                            <div className="bg-[var(--color-bg-secondary)] p-4 rounded border">
                                <h4 className="font-semibold mb-4 text-[var(--color-text-primary)]">ROAS by Day of Week</h4>
                                <div className="h-64 flex items-end justify-between gap-2">
                                    {performanceByTimeData.dayOfWeekData.map((day, index) => {
                                        const maxRoas = Math.max(...performanceByTimeData.dayOfWeekData.map(d => d.roas));
                                        const height = maxRoas > 0 ? (day.roas / maxRoas) * 200 : 0;
                                        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                                        return (
                                            <div key={day.dayOfWeek} className="flex flex-col items-center flex-1">
                                                <div className="flex flex-col items-center justify-end h-52">
                                                    <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-1">
                                                        {day.roas.toFixed(2)}
                                                    </div>
                                                    <div
                                                        className="bg-blue-600 w-8 rounded-t transition-all duration-300 hover:bg-blue-700"
                                                        style={{ height: `${height}px` }}
                                                        title={`${day.dayName}: ROAS ${day.roas.toFixed(2)} (Revenue: $${day.totalRevenue.toFixed(2)}, Cost: $${day.totalCost.toFixed(2)})`}
                                                    />
                                                </div>
                                                <div className="text-xs text-[var(--color-text-secondary)] mt-2">
                                                    {dayNames[index]}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Time of Day Chart */}
                            <div className="bg-[var(--color-bg-secondary)] p-4 rounded border">
                                <h4 className="font-semibold mb-4 text-[var(--color-text-primary)]">ROAS by Time of Day</h4>
                                <div className="h-64 overflow-x-auto">
                                    <div className="flex items-end justify-between gap-1 min-w-max">
                                        {performanceByTimeData.hourOfDayData.map((hour) => {
                                            const maxRoas = Math.max(...performanceByTimeData.hourOfDayData.map(h => h.roas));
                                            const height = maxRoas > 0 ? (hour.roas / maxRoas) * 180 : 0;

                                            return (
                                                <div key={hour.hour} className="flex flex-col items-center">
                                                    <div className="flex flex-col items-center justify-end h-44">
                                                        <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-1">
                                                            {hour.roas > 0 ? hour.roas.toFixed(1) : '0'}
                                                        </div>
                                                        <div
                                                            className="bg-green-600 w-4 rounded-t transition-all duration-300 hover:bg-green-700"
                                                            style={{ height: `${height}px` }}
                                                            title={`${hour.hourLabel}: ROAS ${hour.roas.toFixed(2)} (Revenue: $${hour.totalRevenue.toFixed(2)}, Cost: $${hour.totalCost.toFixed(2)})`}
                                                        />
                                                    </div>
                                                    <div className="text-xs text-[var(--color-text-secondary)] mt-2 transform -rotate-45 origin-center w-8">
                                                        {hour.hourLabel.replace(' ', '')}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-[var(--color-text-secondary)] py-8">
                            {!toolState.selectedClient
                                ? 'Select a client to view performance by day and time'
                                : (dateMode === 'month' && !selectedMonth)
                                    ? 'Select a month to view performance data'
                                    : 'No performance data available for the selected time period'
                            }
                        </div>
                    )}
                </div>

                {/* Performance Comparison Section */}
                <div className="mt-8 bg-[var(--color-card-bg)] p-6 rounded-lg border border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold">Performance Comparison</h3>
                    </div>
                    
                    {isLoadingComparisonData ? (
                        <div className="text-center py-8">
                            <div className="text-[var(--color-text-secondary)]">
                                Loading performance comparison data{toolState.selectedClient ? ` for ${toolState.selectedClient}` : ''}...
                            </div>
                        </div>
                    ) : performanceComparisonData ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--color-border)]">
                                        <th className="text-left py-3 px-4 font-medium text-[var(--color-text-secondary)]">Metric</th>
                                        <th className="text-center py-3 px-4 font-medium text-[var(--color-text-secondary)]">Month-to-Date</th>
                                        <th className="text-center py-3 px-4 font-medium text-[var(--color-text-secondary)]">Last 7 Days</th>
                                        <th className="text-center py-3 px-4 font-medium text-[var(--color-text-secondary)]">Last 14 Days</th>
                                        <th className="text-center py-3 px-4 font-medium text-[var(--color-text-secondary)]">3-Month Avg</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const formatPercentChange = (value: number, isGoodWhenPositive: boolean = true) => {
                                            const isPositive = value > 0;
                                            const isNegative = value < 0;
                                            const absValue = Math.abs(value);

                                            // Determine if this change is good or bad
                                            const isGood = isGoodWhenPositive ? isPositive : isNegative;
                                            const isBad = isGoodWhenPositive ? isNegative : isPositive;

                                            let bgColor, textColor, icon;
                                            if (isGood) {
                                                bgColor = 'bg-green-100';
                                                textColor = 'text-green-800';
                                                icon = '▲';
                                            } else if (isBad) {
                                                bgColor = 'bg-red-100';
                                                textColor = 'text-red-800';
                                                icon = '▼';
                                            } else {
                                                bgColor = 'bg-gray-100';
                                                textColor = 'text-gray-600';
                                                icon = '';
                                            }

                                            return (
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-semibold ${bgColor} ${textColor}`}>
                                                    {value !== 0 && <span className="mr-1">{icon}</span>}
                                                    {absValue.toFixed(2)}%
                                                </span>
                                            );
                                        };

                                        // Handle both old and new data structures
                                        const mtdData = performanceComparisonData['mtd'] || performanceComparisonData['30d'] || {};
                                        const data7d = performanceComparisonData['7d'] || { cost: 0, roas: 0 };
                                        const data14d = performanceComparisonData['14d'] || { cost: 0, roas: 0 };
                                        const data90d = performanceComparisonData['90d'] || { cost: 0, roas: 0 };

                                        // Use actual values if available, otherwise use placeholder
                                        const mtdCost = mtdData.costActual || mtdData.cost || 0;
                                        const mtdRoas = mtdData.roasActual || mtdData.roas || 0;

                                        return (
                                            <>
                                                {/* Cost Row */}
                                                <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                                                    <td className="py-4 px-4 font-medium text-[var(--color-text-primary)]">Cost</td>
                                                    <td className="py-4 px-4 text-center font-semibold text-[var(--color-text-primary)]">
                                                        ${typeof mtdCost === 'number' ? mtdCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : formatPercentChange(mtdCost, false)}
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        {formatPercentChange(data7d.cost || 0, false)}
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        {formatPercentChange(data14d.cost || 0, false)}
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        {formatPercentChange(data90d.cost || 0, false)}
                                                    </td>
                                                </tr>

                                                {/* ROAS Row */}
                                                <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                                                    <td className="py-4 px-4 font-medium text-[var(--color-text-primary)]">ROAS</td>
                                                    <td className="py-4 px-4 text-center font-semibold text-[var(--color-text-primary)]">
                                                        {typeof mtdRoas === 'number' ? `${mtdRoas.toFixed(2)}x` : formatPercentChange(mtdRoas, true)}
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        {formatPercentChange(data7d.roas || 0, true)}
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        {formatPercentChange(data14d.roas || 0, true)}
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        {formatPercentChange(data90d.roas || 0, true)}
                                                    </td>
                                                </tr>
                                            </>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center text-[var(--color-text-secondary)] py-8">
                            {toolState.selectedClient 
                                ? 'No comparison data available for the selected client'
                                : 'Select a client to view performance comparison data'
                            }
                        </div>
                    )}
                </div>

                {/* Campaigns Section */}
                <div className="mt-8 bg-[var(--color-card-bg)] p-6 rounded-lg border border-[var(--color-border)]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">
                            {campaignFilter === 'all' ? 'All Campaigns' : 
                             campaignFilter === 'pmax' ? 'Performance Max Campaigns' : 'Search Campaigns'} 
                            ({filteredCampaigns.length})
                        </h3>
                        
                        <div className="flex items-center gap-3">
                            {/* Campaign Type Filter */}
                            <select
                                value={campaignFilter}
                                onChange={e => setCampaignFilter(e.target.value as 'all' | 'pmax' | 'search')}
                                className="bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2 w-40"
                            >
                                <option value="all">All ({campaigns.length})</option>
                                <option value="pmax">PMax ({campaigns.filter(c => {
                                    const name = c.campaign.name.toLowerCase();
                                    return name.includes('perf max') || name.includes('pmax') || name.includes('performance max');
                                }).length})</option>
                                <option value="search">Search ({campaigns.filter(c => {
                                    const name = c.campaign.name.toLowerCase();
                                    return name.includes('search') && !name.includes('perf max') && !name.includes('pmax');
                                }).length})</option>
                            </select>
                        </div>
                    </div>
                    
                    {filteredCampaigns.length === 0 ? (
                        <div className="text-center text-[var(--color-text-secondary)] py-8">
                            {campaigns.length === 0 ? 'No campaigns loaded.' : 'No campaigns match the selected filter.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--color-border)]">
                                        {columnOrder.map((columnId, index) => {
                                            const column = columns[columnId as keyof typeof columns];
                                            const isLastColumn = index === columnOrder.length - 1;
                                            return (
                                                <th 
                                                    key={columnId}
                                                    className={`${column.className} font-medium text-[var(--color-text-secondary)] cursor-move select-none ${draggedColumn === columnId ? 'opacity-50' : ''} ${isLastColumn ? '!border-r-0' : ''}`}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, columnId)}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, columnId)}
                                                    onDragEnd={handleDragEnd}
                                                    title="Drag to reorder columns"
                                                >
                                                    {column.title}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCampaigns.map(campaign => (
                                        <tr key={campaign.campaign.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                                            {columnOrder.map((columnId, index) => {
                                                const column = columns[columnId as keyof typeof columns];
                                                const isLastColumn = index === columnOrder.length - 1;
                                                return (
                                                    <td 
                                                        key={`${campaign.campaign.id}-${columnId}`} 
                                                        className={`py-4 px-4 text-center border-r border-[var(--color-border)] ${isLastColumn ? '!border-r-0' : ''}`}
                                                    >
                                                        <div className="flex items-center justify-center">
                                                            {renderCellContent(columnId, campaign)}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Budget Allocation Notes Section */}
                {allocationNotes.length > 0 && (
                    <div className="mt-8 bg-[var(--color-card-bg)] p-6 rounded-lg border border-[var(--color-border)]">
                        <h3 className="text-xl font-semibold mb-4">Budget Allocation Notes</h3>
                        <div className="bg-[var(--color-bg-primary)] p-4 rounded border border-[var(--color-border)] max-h-48 overflow-y-auto">
                            <div className="space-y-2">
                                {allocationNotes.map((note, index) => (
                                    <div key={index} className="text-[var(--color-text-primary)] text-sm p-2 bg-[var(--color-bg-secondary)] rounded border">
                                        {note}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => setAllocationNotes([])}
                            className="mt-3 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            Clear Notes
                        </button>
                    </div>
                )}

                {/* Log Section */}
                <div className="mt-8 bg-[var(--color-card-bg)] p-6 rounded-lg border border-[var(--color-border)]">
                    <h3 className="text-xl font-semibold mb-4">Log</h3>
                    <div className="bg-[var(--color-bg-primary)] p-4 rounded border border-[var(--color-border)] h-64 overflow-y-auto">
                        {log.length === 0 ? (
                            <div className="text-[var(--color-text-secondary)] text-sm">
                                Ready to start...
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {log.map((entry, index) => (
                                    <div key={index} className="text-[var(--color-text-primary)] text-sm font-mono">
                                        {entry}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Budget Allocation Modal */}
                {showAllocationModal && budgetAllocationAnalysis && budgetAllocationAnalysis.recommendation && (() => {
                    const { recommendation } = budgetAllocationAnalysis;
                    
                    const applyAllocation = async () => {
                        setIsLoading(true);
                        const timestamp = new Date().toLocaleString();
                        
                        addToLog('Applying budget allocation changes...');
                        
                        try {
                            // Calculate budget adjustments for each campaign
                            const fromCampaignAdjustments = recommendation.fromCampaigns.map(campaign => {
                                const currentBudget = campaign.campaignBudget.amountMicros / 1000000;
                                const reductionPerCampaign = recommendation.shiftAmount / recommendation.fromCampaigns.length;
                                const newBudget = currentBudget - reductionPerCampaign;
                                return { campaign, currentBudget, newBudget, change: -reductionPerCampaign };
                            });
                            
                            const toCampaignAdjustments = recommendation.toCampaigns.map(campaign => {
                                const currentBudget = campaign.campaignBudget.amountMicros / 1000000;
                                const increasePerCampaign = recommendation.shiftAmount / recommendation.toCampaigns.length;
                                const newBudget = currentBudget + increasePerCampaign;
                                return { campaign, currentBudget, newBudget, change: increasePerCampaign };
                            });
                            
                            // Apply budget changes
                            for (const adjustment of [...fromCampaignAdjustments, ...toCampaignAdjustments]) {
                                if (adjustment.newBudget > 0) {
                                    await updateCampaignBudget(adjustment.campaign.campaign.id, adjustment.newBudget);
                                    addToLog(`✓ ${adjustment.campaign.campaign.name}: $${adjustment.currentBudget.toFixed(2)} → $${adjustment.newBudget.toFixed(2)} (${adjustment.change >= 0 ? '+' : ''}${adjustment.change.toFixed(2)})`);
                                }
                            }
                            
                            // Add to notes
                            const noteText = `${timestamp}: Shifted $${recommendation.shiftAmount.toFixed(2)} (10%) from ${recommendation.fromCategory} (ROAS: ${recommendation.fromROAS.toFixed(2)}) to ${recommendation.toCategory} (ROAS: ${recommendation.toROAS.toFixed(2)})`;
                            setAllocationNotes(prev => [noteText, ...prev]);
                            
                            addToLog('Budget allocation applied successfully');
                            setShowAllocationModal(false);
                        } catch (error) {
                            addToLog(`Error applying budget allocation: ${error}`);
                        } finally {
                            setIsLoading(false);
                        }
                    };

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                            <div className="bg-slate-800 p-8 rounded-lg border border-slate-600 w-[700px] max-h-[80vh] overflow-y-auto">
                                <h3 className="text-2xl font-semibold mb-6 text-white">Budget Allocation Recommendation</h3>
                                
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    {/* From Category */}
                                    <div className="bg-red-900/20 border border-red-600 p-4 rounded">
                                        <h4 className="text-lg font-semibold text-red-300 mb-3">
                                            {recommendation.fromCategory.toUpperCase()} (Lower Performance)
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-300">ROAS:</span>
                                                <span className="text-red-300 font-semibold">{recommendation.fromROAS.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-300">Budget Reduction:</span>
                                                <span className="text-red-300 font-semibold">-${recommendation.shiftAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-300">Campaigns:</span>
                                                <span className="text-slate-300">{recommendation.fromCampaigns.length}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* To Category */}
                                    <div className="bg-green-900/20 border border-green-600 p-4 rounded">
                                        <h4 className="text-lg font-semibold text-green-300 mb-3">
                                            {recommendation.toCategory.toUpperCase()} (Higher Performance)
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-300">ROAS:</span>
                                                <span className="text-green-300 font-semibold">{recommendation.toROAS.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-300">Budget Increase:</span>
                                                <span className="text-green-300 font-semibold">+${recommendation.shiftAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-300">Campaigns:</span>
                                                <span className="text-slate-300">{recommendation.toCampaigns.length}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Campaign Details */}
                                <div className="bg-slate-700 p-4 rounded border border-slate-600 mb-6">
                                    <h4 className="font-semibold text-white mb-3">Campaign Budget Changes</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h5 className="text-sm font-medium text-red-300 mb-2">Reducing ({recommendation.fromCategory}):</h5>
                                            {recommendation.fromCampaigns.map(campaign => {
                                                const currentBudget = campaign.campaignBudget.amountMicros / 1000000;
                                                const reduction = recommendation.shiftAmount / recommendation.fromCampaigns.length;
                                                const newBudget = currentBudget - reduction;
                                                return (
                                                    <div key={campaign.campaign.id} className="text-xs text-slate-300 mb-1">
                                                        {campaign.campaign.name}: ${currentBudget.toFixed(2)} → ${newBudget.toFixed(2)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        
                                        <div>
                                            <h5 className="text-sm font-medium text-green-300 mb-2">Increasing ({recommendation.toCategory}):</h5>
                                            {recommendation.toCampaigns.map(campaign => {
                                                const currentBudget = campaign.campaignBudget.amountMicros / 1000000;
                                                const increase = recommendation.shiftAmount / recommendation.toCampaigns.length;
                                                const newBudget = currentBudget + increase;
                                                return (
                                                    <div key={campaign.campaign.id} className="text-xs text-slate-300 mb-1">
                                                        {campaign.campaign.name}: ${currentBudget.toFixed(2)} → ${newBudget.toFixed(2)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <button
                                        onClick={applyAllocation}
                                        disabled={isLoading}
                                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? 'Applying Changes...' : 'Apply Budget Allocation'}
                                    </button>
                                    <button
                                        onClick={() => setShowAllocationModal(false)}
                                        disabled={isLoading}
                                        className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Recommendation Summary Modal */}
                {showRecommendationSummary && (() => {
                    const budgetIncrease = budgetStatusForClient && totalBudget > 0 ? 
                        budgetStatusForClient.recDailyBudget - totalBudget : 0;
                    
                    const pmaxRecommendations = campaigns.filter(campaign => {
                        const campaignName = campaign.campaign.name.toLowerCase();
                        return campaignName.includes('perf max') || campaignName.includes('pmax') || campaignName.includes('performance max');
                    }).map(campaign => {
                        const percentOfTotal = totalCost > 0 ? ((campaign.metrics.costMicros / 1000000) / totalCost) * 100 : 0;
                        const campaignIncrease = (budgetIncrease * percentOfTotal) / 100;
                        const currentBudget = campaign.campaignBudget.amountMicros / 1000000;
                        // Always round UP to nearest dollar for increases
                        const roundedIncrease = campaignIncrease > 0 ? Math.ceil(campaignIncrease) : campaignIncrease;
                        const newBudget = currentBudget + roundedIncrease;
                        
                        return {
                            id: campaign.campaign.id,
                            name: campaign.campaign.name,
                            currentBudget,
                            newBudget,
                            increase: roundedIncrease
                        };
                    }).filter(rec => rec.increase > 0);

                    const applyAllRecommendations = async () => {
                        setIsLoading(true);
                        addToLog('Applying budget recommendations...');

                        for (const rec of pmaxRecommendations) {
                            try {
                                await updateCampaignBudget(rec.id, rec.newBudget);
                                addToLog(`✓ Updated ${rec.name}: $${rec.currentBudget.toFixed(2)} → $${rec.newBudget.toFixed(2)}`);
                            } catch (error) {
                                addToLog(`✗ Failed to update ${rec.name}: ${error}`);
                            }
                        }

                        addToLog('Budget recommendations applied. Refreshing campaign data...');
                        setShowRecommendationSummary(false);

                        // Refetch campaigns to show updated budgets
                        await fetchCampaigns();

                        setIsLoading(false);
                        addToLog('✓ Campaign data refreshed');
                    };

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                            <div className="bg-slate-800 p-8 rounded-lg border border-slate-600 w-[600px] max-h-[80vh] overflow-y-auto">
                                <h3 className="text-2xl font-semibold mb-6 text-white">Apply Budget Recommendations</h3>
                                <p className="text-slate-300 mb-6">
                                    The following Performance Max campaigns will have their budgets updated:
                                </p>
                                
                                <div className="space-y-4 mb-6">
                                    {pmaxRecommendations.map(rec => (
                                        <div key={rec.id} className="bg-slate-700 p-4 rounded border border-slate-600">
                                            <div className="font-semibold text-white mb-2">{rec.name}</div>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <span className="text-slate-400">Current:</span>
                                                    <div className="text-white font-semibold">${rec.currentBudget.toFixed(2)}/day</div>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">New Budget:</span>
                                                    <div className="text-green-400 font-semibold">${rec.newBudget.toFixed(2)}/day</div>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">Increase:</span>
                                                    <div className="text-purple-400 font-semibold">+${rec.increase.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="bg-slate-700 p-4 rounded border border-slate-600 mb-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-300">Total Daily Increase:</span>
                                        <span className="text-purple-400 font-bold text-lg">
                                            +${pmaxRecommendations.reduce((sum, rec) => sum + rec.increase, 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <button
                                        onClick={applyAllRecommendations}
                                        disabled={isLoading}
                                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? 'Applying Changes...' : 'Apply All Recommendations'}
                                    </button>
                                    <button
                                        onClick={() => setShowRecommendationSummary(false)}
                                        disabled={isLoading}
                                        className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default GoogleAdsRobotTool;