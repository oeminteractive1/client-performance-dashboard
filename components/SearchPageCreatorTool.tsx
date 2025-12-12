import React, { useState, useMemo } from 'react';
import { SearchPageCreatorToolState, AccountDetailsRecord, AllRevolutionLinksData } from '../types';

interface SearchPageCreatorToolProps {
    allAccountDetails: AccountDetailsRecord[];
    allRevolutionLinksData: AllRevolutionLinksData;
    toolState: SearchPageCreatorToolState;
    onStateChange: (newState: Partial<SearchPageCreatorToolState>) => void;
}

const SearchPageCreatorTool: React.FC<SearchPageCreatorToolProps> = ({ allAccountDetails, allRevolutionLinksData, toolState, onStateChange }) => {
    const [step, setStep] = useState(1);
    const { selectedClient, title, url, h1, metaTitle, metaDescription, contentUrl, searchTerms } = toolState;
    
    const clients = useMemo(() => {
        return allAccountDetails.map(c => c.ClientName).sort();
    }, [allAccountDetails]);

    const fileManagerLink = useMemo(() => {
        if (!selectedClient) return null;
        return allRevolutionLinksData[selectedClient]?.FileManager;
    }, [selectedClient, allRevolutionLinksData]);

    const isStep2Complete = title.trim() && url.trim() && h1.trim() && metaTitle.trim() && metaDescription.trim();

    const partCount = useMemo(() => {
        if (!searchTerms) return 0;
        return searchTerms
            .replace(/,/g, '\n')
            .split('\n')
            .map(part => part.trim())
            .filter(part => part !== '')
            .length;
    }, [searchTerms]);

    const handleGenerateCsv = () => {
        const processedParts = searchTerms
            .replace(/,/g, '\n')
            .split('\n')
            .map(part => part.trim())
            .filter(part => part !== '');

        if (processedParts.length === 0) {
            alert('Please enter at least one part number in the "Search Terms" field.');
            return;
        }
        
        const searchTermsCsv = processedParts.join(';');

        const formattedContent = contentUrl.trim() ? `<p><img src="${contentUrl.trim()}"></p>` : '';

        const headers = [
            'Title', 'URL', 'Page Type', 'Published', 'H1', 'Meta Title', 
            'Meta Description', 'Search Filter Year', 'Search Filter Make', 
            'Search Filter Model', 'Search Categories', 'Search Terms', 'Content', 
            'Featured On Home Page'
        ];

        const row = [
            title, url, 'search', 'Yes', h1, metaTitle, metaDescription,
            '', '', '', '', searchTermsCsv, formattedContent, ''
        ];
        
        const csvContent = [
            headers.join(','),
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const filename = `${selectedClient} - Search Page - ${title}.csv`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        setStep(5); // Move to final "completed" step
    };
    
    const handleReset = () => {
        onStateChange({ selectedClient: '', title: '', url: '', h1: '', metaTitle: '', metaDescription: '', contentUrl: '', searchTerms: '' });
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
            <h2 className="text-2xl font-semibold mb-2 text-[var(--color-text-primary)] text-center">Search Page Creator</h2>
            <p className="text-center text-[var(--color-text-secondary)] mb-8">Generate a CSV to create a new custom search results page in Revolution Parts.</p>

            <div className="w-full space-y-4">
                 {step < 5 ? (
                    <>
                        {renderStep(1, "Select Client", <p className="text-lg font-semibold">{selectedClient}</p>,
                            <select value={selectedClient} onChange={e => { onStateChange({ selectedClient: e.target.value }); setStep(2); }} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5">
                                <option value="">-- Select a Client --</option>
                                {clients.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>,
                            () => handleReset()
                        )}
                        {step >= 2 && renderStep(2, "Page Details & SEO", 
                            <div className="space-y-1 text-sm"><p><strong>Title:</strong> {title}</p><p><strong>URL:</strong> {url}</p></div>,
                            <div className="space-y-4">
                                <div><label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Revolution Title</label><input type="text" value={title} onChange={e => onStateChange({ title: e.target.value })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5" /></div>
                                <div><label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">URL</label><input type="text" value={url} onChange={e => onStateChange({ url: e.target.value })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5" /></div>
                                <div><label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">H1</label><input type="text" value={h1} onChange={e => onStateChange({ h1: e.target.value })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5" /></div>
                                <div><label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Meta Title</label><input type="text" value={metaTitle} onChange={e => onStateChange({ metaTitle: e.target.value })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5" /></div>
                                <div><label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Meta Description</label><textarea value={metaDescription} onChange={e => onStateChange({ metaDescription: e.target.value })} className="w-full h-24 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5 resize-y" /></div>
                                <div className="text-right"><button onClick={() => isStep2Complete && setStep(3)} disabled={!isStep2Complete} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-lg transition-colors">Next</button></div>
                            </div>,
                            () => { setStep(2); }
                        )}

                        {step >= 3 && renderStep(3, "Content URL", <p className="text-lg font-semibold truncate">{contentUrl || 'None'}</p>,
                            <div className="flex items-center gap-4">
                                <input type="text" value={contentUrl} onChange={e => onStateChange({ contentUrl: e.target.value })} placeholder="e.g., /content/my-page-banner.jpg" className="flex-grow bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5" />
                                {fileManagerLink && (
                                    <a href={fileManagerLink} target="_blank" rel="noopener noreferrer" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors inline-flex items-center gap-2 flex-shrink-0">
                                        File Manager <LinkIcon />
                                    </a>
                                )}
                                <button onClick={() => setStep(4)} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-2.5 px-6 rounded-lg transition-colors">Next</button>
                            </div>,
                            () => { setStep(3); }
                        )}

                        {step >= 4 && (
                            <div className="p-6 bg-black/20 rounded-lg">
                                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">4. Add Products & Generate CSV</h3>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Search Terms (Part Numbers)</label>
                                <textarea value={searchTerms} onChange={e => onStateChange({ searchTerms: e.target.value })} placeholder="Paste part numbers here, separated by new lines or commas." className="w-full h-48 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-3 font-mono resize-y" />
                                <div className="mt-2 text-right">
                                    <p className={`text-sm ${partCount > 500 ? 'text-red-500 font-bold' : 'text-[var(--color-text-secondary)]'}`}>
                                        Part Count: {partCount} / 500
                                    </p>
                                    {partCount > 500 && (
                                        <p className="text-red-400 text-xs mt-1">Warning: Revolution Parts has a limit of 500 search terms per page. The generated CSV may fail to import.</p>
                                    )}
                                </div>
                                <div className="text-center mt-4">
                                    <button onClick={handleGenerateCsv} className="bg-[var(--color-positive)] hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-lg transition-colors text-base">Generate Search Page CSV</button>
                                </div>
                            </div>
                        )}
                    </>
                 ) : (
                     <>
                        {renderStep(1, "Select Client", <p>{selectedClient}</p>, null, () => handleReset())}
                        {renderStep(2, "Page Details & SEO", <p>Completed</p>, null, () => { setStep(2); })}
                        {renderStep(3, "Content URL", <p>Completed</p>, null, () => { setStep(3); })}
                        {renderStep(4, "Products", <p>CSV Generated</p>, null, () => { setStep(4); })}
                        
                        <div className="p-6 bg-green-500/10 rounded-lg mt-4 text-center">
                            <h3 className="text-lg font-bold text-green-300 mb-4">✅ Success! Your CSV is ready.</h3>
                            <p className="text-white mb-6">Click the link below to upload your file to Revolution Parts.</p>
                            
                            {allRevolutionLinksData[selectedClient]?.Imports ? (
                                <a href={allRevolutionLinksData[selectedClient]!.Imports} target="_blank" rel="noopener noreferrer" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-6 rounded-lg transition-colors inline-flex items-center justify-center">
                                    Go to Imports Page
                                    <LinkIcon />
                                </a>
                            ): (
                                <p className="text-sm text-gray-400">Import link not available for {selectedClient}.</p>
                            )}

                            <button onClick={handleReset} className="mt-6 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                                Start Over
                            </button>
                        </div>
                     </>
                 )}
            </div>
        </div>
    );
};

export default SearchPageCreatorTool;