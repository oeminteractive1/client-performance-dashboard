


import React from 'react';
import { RevolutionLinksRecord, StoreChangesRecord } from '../types';

const LinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
);

const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr.toLowerCase() === 'no activity' || dateStr.toLowerCase() === 'n/a') return 'No recent activity';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString();
};

const LinkItem: React.FC<{ label: string; value: string; lastUpdated?: string }> = ({ label, value, lastUpdated }) => {
    return (
        <a 
            href={String(value).startsWith('http') ? String(value) : `https://${value}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="bg-black/20 p-4 rounded-lg flex items-center gap-4 hover:bg-black/30 transition-colors h-full"
        >
            <div className="flex-1">
                <p className="font-bold text-xl text-[var(--color-text-primary)] inline-flex items-center gap-2">{label} <LinkIcon /></p>
                {lastUpdated !== undefined && <p className="text-xs text-[var(--color-text-secondary)] mt-1">Last Updated: {formatDate(lastUpdated)}</p>}
            </div>
        </a>
    );
};

interface RevolutionLinksTileProps {
    revolutionLinks: RevolutionLinksRecord | null;
    storeChanges: StoreChangesRecord | null;
}

const RevolutionLinksTile: React.FC<RevolutionLinksTileProps> = ({ revolutionLinks, storeChanges }) => {
    if (!revolutionLinks) return null;

    const links = [
        { label: 'Pricing', value: revolutionLinks.Pricing, updated: storeChanges?.LastPriceChange },
        { label: 'Shipping', value: revolutionLinks.Shipping, updated: storeChanges?.LastShippingChange },
        { label: 'Orders', value: revolutionLinks.Orders },
        { label: 'Products', value: revolutionLinks.Products },
        { label: 'Pages', value: revolutionLinks.Pages },
        { label: 'Layouts', value: revolutionLinks.Layouts },
    ].filter(link => link.value && String(link.value).trim() && String(link.value).trim() !== '-');

    if (links.length === 0) return null;

    return (
        <div className="flex-grow flex flex-col justify-center h-full">
            <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                {links.map(link => (
                    <LinkItem key={link.label} label={link.label} value={String(link.value)} lastUpdated={link.updated} />
                ))}
            </div>
        </div>
    );
};

export default RevolutionLinksTile;