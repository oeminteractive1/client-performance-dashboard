import React, { useState, useMemo, useEffect } from 'react';
import { AccountDetailsRecord } from '../types';

// Define the state for this tool from App.tsx
interface GoogleAdsRobotToolState {
    selectedClient: string;
}

interface GoogleAdsRobotToolProps {
    allAccountDetails: AccountDetailsRecord[];
    gapiClient: any;
    isSignedIn: boolean;
    toolState: GoogleAdsRobotToolState;
    onStateChange: (newState: Partial<GoogleAdsRobotToolState>) => void;
}

interface Campaign {
    id: string;
    name: string;
    resourceName: string;
    status: 'ENABLED' | 'PAUSED';
    budgetResourceName: string;
    budgetAmountMicros: number;
    stats?: {
        clicks?: number;
        impressions?: number;
        cost?: number;
    };
}

/**
 * Parses a Google API error object to extract a detailed, human-readable message.
 * @param error The error object from a caught exception.
 * @returns A detailed error string.
 */
const getGoogleAdsApiErrorMessage = (error: any): string => {
    if (!error) return 'An unknown error occurred.';

    // This handles the gapiClient.request error structure.
    const apiError = error.result?.error;
    if (apiError) {
        const mainMessage = apiError.message || 'An unknown API error occurred.';
        // Google Ads API often has more specific details nested here
        const adsErrorDetails = apiError.details?.[0]?.errors?.[0]?.message;
        return adsErrorDetails ? `${mainMessage} Details: ${adsErrorDetails}` : mainMessage;
    }

    // This handles plain Error objects thrown from our helper function.
    if (error.message) {
        return error.message;
    }

    // Fallback for other weird error shapes
    try {
        const stringified = JSON.stringify(error);
        return stringified === '{}' ? 'An unknown error occurred.' : stringified;
    } catch {
        return 'An unknown error occurred while processing the error object.';
    }
};


