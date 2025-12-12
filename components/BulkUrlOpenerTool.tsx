import React, { useState, useMemo, useEffect } from 'react';
import { AccountDetailsRecord, RevolutionLinksRecord, AllRevolutionLinksData, BulkUrlOpenerToolState } from '../types';

// Preset definitions
interface Preset {
  name: string;
  description: string;
  type: 'id_template' | 'direct_link';
  // For id_template type
  template?: string;
  placeholder?: string;
  idField?: keyof AccountDetailsRecord;
  // For direct_link type
  linkField?: keyof RevolutionLinksRecord;
}

const presets: Record<string, Preset> = {
  gmcSuspensions: {
    name: 'GMC Account Issues',
    description: 'Opens the account issues page for each client in Google Merchant Center. Requires a GMC or MID from the Settings sheet.',
    type: 'id_template',
    template: 'https://merchants.google.com/mc/products/diagnostics/accountissues?a=[MID]',
    placeholder: '[MID]',
    idField: 'GMC',
  },
  googleAdsHome: {
    name: 'Google Ads Home',
    description: 'Opens the overview page for each client in Google Ads. Requires a Google Ads ID.',
    type: 'id_template',
    template: 'https://ads.google.com/aw/overview?ocid=[GAID]',
    placeholder: '[GAID]',
    idField: 'Google Ads',
  },
  revDashboard: {
    name: 'Revolution - Dashboard',
    description: 'Opens the main dashboard for each client in Revolution Parts.',
    type: 'direct_link',
    linkField: 'Dashboard',
  },
  revPricing: {
    name: 'Revolution - Pricing',
    description: 'Opens the pricing page for each client in Revolution Parts.',
    type: 'direct_link',
    linkField: 'Pricing',
  },
  revShipping: {
    name: 'Revolution - Shipping',
    description: 'Opens the shipping page for each client in Revolution Parts.',
    type: 'direct_link',
    linkField: 'Shipping',
  },
  revOrders: {
    name: 'Revolution - Orders',
    description: 'Opens the orders page for each client in Revolution Parts.',
    type: 'direct_link',
    linkField: 'Orders',
  },
  revProducts: {
    name: 'Revolution - Products',
    description: 'Opens the products page for each client in Revolution Parts.',
    type: 'direct_link',
    linkField: 'Products',
  },
   revPages: {
    name: 'Revolution - Pages',
    description: 'Opens the pages section for each client in Revolution Parts.',
    type: 'direct_link',
    linkField: 'Pages',
  },
  revLayouts: {
    name: 'Revolution - Layouts',
    description: 'Opens the layouts section for each client in Revolution Parts.',
    type: 'direct_link',
    linkField: 'Layouts',
  },
  revFeeds: {
    name: 'Revolution - Feeds',
    description: 'Opens the feeds page for each client in Revolution Parts.',
    type: 'direct_link',
    linkField: 'Feeds',
  },
  revImports: {
    name: 'Revolution - Imports',
    description: 'Opens the imports page for each client in Revolution Parts.',
    type: 'direct_link',
    linkField: 'Imports',
  },
  revCheckout: {
    name: 'Revolution - Checkout',
    description: 'Opens the checkout settings for each client in Revolution Parts.',
    type: 'direct_link',
    linkField: 'Checkout',
  },
};

type PresetKey = keyof typeof presets;

interface BulkUrlOpenerToolProps {
    allAccountDetails: AccountDetailsRecord[];
    allRevolutionLinksData: AllRevolutionLinksData;
    toolState: BulkUrlOpenerToolState;
    onStateChange: (newState: Partial<BulkUrlOpenerToolState>) => void;
}

