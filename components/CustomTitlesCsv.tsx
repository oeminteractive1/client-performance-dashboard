
import React, { useState, useEffect, useMemo } from 'react';
import { AccountDetailsRecord, AllRevolutionLinksData, CustomSeoTitlesToolState } from '../types';

// Hardcoded for reading brand/title data AND writing completions
const READ_API_KEY = 'AIzaSyC-XMGjEXrs4m9LU4wy1blZ9zdULZdILAo';
const TITLES_SHEET_ID = '1fKgY7FsrBXBdoz0lEIo67yTmvXmA7c_ciQ8q_fSFCHs';

// The sheet name for completions is now fixed
const COMPLETIONS_SHEET_NAME = 'CustomSEOTitles';

// Sheet fetcher for brand and title data (read-only)
const genericSheetFetcher = async (sheetId: string, range: string) => {
    const encodedRange = encodeURIComponent(range);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}?key=${READ_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google Sheets API Error: ${errorData?.error?.message || `HTTP error! status: ${response.status}`}.`);
    }
    const json = await response.json();
    return json.values || [];
};

// Helper to download a generic CSV
const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};

// Helper to extract detailed error messages from Google API responses
const extractGapiError = (err: any): string => {
    if (!err) return 'An unknown error occurred.';
    if (err instanceof Error) return err.message;
    // Handle gapi client error object structure
    if (err.result && err.result.error && err.result.error.message) {
        return `Google API Error: ${err.result.error.message}`;
    }
    // Handle other object structures
    try {
        if (typeof err === 'object') {
            return JSON.stringify(err);
        }
    } catch (e) {}
    return String(err);
};

interface CustomSeoTitlesToolProps {
    allAccountDetails: AccountDetailsRecord[];
    allRevolutionLinksData: AllRevolutionLinksData;
    gapiClient: any;
    isSignedIn: boolean;
    mainSheetId: string; // Passed from App.tsx, but we use TITLES_SHEET_ID for this specific tool
    toolState: CustomSeoTitlesToolState;
    onStateChange: (newState: Partial<CustomSeoTitlesToolState>) => void;
}

const CustomSeoTitlesTool: React.FC<CustomSeoTitlesToolProps> = ({ allAccountDetails, allRevolutionLinksData, gapiClient, isSignedIn, mainSheetId, toolState, onStateChange }) => {
    const { selectedBrand } = toolState;
    
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    // Split error states for better UI feedback
    const [csvError, setCsvError] = useState<string | null>(null);
    const [completionError, setCompletionError] = useState<string | null>(null);

    const [brands, setBrands] = useState<string[]>([]);
    const [isLoadingBrands, setIsLoadingBrands] = useState<boolean>(true);
    
    const [completions, setCompletions] = useState<Record<string, string>>({});
    const [clientsToDo, setClientsToDo] = useState<string[]>([]);
    const [clientsCompleted, setClientsCompleted] = useState<string[]>([]);

    // The sheet ID for completions is the same as the Titles DB
    const completionsSheetId = TITLES_SHEET_ID;
    const completionsSheetName = COMPLETIONS_SHEET_NAME;

    // Load completions from Google Sheet when signed in and configured
    useEffect(() => {
        const fetchCompletions = async () => {
            if (!isSignedIn || !gapiClient || !completionsSheetId || !completionsSheetName) {
                setCompletions({}); // Reset if not signed in or configured
                return;
            }
            // Clear previous errors on reload attempt
            setCompletionError(null); 
            
            try {
                const range = `${completionsSheetName}!A2:B`;
                const response = await gapiClient.sheets.spreadsheets.values.get({
                    spreadsheetId: completionsSheetId,
                    range: range,
                });
                const rows = response.result.values || [];
                const loadedCompletions: Record<string, string> = {};
                rows.forEach((row: string[]) => {
                    const clientName = row[0];
                    const date = row[1];
                    if (clientName && date) {
                        loadedCompletions[clientName] = new Date(date).toISOString();
                    }
                });
                setCompletions(loadedCompletions);
            } catch (err) {
                console.error("Failed to fetch completions from Google Sheet:", err);
                // Don't block the whole UI, just show a warning in the todo list
                setCompletionError(`Could not load history. Check if '${completionsSheetName}' tab exists in the Titles Sheet.`);
                setCompletions({});
            }
        };
        fetchCompletions();
    }, [isSignedIn, gapiClient, completionsSheetId, completionsSheetName]);
    
    // Fetch brands for the dropdown
    useEffect(() => {
        const fetchBrands = async () => {
            setIsLoadingBrands(true);
            try {
                const brandData = await genericSheetFetcher(TITLES_SHEET_ID, 'IDdatabase!A2:A');
                const brandList = brandData.map((row: string[]) => row[0]).filter(Boolean).sort();
                setBrands(brandList);
                if (brandList.length > 0 && !selectedBrand) {
                    onStateChange({ selectedBrand: brandList[0] });
                }
            } catch (err) {
                 setCsvError(err instanceof Error ? err.message : 'Failed to fetch brands from Google Sheets.');
            } finally {
                setIsLoadingBrands(false);
            }
        };
        fetchBrands();
    }, []); // Run only once

    const clientsOnSeoPlan = useMemo(() => {
        return new Set(allAccountDetails.filter(c => c.CurrentSEOPackage && c.CurrentSEOPackage.trim() !== '').map(c => c.ClientName));
    }, [allAccountDetails]);

    useEffect(() => {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const recentlyCompleted = new Set<string>();
        const allCompleted: string[] = [];

        for (const clientName in completions) {
            const completionDate = new Date(completions[clientName]);
            if (!isNaN(completionDate.getTime()) && completionDate > threeMonthsAgo && clientsOnSeoPlan.has(clientName)) {
                recentlyCompleted.add(clientName);
                allCompleted.push(clientName);
            }
        }
        setClientsCompleted(allCompleted.sort());

        if (!selectedBrand) {
            setClientsToDo([]);
            return;
        }

        const brandLower = selectedBrand.toLowerCase();
        const brandClients = new Set(
            allAccountDetails.filter(c => c.Brands && c.Brands.toLowerCase().split(',').map(b => b.trim()).includes(brandLower)).map((c: AccountDetailsRecord) => c.ClientName)
        );
        
        const todo: string[] = [];
        clientsOnSeoPlan.forEach(client => {
            if (brandClients.has(client) && !recentlyCompleted.has(client)) {
                todo.push(client);
            }
        });
        setClientsToDo(todo.sort());

    }, [selectedBrand, allAccountDetails, completions, clientsOnSeoPlan]);

    const handleGenerateCsv = async () => {
        if (!selectedBrand) { setCsvError("Please select a brand first."); return; }
        setIsGenerating(true); setCsvError(null);
        try {
            const range = `'${selectedBrand}'!A3:D`;
            const dataRows = await genericSheetFetcher(TITLES_SHEET_ID, range);
            
            const csvData = dataRows.filter((r:string[])=>r[0]?.trim()&&r[3]?.trim()).map((r:string[])=>({PARTNUMBER:r[0],BRAND:selectedBrand,NAME:r[3]}));
            if (csvData.length === 0) throw new Error(`No data found for brand "${selectedBrand}".`);
            
            const headers = ['PARTNUMBER', 'BRAND', 'NAME'];
            const headerRow = headers.join(',');
            const dataRowStrings = csvData.map(row => headers.map(h => `"${String(row[h as keyof typeof row]||'').replace(/"/g,'""')}"`).join(',')).join('\n');
            
            downloadCSV(`${headerRow}\n${dataRowStrings}`, `${selectedBrand} - SEO Titles.csv`);
        } catch (err) {
            setCsvError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleMarkAsCompleted = async (clientName: string) => {
        if (!isSignedIn || !gapiClient) {
            alert("Please sign in with Google to save changes.");
            return;
        }
         if (!completionsSheetId || !completionsSheetName) {
            setCompletionError("Configuration error: Sheet ID not set.");
            return;
        }
        
        setCompletionError(null); // Clear previous errors

        const today = new Date();
        const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        try {
            // 1. Find the client row
            const findRange = `${completionsSheetName}!A:A`;
            const response = await gapiClient.sheets.spreadsheets.values.get({
                spreadsheetId: completionsSheetId,
                range: findRange,
            });
            
            const rows = response.result.values || [];
            const rowIndex = rows.findIndex((row: string[]) => row[0] === clientName);
            
            if (rowIndex === -1) {
                // Client not found, append a new row
                await gapiClient.sheets.spreadsheets.values.append({
                    spreadsheetId: completionsSheetId,
                    range: `${completionsSheetName}!A:B`,
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        values: [[clientName, todayString]]
                    }
                });
            } else {
                // Client found, update the existing row
                const updateRange = `${completionsSheetName}!B${rowIndex + 1}`; // +1 because sheet is 1-indexed (rows are 0-indexed in array)
                await gapiClient.sheets.spreadsheets.values.update({
                    spreadsheetId: completionsSheetId,
                    range: updateRange,
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        values: [[todayString]]
                    }
                });
            }

            // Update local state for immediate feedback
            setCompletions(prev => ({ ...prev, [clientName]: today.toISOString() }));
            
        } catch (err) {
            console.error("Failed to mark as completed:", err);
            setCompletionError(extractGapiError(err));
        }
    };

    return (
        <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] rounded-xl p-8 shadow-2xl border border-[var(--color-border)] w-full max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold mb-2 text-[var(--color-text-primary)] text-center">Custom SEO Titles Workflow</h2>
            <p className="text-center text-[var(--color-text-secondary)] mb-8">
                This tool helps track the creation and uploading of custom SEO title CSVs for clients with an SEO package.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Left Column: Controls & Generation */}
                <div className="bg-black/20 p-6 rounded-lg space-y-6">
                    <div>
                        <label htmlFor="brand-selector" className="block text-lg font-bold text-[var(--color-text-primary)] mb-3">
                            1. Select Brand
                        </label>
                        {isLoadingBrands ? (
                            <div className="text-center py-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-accent)] mx-auto"></div></div>
                        ) : (
                            <select
                                id="brand-selector"
                                value={selectedBrand}
                                onChange={e => onStateChange({ selectedBrand: e.target.value })}
                                disabled={isLoadingBrands || brands.length === 0}
                                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5"
                            >
                                <option value="">-- Select a Brand --</option>
                                {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                            </select>
                        )}
                    </div>

                    <div>
                         <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">2. Generate CSV</h3>
                        <button
                            onClick={handleGenerateCsv}
                            disabled={!selectedBrand || isGenerating}
                            className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-colors text-base"
                        >
                            {isGenerating ? 'Generating...' : `Download SEO Titles for ${selectedBrand || '...'}`}
                        </button>
                        {csvError && <p className="text-sm text-red-400 mt-3 break-words">{csvError}</p>}
                    </div>
                     <div>
                         <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">3. Mark as Complete</h3>
                         <p className="text-sm text-[var(--color-text-secondary)]">After uploading the CSV to a client's Revolution Parts store, mark them as completed below.</p>
                         {!isSignedIn && (
                             <div className="mt-3 text-center bg-amber-500/10 border border-amber-500/50 text-amber-300 p-3 rounded-lg">
                                <p className="text-sm">Please sign in with Google to mark clients as completed.</p>
                            </div>
                         )}
                     </div>
                </div>

                {/* Right Column: Client Lists */}
                <div className="space-y-6">
                    {/* To Do List */}
                    <div className="bg-black/20 p-6 rounded-lg">
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">To Do ({clientsToDo.length})</h3>
                        <p className="text-xs text-[var(--color-text-secondary)] mb-4">Clients on an SEO plan for this brand that have not been completed in the last 3 months.</p>
                        
                        {completionError && (
                            <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-sm text-red-200 break-words">
                                <strong>Error saving:</strong> {completionError}
                            </div>
                        )}

                        <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {clientsToDo.length > 0 ? (
                                <ul className="space-y-2">
                                    {clientsToDo.map(clientName => (
                                        <li key={clientName} className="flex items-center justify-between bg-slate-800/50 p-2 rounded-md">
                                            <span className="font-medium">{clientName}</span>
                                            <button
                                                onClick={() => handleMarkAsCompleted(clientName)}
                                                disabled={!isSignedIn}
                                                className="text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-1 px-3 rounded-full transition-colors"
                                            >
                                                Mark Done
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                                    {selectedBrand ? 'All clients for this brand are up to date!' : 'Select a brand to see the to-do list.'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Completed List */}
                    <div className="bg-black/20 p-6 rounded-lg">
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">Recently Completed ({clientsCompleted.length})</h3>
                        <p className="text-xs text-[var(--color-text-secondary)] mb-4">Clients completed in the last 3 months.</p>
                        <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                             {clientsCompleted.length > 0 ? (
                                <ul className="space-y-2">
                                    {clientsCompleted.map(clientName => (
                                        <li key={clientName} className="flex items-center justify-between bg-slate-800/50 p-2 rounded-md">
                                            <span className="font-medium text-gray-400 line-through">{clientName}</span>
                                            <span className="text-xs text-gray-500">{new Date(completions[clientName]).toLocaleDateString()}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">No clients marked as completed recently.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomSeoTitlesTool;