const GoogleAdsRobotTool: React.FC<GoogleAdsRobotToolProps> = ({ allAccountDetails, gapiClient, isSignedIn, toolState, onStateChange }) => {
    const { selectedClient } = toolState;

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [log, setLog] = useState<string[]>([]);
    const [displayCustomerId, setDisplayCustomerId] = useState<string | null>(null);
    const [googleAdsAccounts, setGoogleAdsAccounts] = useState<{id: number, name: string}[]>([]);

    // Fetch Google Ads accounts on component mount
    useEffect(() => {
        if (isSignedIn) {
            fetchGoogleAdsAccounts();
        }
    }, [isSignedIn]);

    // Clear state and update display ID when client changes
    useEffect(() => {
        if (selectedClient) {
            const id = getCustomerId(selectedClient);
            setDisplayCustomerId(id);
            // Also clear previous results
            setCampaigns([]);
            setLog([]);
        } else {
            setDisplayCustomerId(null);
            setCampaigns([]);
            setLog([]);
        }
    }, [selectedClient, allAccountDetails, googleAdsAccounts]); // Dependencies for getCustomerId

    const addToLog = (message: string) => {
        setLog(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
    };
    
    /**
     * Calls the backend API for Google Ads operations.
     * @param endpoint The API endpoint to call.
     * @param payload The request payload.
     * @returns The API response.
     */
    const callBackendAPI = async (endpoint: string, payload: any) => {
        const BACKEND_URL = 'http://localhost:3002';
        
        try {
            const response = await fetch(`${BACKEND_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Backend API error ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error from backend');
            }

            return result;
        } catch (error) {
            console.error('Backend API call failed:', error);
            throw error;
        }
    };

    /**
     * Fetches Google Ads campaign data via backend API.
     * @param customerId The Google Ads customer ID.
     * @returns Campaign data from Google Ads API.
     */
    const fetchCampaignsFromAds = async (customerId: string) => {
        return await callBackendAPI('/api/campaigns', { customerId });
    };

    /**
     * Pauses a Google Ads campaign.
     * @param customerId The Google Ads customer ID.
     * @param campaignId The campaign ID to pause.
     */
    const pauseCampaign = async (customerId: string, campaignId: string) => {
        return await callBackendAPI('/api/campaigns/pause', { customerId, campaignId });
    };

    /**
     * Enables a Google Ads campaign.
     * @param customerId The Google Ads customer ID.
     * @param campaignId The campaign ID to enable.
     */
    const enableCampaign = async (customerId: string, campaignId: string) => {
        return await callBackendAPI('/api/campaigns/enable', { customerId, campaignId });
    };

    /**
     * Updates a campaign budget.
     * @param customerId The Google Ads customer ID.
     * @param campaignId The campaign ID to update.
     * @param budgetAmount The new budget amount in dollars.
     */
    const updateCampaignBudget = async (customerId: string, campaignId: string, budgetAmount: number) => {
        return await callBackendAPI('/api/campaigns/budget', { customerId, campaignId, budgetAmount });
    };

    /**
     * Fetches Google Ads accounts from the backend.
     */
    const fetchGoogleAdsAccounts = async () => {
        try {
            const response = await fetch('http://localhost:3002/api/accounts');
            const data = await response.json();
            if (data.success) {
                setGoogleAdsAccounts(data.results);
            }
        } catch (error) {
            console.error('Failed to fetch Google Ads accounts:', error);
        }
    };


    const getCustomerId = (clientName: string): string | null => {
        // First try to match by name in the real Google Ads accounts
        const adsAccount = googleAdsAccounts.find(account => 
            account.name && account.name.toLowerCase() === clientName.toLowerCase()
        );
        
        if (adsAccount) {
            return adsAccount.id.toString();
        }
        
        // Fallback to spreadsheet data if account not found
        const details = allAccountDetails.find(c => c.ClientName === clientName);
        const adsId = details?.['Google Ads'];
        
        if (!adsId || !adsId.trim() || adsId.trim() === '-') {
            return null;
        }
    
        let customerId: string | null = null;
    
        try {
            if (adsId.startsWith('http')) {
                const url = new URL(adsId);
                customerId = url.searchParams.get('ocid') || url.searchParams.get('cid');
            } else {
                customerId = adsId;
            }
        } catch (e) {
            console.warn("Could not parse Google Ads ID as a URL, treating as raw ID:", adsId);
            customerId = adsId;
        }
    
        return customerId ? customerId.replace(/-/g, '') : null;
    };
    
    const clientsWithAds = useMemo(() => {
        return allAccountDetails
            .filter(c => c['Google Ads'] && c['Google Ads'].trim() && c['Google Ads'].trim() !== '-')
            .sort((a, b) => a.ClientName.localeCompare(b.ClientName));
    }, [allAccountDetails]);
    
    const handleCampaignAction = async (action: 'pause' | 'enable' | 'updateBudget', campaign: Campaign, newBudget?: number) => {
        if (!selectedClient) return;
        
        const customerId = getCustomerId(selectedClient);
        if (!customerId) return;
        
        setIsLoading(true);
        
        try {
            let result;
            switch (action) {
                case 'pause':
                    result = await pauseCampaign(customerId, campaign.id);
                    addToLog(`✅ Successfully paused campaign: ${campaign.name}`);
                    break;
                case 'enable':
                    result = await enableCampaign(customerId, campaign.id);
                    addToLog(`✅ Successfully enabled campaign: ${campaign.name}`);
                    break;
                case 'updateBudget':
                    if (newBudget) {
                        result = await updateCampaignBudget(customerId, campaign.id, newBudget);
                        addToLog(`✅ Successfully updated budget for ${campaign.name} to $${newBudget}/day`);
                    }
                    break;
            }
            
            // Refresh campaigns after action
            await handleFetchCampaigns();
            
        } catch (error) {
            const errorMessage = getGoogleAdsApiErrorMessage(error);
            addToLog(`❌ Error ${action === 'updateBudget' ? 'updating budget' : `${action}ing campaign`}: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFetchCampaigns = async () => {
        if (!isSignedIn || !gapiClient || !selectedClient) return;
        
        setIsLoading(true);
        setCampaigns([]);
        addToLog(`Fetching active campaigns for ${selectedClient}...`);
        
        const customerId = getCustomerId(selectedClient);
        if (!customerId) {
            addToLog(`❌ Error: Google Ads ID not found for ${selectedClient}.`);
            setIsLoading(false);
            return;
        }

        try {
            const data = await fetchCampaignsFromAds(customerId);

            const results = data.results || [];
            if (results.length === 0) {
                addToLog(`ℹ️ No active campaigns found for ${selectedClient}.`);
            } else {
                addToLog(`✅ Success! Found ${results.length} active campaigns.`);
            }
            
            const fetchedCampaigns = results.map((r: any) => ({
                id: r.campaign.id || r.campaign.resourceName.split('/').pop(),
                name: r.campaign.name,
                resourceName: r.campaign.resourceName,
                status: r.campaign.status,
                budgetResourceName: r.campaign.campaignBudget,
                budgetAmountMicros: r.campaignBudget?.amountMicros || 0,
                stats: {
                    clicks: r.metrics?.clicks || 0,
                    impressions: r.metrics?.impressions || 0,
                    cost: (r.metrics?.costMicros || 0) / 1000000
                }
            }));
            setCampaigns(fetchedCampaigns);

        } catch (error) {
            const errorMessage = getGoogleAdsApiErrorMessage(error);
            addToLog(`❌ Error fetching campaigns: ${errorMessage}`);
            console.error("Error fetching campaigns:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] rounded-xl p-8 shadow-2xl border border-[var(--color-border)] w-full max-w-5xl mx-auto flex flex-col items-center">
            <h2 className="text-2xl font-semibold mb-2 text-[var(--color-text-primary)]">Google Ads Playground</h2>
            <p className="text-center text-[var(--color-text-secondary)] mb-6 max-w-2xl">
                This is a tool for testing interactions with the Google Ads API. Select a client to view and manage their campaigns.
            </p>
            
            {!isSignedIn ? (
                 <div className="w-full text-center bg-amber-500/10 border border-amber-500/50 text-amber-300 p-4 rounded-lg">
                    <p className="font-semibold">Authentication Required</p>
                    <p className="text-sm">Please sign in with your Google account in the header to use this tool.</p>
                </div>
            ) : (
                <div className="w-full space-y-6">
                    {/* Client Selector */}
                    <div className="max-w-md mx-auto">
                        <label htmlFor="client-selector" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2 text-center">Select a Client</label>
                        <select
                            id="client-selector"
                            value={selectedClient}
                            onChange={e => onStateChange({ selectedClient: e.target.value })}
                            className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
                        >
                            <option value="">-- Select a Client --</option>
                            {clientsWithAds.map(client => (
                                <option key={client.ClientName} value={client.ClientName}>{client.ClientName}</option>
                            ))}
                        </select>
                    </div>

                    {/* Main Content Area */}
                    {selectedClient && (
                         <div className="w-full mt-4 pt-6 border-t border-[var(--color-border)] grid grid-cols-1 md:grid-cols-2 gap-8">
                             {/* Left Column: Actions and Info */}
                            <div>
                                <div className="bg-black/20 p-4 rounded-lg mb-6">
                                    <p className="text-sm text-[var(--color-text-secondary)]">Client Selected: <strong className="text-white">{selectedClient}</strong></p>
                                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">Google Ads Customer ID to be used:</p>
                                    {displayCustomerId ? (
                                        <p className="font-mono text-lg text-[var(--color-accent)] bg-black/30 p-2 rounded mt-1">{displayCustomerId}</p>
                                    ) : (
                                        <p className="font-mono text-lg text-[var(--color-negative)] bg-black/30 p-2 rounded mt-1">ID not found or invalid.</p>
                                    )}
                                </div>

                                <h3 className="text-lg font-bold mb-4">Actions</h3>
                                <div className="space-y-4">
                                     <button
                                        onClick={handleFetchCampaigns}
                                        disabled={isLoading}
                                        className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-colors text-base"
                                    >
                                        {isLoading ? 'Fetching...' : 'Fetch Active Campaigns'}
                                    </button>
                                </div>
                                <h3 className="text-lg font-bold mt-8 mb-4">Log</h3>
                                <div className="w-full h-64 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-xs rounded-lg p-3 font-mono overflow-y-auto flex flex-col-reverse">
                                    {log.length > 0 ? log.join('\n') : <span className="text-gray-500">No actions yet.</span>}
                                </div>
                            </div>
                            
                            {/* Right Column: Campaign List */}
                            <div>
                                 <h3 className="text-lg font-bold mb-4">Campaigns ({campaigns.length})</h3>
                                 <div className="w-full h-[28rem] bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-sm rounded-lg p-2 font-mono overflow-y-auto">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">Loading...</div>
                                    ) : campaigns.length > 0 ? (
                                        <ul className="divide-y divide-[var(--color-border)]">
                                            {campaigns.map(campaign => (
                                                <li key={campaign.resourceName} className="p-4 border-b border-[var(--color-border)] last:border-b-0">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-white truncate" title={campaign.name}>{campaign.name}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                                    campaign.status === 'ENABLED' 
                                                                        ? 'bg-green-500/20 text-green-300'
                                                                        : 'bg-yellow-500/20 text-yellow-300'
                                                                }`}>
                                                                    {campaign.status}
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    Budget: ${(campaign.budgetAmountMicros / 1000000).toFixed(2)}/day
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1 ml-2">
                                                            {campaign.status === 'ENABLED' ? (
                                                                <button
                                                                    onClick={() => handleCampaignAction('pause', campaign)}
                                                                    disabled={isLoading}
                                                                    className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white text-xs rounded"
                                                                    title="Pause Campaign"
                                                                >
                                                                    Pause
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleCampaignAction('enable', campaign)}
                                                                    disabled={isLoading}
                                                                    className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs rounded"
                                                                    title="Enable Campaign"
                                                                >
                                                                    Enable
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => {
                                                                    const newBudget = prompt('Enter new daily budget (USD):', (campaign.budgetAmountMicros / 1000000).toFixed(2));
                                                                    if (newBudget && !isNaN(parseFloat(newBudget))) {
                                                                        handleCampaignAction('updateBudget', campaign, parseFloat(newBudget));
                                                                    }
                                                                }}
                                                                disabled={isLoading}
                                                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded"
                                                                title="Update Budget"
                                                            >
                                                                Budget
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {campaign.stats && (
                                                        <div className="text-xs text-gray-500 grid grid-cols-3 gap-2">
                                                            <div>Clicks: {campaign.stats.clicks?.toLocaleString() || 0}</div>
                                                            <div>Impressions: {campaign.stats.impressions?.toLocaleString() || 0}</div>
                                                            <div>Cost: ${campaign.stats.cost?.toFixed(2) || '0.00'}</div>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-500">
                                            No campaigns loaded.
                                        </div>
                                    )}
                                 </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
export default GoogleAdsRobotTool;