import React from 'react';
import { GoogleSearchConsoleRecord, TopClickItem, TopQueryItem, AccountDetailsRecord } from '../types';

// Memoize parsing functions to avoid re-computation on every render
const parseTopClicks = (clicksString: string): TopClickItem[] => {
    if (!clicksString) return [];
    const regex = /(.*?),\s*(\d+)\s*clicks,\s*(\d+)\s*impressions/g;
    const matches = [...clicksString.matchAll(regex)];
    return matches.map(match => ({
        page: match[1].trim(),
        clicks: parseInt(match[2], 10),
        impressions: parseInt(match[3], 10)
    }));
};

const parseTopQueries = (queriesString: string): TopQueryItem[] => {
    if (!queriesString) return [];
    const regex = /"(.+?)"\s*,\s*(\d+)\s*clicks,\s*(\d+)\s*impressions/g;
    const matches = [...queriesString.matchAll(regex)];
    return matches.map(match => ({
        query: match[1].trim(),
        clicks: parseInt(match[2], 10),
        impressions: parseInt(match[3], 10)
    }));
};

const PerformanceList: React.FC<{
    title: string;
    items: (TopClickItem | TopQueryItem)[];
    baseUrl?: string;
}> = ({ title, items, baseUrl }) => {
    const isPageList = 'page' in (items[0] || {});

    const constructUrl = (path: string) => {
        if (!baseUrl || baseUrl.trim() === '-' || baseUrl.trim() === '') return undefined;
        try {
            const fullBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
            const url = new URL(path, fullBaseUrl);
            return url.href;
        } catch (e) {
            console.error('Invalid URL:', e);
            return undefined;
        }
    };

    return (
        <div className="bg-black/20 p-4 rounded-lg flex-1 flex flex-col min-h-0">
            <h4 className="font-semibold text-lg text-[var(--color-text-primary)] mb-3 flex-shrink-0">{title}</h4>
            
            <div className="grid grid-cols-[minmax(0,1fr)_5rem_6rem] gap-x-4 text-xs uppercase text-[var(--color-text-secondary)] px-2 pb-2 border-b border-white/10 flex-shrink-0">
                <div className="text-left">{isPageList ? 'Page' : 'Query'}</div>
                <div className="text-right">Clicks</div>
                <div className="text-right">Impressions</div>
            </div>

            {items.length > 0 ? (
                <div className="flex-grow overflow-y-auto mt-1 pr-1">
                    <ul className="divide-y divide-white/10">
                        {items.map((item, index) => {
                            const isClickItem = 'page' in item;
                            const mainText = isClickItem ? item.page : item.query;
                            const linkHref = isClickItem ? constructUrl(item.page) : undefined;

                            return (
                                <li key={index} className="grid grid-cols-[minmax(0,1fr)_5rem_6rem] gap-x-4 items-center p-2 hover:bg-white/5 transition-colors">
                                    <div className="truncate text-left">
                                        {linkHref ? (
                                            <a 
                                                href={linkHref} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-[var(--color-text-accent)] hover:underline"
                                                title={mainText}
                                            >
                                                {mainText}
                                            </a>
                                        ) : (
                                            <span className="text-[var(--color-text-primary)]" title={mainText}>
                                                {mainText}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-right font-medium text-[var(--color-text-primary)]">{item.clicks.toLocaleString()}</div>
                                    <div className="text-right text-[var(--color-text-secondary)]">{item.impressions.toLocaleString()}</div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-center text-[var(--color-text-secondary)]">No data available.</p>
                </div>
            )}
        </div>
    );
};


interface TopOrganicPerformanceTileProps {
    data: GoogleSearchConsoleRecord;
    accountDetails: AccountDetailsRecord | null;
}

const TopOrganicPerformanceTile: React.FC<TopOrganicPerformanceTileProps> = ({ data, accountDetails }) => {
    const topClicks = React.useMemo(() => parseTopClicks(data.Top_10_Clicks), [data.Top_10_Clicks]);
    const topQueries = React.useMemo(() => parseTopQueries(data.Top_10_Queries), [data.Top_10_Queries]);
    
    return (
        <div className="flex flex-col gap-4 h-full p-6 overflow-hidden">
            <PerformanceList
                title="Top Clicks by Page"
                items={topClicks}
                baseUrl={accountDetails?.Website}
            />
            <PerformanceList
                title="Top Search Queries"
                items={topQueries}
            />
        </div>
    );
};

export default TopOrganicPerformanceTile;