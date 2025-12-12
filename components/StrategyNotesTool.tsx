import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { KeyContactRecord, StrategyNotesToolState, NoteRecord } from '../types';

const NOTES_SHEET_ID = '1Qg65GE1_Wfx3ryTgK8N_lhdNPqVRU80KmuH2gVHgyhk';
const NOTES_SHEET_NAME = 'Notes';

interface StrategyNotesToolProps {
    allKeyContactsData: KeyContactRecord[];
    onSelectClient: (clientName: string) => void;
    toolState: StrategyNotesToolState;
    onStateChange: (newState: Partial<StrategyNotesToolState>) => void;
    gapiClient: any;
    isSignedIn: boolean;
    notesData: NoteRecord[];
    isLoading: boolean;
    error: string | null;
    onRefresh: () => void;
    onUpdateNoteLocally: (updatedNote: NoteRecord) => void;
}

const NoteDisplay: React.FC<{ title: string; note: string; }> = ({ title, note }) => (
    <div>
        <h5 className="text-lg font-bold text-[var(--color-accent-secondary)] uppercase tracking-wider mb-1">{title}</h5>
        <p className="whitespace-pre-wrap text-[var(--color-text-primary)]">{note}</p>
    </div>
);

const StrategyNotesTool: React.FC<StrategyNotesToolProps> = ({ allKeyContactsData, onSelectClient, toolState, onStateChange, gapiClient, isSignedIn, notesData, isLoading, error, onRefresh, onUpdateNoteLocally }) => {
    const { role: selectedRole, manager: selectedManager, filterType, month: selectedMonth, selectedClientFilter } = toolState;

    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editingNotes, setEditingNotes] = useState<Partial<Omit<NoteRecord, 'clientName' | 'month' | 'rowIndex'>>>({});
    const [savingStatus, setSavingStatus] = useState<Record<string, 'saving' | 'saved' | 'error' | null>>({});

    const managers = useMemo(() => {
        if (!selectedRole) return [];
        const managerNames = allKeyContactsData
            .map(contact => contact[selectedRole])
            .filter(Boolean) as string[];
        return ['All Clients', ...[...new Set(managerNames)].sort()];
    }, [selectedRole, allKeyContactsData]);

    const availableMonths = useMemo(() => {
        const months: string[] = [];
        const today = new Date();
        for (let i = 0; i < 24; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            months.push(`${year}-${month}`);
        }
        if (!selectedMonth && months.length > 0) {
            onStateChange({ month: months[0] });
        }
        return months;
    }, [selectedMonth, onStateChange]);

    const clientListForManager = useMemo(() => {
        if (!selectedManager) return new Set<string>();
        let clientNamesForManager: Set<string>;
        if (selectedManager === 'All Clients') {
            clientNamesForManager = new Set(allKeyContactsData.filter(c => c[selectedRole as 'PPC'|'PDM'] && c[selectedRole as 'PPC'|'PDM']!.trim() !== '').map(c => c.ClientName));
        } else {
            clientNamesForManager = new Set(allKeyContactsData.filter(contact => contact[selectedRole as 'PPC' | 'PDM'] === selectedManager).map(contact => contact.ClientName));
        }
        return clientNamesForManager;
    }, [selectedManager, selectedRole, allKeyContactsData]);

    const clientListForClientFilterDropdown = useMemo(() => {
        if (!selectedManager) return [];
        const clients = allKeyContactsData.filter(contact => {
            if (selectedManager === 'All Clients') {
                return contact[selectedRole as 'PPC'|'PDM'] && contact[selectedRole as 'PPC'|'PDM']!.trim() !== '';
            }
            return contact[selectedRole as 'PPC'|'PDM'] === selectedManager;
        });
        return clients.map(c => c.ClientName).sort();
    }, [selectedManager, selectedRole, allKeyContactsData]);

    const filteredData = useMemo(() => {
        if (filterType === 'client' && selectedClientFilter) {
            const clientNotes = notesData.filter(note => note.clientName === selectedClientFilter);
            const notesMap = new Map(clientNotes.map(note => [note.month, note]));
            const last24Months = availableMonths;
            return last24Months.map(month => {
                const noteRecord = notesMap.get(month);
                return { 
                    clientName: selectedClientFilter, 
                    month, 
                    pricing: noteRecord?.pricing || '',
                    shipping: noteRecord?.shipping || '',
                    otherNotes: noteRecord?.otherNotes || '',
                    strategyNote: noteRecord?.strategyNote || '', 
                    rowIndex: noteRecord?.rowIndex 
                };
            });
        }

        if (filterType === 'month' && selectedManager && selectedMonth) {
            const notesMap = new Map<string, NoteRecord>();
            notesData.forEach(note => {
                if (note.month === selectedMonth) notesMap.set(note.clientName, note);
            });
            return Array.from(clientListForManager).map(clientName => {
                const noteRecord = notesMap.get(clientName);
                return { 
                    clientName, 
                    month: selectedMonth, 
                    pricing: noteRecord?.pricing || '',
                    shipping: noteRecord?.shipping || '',
                    otherNotes: noteRecord?.otherNotes || '',
                    strategyNote: noteRecord?.strategyNote || '', 
                    rowIndex: noteRecord?.rowIndex 
                };
            }).sort((a, b) => a.clientName.localeCompare(b.clientName));
        }
        return [];
    }, [notesData, filterType, selectedMonth, selectedClientFilter, clientListForManager, availableMonths, selectedManager]);
    
    const handleEditClick = (data: (typeof filteredData)[0]) => {
        const key = `${data.clientName}-${data.month}`;
        setEditingKey(key);
        setEditingNotes({
            strategyNote: data.strategyNote,
            pricing: data.pricing,
            shipping: data.shipping,
            otherNotes: data.otherNotes,
        });
    };
    
    const handleNoteChange = (field: keyof typeof editingNotes, value: string) => {
        setEditingNotes(prev => ({ ...prev, [field]: value }));
    };

    const stats = useMemo(() => {
        if (!selectedManager) return { status: 'select_manager' as const };

        const hasNotes = (d: { strategyNote: string, pricing: string, shipping: string, otherNotes: string }) => 
            (d.strategyNote && d.strategyNote.trim() && d.strategyNote.trim().toLowerCase() !== 'n/a') ||
            (d.pricing && d.pricing.trim() && d.pricing.trim().toLowerCase() !== 'n/a') ||
            (d.shipping && d.shipping.trim() && d.shipping.trim().toLowerCase() !== 'n/a') ||
            (d.otherNotes && d.otherNotes.trim() && d.otherNotes.trim().toLowerCase() !== 'n/a');

        if (filterType === 'month') {
            if (!selectedMonth) return { status: 'select_month' as const };
            const totalClients = clientListForManager.size;
            if (totalClients === 0) return { status: 'no_clients' as const };
            const clientsWithNotes = filteredData.filter(hasNotes).length;
            const percentage = totalClients > 0 ? (clientsWithNotes / totalClients) * 100 : 0;
            const [year, month] = selectedMonth.split('-');
            const monthLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
            return { status: 'month_ready' as const, totalClients, clientsWithNotes, percentage, monthLabel };
        }

        if (filterType === 'client') {
            if (!selectedClientFilter) return { status: 'select_client' as const };
            const totalMonths = filteredData.length;
            const monthsWithNotes = filteredData.filter(hasNotes).length;
            const percentage = totalMonths > 0 ? (monthsWithNotes / totalMonths) * 100 : 0;
            return { status: 'client_ready' as const, clientName: selectedClientFilter, totalMonths, monthsWithNotes, percentage };
        }
        
        return { status: 'loading' as const };
    }, [filterType, selectedManager, selectedMonth, selectedClientFilter, filteredData, clientListForManager]);

    const handleSaveNote = async (originalData: (typeof filteredData)[0]) => {
        const { clientName, month, rowIndex } = originalData;
        const key = `${clientName}-${month}`;
        if (!gapiClient || !isSignedIn) return;

        setSavingStatus(prev => ({ ...prev, [key]: 'saving' }));
        
        const noteValuesToSave = {
            pricing: editingNotes.pricing ?? originalData.pricing,
            shipping: editingNotes.shipping ?? originalData.shipping,
            otherNotes: editingNotes.otherNotes ?? originalData.otherNotes,
            strategyNote: editingNotes.strategyNote ?? originalData.strategyNote,
        };
        
        const optimisticallyUpdatedNote: NoteRecord = {
            ...originalData,
            ...noteValuesToSave,
        };

        onUpdateNoteLocally(optimisticallyUpdatedNote);
        setEditingKey(null);

        try {
            if (rowIndex) {
                await gapiClient.sheets.spreadsheets.values.update({
                    spreadsheetId: NOTES_SHEET_ID,
                    range: `${NOTES_SHEET_NAME}!C${rowIndex}:F${rowIndex}`,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[noteValuesToSave.pricing, noteValuesToSave.shipping, noteValuesToSave.otherNotes, noteValuesToSave.strategyNote]] }
                });
            } else {
                const monthToSave = filterType === 'client' ? month : selectedMonth;
                const newRow = [clientName, monthToSave.replace('-', '|'), noteValuesToSave.pricing, noteValuesToSave.shipping, noteValuesToSave.otherNotes, noteValuesToSave.strategyNote];
                await gapiClient.sheets.spreadsheets.values.append({
                    spreadsheetId: NOTES_SHEET_ID,
                    range: `${NOTES_SHEET_NAME}!A:F`,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [newRow] }
                });
                onRefresh();
            }

            setSavingStatus(prev => ({ ...prev, [key]: 'saved' }));
            setTimeout(() => setSavingStatus(prev => ({ ...prev, [key]: null })), 2000);
        } catch (err: any) {
            console.error("Save error:", err);
            setSavingStatus(prev => ({ ...prev, [key]: 'error' }));
            onUpdateNoteLocally(originalData);
        }
    };

    const handleFilterTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value as 'month' | 'client';
        onStateChange({ filterType: newType });
        if (newType === 'client' && !selectedClientFilter && clientListForClientFilterDropdown.length > 0) {
            onStateChange({ selectedClientFilter: clientListForClientFilterDropdown[0] });
        }
    };
    
    if (allKeyContactsData.length === 0) {
        return <div className="text-center p-8 bg-black/20 rounded-lg"><h2 className="text-xl font-semibold mb-2">Data Required</h2><p className="text-[var(--color-text-secondary)]">Please load Key Contacts data to use this tool.</p></div>;
    }

    return (
        <section className="flex flex-col gap-8">
            <div className="bg-[var(--color-card-bg)] backdrop-blur-sm rounded-xl border border-[var(--color-border)] shadow-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 max-w-6xl mx-auto items-end">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Role</label>
                        <select value={toolState.role} onChange={e => onStateChange({ role: e.target.value as 'PPC' | 'PDM' | '', manager: '', selectedClientFilter: '' })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5">
                            <option value="">Select Role</option><option value="PPC">PPC</option><option value="PDM">PDM</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Manager</label>
                        <select value={toolState.manager} onChange={e => onStateChange({ manager: e.target.value, selectedClientFilter: '' })} disabled={!toolState.role} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5 disabled:opacity-50">
                            <option value="">Select Manager</option>{managers.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Filter Type</label>
                        <select value={filterType} onChange={handleFilterTypeChange} disabled={!selectedManager} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5 disabled:opacity-50">
                            <option value="month">By Month</option><option value="client">By Client</option>
                        </select>
                    </div>
                    <div>
                        {filterType === 'month' ? (
                            <><label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Month</label><select value={selectedMonth} onChange={e => onStateChange({ month: e.target.value })} disabled={!selectedManager} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5 disabled:opacity-50">{availableMonths.map(m => <option key={m} value={m}>{m}</option>)}</select></>
                        ) : (
                            <><label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Client</label><select value={selectedClientFilter} onChange={e => onStateChange({ selectedClientFilter: e.target.value })} disabled={!selectedManager || clientListForClientFilterDropdown.length === 0} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5 disabled:opacity-50"><option value="">Select Client</option>{clientListForClientFilterDropdown.map(c => <option key={c} value={c}>{c}</option>)}</select></>
                        )}
                    </div>
                    <div>
                        <button onClick={onRefresh} disabled={isLoading} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5 flex items-center justify-center gap-2 hover:border-[var(--color-accent)] disabled:opacity-50">
                            <svg className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.18-3.185m-3.181-4.995l-3.182-3.182a8.25 8.25 0 00-11.664 0l-3.18 3.185" /></svg>
                            {isLoading ? 'Refreshing...' : 'Refresh Notes'}
                        </button>
                    </div>
                </div>
            </div>

            {selectedManager && (
                <div className="bg-[var(--color-card-bg)] backdrop-blur-sm rounded-xl border border-[var(--color-border)] shadow-lg p-6 text-center">
                    {stats.status === 'month_ready' && <>
                        <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Note Completion</h3>
                        <p className={`text-6xl font-bold my-2 ${stats.percentage >= 75 ? 'text-[var(--color-positive)]' : stats.percentage >= 50 ? 'text-[var(--color-warning)]' : 'text-[var(--color-negative)]'}`}>{stats.percentage.toFixed(0)}%</p>
                        <p className="text-lg text-[var(--color-text-secondary)]">For <span className="font-semibold text-[var(--color-text-primary)]">{stats.monthLabel}</span>, <span className="font-semibold text-[var(--color-text-primary)]">{stats.clientsWithNotes} of {stats.totalClients}</span> clients have a note.</p>
                    </>}
                    {stats.status === 'client_ready' && <>
                        <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Historical Note Completion for {stats.clientName}</h3>
                        <p className={`text-6xl font-bold my-2 ${stats.percentage >= 75 ? 'text-[var(--color-positive)]' : stats.percentage >= 50 ? 'text-[var(--color-warning)]' : 'text-[var(--color-negative)]'}`}>{stats.percentage.toFixed(0)}%</p>
                        <p className="text-lg text-[var(--color-text-secondary)]"><span className="font-semibold text-[var(--color-text-primary)]">{stats.monthsWithNotes} of {stats.totalMonths}</span> months have a note in the last 2 years.</p>
                    </>}
                    {stats.status !== 'month_ready' && stats.status !== 'client_ready' && <p className="text-lg text-[var(--color-text-secondary)]">Please complete your filter selections.</p>}
                </div>
            )}
            
            {error && <div className="text-center p-4 bg-[var(--color-negative-bg)] text-[var(--color-negative)] rounded-lg">{error}</div>}

            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center p-8 text-[var(--color-text-secondary)]">Loading notes...</div>
                ) : filteredData.length > 0 ? (
                    filteredData.map((data) => {
                        const key = `${data.clientName}-${data.month}`;
                        const isEditing = editingKey === key;
                        const hasAnyNote = data.pricing.trim() || data.shipping.trim() || data.otherNotes.trim() || data.strategyNote.trim();

                        return (
                            <div key={key} className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)] p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <button onClick={() => onSelectClient(data.clientName)} className="text-xl font-bold text-[var(--color-text-accent)] hover:underline">{data.clientName}</button>
                                        <p className="text-sm text-[var(--color-text-secondary)]">{new Date(data.month + '-02T00:00:00Z').toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {isEditing ? (<>
                                            <button onClick={() => handleSaveNote(data)} disabled={!isSignedIn || savingStatus[key] === 'saving'} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 w-24 text-white font-bold py-2 px-4 rounded-lg">{savingStatus[key] === 'saving' ? 'Saving...' : 'Save'}</button>
                                            <button onClick={() => setEditingKey(null)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg w-24">Cancel</button>
                                        </>) : (
                                            <button onClick={() => handleEditClick(data)} disabled={!isSignedIn} className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg w-24">{savingStatus[key] === 'saved' ? 'Saved!' : savingStatus[key] === 'error' ? 'Error!' : 'Edit'}</button>
                                        )}
                                        {savingStatus[key] === 'error' && <p className="text-xs text-red-400">Save failed. Please try again.</p>}
                                    </div>
                                </div>
                                
                                {isEditing ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                        {(['pricing', 'shipping', 'otherNotes', 'strategyNote'] as const).map(field => (
                                            <div key={field} className={field === 'strategyNote' ? 'md:col-span-2' : ''}>
                                                <label className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">{field.replace('Note', ' Note')}</label>
                                                <textarea value={editingNotes[field] ?? data[field]} onChange={e => handleNoteChange(field, e.target.value)} disabled={!isSignedIn} className="w-full h-24 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg p-2 resize-y text-sm mt-1"/>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    hasAnyNote ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-4">
                                            {data.pricing && data.pricing.trim() && <NoteDisplay title="Pricing" note={data.pricing} />}
                                            {data.shipping && data.shipping.trim() && <NoteDisplay title="Shipping" note={data.shipping} />}
                                            {data.otherNotes && data.otherNotes.trim() && <NoteDisplay title="Other Notes" note={data.otherNotes} />}
                                            {data.strategyNote && data.strategyNote.trim() && <div className="md:col-span-2"><NoteDisplay title="Strategy Note" note={data.strategyNote} /></div>}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic mt-4">No notes for this month.</p>
                                    )
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center p-8 text-[var(--color-text-secondary)]">No clients or data found for the selected filters.</div>
                )}
            </div>
        </section>
    );
};

export default StrategyNotesTool;
