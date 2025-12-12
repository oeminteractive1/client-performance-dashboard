
import React, { useState } from 'react';
import { StoreStatusRecord, AccountDetailsRecord, CurrentStatusRecord } from '../types';

interface StoreStatusTileProps {
    storeStatus: StoreStatusRecord;
    accountDetails: AccountDetailsRecord | null;
    currentStatus: CurrentStatusRecord | null;
    onUpdateStatus: (clientName: string, newStatus: string) => Promise<boolean>;
}

const StoreStatusTile: React.FC<StoreStatusTileProps> = ({ storeStatus, accountDetails, currentStatus, onUpdateStatus }) => {
    const { banner } = storeStatus;
    const { TAndC, FitmentVerification, RequiredField } = accountDetails || {};

    const [isEditing, setIsEditing] = useState(false);
    const [newStatus, setNewStatus] = useState(currentStatus?.status || '');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!currentStatus) return;
        setIsSaving(true);
        setSaveError(null);
        try {
            const success = await onUpdateStatus(currentStatus.clientName, newStatus);
            if (success) {
                setIsEditing(false);
            } else {
                setSaveError('Failed to save. Please try again.');
            }
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'An unknown error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditClick = () => {
        setNewStatus(currentStatus?.status || '');
        setIsEditing(true);
        setSaveError(null);
    };

    const normalizeYesNo = (value: string | undefined): 'Yes' | 'No' => {
        if (!value) return 'No';
        const lowerValue = value.trim().toLowerCase();
        if (lowerValue === '' || lowerValue === 'no' || lowerValue === 'n/a' || lowerValue === 'false') {
            return 'No';
        }
        return 'Yes';
    };

    const tAndCValue = normalizeYesNo(TAndC);
    const fitmentValue = normalizeYesNo(FitmentVerification);
    const requiredFieldValue = normalizeYesNo(RequiredField);

    const YesNoDisplay: React.FC<{ label: string; value: 'Yes' | 'No' }> = ({ label, value }) => (
        <div className="bg-black/20 p-4 rounded-lg flex flex-col items-center justify-center h-full">
            <p className="text-xs text-[var(--color-text-secondary)] font-medium uppercase tracking-wider mb-2">{label}</p>
            <p className={`font-bold text-2xl ${value === 'Yes' ? 'text-[var(--color-negative)]' : 'text-[var(--color-positive)]'}`}>{value}</p>
        </div>
    );

    return (
        <div className="h-full">
            <div className="flex flex-col h-full items-center justify-center text-center">
                <div className="flex flex-col items-center justify-center space-y-6 w-full">
                    {/* --- Custom Status Section --- */}
                    <div className="w-full">
                         <p className="font-semibold text-lg text-[var(--color-warning)]">Current Status</p>
                         {isEditing ? (
                             <div className="mt-1 px-4 max-w-full">
                                <textarea
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2"
                                    rows={3}
                                />
                                <div className="flex justify-center gap-2 mt-2">
                                    <button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm disabled:opacity-50">
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded text-sm">
                                        Cancel
                                    </button>
                                </div>
                                {saveError && <p className="text-xs text-red-400 mt-1">{saveError}</p>}
                            </div>
                         ) : (
                             <div className="group relative mt-1 text-lg text-[var(--color-text-primary)] break-words max-w-full px-4 min-h-[2.25rem]">
                                 <p>{currentStatus?.status || <span className="text-gray-500 italic">No status set.</span>}</p>
                                 <button onClick={handleEditClick} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-600 hover:bg-slate-500 p-1 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg>
                                 </button>
                             </div>
                         )}
                    </div>

                    {/* --- Banner Section --- */}
                    <div className="w-full">
                         <p className="font-semibold text-lg text-[var(--color-text-accent)]">Banner</p>
                         <p className="mt-1 text-[var(--color-text-primary)] break-words max-w-full px-4">
                            {banner ? banner : <span className="text-[var(--color-text-secondary)] italic">No active banner.</span>}
                         </p>
                    </div>

                    {/* --- Yes/No Section --- */}
                    <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                        <YesNoDisplay label="T&C" value={tAndCValue} />
                        <YesNoDisplay label="Fitment Verification" value={fitmentValue} />
                        <YesNoDisplay label="Required Field" value={requiredFieldValue} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoreStatusTile;
