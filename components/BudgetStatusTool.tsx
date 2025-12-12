
import React, { useMemo } from 'react';
import { AccountDetailsRecord, AllBudgetStatusData, KeyContactRecord, BudgetStatusRecord, BudgetStatusToolState } from '../types';
import ChartGridItem from './ChartGridItem';
import BudgetStatusTile from './BudgetStatusTile';

interface ClientWithBudget extends AccountDetailsRecord {
    budgetInfo: BudgetStatusRecord;
}

interface BudgetStatusToolProps {
    allAccountDetails: AccountDetailsRecord[];
    allBudgetStatusData: AllBudgetStatusData;
    allKeyContactsData: KeyContactRecord[];
    onSelectClient: (clientName: string) => void;
    toolState: BudgetStatusToolState;
    onStateChange: (newState: Partial<BudgetStatusToolState>) => void;
}

const BudgetStatusTool: React.FC<BudgetStatusToolProps> = ({ allAccountDetails, allBudgetStatusData, allKeyContactsData, onSelectClient, toolState, onStateChange }) => {
    const { role: selectedRole, manager: selectedManager, threshold } = toolState;

    const managers = useMemo(() => {
        if (!selectedRole) return [];
        const managerNames = allKeyContactsData
            .map(contact => contact[selectedRole])
            .filter(Boolean) as string[];
        return ['All Clients', ...[...new Set(managerNames)].sort()];
    }, [selectedRole, allKeyContactsData]);

    const clientsToShow = useMemo(() => {
        if (!selectedManager) return [];

        let clientsForManager: AccountDetailsRecord[];

        if (selectedManager === 'All Clients') {
            // Use all clients from the settings sheet that also have budget data.
            clientsForManager = allAccountDetails.filter(client => allBudgetStatusData[client.ClientName]);
        } else {
            const clientNamesForManager = new Set(
                allKeyContactsData
                    .filter(contact => contact[selectedRole as 'PPC' | 'PDM'] === selectedManager)
                    .map(contact => contact.ClientName)
            );
            clientsForManager = allAccountDetails.filter(client => clientNamesForManager.has(client.ClientName));
        }

        const alerts = clientsForManager.map(client => {
            const budgetInfo = allBudgetStatusData[client.ClientName];
            if (!budgetInfo) return null;

            const pacingDifference = Math.abs(budgetInfo.projectedTotalSpend - budgetInfo.targetSpend) / 100.0;
            
            if (pacingDifference >= threshold) {
                return { ...client, budgetInfo };
            }
            return null;
        }).filter((c): c is ClientWithBudget => c !== null);

        // Sort by who is most off-pace
        return alerts.sort((a, b) => 
            Math.abs(b.budgetInfo.projectedTotalSpend - b.budgetInfo.targetSpend) - 
            Math.abs(a.budgetInfo.projectedTotalSpend - a.budgetInfo.targetSpend)
        );

    }, [selectedManager, selectedRole, threshold, allKeyContactsData, allAccountDetails, allBudgetStatusData]);
    
    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onStateChange({
            role: e.target.value as 'PPC' | 'PDM' | '',
            manager: '', // Reset manager when role changes
        });
    };

    if (allAccountDetails.length === 0 || Object.keys(allKeyContactsData).length === 0 || Object.keys(allBudgetStatusData).length === 0) {
        return <div className="text-center p-8 bg-black/20 rounded-lg"><h2 className="text-xl font-semibold mb-2">Data Required</h2><p className="text-[var(--color-text-secondary)]">Please load Client Info, Key Contacts, and Budget Status data to use this tool.</p></div>;
    }

    const getHeaderLink = (client: AccountDetailsRecord) => (
        <button onClick={() => onSelectClient(client.ClientName)} className="text-sm font-semibold text-[var(--color-text-accent)] hover:brightness-90 inline-flex items-center gap-1.5">
            View Dashboard
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </button>
    );

    return (
        <section className="flex flex-col gap-8">
            <div className="bg-[var(--color-card-bg)] backdrop-blur-sm rounded-xl border border-[var(--color-border)] shadow-lg p-6">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4 text-center">🪙 Budget Pacing Alerts</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                    <div>
                        <label htmlFor="role-selector" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Role</label>
                        <select id="role-selector" value={selectedRole} onChange={handleRoleChange} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5">
                            <option value="">Select Role</option>
                            <option value="PPC">PPC Manager</option>
                            <option value="PDM">PDM</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="manager-selector" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Manager</label>
                        <select id="manager-selector" value={selectedManager} onChange={e => onStateChange({ manager: e.target.value })} disabled={!selectedRole} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5 disabled:opacity-50">
                            <option value="">Select Manager</option>
                            {managers.map(manager => <option key={manager} value={manager}>{manager}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="threshold-selector" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Alert Threshold</label>
                        <select id="threshold-selector" value={threshold} onChange={e => onStateChange({ threshold: parseFloat(e.target.value) })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5">
                            <option value={0}>No Threshold (Show All)</option>
                            <option value={0.05}>+/- 5% Off Pace</option>
                            <option value={0.10}>+/- 10% Off Pace</option>
                            <option value={0.15}>+/- 15% Off Pace</option>
                            <option value={0.20}>+/- 20% Off Pace</option>
                        </select>
                    </div>
                </div>
            </div>

            {selectedManager && (
                clientsToShow.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {clientsToShow.map(client => (
                             <div key={client.ClientName} style={{minHeight: '350px'}}>
                                <ChartGridItem title={client.ClientName} headerControls={getHeaderLink(client)}>
                                    <BudgetStatusTile 
                                        budgetStatus={client.budgetInfo} 
                                        accountDetails={client} 
                                    />
                                </ChartGridItem>
                             </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-8 bg-black/20 rounded-lg">
                        <h2 className="text-xl font-semibold mb-2">All Clear!</h2>
                        <p className="text-[var(--color-text-secondary)]">No clients for {selectedManager} are off pace by more than {(threshold * 100).toFixed(0)}%.</p>
                    </div>
                )
            )}
        </section>
    );
};
export default BudgetStatusTool;
