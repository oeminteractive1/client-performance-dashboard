import React, { useState, useMemo, useEffect } from 'react';
import { AccountDetailsRecord, GoogleAdsRobotToolState } from '../types';

interface Campaign {
    campaign: {
        id: string;
        name: string;
        status: string;
    };
    campaignBudget: {
        amountMicros: number;
    };
    metrics: {
        clicks: number;
        impressions: number;
        costMicros: number;
    };
}

interface GoogleAdsRobotToolProps {
    allAccountDetails: AccountDetailsRecord[];
    gapiClient: any;
    isSignedIn: boolean;
    toolState: GoogleAdsRobotToolState;
    onStateChange: (newState: GoogleAdsRobotToolState) => void;
}

const GoogleAdsRobotTool: React.FC<GoogleAdsRobotToolProps> = ({ 
    allAccountDetails, 
    gapiClient, 
    isSignedIn, 
    toolState, 
    onStateChange 
}) => {
    const { selectedClient } = toolState;
    
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [log, setLog] = useState<string[]>([]);
    const [campaignFilter, setCampaignFilter] = useState<'all' | 'pmax' | 'search'>('all');

    // Get Google Ads ID for selected client
    const getGoogleAdsId = (clientName: string): string | null => {
        if (!clientName) return null;
        
        const client = allAccountDetails.find(c => c.ClientName === clientName);
        if (!client) return null;
        
        const adsId = client['Google Ads ID'];
        if (!adsId) return null;
        
        // Remove hyphens for API usage
        return adsId.replace(/-/g, '');
    };

    const currentGoogleAdsId = useMemo(() => {
        return selectedClient ? getGoogleAdsId(selectedClient) : null;
    }, [selectedClient, allAccountDetails]);

    // Auto-fetch campaigns when client changes
    useEffect(() => {
        if (selectedClient && currentGoogleAdsId) {
            fetchCampaigns();
        } else {
            setCampaigns([]);
        }
    }, [selectedClient, currentGoogleAdsId]);

    // Get all clients from Settings tab
    const availableClients = useMemo(() => {
        return allAccountDetails
            .map(client => client.ClientName)
            .filter(Boolean)
            .sort();
    }, [allAccountDetails]);

    // Filter campaigns based on type
    const filteredCampaigns = useMemo(() => {
        if (campaignFilter === 'all') return campaigns;
        
        return campaigns.filter(campaign => {
            const name = campaign.campaign.name.toLowerCase();
            if (campaignFilter === 'pmax') {
                return name.includes('perf max') || name.includes('pmax') || name.includes('performance max');
            } else if (campaignFilter === 'search') {
                return name.includes('search') && !name.includes('perf max') && !name.includes('pmax');
            }
            return true;
        });
    }, [campaigns, campaignFilter]);

    const addToLog = (message: string) => {
        setLog(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
    };

    const fetchCampaigns = async () => {
        if (!currentGoogleAdsId) {
            addToLog('No Google Ads ID available');
            return;
        }

        setIsLoading(true);
        addToLog(`Fetching campaigns for customer ID: ${currentGoogleAdsId}`);

        try {
            const response = await fetch('http://localhost:3002/api/campaigns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ customerId: currentGoogleAdsId })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Backend API error ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error from backend');
            }

            setCampaigns(result.results || []);
            addToLog(`Loaded ${result.results?.length || 0} campaigns`);
        } catch (error) {
            addToLog(`Error fetching campaigns: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    const pauseCampaign = async (campaignId: string) => {
        if (!currentGoogleAdsId) return;

        setIsLoading(true);
        addToLog(`Pausing campaign ${campaignId}`);

        try {
            const response = await fetch('http://localhost:3002/api/campaigns/pause', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    customerId: currentGoogleAdsId,
                    campaignId: campaignId
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Backend API error ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to pause campaign');
            }

            // Update local state
            setCampaigns(prev => prev.map(campaign => 
                campaign.campaign.id === campaignId 
                    ? { ...campaign, campaign: { ...campaign.campaign, status: 'PAUSED' } }
                    : campaign
            ));
            
            addToLog(`Campaign ${campaignId} paused successfully`);
        } catch (error) {
            addToLog(`Error pausing campaign: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    const enableCampaign = async (campaignId: string) => {
        if (!currentGoogleAdsId) return;

        setIsLoading(true);
        addToLog(`Enabling campaign ${campaignId}`);

        try {
            const response = await fetch('http://localhost:3002/api/campaigns/enable', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    customerId: currentGoogleAdsId,
                    campaignId: campaignId
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Backend API error ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to enable campaign');
            }

            // Update local state
            setCampaigns(prev => prev.map(campaign => 
                campaign.campaign.id === campaignId 
                    ? { ...campaign, campaign: { ...campaign.campaign, status: 'ENABLED' } }
                    : campaign
            ));
            
            addToLog(`Campaign ${campaignId} enabled successfully`);
        } catch (error) {
            addToLog(`Error enabling campaign: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    const pauseAllCampaigns = async () => {
        const enabledCampaigns = campaigns.filter(c => c.campaign.status === 'ENABLED');
        if (enabledCampaigns.length === 0) {
            addToLog('No enabled campaigns to pause');
            return;
        }

        setIsLoading(true);
        addToLog(`Pausing ${enabledCampaigns.length} enabled campaigns...`);

        for (const campaign of enabledCampaigns) {
            try {
                const response = await fetch('http://localhost:3002/api/campaigns/pause', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        customerId: currentGoogleAdsId,
                        campaignId: campaign.campaign.id
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Backend API error ${response.status}: ${errorText}`);
                }

                const result = await response.json();
                
                if (result.success) {
                    addToLog(`✓ Paused: ${campaign.campaign.name}`);
                } else {
                    addToLog(`✗ Failed to pause: ${campaign.campaign.name}`);
                }
            } catch (error) {
                addToLog(`✗ Error pausing ${campaign.campaign.name}: ${error}`);
            }
        }

        // Refresh campaigns to get updated statuses
        setTimeout(() => {
            fetchCampaigns();
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] p-8">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-4 text-white">Google Ads Playground</h1>
                    <p className="text-lg text-[var(--color-text-secondary)]">
                        This is a tool for testing interactions with the Google Ads API. Select a client to view and manage their campaigns.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Client Selection */}
                    <div className="bg-[var(--color-card-bg)] p-6 rounded-lg border border-[var(--color-border)]">
                        <h3 className="text-xl font-semibold mb-4">Select a Client</h3>
                        <div className="space-y-4">
                            <select
                                value={selectedClient}
                                onChange={e => onStateChange({ selectedClient: e.target.value })}
                                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
                            >
                                <option value="">-- Select a Client --</option>
                                {availableClients.map(clientName => (
                                    <option key={clientName} value={clientName}>
                                        {clientName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedClient && (
                            <div className="mt-6 p-4 bg-[var(--color-bg-secondary)] rounded border border-[var(--color-border)]">
                                <h4 className="font-semibold mb-2">Client Selected: {selectedClient}</h4>
                                <p className="text-sm text-[var(--color-text-secondary)] mb-2">Google Ads Customer ID to be used:</p>
                                <div className="font-mono text-sm p-2 bg-[var(--color-bg-primary)] rounded border">
                                    {currentGoogleAdsId || (
                                        <span className="text-red-400">ID not found or invalid.</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="bg-[var(--color-card-bg)] p-6 rounded-lg border border-[var(--color-border)]">
                        <h3 className="text-xl font-semibold mb-4">Actions</h3>
                        
                        {/* Campaign Filter */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Filter Campaigns</label>
                            <select
                                value={campaignFilter}
                                onChange={e => setCampaignFilter(e.target.value as 'all' | 'pmax' | 'search')}
                                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
                            >
                                <option value="all">All Campaigns ({campaigns.length})</option>
                                <option value="pmax">Performance Max ({campaigns.filter(c => {
                                    const name = c.campaign.name.toLowerCase();
                                    return name.includes('perf max') || name.includes('pmax') || name.includes('performance max');
                                }).length})</option>
                                <option value="search">Search Campaigns ({campaigns.filter(c => {
                                    const name = c.campaign.name.toLowerCase();
                                    return name.includes('search') && !name.includes('perf max') && !name.includes('pmax');
                                }).length})</option>
                            </select>
                        </div>
                        
                        <button
                            onClick={pauseAllCampaigns}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!selectedClient || !currentGoogleAdsId || isLoading || campaigns.filter(c => c.campaign.status === 'ENABLED').length === 0}
                        >
                            {isLoading ? 'Pausing...' : `Pause All Campaigns (${campaigns.filter(c => c.campaign.status === 'ENABLED').length})`}
                        </button>
                    </div>
                </div>

                {/* Campaigns Section */}
                <div className="mt-8 bg-[var(--color-card-bg)] p-6 rounded-lg border border-[var(--color-border)]">
                    <h3 className="text-xl font-semibold mb-4">
                        {campaignFilter === 'all' ? 'All Campaigns' : 
                         campaignFilter === 'pmax' ? 'Performance Max Campaigns' : 'Search Campaigns'} 
                        ({filteredCampaigns.length})
                    </h3>
                    
                    {filteredCampaigns.length === 0 ? (
                        <div className="text-center text-[var(--color-text-secondary)] py-8">
                            {campaigns.length === 0 ? 'No campaigns loaded.' : 'No campaigns match the selected filter.'}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredCampaigns.map(campaign => (
                                <div key={campaign.campaign.id} className="bg-[var(--color-bg-secondary)] p-4 rounded border border-[var(--color-border)]">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h4 className="font-semibold">{campaign.campaign.name}</h4>
                                            <p className="text-sm text-[var(--color-text-secondary)]">ID: {campaign.campaign.id}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-4">
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                                campaign.campaign.status === 'ENABLED' 
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                            }`}>
                                                {campaign.campaign.status}
                                            </span>
                                            <p className="text-sm mt-1">Budget: ${(campaign.campaignBudget.amountMicros / 1000000).toFixed(2)}</p>
                                            <p className="text-sm">Clicks: {campaign.metrics.clicks}</p>
                                            
                                            <div className="mt-3 space-x-2">
                                                {campaign.campaign.status === 'ENABLED' ? (
                                                    <button
                                                        onClick={() => pauseCampaign(campaign.campaign.id)}
                                                        disabled={isLoading}
                                                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors disabled:opacity-50"
                                                    >
                                                        Pause
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => enableCampaign(campaign.campaign.id)}
                                                        disabled={isLoading}
                                                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors disabled:opacity-50"
                                                    >
                                                        Enable
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Log Section */}
                <div className="mt-8 bg-[var(--color-card-bg)] p-6 rounded-lg border border-[var(--color-border)]">
                    <h3 className="text-xl font-semibold mb-4">Log</h3>
                    <div className="bg-[var(--color-bg-primary)] p-4 rounded border border-[var(--color-border)] h-64 overflow-y-auto">
                        {log.length === 0 ? (
                            <div className="text-[var(--color-text-secondary)] text-sm">
                                Ready to start...
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {log.map((entry, index) => (
                                    <div key={index} className="text-[var(--color-text-primary)] text-sm font-mono">
                                        {entry}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoogleAdsRobotTool;