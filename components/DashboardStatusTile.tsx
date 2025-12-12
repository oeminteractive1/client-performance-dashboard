
import React from 'react';
import { ClientDataRecord, AccountDetailsRecord } from '../types';

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

// Map month names to numbers for date creation
const monthMap: { [key: string]: number } = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };


interface DashboardStatusTileProps {
    clientData: ClientDataRecord[];
    accountDetails: AccountDetailsRecord | null;
    dashboardUrl?: string;
}

const DetailItem: React.FC<{ label: string; value: string; icon: string; valueColorClass?: string }> = ({ label, value, icon, valueColorClass = 'text-[var(--color-text-primary)]' }) => (
    <div className="bg-[var(--color-card-bg)] p-4 flex items-center gap-4 h-full">
        <span className="text-2xl">{icon}</span>
        <div>
            <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
            <p className={`font-bold text-xl ${valueColorClass}`}>{value}</p>
        </div>
    </div>
);

const LinkIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
);


const DashboardStatusTile: React.FC<DashboardStatusTileProps> = ({ clientData, accountDetails, dashboardUrl }) => {
    // Find data for the current month
    const currentMonthData = React.useMemo(() => {
        if (!clientData || clientData.length === 0) return null;
        
        // Sort data descending by date to easily find the latest record
        const sortedData = [...clientData].sort((a, b) => 
            new Date(b.Year, monthMap[b.Month.substring(0, 3)]).getTime() - 
            new Date(a.Year, monthMap[a.Month.substring(0, 3)]).getTime()
        );

        // The first record is the most recent one.
        return sortedData[0] || null;
    }, [clientData]);

    return (
        <div className="flex flex-col h-full">
            {currentMonthData ? (
                <div className="flex-grow grid grid-cols-2 gap-px bg-[var(--color-border)] rounded-lg overflow-hidden">
                    <DetailItem 
                        label="Revenue" 
                        icon="💰" 
                        value={formatCurrency(currentMonthData.Revenue)} 
                    />
                    <DetailItem 
                        label="Orders" 
                        icon="📦" 
                        value={formatNumber(currentMonthData.Orders)} 
                    />
                    <DetailItem 
                        label="Profit" 
                        icon="💵" 
                        value={formatCurrency(currentMonthData.Profit)} 
                        valueColorClass="text-[var(--color-positive)]"
                    />
                    <DetailItem 
                        label="Canceled" 
                        icon="❌" 
                        value={formatPercentage(currentMonthData.Canceled)} 
                        valueColorClass="text-[var(--color-negative)]"
                    />
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center text-center text-[var(--color-text-secondary)] h-full">
                    <p>No performance data available for the current month.</p>
                </div>
            )}
             {dashboardUrl && dashboardUrl.trim() && dashboardUrl.trim() !== '-' && (
                <div className="pt-3 mt-3 border-t border-[var(--color-border)] text-center">
                    <a
                        href={dashboardUrl.startsWith('http') ? dashboardUrl : `https://${dashboardUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-[var(--color-text-accent)] hover:brightness-90 inline-flex items-center gap-1.5"
                    >
                        View Revolution Dashboard <LinkIcon />
                    </a>
                </div>
            )}
        </div>
    );
};

export default DashboardStatusTile;