import React, { useState, useMemo, useEffect } from 'react';
import { AccountDetailsRecord, TagCreatorToolState, AllRevolutionLinksData } from '../types';

interface TagCreatorToolProps {
    allAccountDetails: AccountDetailsRecord[];
    allRevolutionLinksData: AllRevolutionLinksData;
    toolState: TagCreatorToolState;
    onStateChange: (newState: Partial<TagCreatorToolState>) => void;
}

const TagCreatorTool: React.FC<TagCreatorToolProps> = ({ allAccountDetails, allRevolutionLinksData, toolState, onStateChange }) => {
    const [step, setStep] = useState(1);
    const { selectedClient, selectedBrand, tag, partNumbers } = toolState;

    const clients = useMemo(() => {
        return allAccountDetails.map(c => c.ClientName).sort();
    }, [allAccountDetails]);

    const brandsForSelectedClient = useMemo(() => {
        if (!selectedClient) return [];
        const clientDetails = allAccountDetails.find(c => c.ClientName === selectedClient);
        if (!clientDetails || !clientDetails.Brands) return [];
        return clientDetails.Brands.split(',').map(b => b.trim()).filter(Boolean).sort();
    }, [selectedClient, allAccountDetails]);

    const revolutionLinks = useMemo(() => {
        if (!selectedClient) return null;
        return allRevolutionLinksData[selectedClient];
    }, [selectedClient, allRevolutionLinksData]);
    
    // Auto-skip brand selection if only one brand
    useEffect(() => {
        if (step === 2 && brandsForSelectedClient.length === 1) {
            onStateChange({ selectedBrand: brandsForSelectedClient[0] });
            setStep(3);
        }
    }, [step, brandsForSelectedClient, onStateChange]);

    const handleClientSelect = (client: string) => {
        onStateChange({ selectedClient: client, selectedBrand: '', tag: '', partNumbers: '' });
        setStep(2);
    };

    const handleGenerateCsv = () => {
        const processedParts = partNumbers
            .replace(/,/g, '\n')
            .split('\n')
            .map(part => part.trim())
            .filter(part => part !== '');

        if (processedParts.length === 0) {
            alert('Please enter at least one part number.');
            return;
        }

        const headers = ['PARTNUMBER', 'BRAND', 'TAGS'];
        const rows = processedParts.map(part => [part, selectedBrand, tag]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const filename = `${selectedClient} - ${tag} - Tag.csv`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        setStep(5);
    };
    
    const handleReset = () => {
        onStateChange({ selectedClient: '', selectedBrand: '', tag: '', partNumbers: '' });
        setStep(1);
    };

    const LinkIcon: React.FC = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
    );
    
    const renderStep = (stepNumber: number, title: string, completedContent: React.ReactNode, activeContent: React.ReactNode, onEdit: () => void) => {
        const isCompleted = step > stepNumber;
        const isActive = step === stepNumber;

        return (
            <div className={`p-6 bg-black/20 rounded-lg transition-opacity duration-500 ${!isActive ? 'opacity-50' : 'opacity-100'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{stepNumber}. {title}</h3>
                    {isCompleted && (
                        <button onClick={onEdit} className="text-sm text-[var(--color-accent-secondary)] hover:underline">
                            Change
                        </button>
                    )}
                </div>
                {isActive ? activeContent : completedContent}
            </div>
        );
    };

    return (
        <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] rounded-xl p-8 shadow-2xl border border-[var(--color-border)] w-full max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold mb-2 text-[var(--color-text-primary)] text-center">Tag Creator</h2>
            <p className="text-center text-[var(--color-text-secondary)] mb-8">Generate a CSV of tagged part numbers in a few simple steps.</p>

            <div className="w-full space-y-4">
                {step < 5 ? (
                    <>
                        {renderStep(1, 'Select Client', <p className="text-lg font-semibold">{selectedClient}</p>,
                            <select value={selectedClient} onChange={e => handleClientSelect(e.target.value)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5">
                                <option value="">-- Select a Client --</option>
                                {clients.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>,
                            () => { handleReset(); }
                        )}

                        {step >= 2 && renderStep(2, 'Select Brand', <p className="text-lg font-semibold">{selectedBrand}</p>,
                            brandsForSelectedClient.length > 0 ? (
                                <select value={selectedBrand} onChange={e => { onStateChange({ selectedBrand: e.target.value }); setStep(3); }} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5">
                                    <option value="">-- Select a Brand --</option>
                                    {brandsForSelectedClient.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            ) : <p className="text-[var(--color-text-secondary)]">No brands found for this client. Please check the Settings sheet.</p>,
                            () => { onStateChange({ selectedBrand: '', tag: '', partNumbers: '' }); setStep(2); }
                        )}

                        {step >= 3 && renderStep(3, 'Define Tag', <p className="text-lg font-semibold">{tag}</p>,
                            <div className="flex items-center gap-4">
                                <input type="text" value={tag} onChange={e => onStateChange({ tag: e.target.value })} placeholder="e.g., Collision" className="flex-grow bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5" />
                                <button onClick={() => tag.trim() && setStep(4)} disabled={!tag.trim()} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-lg transition-colors">Next</button>
                            </div>,
                            () => { onStateChange({ tag: '', partNumbers: '' }); setStep(3); }
                        )}

                        {step >= 4 && (
                            <div className="p-6 bg-black/20 rounded-lg">
                                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">4. Paste Part Numbers & Generate</h3>
                                <textarea value={partNumbers} onChange={e => onStateChange({ partNumbers: e.target.value })} placeholder="Paste part numbers here, separated by new lines or commas." className="w-full h-48 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-3 font-mono resize-y" />
                                <div className="text-center mt-4">
                                    <button onClick={handleGenerateCsv} className="bg-[var(--color-positive)] hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-lg transition-colors text-base">Generate CSV</button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {renderStep(1, 'Select Client', <p className="text-lg font-semibold">{selectedClient}</p>, null, () => handleReset())}
                        {renderStep(2, 'Select Brand', <p className="text-lg font-semibold">{selectedBrand}</p>, null, () => { onStateChange({ selectedBrand: '', tag: '', partNumbers: '' }); setStep(2); })}
                        {renderStep(3, 'Define Tag', <p className="text-lg font-semibold">{tag}</p>, null, () => { onStateChange({ tag: '', partNumbers: '' }); setStep(3); })}
                        {renderStep(4, 'Part Numbers', <p className="text-lg font-semibold">CSV Generated</p>, null, () => { setStep(4); })}
                        
                        <div className="p-6 bg-black/20 rounded-lg mt-4 text-center">
                            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-6">5. Next Steps</h3>
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-6">
                                {revolutionLinks?.Pricing ? (
                                    <a href={revolutionLinks.Pricing} target="_blank" rel="noopener noreferrer" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-6 rounded-lg transition-colors inline-flex items-center justify-center w-full sm:w-auto">
                                        Add Pricing Rules for "{tag}"
                                        <LinkIcon />
                                    </a>
                                ) : <p className="text-sm text-gray-500">Pricing link not available.</p>}

                                {revolutionLinks?.Imports ? (
                                    <a href={revolutionLinks.Imports} target="_blank" rel="noopener noreferrer" className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold py-3 px-6 rounded-lg transition-colors inline-flex items-center justify-center w-full sm:w-auto">
                                        Add Tags to Products
                                        <LinkIcon />
                                    </a>
                                ) : <p className="text-sm text-gray-500">Import link not available.</p>}
                            </div>
                            <button onClick={handleReset} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                                Start Over
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TagCreatorTool;