const BulkUrlOpenerTool: React.FC<BulkUrlOpenerToolProps> = ({ allAccountDetails, allRevolutionLinksData, toolState, onStateChange }) => {
    const { selectedPreset, batchSize } = toolState;
    const [urlTemplate, setUrlTemplate] = useState<string>(presets[selectedPreset]?.template || '');
    const [clientsToDo, setClientsToDo] = useState<string[]>([]);
    const [clientsCompleted, setClientsCompleted] = useState<string[]>([]);
    
    useEffect(() => {
        const currentPreset = presets[selectedPreset];
        setUrlTemplate(currentPreset.template || '');
    }, [selectedPreset]);

    const eligibleClientsMap = useMemo(() => {
        const currentPreset = presets[selectedPreset];
        let clients: { name: string; url: string; }[] = [];
        
        // The client list is always sourced from the 'Settings' sheet (allAccountDetails).
        const allClientNamesFromSettings = [...new Set(allAccountDetails.map(d => d.ClientName))];

        if (currentPreset.type === 'id_template' && currentPreset.idField && currentPreset.template) {
            const accountDetailsMap = new Map(allAccountDetails.map(d => [d.ClientName, d]));
            
            clients = allClientNamesFromSettings
                .map(clientName => {
                    const details = accountDetailsMap.get(clientName);
                    if (!details) return null;

                    const idValue = details[currentPreset.idField!];
                    if (!idValue || String(idValue).trim() === '' || String(idValue).trim() === '-') return null;
                    
                    let finalId = String(idValue).trim();

                    // Special handling for IDs that are full URLs
                    if (finalId.startsWith('http')) {
                        try {
                            const url = new URL(finalId);
                            if (currentPreset.idField === 'Google Ads') {
                                const extractedId = url.searchParams.get('ocid') || url.searchParams.get('cid');
                                if (extractedId) finalId = extractedId;
                            } else if (currentPreset.idField === 'GMC') {
                                const extractedId = url.searchParams.get('a');
                                if (extractedId) finalId = extractedId;
                            }
                        } catch (e) {
                            console.warn('Could not parse URL, using raw value:', finalId);
                        }
                    }
                    
                    return { name: clientName, url: currentPreset.template!.replace(currentPreset.placeholder!, finalId) };
                })
                .filter((client): client is { name: string; url: string } => client !== null);

        } else if (currentPreset.type === 'direct_link' && currentPreset.linkField) {
            const revolutionLinksMap = new Map(Object.values(allRevolutionLinksData).map(d => [d.ClientName, d]));
            clients = allClientNamesFromSettings
                .map(clientName => {
                    const linkRecord = revolutionLinksMap.get(clientName);
                    if (!linkRecord) return null;

                    const linkValue = linkRecord[currentPreset.linkField!];
                    if (!linkValue || String(linkValue).trim() === '' || String(linkValue).trim() === '-') return null;

                    return { name: clientName, url: String(linkValue) };
                })
                .filter((client): client is { name: string; url: string } => client !== null);
        }
        
        clients.sort((a, b) => a.name.localeCompare(b.name));
        return new Map(clients.map(c => [c.name, c.url]));

    }, [selectedPreset, allAccountDetails, allRevolutionLinksData]);

    useEffect(() => {
        setClientsToDo(Array.from(eligibleClientsMap.keys()));
        setClientsCompleted([]);
    }, [eligibleClientsMap]);

    const handleOpenBatch = () => {
        const batchToOpenNames = clientsToDo.slice(0, batchSize);
        if (batchToOpenNames.length === 0) return;

        batchToOpenNames.forEach(name => {
            const url = eligibleClientsMap.get(name);
            if (url) {
                window.open(url, '_blank');
            }
        });

        setClientsToDo(prev => prev.slice(batchSize));
        setClientsCompleted(prev => [...prev, ...batchToOpenNames].sort((a, b) => a.localeCompare(b)));
    };

    const handleReset = () => {
        setClientsToDo(Array.from(eligibleClientsMap.keys()));
        setClientsCompleted([]);
    };

    if (allAccountDetails.length === 0) {
        return (
            <div className="text-center p-8 bg-black/20 rounded-lg">
                <h2 className="text-xl font-semibold mb-2">Data Required</h2>
                <p className="text-[var(--color-text-secondary)]">Please load Client Info data to use this tool.</p>
            </div>
        );
    }

    const totalClients = eligibleClientsMap.size;
    const hasOpenedAll = clientsToDo.length === 0;
    const currentPreset = presets[selectedPreset];

    return (
        <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] rounded-xl p-8 shadow-2xl border border-[var(--color-border)] w-full max-w-4xl mx-auto flex flex-col items-center">
            <h2 className="text-2xl font-semibold mb-2 text-[var(--color-text-primary)]">Bulk URL Opener Tool</h2>
            <p className="text-center text-[var(--color-text-secondary)] mb-8 max-w-2xl">This tool opens a specific URL for multiple clients at once in new tabs. Use the controls to manage how many tabs are opened at a time.</p>

            <div className="w-full space-y-6">
                {/* Step 1: Select Preset */}
                <div>
                    <label htmlFor="preset-selector" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">1. Select a URL Preset</label>
                    <select
                        id="preset-selector"
                        value={selectedPreset}
                        onChange={(e) => onStateChange({ selectedPreset: e.target.value as PresetKey })}
                        className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5"
                    >
                        {Object.entries(presets).map(([key, value]) => (
                            <option key={key} value={key}>{value.name}</option>
                        ))}
                    </select>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-2">{currentPreset.description}</p>
                </div>

                {/* Step 2: URL Template (Conditional) */}
                {currentPreset.type === 'id_template' && (
                    <div>
                        <label htmlFor="url-template" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">2. URL Template (uses `{currentPreset.placeholder}`)</label>
                        <input
                            id="url-template"
                            type="text"
                            value={urlTemplate}
                            onChange={(e) => setUrlTemplate(e.target.value)}
                            className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5 font-mono"
                            placeholder="e.g., https://example.com?id=[ID]"
                            readOnly
                        />
                    </div>
                )}

                {/* Step 3: Batch Size */}
                <div>
                    <label htmlFor="batch-size" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">{currentPreset.type === 'id_template' ? '3.' : '2.'} How many tabs to open at once?</label>
                    <input
                        id="batch-size"
                        type="number"
                        min="1"
                        max="50"
                        value={batchSize}
                        onChange={(e) => onStateChange({ batchSize: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        className="w-full max-w-xs bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
                    />
                </div>
            </div>

            <div className="w-full mt-8 pt-8 border-t border-[var(--color-border)] text-center">
                <p className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                    Found <span className="text-[var(--color-accent)]">{totalClients}</span> eligible clients for this preset.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 text-left">
                    <div>
                        <h4 className="font-semibold text-lg text-center mb-2">Left to Check ({clientsToDo.length})</h4>
                        <textarea
                            readOnly
                            value={clientsToDo.join('\n')}
                            className="w-full h-64 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-secondary)] text-sm rounded-lg p-3 font-mono resize-none"
                            aria-label="Clients left to check"
                        />
                    </div>
                    <div>
                        <h4 className="font-semibold text-lg text-center mb-2">Checked ({clientsCompleted.length})</h4>
                        <textarea
                            readOnly
                            value={clientsCompleted.join('\n')}
                            className="w-full h-64 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-3 font-mono resize-none"
                            aria-label="Checked clients"
                        />
                    </div>
                </div>

                <div className="flex justify-center items-center gap-4 mt-6">
                    <button
                        onClick={handleOpenBatch}
                        disabled={hasOpenedAll || totalClients === 0}
                        className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors text-base"
                    >
                        {hasOpenedAll ? 'All Done!' : `Open Next ${Math.min(batchSize, clientsToDo.length)}`}
                    </button>
                    <button
                        onClick={handleReset}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors text-base"
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkUrlOpenerTool;