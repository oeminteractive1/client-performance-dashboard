import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyContactRecord } from '../types';
import BetaModeBadge from './BetaModeBadge';
import AlertsPopover from './AlertsPopover';
import AccountDropdown from './AccountDropdown';
import ToolsPopover from './ToolsPopover';
import DashboardsPopover from './DashboardsPopover';

interface BetaHeaderProps {
    currentPath: string;
    selectedClient: string | null;
    clients: string[];
    onSelectClient: (client: string) => void;
    selectedAutoGroup: string | null;
    autoGroups: string[];
    onSelectAutoGroup: (group: string) => void;
    onNavigate: (path: string) => void;
    onSignOut: () => void;
    isSignedIn: boolean;
    userName?: string;
    onToggleBetaMode: () => void;
    keyContactForClient?: KeyContactRecord;
    onOpenDataConnections: () => void;
    onOpenDashboardCustomization: () => void;
    onOpenThemes: () => void;
    quickLinks: string[];
    onToggleQuickLink: (toolId: string) => void;
    closedStores: { name: string; status: string; }[];
    recentChanges: { name: string; changes: { type: string; date: Date }[] }[];
    oldFeeds: { name: string; feeds: string[] }[];
    alertCount: number;
    onSelectClientFromAlert: (clientName: string) => void;
}

