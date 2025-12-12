
import React, { useEffect, useRef } from 'react';

interface DashboardsPopoverProps {
    onClose: () => void;
    onSelectTool: (tool: string) => void;
    quickLinks: string[];
    onToggleQuickLink: (toolId: string) => void;
}

const dashboards = [
    { key: 'client', icon: '👤', title: 'Client Dashboard', description: 'Individual metrics & analysis.' },
    { key: 'multi_client', icon: '👥', title: 'Multi-Client View', description: 'Group aggregate performance.' },
    { key: 'manager_dashboard', icon: '👨‍💼', title: 'Manager View', description: 'Team performance overview.' },
];

const DashboardsPopover: React.FC<DashboardsPopoverProps> = ({ onClose, onSelectTool, quickLinks, onToggleQuickLink }) => {
    const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleMouseLeave = () => {
        leaveTimeoutRef.current = setTimeout(() => {
            onClose();
        }, 300);
    };
    
    const handleContainerEnter = () => {
        if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    }

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div 
                onClick={e => e.stopPropagation()}
                onMouseLeave={handleMouseLeave}
                onMouseEnter={handleContainerEnter}
                className="absolute top-full mt-3 right-1/2 translate-x-1/2 z-50 w-72"
            >
                <div className="relative bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-2xl popover-taper">
                    <div className="p-4 border-b border-[var(--color-border)]">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Dashboards</h3>
                    </div>
                    <div className="p-2">
                        <ul className="space-y-1">
                            {dashboards.map((item) => {
                                const isAdded = quickLinks.includes(item.key);
                                return (
                                    <li key={item.key} className="flex items-center hover:bg-black/20 rounded-lg transition-colors pr-2">
                                        <button
                                            onClick={() => onSelectTool(item.key)}
                                            className="flex-grow text-left p-3 flex items-start gap-3 group"
                                        >
                                            <span className="text-2xl mt-0.5 group-hover:scale-110 transition-transform">{item.icon}</span>
                                            <div>
                                                <p className="font-semibold text-[var(--color-text-primary)]">{item.title}</p>
                                                <p className="text-xs text-[var(--color-text-secondary)]">{item.description}</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleQuickLink(item.key);
                                            }}
                                            className={`p-1.5 rounded-full transition-colors ${isAdded ? 'text-green-400 hover:bg-green-400/20' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                                            title={isAdded ? "Remove from Quick Links" : "Add to Quick Links"}
                                        >
                                            {isAdded ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DashboardsPopover;
