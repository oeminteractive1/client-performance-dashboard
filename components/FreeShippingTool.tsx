import React, { useState, useMemo } from 'react';
import { AccountDetailsRecord, AllRevolutionLinksData, FreeShippingToolState } from '../types';

interface FreeShippingToolProps {
    allAccountDetails: AccountDetailsRecord[];
    allRevolutionLinksData: AllRevolutionLinksData;
    toolState: FreeShippingToolState;
    onStateChange: (newState: Partial<FreeShippingToolState>) => void;
}

const FreeShippingTool: React.FC<FreeShippingToolProps> = ({ allAccountDetails, allRevolutionLinksData, toolState, onStateChange }) => {
    const [step, setStep] = useState(1);
    const { selectedClient, selectedBrand, partNumbers } = toolState;

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

    const partCount = useMemo(() => {
        if (!partNumbers) return 0;
        return partNumbers
            .replace(/,/g, '\n')
            .split('\n')
            .map(part => part.trim())
            .filter(part => part !== '')
            .length;
    }, [partNumbers]);

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

        const headers = ['PARTNUMBER', 'BRAND', 'SHIPPINGPRICE'];
        const rows = processedParts.map(part => [part, selectedBrand, '0']);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const filename = `${selectedClient} - Free Shipping.csv`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        setStep(4);
    };
    
    const handleReset = () => {
        onStateChange({ selectedClient: '', selectedBrand: '', partNumbers: '' });
        setStep(1);
    };
    
    const LinkIcon: React.FC = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
    );

    const renderStep = (stepNumber: number, title: string, isComplete: boolean, content: React.ReactNode) => {
        const isActive = step === stepNumber;
        return (
            <div className={`p-6 bg-black/20 rounded-lg transition-opacity duration-500 ${!isActive ? 'opacity-50' : 'opacity-100'}`}>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">{stepNumber}. {title}</h3>
                {content}
            </div>
        );
    };

    return (
        <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] rounded-xl p-8 shadow-2xl border border-[var(--color-border)] w-full max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold mb-2 text-[var(--color-text-primary)] text-center">Free Shipping Tool</h2>
            <p className="text-center text-[var(--color-text-secondary)] mb-8">Generate a CSV to mark a list of parts for free shipping.</p>

            <div className="w-full space-y-4">
                {step < 4 ? (
                    <>
                        {renderStep(1, 'Select Client', step > 1, (
                            step === 1 ? (
                                <select value={selectedClient} onChange={e => { onStateChange({ selectedClient: e.target.value, selectedBrand: '' }); setStep(2); }} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5">
                                    <option value="">-- Select a Client --</option>
                                    {clients.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            ) : <p className="text-lg font-semibold">{selectedClient}</p>
                        ))}
                        
                        {step >= 2 && renderStep(2, 'Select Brand', step > 2, (
                            step === 2 ? (
                                <select value={selectedBrand} onChange={e => { onStateChange({ selectedBrand: e.target.value }); setStep(3); }} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5">
                                    <option value="">-- Select a Brand --</option>
                                    {brandsForSelectedClient.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            ) : <p className="text-lg font-semibold">{selectedBrand}</p>
                        ))}

                        {step >= 3 && renderStep(3, 'Enter Part Numbers & Generate', step > 3, (
                            <div>
                                <textarea 
                                    value={partNumbers} 
                                    onChange={e => onStateChange({ partNumbers: e.target.value })} 
                                    placeholder="Paste part numbers here, separated by new lines or commas." 
                                    className="w-full h-48 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-3 font-mono resize-y" 
                                />
                                <div className="mt-2 text-right">
                                    <p className="text-sm text-[var(--color-text-secondary)]">Part Count: {partCount}</p>
                                </div>
                                <div className="text-center mt-4">
                                    <button 
                                        onClick={handleGenerateCsv} 
                                        disabled={!partNumbers.trim()}
                                        className="bg-[var(--color-positive)] hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-lg transition-colors text-base"
                                    >
                                        Generate Free Shipping CSV
                                    </button>
                                </div>
                            </div>
                        ))}
                    </>
                ) : (
                    <div className="p-6 bg-green-500/10 rounded-lg mt-4 text-center">
                        <h3 className="text-lg font-bold text-green-300 mb-4">✅ Success! Your CSV has been generated.</h3>
                        <p className="text-white mb-6">You can now upload this file to Revolution Parts to apply free shipping to the specified items.</p>
                        {revolutionLinks?.Imports ? (
                            <a href={revolutionLinks.Imports} target="_blank" rel="noopener noreferrer" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-6 rounded-lg transition-colors inline-flex items-center justify-center">
                                Go to Imports Page
                                <LinkIcon />
                            </a>
                        ) : (
                            <p className="text-sm text-gray-400">Import link not available for {selectedClient}.</p>
                        )}
                        <button 
                            onClick={handleReset} 
                            className="mt-6 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                        >
                            Start Over
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FreeShippingTool;