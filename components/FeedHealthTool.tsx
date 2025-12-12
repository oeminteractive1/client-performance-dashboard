import React, { useState, useEffect, useMemo } from 'react';
import { AccountDetailsRecord, AllFeedStatusData, AllPercentApprovedData, AllRevolutionLinksData, AllItemsInFeedData, ItemsInFeedDataPoint, Theme, FeedHealthToolState } from '../types';
import FeedStatusTile from './FeedStatusTile';
import ChartGridItem from './ChartGridItem';
import ChartWrapper from './ChartWrapper';

// Hardcoded Google Sheets info for fetching brand/title data
const API_KEY = 'AIzaSyC-XMGjEXrs4m9LU4wy1blZ9zdULZdILAo';
const TITLES_SHEET_ID = '1fKgY7FsrBXBdoz0lEIo67yTmvXmA7c_ciQ8q_fSFCHs';

// Generic fetcher for fetching brand data
const genericSheetFetcher = async (sheetId: string, range: string) => {
    const encodedRange = encodeURIComponent(range);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}?key=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Sheets API Error: ${errorData?.error?.message || `HTTP error! status: ${response.status}`}. Please check restrictions, permissions, ID, and Name/Range.`);
    }

    const json = await response.json();
    return json.values || [];
};

const formatValue = (value: number, type: 'number') => {
    if (isNaN(value) || !isFinite(value)) value = 0;
    switch (type) {
        case 'number': return value.toLocaleString();
    }
};

type TimeRange = '3m' | '6m' | '12m' | '24m';
type DropTimeFrame = '7d' | '14d' | '1m' | '2m';

const getFeedStatus = (lastUpdate: Date | 'Never'): 'Fresh' | 'Stale' | 'Old' | 'Never' => {
    if (lastUpdate === 'Never') {
        return 'Never';
    }
    const now = new Date();
    const diffHours = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    const fifteenDaysInHours = 15 * 24;
    const thirtyDaysInHours = 30 * 24;

    if (diffHours <= fifteenDaysInHours) {
        return 'Fresh';
    } else if (diffHours <= thirtyDaysInHours) {
        return 'Stale';
    } else {
        return 'Old';
    }
};

const getTimeFrameLabel = (timeFrame: DropTimeFrame): string => {
    switch (timeFrame) {
        case '7d': return '1 Week';
        case '14d': return '2 Weeks';
        case '1m': return '1 Month';
        case '2m': return '2 Months';
        default: return '';
    }
};

interface FeedHealthToolProps {
    allAccountDetails: AccountDetailsRecord[];
    allFeedStatusData: AllFeedStatusData;
    allPercentApprovedData: AllPercentApprovedData;
    allRevolutionLinksData: AllRevolutionLinksData;
    allItemsInFeedData: AllItemsInFeedData;
    theme: Theme;
    toolState: FeedHealthToolState;
    onStateChange: (newState: Partial<FeedHealthToolState>) => void;
}

const FeedHealthTool: React.FC<FeedHealthToolProps> = ({ allAccountDetails, allFeedStatusData, allPercentApprovedData, allRevolutionLinksData, allItemsInFeedData, theme, toolState, onStateChange }) => {
    const [brands, setBrands] = useState<string[]>([]);
    const [isLoadingBrands, setIsLoadingBrands] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { selectedBrand, itemsInFeedTimeRange, dropThreshold, dropTimeFrame, approvalThreshold } = toolState;


    // Fetch brands for the dropdown on component mount
    useEffect(() => {
        const fetchBrands = async () => {
            setIsLoadingBrands(true);
            setError(null);
            try {
                const brandData = await genericSheetFetcher(TITLES_SHEET_ID, 'IDdatabase!A2:A');
                const brandList = brandData.map((row: string[]) => row[0]).filter(Boolean).sort();
                setBrands(brandList);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch brands from Google Sheets.');
                console.error(err);
            } finally {
                setIsLoadingBrands(false);
            }
        };

        fetchBrands();
    }, []);
    
    // --- Memos for the Warning Section ---
    const clientsWithOldFeeds = useMemo(() => {
        const clientNames = Object.keys(allFeedStatusData).filter(clientName => {
            const clientStatus = allFeedStatusData[clientName];
            return clientStatus.feeds.some(feed => getFeedStatus(feed.lastUpdate) === 'Old');
        });
        return allAccountDetails.filter(client => clientNames.includes(client.ClientName));
    }, [allFeedStatusData, allAccountDetails]);

    const clientsWithItemDrops = useMemo(() => {
        const daysAgo = (() => {
            switch (dropTimeFrame) {
                case '7d': return 7;
                case '1m': return 30;
                case '2m': return 60;
                case '14d': default: return 14;
            }
        })();
    
        const clientNames = Object.keys(allItemsInFeedData).filter(clientName => {
            const data = allItemsInFeedData[clientName]?.timeline;
    
            if (dropThreshold === -1) {
                return data && data.length > 0; // Show all clients with any item data
            }
            
            if (!data || data.length < daysAgo) return false;
    
            const latestPoint = data[data.length - 1];
            const latestDate = latestPoint.date.getTime();
            const comparisonTimestamp = latestDate - (daysAgo * 24 * 60 * 60 * 1000);
    
            // Find the point closest to the comparison date
            const comparisonPoint = data.reduce((prev, curr) =>
                Math.abs(curr.date.getTime() - comparisonTimestamp) < Math.abs(prev.date.getTime() - comparisonTimestamp)
                ? curr : prev
            );
            
            if (comparisonPoint && comparisonPoint.count > 100) { // Avoid flagging small, insignificant drops
                const change = (latestPoint.count - comparisonPoint.count) / comparisonPoint.count;
                return change <= -dropThreshold;
            }
    
            return false;
        });
    
        return allAccountDetails.filter(client => clientNames.includes(client.ClientName));
    }, [allItemsInFeedData, allAccountDetails, dropThreshold, dropTimeFrame]);
    
    const clientsWithLowApproval = useMemo(() => {
        const clientNames = Object.keys(allPercentApprovedData).filter(clientName => {
            const records = allPercentApprovedData[clientName];
            if (!records || records.length === 0) return false;

            // Data is sorted by date, last record is the latest
            const latestRecord = records[records.length - 1];
            return latestRecord.percentApproved < approvalThreshold * 100;
        });

        return allAccountDetails.filter(client => clientNames.includes(client.ClientName));
    }, [allPercentApprovedData, allAccountDetails, approvalThreshold]);


    // --- Memos for the Brand-Specific View ---
    const matchingClients = useMemo(() => {
        if (!selectedBrand) return [];
        return allAccountDetails.filter(client =>
            client.Brands && client.Brands.toLowerCase().includes(selectedBrand.toLowerCase())
        );
    }, [selectedBrand, allAccountDetails]);
    
    const clientsWithItemsInFeed = useMemo(() => {
        return matchingClients.filter(c => allItemsInFeedData[c.ClientName]?.timeline && allItemsInFeedData[c.ClientName].timeline.length > 0);
    }, [matchingClients, allItemsInFeedData]);

    const maxYValueForItemsInFeed = useMemo(() => {
        if (clientsWithItemsInFeed.length === 0) return undefined;

        let daysToShow: number;
        switch (itemsInFeedTimeRange) {
            case '3m': daysToShow = 90; break;
            case '6m': daysToShow = 180; break;
            case '24m': daysToShow = 730; break;
            case '12m': default: daysToShow = 365; break;
        }

        let maxCount = 0;
        clientsWithItemsInFeed.forEach(client => {
            const clientItemsData = allItemsInFeedData[client.ClientName]?.timeline;
            if (clientItemsData) {
                const slicedData = clientItemsData.slice(-daysToShow);
                const localMax = Math.max(...slicedData.map(d => d.count), 0);
                if (localMax > maxCount) {
                    maxCount = localMax;
                }
            }
        });
        
        if (maxCount === 0) return undefined;

        // Round up to the nearest 5,000
        return Math.ceil(maxCount / 5000) * 5000;

    }, [clientsWithItemsInFeed, allItemsInFeedData, itemsInFeedTimeRange]);

    if (allAccountDetails.length === 0 || Object.keys(allFeedStatusData).length === 0) {
        return <div className="text-center p-8 bg-black/20 rounded-lg"><h2 className="text-xl font-semibold mb-2">Data Required</h2><p className="text-[var(--color-text-secondary)]">Please load Client Info and Feed Status data to use this tool.</p></div>;
    }

    return (
        <section className="flex flex-col gap-8">
            <div className="bg-[var(--color-card-bg)] backdrop-blur-sm rounded-xl border border-[var(--color-border)] shadow-lg p-6">
                <label htmlFor="brand-selector" className="block text-xl font-bold text-[var(--color-text-primary)] mb-4 text-center">🩺 Select a Brand to Compare</label>
                {isLoadingBrands ? (
                    <div className="text-center py-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-accent)] mx-auto"></div></div>
                ) : (
                    <select
                        id="brand-selector"
                        value={selectedBrand}
                        onChange={e => onStateChange({ selectedBrand: e.target.value })}
                        disabled={isLoadingBrands || brands.length === 0}
                        className="w-full max-w-md mx-auto bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5"
                    >
                        <option value="">-- View Warnings or Select a Brand --</option>
                        {brands.length > 0 ? (
                            brands.map(brand => <option key={brand} value={brand}>{brand}</option>)
                        ) : (
                            <option disabled>No brands found</option>
                        )}
                    </select>
                )}
                 {error && <div className="bg-[var(--color-negative-bg)] border border-[var(--color-negative)] text-[var(--color-negative)] p-3 rounded-lg text-sm text-center mt-4 w-full max-w-md mx-auto" role="alert">{error}</div>}
            </div>
            
            {!selectedBrand ? (
                // --- WARNING SECTION ---
                <div className="mt-8">
                    <h2 className="text-3xl text-center font-bold mb-8 text-[var(--color-text-primary)]">⚠️ Warning Section</h2>
                    {clientsWithOldFeeds.length === 0 && clientsWithItemDrops.length === 0 && clientsWithLowApproval.length === 0 ? (
                         <div className="text-center p-8 bg-black/20 rounded-lg">
                            <h2 className="text-2xl font-semibold mb-2">✅ All Clear!</h2>
                            <p className="text-[var(--color-text-secondary)] text-lg">No major issues detected. All feeds are fresh, approval rates are high, and no significant item drops were found.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-12">
                             {clientsWithLowApproval.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-center flex-wrap gap-4 mb-6">
                                        <h3 className="text-2xl text-center font-semibold text-[var(--color-text-primary)]">
                                            {approvalThreshold > 1 ? 'All Client Feed Approvals' : 'Feed Approval Below Threshold'}
                                        </h3>
                                        <select
                                            value={approvalThreshold}
                                            onChange={e => onStateChange({ approvalThreshold: parseFloat(e.target.value) })}
                                            className="text-sm bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-1.5"
                                            aria-label="Select feed approval threshold"
                                        >
                                            <option value={1.01}>No Threshold (Show All)</option>
                                            <option value={0.95}>&lt; 95%</option>
                                            <option value={0.90}>&lt; 90%</option>
                                            <option value={0.85}>&lt; 85%</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {clientsWithLowApproval.map(client => {
                                            const clientName = client.ClientName;
                                            const feedStatus = allFeedStatusData[clientName];
                                            const percentApprovedRecords = allPercentApprovedData[clientName];
                                            const revolutionLinks = allRevolutionLinksData[clientName];
                                            const latestPercentApproved = percentApprovedRecords && percentApprovedRecords.length > 0 ? percentApprovedRecords[percentApprovedRecords.length - 1] : null;
                                            if (!feedStatus) return null;
                                            return (
                                                <div key={`${clientName}-low-approval`} style={{minHeight: '350px'}}>
                                                    <ChartGridItem title={clientName}>
                                                        <FeedStatusTile feedStatus={feedStatus} percentApprovedData={latestPercentApproved} accountDetails={client} revolutionLinks={revolutionLinks} />
                                                    </ChartGridItem>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {clientsWithOldFeeds.length > 0 && (
                                <div>
                                    <h3 className="text-2xl text-center font-semibold mb-6 text-[var(--color-text-primary)]">Feeds Older Than 30 Days</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {clientsWithOldFeeds.map(client => {
                                            const clientName = client.ClientName;
                                            const feedStatus = allFeedStatusData[clientName];
                                            const percentApprovedRecords = allPercentApprovedData[clientName];
                                            const revolutionLinks = allRevolutionLinksData[clientName];
                                            const latestPercentApproved = percentApprovedRecords && percentApprovedRecords.length > 0 ? percentApprovedRecords[percentApprovedRecords.length - 1] : null;
                                            if (!feedStatus) return null;
                                            return (
                                                <div key={`${clientName}-old-feed`} style={{minHeight: '350px'}}>
                                                    <ChartGridItem title={clientName}>
                                                        <FeedStatusTile feedStatus={feedStatus} percentApprovedData={latestPercentApproved} accountDetails={client} revolutionLinks={revolutionLinks} />
                                                    </ChartGridItem>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                             {clientsWithItemDrops.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-center flex-wrap gap-4 mb-6">
                                        <h3 className="text-2xl text-center font-semibold text-[var(--color-text-primary)]">
                                            {dropThreshold === -1 ? 'All Item Counts' : 'Significant Item Count Drops'} (Last {getTimeFrameLabel(dropTimeFrame)})
                                        </h3>
                                        <div className="flex items-center gap-4">
                                            <select 
                                                value={dropThreshold} 
                                                onChange={e => onStateChange({ dropThreshold: parseFloat(e.target.value) })}
                                                className="text-sm bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-1.5"
                                                aria-label="Select item drop alert threshold"
                                            >
                                                <option value={-1}>No Threshold (Show All)</option>
                                                <option value={0.05}>&darr; 5%</option>
                                                <option value={0.10}>&darr; 10%</option>
                                                <option value={0.15}>&darr; 15%</option>
                                                <option value={0.20}>&darr; 20%</option>
                                                <option value={0.25}>&darr; 25%</option>
                                            </select>
                                            <select 
                                                value={dropTimeFrame} 
                                                onChange={e => onStateChange({ dropTimeFrame: e.target.value as DropTimeFrame })}
                                                className="text-sm bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-1.5"
                                                aria-label="Select item drop time frame"
                                            >
                                                <option value="7d">1 Week</option>
                                                <option value="14d">2 Weeks</option>
                                                <option value="1m">1 Month</option>
                                                <option value="2m">2 Months</option>
                                            </select>
                                        </div>
                                    </div>
                                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {clientsWithItemDrops.map(client => {
                                            const clientItemsData = allItemsInFeedData[client.ClientName]?.timeline;
                                            if (!clientItemsData) return null;

                                            const slicedData = clientItemsData.slice(-90); // Show 3 months of data for context
                                            const chartData = { labels: slicedData.map(d => d.date.toLocaleDateString('en-CA')), datasets: [{ label: 'Item Count', data: slicedData.map(d => d.count), borderColor: theme.colors['--color-accent-secondary'], backgroundColor: `${theme.colors['--color-accent-secondary']}20`, borderWidth: 2, fill: true, tension: 0.4 }] };
                                            const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: theme.colors['--color-text-secondary'], callback: (v: any) => formatValue(v, 'number') }, grid: { color: theme.colors['--color-border'] } }, x: { ticks: { color: theme.colors['--color-text-secondary'], maxTicksLimit: 10 }, grid: { display: false } } } };
                                            
                                            return (
                                                <div key={`${client.ClientName}-item-drop`} style={{ minHeight: '350px' }}>
                                                    <ChartGridItem title={client.ClientName}>
                                                        <ChartWrapper type="line" data={chartData} options={chartOptions} />
                                                    </ChartGridItem>
                                                </div>
                                            );
                                        })}
                                     </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                // --- BRAND-SPECIFIC VIEW ---
                <div className="mt-8">
                    <h2 className="text-2xl text-center font-semibold mb-6 text-[var(--color-text-primary)]">Feed Health Comparison</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {matchingClients.length > 0 ? (
                            matchingClients.map(client => {
                                const clientName = client.ClientName;
                                const feedStatus = allFeedStatusData[clientName];
                                const percentApprovedRecords = allPercentApprovedData[clientName];
                                const revolutionLinks = allRevolutionLinksData[clientName];
                                const latestPercentApproved = percentApprovedRecords && percentApprovedRecords.length > 0 ? percentApprovedRecords[percentApprovedRecords.length - 1] : null;
                                if (!feedStatus) return null;

                                const approvalDate = latestPercentApproved?.date;
                                const feedsDateForHeader = feedStatus?.lastChecked;
                                const feedStatusHeaderControls = (approvalDate || feedsDateForHeader) ? (
                                    <div className="space-y-1 text-xs text-[var(--color-text-secondary)] text-right">
                                        {approvalDate && <div>Approval: <span className="font-semibold text-[var(--color-text-primary)]">{approvalDate.toLocaleDateString()}</span></div>}
                                        {feedsDateForHeader && <div>Feeds: <span className="font-semibold text-[var(--color-text-primary)]">{feedsDateForHeader.toLocaleDateString()}</span></div>}
                                    </div>
                                ) : null;

                                return (
                                    <div key={clientName} style={{minHeight: '350px'}}>
                                        <ChartGridItem title={clientName} headerControls={feedStatusHeaderControls}>
                                            <FeedStatusTile feedStatus={feedStatus} percentApprovedData={latestPercentApproved} accountDetails={client} revolutionLinks={revolutionLinks} />
                                        </ChartGridItem>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-full text-center p-8 bg-black/20 rounded-lg">
                                <h2 className="text-xl font-semibold mb-2">No Clients Found</h2>
                                <p className="text-[var(--color-text-secondary)]">No clients are associated with the brand "{selectedBrand}".</p>
                            </div>
                        )}
                    </div>
                    <div className="mt-12">
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <h2 className="text-2xl text-center font-semibold text-[var(--color-text-primary)]">Items in Feed Comparison</h2>
                            <select value={itemsInFeedTimeRange} onChange={(e) => onStateChange({ itemsInFeedTimeRange: e.target.value as TimeRange })} aria-label="Select time range for items in feed charts" className="text-sm bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-1.5">
                                <option value="3m">3 Months</option>
                                <option value="6m">6 Months</option>
                                <option value="12m">12 Months</option>
                                <option value="24m">2 Years</option>
                            </select>
                        </div>
                        {clientsWithItemsInFeed.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {clientsWithItemsInFeed.map(client => {
                                    const clientItemsData = allItemsInFeedData[client.ClientName]?.timeline;
                                    if (!clientItemsData || clientItemsData.length === 0) return null;

                                    let daysToShow: number;
                                    switch (itemsInFeedTimeRange) {
                                        case '3m': daysToShow = 90; break;
                                        case '6m': daysToShow = 180; break;
                                        case '24m': daysToShow = 730; break;
                                        case '12m': default: daysToShow = 365; break;
                                    }
                                    const slicedData = clientItemsData.slice(-daysToShow);
                                    if (slicedData.length === 0) return null;
                                    
                                    const chartData = { labels: slicedData.map(d => d.date.toLocaleDateString('en-CA')), datasets: [{ label: 'Item Count', data: slicedData.map(d => d.count), borderColor: theme.colors['--color-accent-secondary'], backgroundColor: `${theme.colors['--color-accent-secondary']}20`, borderWidth: 2, fill: true, tension: 0.4 }] };
                                    const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: maxYValueForItemsInFeed, ticks: { color: theme.colors['--color-text-secondary'], callback: (v: any) => formatValue(v, 'number') }, grid: { color: theme.colors['--color-border'] } }, x: { ticks: { color: theme.colors['--color-text-secondary'], maxTicksLimit: 10 }, grid: { display: false } } } };
                                    
                                    return (
                                        <div key={`${client.ClientName}-items-feed`} style={{ minHeight: '350px' }}>
                                            <ChartGridItem title={client.ClientName}>
                                                <ChartWrapper type="line" data={chartData} options={chartOptions} />
                                            </ChartGridItem>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                             <div className="col-span-full text-center p-8 bg-black/20 rounded-lg">
                                <p className="text-[var(--color-text-secondary)]">No "Items in Feed" data available for any clients associated with "{selectedBrand}".</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

export default FeedHealthTool;
