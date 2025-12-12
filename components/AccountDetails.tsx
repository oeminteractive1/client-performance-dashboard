import React from 'react';
import { KeyContactRecord } from '../types';

interface ContactsTileProps {
    data: KeyContactRecord | null;
}

const LinkIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
);

const Representative: React.FC<{ role: string; name: string; }> = ({ role, name }) => (
    <div className="flex-1">
        <p className="text-xs text-[var(--color-text-secondary)] font-medium uppercase tracking-wider">{role}</p>
        <p className="font-semibold text-lg text-[var(--color-text-primary)]">{name}</p>
    </div>
);


const ContactsTile: React.FC<ContactsTileProps> = ({ data }) => {
    if (!data) return null;

    const {
        PPC,
        PDM,
        Deal,
        'Hubspot Contact Name': hubspotContactName,
        'Hub Spot Contact ID': hubspotContactLink,
        'Hubspot Contact Phone': hubspotPhone,
    } = data;

    const hasPpc = PPC && PPC.trim() && PPC.trim() !== '-';
    const hasPdm = PDM && PDM.trim() && PDM.trim() !== '-';
    const hasDeal = Deal && Deal.trim() && Deal.trim() !== '-';
    const hasContactName = hubspotContactName && hubspotContactName.trim() && hubspotContactName.trim() !== '-';
    const hasContactLink = hubspotContactLink && hubspotContactLink.trim() && hubspotContactLink.trim() !== '-';
    const hasPhone = hubspotPhone && hubspotPhone.trim() && hubspotPhone.trim() !== '-';

    const hasInternalContacts = hasPpc || hasPdm;
    const hasHubspotInfo = hasDeal || hasContactName;

    if (!hasInternalContacts && !hasHubspotInfo) return null;

    return (
        <div className="flex-grow flex flex-col justify-center space-y-4 h-full">
            {hasInternalContacts && (
                <div className="bg-black/20 p-4 rounded-lg">
                    <h4 className="text-xs font-bold uppercase text-[var(--color-text-secondary)] mb-3">Your Representatives</h4>
                    <div className="flex flex-col sm:flex-row gap-4">
                        {hasPpc && <Representative role="PPC Manager" name={PPC} />}
                        {hasPdm && <Representative role="PDM" name={PDM} />}
                    </div>
                </div>
            )}

            {hasHubspotInfo && (
                <div className="bg-black/20 p-4 rounded-lg">
                     <h4 className="text-xs font-bold uppercase text-[var(--color-text-secondary)] mb-3">Client Point of Contact</h4>
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            {hasContactName && hasContactLink ? (
                                <a 
                                    href={hubspotContactLink.startsWith('http') ? hubspotContactLink : `https://${hubspotContactLink}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="font-bold text-xl text-[var(--color-text-accent)] hover:brightness-90 inline-flex items-center"
                                    title={hubspotContactLink}
                                >
                                    {hubspotContactName}
                                    <LinkIcon />
                                </a>
                            ) : hasContactName ? (
                                <p className="font-bold text-xl text-[var(--color-text-primary)]">{hubspotContactName}</p>
                            ) : null}

                            {hasPhone && (
                                <p className="text-sm text-[var(--color-text-secondary)] mt-1">{hubspotPhone}</p>
                            )}
                        </div>
                        
                        {hasDeal && (
                            <a 
                                href={Deal.startsWith('http') ? Deal : `https://${Deal}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="bg-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/40 text-[var(--color-accent)] font-semibold py-2 px-4 rounded-lg transition-colors inline-flex items-center self-start sm:self-center"
                                title={Deal}
                            >
                                View Deal
                                <LinkIcon />
                            </a>
                        )}
                     </div>
                </div>
            )}
        </div>
    );
};

export default ContactsTile;