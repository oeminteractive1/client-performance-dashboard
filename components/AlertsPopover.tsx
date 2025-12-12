import React, { useEffect, useState, useMemo, useRef } from 'react';

interface AlertsPopoverProps {
    onClose: () => void;
    closedStores: { name: string; status: string; }[];
    recentChanges: { name: string; changes: { type: string; date: Date }[] }[];
    oldFeeds: { name: string; feeds: string[] }[];
    onSelectClient: (clientName: string) => void;
}

type Category = 'closed' | 'feeds' | 'pricing' | 'shipping' | 'settings' | 'checkout';

const AlertsPopover: React.FC<AlertsPopoverProps> = ({ onClose, closedStores, recentChanges, oldFeeds, onSelectClient }) => {
    const [hoveredCategory, setHoveredCategory] = useState<Category | null>(null);
    const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const pricingChanges = useMemo(() => recentChanges.map(item => ({ ...item, changes: item.changes.filter(c => c.type === 'Pricing') })).filter(item => item.changes.length > 0), [recentChanges]);
    const shippingChanges = useMemo(() => recentChanges.map(item => ({ ...item, changes: item.changes.filter(c => c.type === 'Shipping') })).filter(item => item.changes.length > 0), [recentChanges]);
    const settingsChanges = useMemo(() => recentChanges.map(item => ({ ...item, changes: item.changes.filter(c => c.type === 'Settings') })).filter(item => item.changes.length > 0), [recentChanges]);
    const checkoutChanges = useMemo(() => recentChanges.map(item => ({ ...item, changes: item.changes.filter(c => c.type === 'Checkout') })).filter(item => item.changes.length > 0), [recentChanges]);

    const categories: { key: Category; title: string; count: number; icon: string; }[] = [
        { key: 'closed', title: 'Closed Stores', count: closedStores.length, icon: '⚠️' },
        { key: 'feeds', title: 'Old Feeds', count: oldFeeds.length, icon: '📜' },
        { key: 'shipping', title: 'Shipping Changes', count: shippingChanges.length, icon: '🚚' },
        { key: 'pricing', title: 'Pricing Changes', count: pricingChanges.length, icon: '🔔' },
        { key: 'settings', title: 'Settings Changes', count: settingsChanges.length, icon: '⚙️' },
        { key: 'checkout', title: 'Checkout Changes', count: checkoutChanges.length, icon: '🛒' },
    ];
    
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleMouseEnter = (key: Category) => {
        if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
        setHoveredCategory(key);
    };

    const handleMouseLeave = () => {
        leaveTimeoutRef.current = setTimeout(() => {
            setHoveredCategory(null);
        }, 300); // 300ms delay to allow moving to the flyout
    };
    
    const handleContainerEnter = () => {
        if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    }

    const handleSelect = (clientName: string) => {
        onSelectClient(clientName);
        onClose();
    };
    
    const hasAlerts = categories.some(c => c.count > 0);

    const renderAlertsForCategory = (category: Category | null) => {
        if (!category) return null;

        let items: React.ReactNode[] = [];
        let title = '';

        switch (category) {
            case 'closed':
                title = 'Closed Stores';
                items = closedStores.map(store => (
                    <li key={`closed-${store.name}`}>
                        <button onClick={() => handleSelect(store.name)} className="w-full text-left p-3 hover:bg-black/20 transition-colors flex items-start gap-3 rounded-lg">
                            <div>
                                <p className="font-semibold text-[var(--color-text-primary)]">{store.name}</p>
                                <p className="text-sm text-[var(--color-warning)]">Store status is "{store.status}"</p>
                            </div>
                        </button>
                    </li>
                ));
                break;
            case 'feeds':
                title = 'Feeds Older than 30 Days';
                items = oldFeeds.map(item => (
                    <li key={`old-feed-${item.name}`}>
                        <button onClick={() => handleSelect(item.name)} className="w-full text-left p-3 hover:bg-black/20 transition-colors flex items-start gap-3 rounded-lg">
                            <div>
                                <p className="font-semibold text-[var(--color-text-primary)]">{item.name}</p>
                                <p className="text-sm text-red-300 truncate" title={`Feeds: ${item.feeds.join(', ')}`}>
                                    Feeds: {item.feeds.join(', ')}
                                </p>
                            </div>
                        </button>
                    </li>
                ));
                break;
            case 'pricing':
            case 'shipping':
            case 'settings':
            case 'checkout':
                const changeMap = { pricing: pricingChanges, shipping: shippingChanges, settings: settingsChanges, checkout: checkoutChanges };
                const titleMap = { pricing: 'Recent Pricing Changes', shipping: 'Recent Shipping Changes', settings: 'Recent Settings Changes', checkout: 'Recent Checkout Changes' };
                const data = changeMap[category];
                title = titleMap[category];
                items = data.map(item => (
                     <li key={`change-${item.name}-${category}`}>
                        <button onClick={() => handleSelect(item.name)} className="w-full text-left p-3 hover:bg-black/20 transition-colors flex items-start gap-3 rounded-lg">
                            <div>
                                <p className="font-semibold text-[var(--color-text-primary)]">{item.name}</p>
                                <p className="text-sm text-blue-300">
                                    Updated on {item.changes[0].date.toLocaleDateString()}
                                </p>
                            </div>
                        </button>
                    </li>
                ));
                break;
        }

        return (
            <div className="p-2">
                 <h4 className="font-semibold text-center text-[var(--color-text-secondary)] mb-2 px-2">{title}</h4>
                 {items.length > 0 ? (
                    <ul className="space-y-1">{items}</ul>
                 ) : (
                    <p className="text-center text-sm text-[var(--color-text-secondary)] p-4">No alerts in this category.</p>
                 )}
            </div>
        );
    };

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div 
                onClick={e => e.stopPropagation()}
                onMouseLeave={handleMouseLeave}
                className="absolute top-full mt-3 right-0 z-50 w-64"
            >
                <div 
                    className="relative bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-2xl popover-taper"
                    onMouseEnter={handleContainerEnter}
                >
                    <div className="p-4 border-b border-[var(--color-border)]">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Notifications</h3>
                    </div>
                    {hasAlerts ? (
                        <div className="p-2">
                            <ul className="space-y-1">
                                {categories.map(({ key, title, count, icon }) => (
                                    count > 0 && (
                                        <li key={key}>
                                            <button 
                                                onMouseEnter={() => handleMouseEnter(key)}
                                                onClick={() => handleMouseEnter(key)}
                                                className={`w-full text-left p-2 rounded-md flex justify-between items-center transition-colors ${hoveredCategory === key ? 'bg-black/30 text-[var(--color-text-accent)]' : 'hover:bg-black/20 text-[var(--color-text-primary)]'}`}
                                            >
                                                <span className="font-semibold text-sm flex items-center gap-2">
                                                    <span>{icon}</span>
                                                    <span>{title}</span>
                                                </span>
                                                <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${hoveredCategory === key ? 'bg-[var(--color-accent)]/20' : 'bg-black/20 text-[var(--color-text-secondary)]'}`}>
                                                    {count}
                                                </span>
                                            </button>
                                        </li>
                                    )
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className="p-6 text-center text-[var(--color-text-secondary)]">
                            <p>You're all caught up!</p>
                            <p className="text-sm">No new notifications.</p>
                        </div>
                    )}

                    {/* Fly-out Panel */}
                    {hoveredCategory && hasAlerts && (
                        <div 
                            className="absolute top-0 left-full ml-1 w-80 bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-2xl max-h-[28rem] overflow-y-auto"
                            onMouseEnter={handleContainerEnter}
                        >
                            {renderAlertsForCategory(hoveredCategory)}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default AlertsPopover;