const BetaHeader: React.FC<BetaHeaderProps> = ({
    currentPath,
    selectedClient,
    clients,
    onSelectClient,
    selectedAutoGroup,
    autoGroups,
    onSelectAutoGroup,
    onNavigate,
    onSignOut,
    isSignedIn,
    userName,
    onToggleBetaMode,
    keyContactForClient,
    onOpenDataConnections,
    onOpenDashboardCustomization,
    onOpenThemes,
    quickLinks,
    onToggleQuickLink,
    closedStores,
    recentChanges,
    oldFeeds,
    alertCount,
    onSelectClientFromAlert,
}) => {
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [clientSearchQuery, setClientSearchQuery] = useState('');
    const clientSelectorRef = useRef<HTMLDivElement>(null);

    const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
    const [groupSearchQuery, setGroupSearchQuery] = useState('');
    const groupSelectorRef = useRef<HTMLDivElement>(null);

    // Popover states for navigation menus
    const [isDashboardsPopoverOpen, setIsDashboardsPopoverOpen] = useState(false);
    const [isToolsPopoverOpen, setIsToolsPopoverOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAlertsOpen, setIsAlertsOpen] = useState(false);

    // Filter clients based on search
    const filteredClients = clients.filter(c =>
        c.toLowerCase().includes(clientSearchQuery.toLowerCase())
    );

    // Filter groups based on search
    const filteredGroups = autoGroups.filter(g =>
        g.toLowerCase().includes(groupSearchQuery.toLowerCase())
    );

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (clientSelectorRef.current && !clientSelectorRef.current.contains(event.target as Node)) {
                setIsClientDropdownOpen(false);
            }
            if (groupSelectorRef.current && !groupSelectorRef.current.contains(event.target as Node)) {
                setIsGroupDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navigate = useNavigate();

    const handleBackToHome = () => {
        navigate('/');
    };

    const handleToggleAlerts = () => {
        setIsToolsPopoverOpen(false);
        setIsDashboardsPopoverOpen(false);
        setIsSettingsOpen(false);
        setIsAlertsOpen(prev => !prev);
    };

    const showClientSelector = currentPath === '/dashboards/client' && clients.length > 0;
    const showGroupSelector = currentPath === '/dashboards/multi-client' && autoGroups.length > 0;

    return (
        <header className="flex-shrink-0 bg-[var(--color-card-bg)] backdrop-blur-md rounded-xl border border-[var(--color-border)] shadow-lg mb-4 mx-16 z-50 relative">
            {/* Single Row - macOS Style Taskbar */}
            <div className="flex items-center justify-between px-6 h-12">
                {/* Left Section - Navigation */}
                <div className="flex items-center gap-3">
                    {/* Home Button */}
                    <button
                        onClick={handleBackToHome}
                        className="hover:bg-[var(--color-input-bg)] text-[var(--color-text-secondary)] p-1.5 rounded-md transition-colors"
                        title="Home"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                    </button>

                    {/* Dashboards Popover - Hidden if not signed in */}
                    {isSignedIn && (
                        <div className="relative">
                            <button
                                onClick={() => setIsDashboardsPopoverOpen(!isDashboardsPopoverOpen)}
                                className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer px-2"
                            >
                                <span>Dashboards</span>
                            </button>
                            {isDashboardsPopoverOpen && (
                                <DashboardsPopover
                                    onClose={() => setIsDashboardsPopoverOpen(false)}
                                    onSelectTool={(tool) => {
                                        onNavigate(tool);
                                        setIsDashboardsPopoverOpen(false);
                                    }}
                                    quickLinks={quickLinks}
                                    onToggleQuickLink={onToggleQuickLink}
                                />
                            )}
                        </div>
                    )}

                    {/* Tools Popover */}
                    <div className="relative">
                        <button
                            onClick={() => setIsToolsPopoverOpen(!isToolsPopoverOpen)}
                            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer px-2"
                        >
                            <span>Tools</span>
                        </button>
                        {isToolsPopoverOpen && (
                            <ToolsPopover
                                onClose={() => setIsToolsPopoverOpen(false)}
                                onSelectTool={(tool) => {
                                    onNavigate(tool);
                                    setIsToolsPopoverOpen(false);
                                }}
                                quickLinks={quickLinks}
                                onToggleQuickLink={onToggleQuickLink}
                            />
                        )}
                    </div>

                    {/* Settings Dropdown */}
                    <div className="relative">
                        <div
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer px-2"
                        >
                            <span>Settings ▾</span>
                        </div>
                        {isSettingsOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
                                <div
                                    className="absolute top-full mt-3 right-1/2 translate-x-1/2 z-50 w-64"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-2xl">
                                        <div className="p-4 border-b border-[var(--color-border)]">
                                            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Settings</h3>
                                        </div>
                                        <div className="p-2">
                                            <ul className="space-y-1">
                                                <li>
                                                    <button
                                                        onClick={() => {
                                                            onOpenDataConnections();
                                                            setIsSettingsOpen(false);
                                                        }}
                                                        className="w-full text-left p-2 rounded-md hover:bg-black/20 transition-colors flex items-center gap-3"
                                                    >
                                                        <span className="text-xl">🔗</span>
                                                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">Data Connections</span>
                                                    </button>
                                                </li>
                                                <li>
                                                    <button
                                                        onClick={() => {
                                                            onOpenThemes();
                                                            setIsSettingsOpen(false);
                                                        }}
                                                        className="w-full text-left p-2 rounded-md hover:bg-black/20 transition-colors flex items-center gap-3"
                                                    >
                                                        <span className="text-xl">🎨</span>
                                                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">Themes</span>
                                                    </button>
                                                </li>
                                                <li>
                                                    <button
                                                        onClick={() => {
                                                            onOpenDashboardCustomization();
                                                            setIsSettingsOpen(false);
                                                        }}
                                                        className="w-full text-left p-2 rounded-md hover:bg-black/20 transition-colors flex items-center gap-3"
                                                    >
                                                        <span className="text-xl">⭐</span>
                                                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">Dashboard Customization</span>
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Beta Badge */}
                    <BetaModeBadge />
                </div>

                {/* Center Section - Empty spacer */}
                <div className="flex-1"></div>

                {/* Right Section - Client Selector, Notifications & Account */}
                <div className="flex items-center gap-3">
                    {/* Client Contact Info */}
                    {currentPath === '/dashboards/client' && keyContactForClient && (
                        <div className="flex items-center gap-2">
                            {keyContactForClient["PPC"] && (
                                <span className="bg-[var(--color-card-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)] px-3 py-1.5 rounded-lg font-medium shadow-sm text-xs">
                                    {keyContactForClient["PPC"]}
                                </span>
                            )}
                            {keyContactForClient["PDM"] && (
                                <span className="bg-[var(--color-card-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)] px-3 py-1.5 rounded-lg font-medium shadow-sm text-xs">
                                    {keyContactForClient["PDM"]}
                                </span>
                            )}
                            {keyContactForClient["Hubspot Contact Name"] && (
                                <span className="bg-[var(--color-card-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)] px-3 py-1.5 rounded-lg font-medium shadow-sm text-xs">
                                    {keyContactForClient["Hubspot Contact Name"]}
                                </span>
                            )}
                            {keyContactForClient["Hubspot Contact Phone"] && (
                                <span className="bg-[var(--color-card-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)] px-3 py-1.5 rounded-lg font-medium shadow-sm text-xs">
                                    {keyContactForClient["Hubspot Contact Phone"]}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Client/Group Selector */}
                    {showClientSelector && (
                        <div className="relative" ref={clientSelectorRef}>
                            <button
                                onClick={() => setIsClientDropdownOpen(prev => !prev)}
                                className="bg-[var(--color-input-bg)] hover:bg-[var(--color-accent-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm rounded-lg px-4 py-1.5 min-w-[250px] text-center flex justify-between items-center transition-colors"
                            >
                                <span className="truncate">{selectedClient || 'Select a Client'}</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`h-4 w-4 ml-2 text-[var(--color-text-secondary)] transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`}
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                            {isClientDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-[var(--color-input-bg)] border border-[var(--color-border)] rounded-lg shadow-xl">
                                    <div className="p-2">
                                        <input
                                            type="text"
                                            value={clientSearchQuery}
                                            onChange={e => setClientSearchQuery(e.target.value)}
                                            placeholder="Search clients..."
                                            className="w-full bg-[var(--color-input-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                                            autoFocus
                                        />
                                    </div>
                                    <ul className="max-h-[28rem] overflow-y-auto">
                                        {filteredClients.length > 0 ? (
                                            filteredClients.map(client => (
                                                <li
                                                    key={client}
                                                    onClick={() => {
                                                        onSelectClient(client);
                                                        setIsClientDropdownOpen(false);
                                                        setClientSearchQuery('');
                                                    }}
                                                    className="px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-accent-secondary)] cursor-pointer"
                                                >
                                                    {client}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="px-4 py-2 text-sm text-[var(--color-text-secondary)]">No clients found.</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {showGroupSelector && (
                        <div className="relative" ref={groupSelectorRef}>
                            <button
                                onClick={() => setIsGroupDropdownOpen(prev => !prev)}
                                className="bg-[var(--color-input-bg)] hover:bg-[var(--color-accent-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm rounded-lg px-4 py-1.5 min-w-[250px] text-center flex justify-between items-center transition-colors"
                            >
                                <span className="truncate">{selectedAutoGroup || 'Select an Auto Group'}</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`h-4 w-4 ml-2 text-[var(--color-text-secondary)] transition-transform ${isGroupDropdownOpen ? 'rotate-180' : ''}`}
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                            {isGroupDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-[var(--color-input-bg)] border border-[var(--color-border)] rounded-lg shadow-xl">
                                    <div className="p-2">
                                        <input
                                            type="text"
                                            value={groupSearchQuery}
                                            onChange={e => setGroupSearchQuery(e.target.value)}
                                            placeholder="Search groups..."
                                            className="w-full bg-[var(--color-input-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                                            autoFocus
                                        />
                                    </div>
                                    <ul className="max-h-[28rem] overflow-y-auto">
                                        {filteredGroups.length > 0 ? (
                                            filteredGroups.map(group => (
                                                <li
                                                    key={group}
                                                    onClick={() => {
                                                        onSelectAutoGroup(group);
                                                        setIsGroupDropdownOpen(false);
                                                        setGroupSearchQuery('');
                                                    }}
                                                    className="px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-accent-secondary)] cursor-pointer"
                                                >
                                                    {group}
                                                </li>
                                            ))
                                        ) : (
                                            <li className="px-4 py-2 text-sm text-[var(--color-text-secondary)]">No groups found.</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Alerts/Notifications */}
                    <div className="relative">
                        <button
                            onClick={handleToggleAlerts}
                            className="relative hover:bg-[var(--color-input-bg)] text-[var(--color-text-secondary)] p-1.5 rounded-md transition-colors"
                            title="Alerts"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                            </svg>
                            {alertCount > 0 && (
                                <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-600 rounded-full">
                                    {alertCount}
                                </span>
                            )}
                        </button>
                        {isAlertsOpen && (
                            <AlertsPopover
                                onClose={handleToggleAlerts}
                                closedStores={closedStores}
                                recentChanges={recentChanges}
                                oldFeeds={oldFeeds}
                                onSelectClient={onSelectClientFromAlert}
                            />
                        )}
                    </div>

                    <AccountDropdown
                        userName={userName || 'Guest'}
                        isSignedIn={isSignedIn}
                        onSignOut={onSignOut}
                        onToggleBetaMode={onToggleBetaMode}
                    />
                </div>
            </div>
        </header>
    );
};

export default BetaHeader;
