import React from 'react';
import { ClientDataRecord, RevolutionLinksRecord, StoreChangesRecord } from '../types';

// Helper to format values
const formatCurrency = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '$0';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};
const formatNumber = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0';
    return value.toLocaleString();
};
const formatPercentage = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0.0%';
    return `${value.toFixed(1)}%`;
};

const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr.toLowerCase() === 'no activity' || dateStr.toLowerCase() === 'n/a') return 'No recent activity';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const monthMap: { [key: string]: number } = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };

interface SnapshotAndLinksTileProps {
    clientData: ClientDataRecord[];
    revolutionLinks: RevolutionLinksRecord | null;
    storeChanges: StoreChangesRecord | null;
}

const DetailItem: React.FC<{ label: string; value: string; icon: string; valueColorClass?: string }> = ({ label, value, icon, valueColorClass = 'text-[var(--color-text-primary)]' }) => (
    <div className="bg-[var(--color-card-bg)] p-4 flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
            <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
            <p className={`font-bold text-xl ${valueColorClass}`}>{value}</p>
        </div>
    </div>
);

const LinkIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
);

const SnapshotAndLinksTile: React.FC<SnapshotAndLinksTileProps> = ({ clientData, revolutionLinks, storeChanges }) => {
    const currentMonthData = React.useMemo(() => {
        if (!clientData || clientData.length === 0) return null;
        const sortedData = [...clientData].sort((a, b) => new Date(b.Year, monthMap[b.Month.substring(0, 3)]).getTime() - new Date(a.Year, monthMap[a.Month.substring(0, 3)]).getTime());
        return sortedData[0] || null;
    }, [clientData]);

    const links = React.useMemo(() => {
        if (!revolutionLinks) return [];
        return [
            { label: 'Pricing', value: revolutionLinks.Pricing, updated: storeChanges?.LastPriceChange },
            { label: 'Shipping', value: revolutionLinks.Shipping, updated: storeChanges?.LastShippingChange },
            { label: 'Checkout', value: revolutionLinks.Checkout, updated: storeChanges?.LastCheckoutChange },
            { label: 'Orders', value: revolutionLinks.Orders },
            { label: 'Products', value: revolutionLinks.Products },
            { label: 'Promotions', value: revolutionLinks.Promotions },
            { label: 'Pages', value: revolutionLinks.Pages },
            { label: 'Layouts', value: revolutionLinks.Layouts },
        ].filter(link => link.value && String(link.value).trim() && String(link.value).trim() !== '-');
    }, [revolutionLinks, storeChanges]);

    const dashboardUrl = revolutionLinks?.Dashboard;

    return (
        <div className="flex h-full">
            {/* Left side: Snapshot */}
            <div className="w-3/5 flex flex-col pr-6">
                {currentMonthData ? (
                    <div className="flex-grow grid grid-cols-2 gap-px bg-[var(--color-border)] rounded-lg overflow-hidden">
                        <DetailItem label="Revenue" icon="💰" value={formatCurrency(currentMonthData.Revenue)} />
                        <DetailItem label="Orders" icon="📦" value={formatNumber(currentMonthData.Orders)} />
                        <DetailItem label="Profit" icon="💵" value={formatCurrency(currentMonthData.Profit)} valueColorClass="text-[var(--color-positive)]" />
                        <DetailItem label="Canceled" icon="❌" value={formatPercentage(currentMonthData.Canceled)} valueColorClass="text-[var(--color-negative)]" />
                    </div>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-center text-[var(--color-text-secondary)] bg-[var(--color-card-bg)] rounded-lg">
                        <p>No performance data available.</p>
                    </div>
                )}
                {dashboardUrl && dashboardUrl.trim() && dashboardUrl.trim() !== '-' && (
                    <div className="pt-3 mt-auto text-center">
                        <a href={dashboardUrl.startsWith('http') ? dashboardUrl : `https://${dashboardUrl}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[var(--color-text-accent)] hover:brightness-90 inline-flex items-center gap-1.5">
                            View Revolution Dashboard
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="w-px bg-[var(--color-border)] my-2"></div>

            {/* Right side: Links */}
            <div className="w-2/5 pl-6 flex flex-col">
                <h4 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3 flex-shrink-0">Quick Links</h4>
                <div className="overflow-y-auto pr-2">
                    <ul className="space-y-3">
                        {links.map(link => (
                             <li key={link.label}>
                                <a href={String(link.value).startsWith('http') ? String(link.value) : `https://${link.value}`} target="_blank" rel="noopener noreferrer" className="block p-2 -m-2 rounded-lg hover:bg-black/20 transition-colors group">
                                    <div className="flex items-center justify-between text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-text-accent)]">
                                        <span>{link.label}</span>
                                        <LinkIcon />
                                    </div>
                                    {link.updated && (
                                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                                            Updated: {formatDate(link.updated)}
                                        </p>
                                    )}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SnapshotAndLinksTile;