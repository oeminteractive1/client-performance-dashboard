import React, { useState, useMemo } from 'react';
import { CategoryPageCreatorToolState, AccountDetailsRecord, AllRevolutionLinksData } from '../types';

interface CategoryPageCreatorToolProps {
    allAccountDetails: AccountDetailsRecord[];
    allRevolutionLinksData: AllRevolutionLinksData;
    toolState: CategoryPageCreatorToolState;
    onStateChange: (newState: Partial<CategoryPageCreatorToolState>) => void;
}

const CategoryPageCreatorTool: React.FC<CategoryPageCreatorToolProps> = ({ allAccountDetails, allRevolutionLinksData, toolState, onStateChange }) => {
    const [step, setStep] = useState(1);
    const { selectedClient, selectedBrand, categoryName, h1, metaTitle, metaDescription, contentUrl, partNumbers } = toolState;

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

    const isStep1Complete = selectedClient && selectedBrand && categoryName.trim();
    const isStep2Complete = h1.trim() && metaTitle.trim() && metaDescription.trim();

    const partCount = useMemo(() => {
        if (!partNumbers) return 0;
        return partNumbers
            .replace(/,/g, '\n')
            .split('\n')
            .map(part => part.trim())
            .filter(part => part !== '')
            .length;
    }, [partNumbers]);
    
    const downloadCSV = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    const handleGenerateCreatorCsv = () => {
        const formattedContent = contentUrl.trim() ? `<p><img src="${contentUrl.trim()}"></p>` : '';
        const headers = ['Name', 'Current Path', 'Updated Path', 'H1 Title', 'Meta Title', 'Meta Description', 'Category Image Location', 'Show Subcategory Products', 'Content'];
        const row = [categoryName, categoryName, '', h1, metaTitle, metaDescription, 'category', 'Yes', formattedContent];
        
        const csvContent = [
            headers.join(','),
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ].join('\n');
        
        const filename = `${selectedClient} - ${categoryName} - Creator.csv`;
        downloadCSV(csvContent, filename);
        setStep(4); // Move to the next step
    };

    const handleGeneratePartMappingCsv = () => {
        const processedParts = partNumbers.replace(/,/g, '\n').split('\n').map(part => part.trim()).filter(part => part !== '');
        if (processedParts.length === 0) {
            alert('Please enter at least one part number.');
            return;
        }

        const headers = ['PARTNUMBER', 'BRAND', 'ACTION', 'CATEGORYPATH'];
        const rows = processedParts.map(part => [part, selectedBrand, 'ADD', categoryName]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const filename = `${selectedClient} - ${categoryName} - mapping.csv`;
        downloadCSV(csvContent, filename);
        setStep(5);
    };
    
    const handleReset = () => {
        onStateChange({ selectedClient: '', selectedBrand: '', categoryName: '', h1: '', metaTitle: '', metaDescription: '', contentUrl: '', partNumbers: '' });
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
                    {isCompleted && (<button onClick={onEdit} className="text-sm text-[var(--color-accent-secondary)] hover:underline">Change</button>)}
                </div>
                {isActive ? activeContent : completedContent}
            </div>
        );
    };

    return (
        <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] rounded-xl p-8 shadow-2xl border border-[var(--color-border)] w-full max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold mb-2 text-[var(--color-text-primary)] text-center">Category Page Creator</h2>
            <p className="text-center text-[var(--color-text-secondary)] mb-8">This tool generates two CSVs: one to create the category page, and one to map products to it.</p>
            <div className="w-full space-y-4">
                {step < 5 ? (
                    <>
                        {renderStep(1, "Client, Brand, & Category Name", 
                            <div className="space-y-1 text-sm">
                                <p><strong>Client:</strong> {selectedClient}</p>
                                <p><strong>Brand:</strong> {selectedBrand}</p>
                                <p><strong>Category:</strong> {categoryName}</p>
                            </div>,
                            <div className="space-y-4">
                                <div><label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Client</label><select value={selectedClient} onChange={e => onStateChange({ selectedClient: e.target.value, selectedBrand: '', categoryName: '' })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5"><option value="">-- Select a Client --</option>{clients.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                <div><label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Brand</label><select value={selectedBrand} onChange={e => onStateChange({ selectedBrand: e.target.value })} disabled={!selectedClient} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5 disabled:opacity-50"><option value="">-- Select a Brand --</option>{brandsForSelectedClient.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                                <div><label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Category Name</label><input type="text" value={categoryName} onChange={e => onStateChange({ categoryName: e.target.value })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5" /></div>
                                <div className="text-right"><button onClick={() => isStep1Complete && setStep(2)} disabled={!isStep1Complete} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-lg">Next</button></div>
                            </div>,
                            () => handleReset()
                        )}

                        {step >= 2 && renderStep(2, "SEO & Page Details",
                             <div className="space-y-1 text-sm"><p><strong>H1:</strong> {h1}</p><p><strong>Meta Title:</strong> {metaTitle}</p></div>,
                            <div className="space-y-4">
                                <div><label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">H1 Title</label><input type="text" value={h1} onChange={e => onStateChange({ h1: e.target.value })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5" /></div>
                                <div><label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Meta Title</label><input type="text" value={metaTitle} onChange={e => onStateChange({ metaTitle: e.target.value })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5" /></div>
                                <div><label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Meta Description</label><textarea value={metaDescription} onChange={e => onStateChange({ metaDescription: e.target.value })} className="w-full h-24 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5 resize-y" /></div>
                                <div className="text-right"><button onClick={() => isStep2Complete && setStep(3)} disabled={!isStep2Complete} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-lg">Next</button></div>
                            </div>,
                             () => setStep(2)
                        )}

                        {step >= 3 && renderStep(3, "Content Image URL (Optional)",
                            <p className="text-lg font-semibold truncate">{contentUrl || 'None'}</p>,
                            <div className="flex items-center gap-4">
                                <input type="text" value={contentUrl} onChange={e => onStateChange({ contentUrl: e.target.value })} placeholder="e.g., /content/my-banner.jpg" className="flex-grow bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2.5" />
                                {revolutionLinks?.FileManager && (<a href={revolutionLinks.FileManager} target="_blank" rel="noopener noreferrer" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-6 rounded-lg flex-shrink-0">File Manager</a>)}
                                <button onClick={handleGenerateCreatorCsv} className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-2.5 px-6 rounded-lg">Next & Download CSV 1</button>
                            </div>,
                             () => setStep(3)
                        )}

                        {step >= 4 && (
                            <div className="p-6 bg-black/20 rounded-lg">
                                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">4. Add Products & Generate Mapping CSV</h3>
                                <p className="text-sm text-center text-green-400 mb-4">✅ Category Creator CSV has been downloaded.</p>
                                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Part Numbers</label>
                                <textarea value={partNumbers} onChange={e => onStateChange({ partNumbers: e.target.value })} placeholder="Paste part numbers here, separated by new lines or commas." className="w-full h-48 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-3 font-mono resize-y" />
                                <p className="text-sm text-right text-[var(--color-text-secondary)] mt-2">Part Count: {partCount}</p>
                                <div className="text-center mt-4"><button onClick={handleGeneratePartMappingCsv} disabled={!partNumbers.trim()} className="bg-[var(--color-positive)] hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-lg text-base">Generate Part Mapping CSV</button></div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {renderStep(1, "Client, Brand, & Category Name", <p>{selectedClient}, {selectedBrand}, {categoryName}</p>, null, () => handleReset())}
                        {renderStep(2, "SEO & Page Details", <p>Completed</p>, null, () => setStep(2))}
                        {renderStep(3, "Content Image URL", <p>Completed & CSV 1 Downloaded</p>, null, () => setStep(3))}
                        {renderStep(4, "Add Products", <p>CSV 2 Downloaded</p>, null, () => setStep(4))}

                        <div className="p-6 bg-green-500/10 rounded-lg mt-4 text-center">
                            <h3 className="text-lg font-bold text-green-300 mb-4">✅ Success! Both CSVs are ready.</h3>
                            <p className="text-white mb-6">Upload your CSVs to Revolution Parts. Start with the Category Creator file, then the Part Mapping file.</p>
                            {revolutionLinks?.Imports ? (
                                <a href={revolutionLinks.Imports} target="_blank" rel="noopener noreferrer" className="bg-sky-600 hover:bg-sky-7-00 text-white font-bold py-3 px-6 rounded-lg inline-flex items-center justify-center">Go to Imports Page<LinkIcon /></a>
                            ) : (<p className="text-sm text-gray-400">Import link not available for {selectedClient}.</p>)}
                            <button onClick={handleReset} className="mt-6 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg">Start Over</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CategoryPageCreatorTool;