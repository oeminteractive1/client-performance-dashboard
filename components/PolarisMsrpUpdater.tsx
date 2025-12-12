import React, { useState, useEffect, useRef, useCallback } from 'react';

interface PolarisMsrpUpdaterProps {
    gapiClient: any;
    isSignedIn: boolean;
}

const SPREADSHEET_ID = '1tv5Vdd_mi3H3i07HqAmKEktmho-FO0NdrhVGiqYTnLQ';
const SHEET_NAME = 'MSRP';


const PolarisMsrpUpdater: React.FC<PolarisMsrpUpdaterProps> = ({ gapiClient, isSignedIn }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // State for the new workflow
    const [isWaiting, setIsWaiting] = useState(false);
    const [countdown, setCountdown] = useState(30);
    const [canProceed, setCanProceed] = useState(false);
    
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const completeCooldown = useCallback(() => {
        setIsWaiting(false);
        setCanProceed(true);
        setStatusMessage({ type: 'success', message: '✅ Cooldown complete! You may now proceed.' });
    }, []);
    
    useEffect(() => {
        if (!isWaiting) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
            return;
        }

        countdownIntervalRef.current = setInterval(() => {
            setCountdown(prev => (prev <= 1 ? 0 : prev - 1));
        }, 1000);

        actionTimeoutRef.current = setTimeout(completeCooldown, 30000);

        return () => {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
        };
    }, [isWaiting, completeCooldown]);


    const resetWorkflowState = () => {
        setUploadSuccess(false);
        setIsWaiting(false);
        setCountdown(30);
        setCanProceed(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        resetWorkflowState(); 
        const file = event.target.files?.[0];
        if (file && file.type === 'text/csv') {
            setSelectedFile(file);
            setStatusMessage({ type: 'info', message: `Selected file: ${file.name}` });
        } else {
            setSelectedFile(null);
            if (file) {
                 setStatusMessage({ type: 'error', message: 'Please select a valid .csv file.' });
            } else {
                setStatusMessage(null);
            }
        }
        event.target.value = '';
    };

    const parseCSV = (csvText: string): string[][] => {
        const lines = csvText.trim().split(/\r?\n/);
        const parseCsvLine = (line: string): string[] => {
            const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
            const values = [];
            let match;
            while ((match = regex.exec(line))) {
                values.push(match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2]);
            }
            return values;
        };
        return lines.map(line => parseCsvLine(line));
    };

    const handleSkipWait = () => {
        completeCooldown();
    };

    const handleUpload = async () => {
        if (!selectedFile || !gapiClient || !isSignedIn) return;

        setIsLoading(true);
        resetWorkflowState();
        setStatusMessage({ type: 'info', message: 'Reading and parsing CSV file...' });

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const csvText = e.target?.result as string;
                const values = parseCSV(csvText);
                if (values.length === 0) throw new Error('CSV file is empty or could not be parsed.');

                setStatusMessage({ type: 'info', message: `Found ${values.length} rows. Clearing existing data...` });
                await gapiClient.sheets.spreadsheets.values.clear({
                    spreadsheetId: SPREADSHEET_ID,
                    range: SHEET_NAME,
                });

                setStatusMessage({ type: 'info', message: 'Uploading new data to Google Sheets...' });
                const result = await gapiClient.sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${SHEET_NAME}!A1`,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values },
                });
                const updatedRows = result.result.updatedRows || 0;

                setStatusMessage({ type: 'success', message: `✅ Successfully uploaded ${updatedRows} rows. Starting 30s cooldown...` });
                setSelectedFile(null);
                setUploadSuccess(true);
                setIsWaiting(true); 
            } catch (err: any) {
                const errorMessage = err.result?.error?.message || err.message || 'An unknown error occurred.';
                console.error("Upload error:", err);
                if (errorMessage.includes('PERMISSION_DENIED')) {
                    setStatusMessage({ type: 'error', message: `❌ Upload failed: Permission Denied. Please ensure your Google account has 'Editor' access to the spreadsheet.` });
                } else {
                    setStatusMessage({ type: 'error', message: `❌ Upload failed: ${errorMessage}` });
                }
                setUploadSuccess(false);
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
            setStatusMessage({ type: 'error', message: 'Error reading the file.' });
            setIsLoading(false);
        };
        reader.readAsText(selectedFile);
    };

    const statusColor = {
        info: 'text-[var(--color-text-secondary)]',
        success: 'text-[var(--color-positive)]',
        error: 'text-[var(--color-negative)]',
    };
    
    const LinkIcon: React.FC = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
    );
    
    interface LinkButtonProps {
        href: string;
        text: string;
        subtext: string;
        enabledClass: string;
        subtextClass: string;
        disabled: boolean;
    }

    const LinkButton: React.FC<LinkButtonProps> = ({ href, text, subtext, enabledClass, subtextClass, disabled }) => {
        const baseClasses = "inline-flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors";
        const disabledClasses = "bg-gray-600 text-gray-400 cursor-not-allowed";

        return (
            <div className="text-center">
                {disabled ? (
                     <div className={`${baseClasses} ${disabledClasses}`}>
                        <span>{text}</span>
                        <LinkIcon />
                    </div>
                ) : (
                    <a href={href} target="_blank" rel="noopener noreferrer" className={`${baseClasses} ${enabledClass}`}>
                        <span>{text}</span>
                        <LinkIcon />
                    </a>
                )}
                <p className={`text-xs mt-2 ${subtextClass}`}>{subtext}</p>
            </div>
        );
    };


    return (
        <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] rounded-xl p-8 shadow-2xl border border-[var(--color-border)] w-full max-w-2xl mx-auto flex flex-col items-center">
            <h2 className="text-2xl font-semibold mb-2 text-[var(--color-text-primary)]">Polaris MSRP Updater</h2>
            <p className="text-center text-[var(--color-text-secondary)] mb-6 max-w-lg">
                Upload a CSV file to update the Polaris MSRP data. This will overwrite all existing data in the '{SHEET_NAME}' tab of the target Google Sheet.
            </p>

            {!isSignedIn ? (
                <div className="w-full text-center bg-amber-500/10 border border-amber-500/50 text-amber-300 p-4 rounded-lg">
                    <p className="font-semibold">Authentication Required</p>
                    <p className="text-sm">Please sign in with your Google account in the header to use this tool.</p>
                </div>
            ) : (
                <div className="w-full flex flex-col items-center gap-6">
                    <div className="w-full max-w-md">
                        <label htmlFor="csv-upload" className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--color-input-border)] rounded-lg cursor-pointer hover:bg-black/20 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mb-3 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h2a4 4 0 014 4v1m-4 3l-4 4m0 0l-4-4m4 4V7" /></svg>
                            <p className="mb-2 text-sm text-[var(--color-text-secondary)]">
                                <span className="font-semibold text-[var(--color-text-accent)]">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)]">CSV files only</p>
                        </label>
                        <input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                    </div>

                    {statusMessage && (
                        <div className={`p-3 rounded-lg text-sm text-center font-semibold ${statusMessage.type === 'info' ? 'bg-blue-900/40' : ''} ${statusMessage.type === 'success' ? 'bg-green-900/40' : ''} ${statusMessage.type === 'error' ? 'bg-red-900/40' : ''}`}>
                             <p className={statusColor[statusMessage.type]}>{statusMessage.message}</p>
                        </div>
                    )}
                    
                    {uploadSuccess && (
                        <div className="w-full max-w-md mt-4 p-4 bg-black/30 border border-white/20 rounded-lg text-center">
                            <h4 className="font-bold text-lg text-white mb-4">Next Steps</h4>
                            
                            <div className="mb-6 flex flex-col items-center gap-2 text-lg font-semibold">
                                {isWaiting && (
                                    <>
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-accent)]"></div>
                                        <p className="text-[var(--color-text-secondary)]">Cooldown in progress... <span className="text-white font-mono">{countdown}s</span></p>
                                        <button onClick={handleSkipWait} className="text-sm bg-gray-600 hover:bg-gray-700 text-white font-semibold py-1 px-3 rounded-lg transition-colors mt-2">
                                            Skip Wait
                                        </button>
                                    </>
                                )}
                                {canProceed && (
                                    <p className="text-[var(--color-positive)]">Ready to Proceed!</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <LinkButton 
                                    href="https://merchants.google.com/mc/products/sources/detail?a=129244414&afmDataSourceId=10082670039&tab=processing"
                                    text="Go to GMC"
                                    subtext="Click Update to send new Prices to GMC"
                                    enabledClass="bg-blue-600 hover:bg-blue-700 text-white"
                                    subtextClass="text-blue-200"
                                    disabled={!canProceed}
                                />
                                <LinkButton 
                                    href="https://ads.google.com/aw/campaigns?ocid=7315544145&ascid=7315544145&euid=319666021&__u=3334856829&uscid=126047711&__c=9148361639&authuser=0"
                                    text="Go to Google Ads"
                                    subtext="Unpause Campaigns"
                                    enabledClass="bg-green-600 hover:bg-green-700 text-white"
                                    subtextClass="text-green-200"
                                    disabled={!canProceed}
                                />
                            </div>
                        </div>
                    )}


                    <button
                        onClick={handleUpload}
                        disabled={!selectedFile || isLoading}
                        className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors text-base flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <span>Upload to Google Sheets</span>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default PolarisMsrpUpdater;