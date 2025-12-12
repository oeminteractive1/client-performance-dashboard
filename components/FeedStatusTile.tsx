import React from 'react';
import { FeedStatus, PercentApprovedRecord, AccountDetailsRecord, RevolutionLinksRecord } from '../types';

// Function to determine feed status based on last update time
const getFeedStatusStyle = (lastUpdate: Date | 'Never'): { text: string; colorClass: string; bgColorClass: string } => {
    if (lastUpdate === 'Never') {
        return { text: 'Never', colorClass: 'text-gray-400', bgColorClass: 'bg-gray-700/50' };
    }
    const now = new Date();
    const diffHours = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    const fifteenDaysInHours = 15 * 24;
    const thirtyDaysInHours = 30 * 24;

    if (diffHours <= fifteenDaysInHours) { // <= 15 days is Fresh
        return { text: 'Fresh', colorClass: 'text-green-300', bgColorClass: 'bg-green-500/20' };
    } else if (diffHours <= thirtyDaysInHours) { // > 15 and <= 30 days is Stale
        return { text: 'Stale', colorClass: 'text-[var(--color-warning)]', bgColorClass: 'bg-[var(--color-warning-bg)]' };
    } else { // > 30 days is Old
        return { text: 'Old', colorClass: 'text-red-300', bgColorClass: 'bg-red-500/20' };
    }
};

const RadialProgress: React.FC<{ percentage: number }> = ({ percentage }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const colorClass = percentage >= 95 ? 'text-[var(--color-positive)]' : percentage >= 85 ? 'text-[var(--color-warning)]' : 'text-[var(--color-negative)]';

    return (
        <div className="relative h-32 w-32">
            <svg className="h-full w-full" viewBox="0 0 120 120">
                <circle
                    className="text-[var(--color-border)]"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="60"
                    cy="60"
                />
                <circle
                    className={colorClass}
                    strokeWidth="10"
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
            <span className={`absolute inset-0 flex items-center justify-center text-3xl font-bold ${colorClass}`}>
                {percentage.toFixed(0)}%
            </span>
        </div>
    );
};

const LinkIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
);

interface FeedStatusTileProps {
    feedStatus: FeedStatus;
    percentApprovedData: PercentApprovedRecord | null;
    accountDetails: AccountDetailsRecord | null;
    revolutionLinks: RevolutionLinksRecord | null;
}

const FeedStatusTile: React.FC<FeedStatusTileProps> = ({ feedStatus, percentApprovedData, accountDetails, revolutionLinks }) => {
    const gmcLink = accountDetails?.GMC;
    const feedsLink = revolutionLinks?.Feeds;

    return (
       <div className="flex flex-col h-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow items-center h-full min-h-0">
                {/* Approval Stat Column */}
                <div className="md:col-span-1 flex flex-col items-center justify-center text-center border-r-0 md:border-r border-[var(--color-border)] pr-0 md:pr-6 h-full">
                     {percentApprovedData ? (
                         <div className="flex flex-col items-center gap-4">
                            <RadialProgress percentage={percentApprovedData.percentApproved} />
                            <div className="flex flex-col items-center space-y-2">
                                {gmcLink && gmcLink.trim() && gmcLink.trim() !== '-' && (
                                    <a 
                                        href={gmcLink.startsWith('http') ? gmcLink : `https://${gmcLink}`}
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-sm font-semibold text-[var(--color-text-accent)] hover:brightness-90 inline-flex items-center gap-1.5"
                                    >
                                        GMC <LinkIcon />
                                    </a>
                                )}
                                {feedsLink && feedsLink.trim() && feedsLink.trim() !== '-' && (
                                    <a 
                                        href={feedsLink.startsWith('http') ? feedsLink : `https://${feedsLink}`}
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-sm font-semibold text-[var(--color-text-accent)] hover:brightness-90 inline-flex items-center gap-1.5"
                                    >
                                        Revolution Feeds <LinkIcon />
                                    </a>
                                )}
                            </div>
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center text-center h-full opacity-50">
                            <div className="relative h-32 w-32">
                                <svg className="h-full w-full text-[var(--color-border)]" viewBox="0 0 120 120">
                                    <circle strokeWidth="10" stroke="currentColor" fill="transparent" r="50" cx="60" cy="60" />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold">?</span>
                            </div>
                            <p className="text-sm mt-1">No Data</p>
                        </div>
                    )}
                </div>

                {/* Feeds List Column */}
                <div className="md:col-span-2 max-h-full overflow-y-auto pr-2 space-y-3">
                     {feedStatus.feeds.length > 0 ? (
                        feedStatus.feeds.map((feed, index) => {
                            const statusStyle = getFeedStatusStyle(feed.lastUpdate);
                            return (
                                <div key={index} className="bg-black/20 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-[var(--color-text-primary)] truncate" title={feed.name}>{feed.name}</p>
                                        <p className="text-xs text-[var(--color-text-secondary)]">
                                            Last Update: {feed.lastUpdate instanceof Date ? feed.lastUpdate.toLocaleString() : 'N/A'}
                                        </p>
                                    </div>
                                    <div className={`text-xs font-bold px-3 py-1 rounded-full ${statusStyle.bgColorClass} ${statusStyle.colorClass}`}>
                                        {statusStyle.text}
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-center text-[var(--color-text-secondary)] py-4">No feeds found for this client.</p>
                    )}
                </div>
            </div>
       </div>
    );
};

export default FeedStatusTile;