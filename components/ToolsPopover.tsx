
import React, { useEffect, useState, useRef } from 'react';

interface ToolsPopoverProps {
    onClose: () => void;
    onSelectTool: (tool: string) => void;
    quickLinks: string[];
    onToggleQuickLink: (toolId: string) => void;
}

// All available tools with their details
const allTools = {
    polaris_msrp_updater: { icon: '⬆️', title: 'Polaris MSRP Updater', description: 'Upload a CSV to update the Polaris MSRP Google Sheet.' },
    brand_comparison: { icon: '⚖️', title: 'Brand Comparison', description: 'Compare a client against their brand average.' },
    feed_health: { icon: '🩺', title: 'Feed Health Tool', description: 'Monitor feed status and item approvals.' },
    medium_comparison: { icon: '📊', title: 'Medium Comparison', description: 'Compare GA revenue sources across clients.' },
    budget_status: { icon: '🪙', title: 'Budget Status Tool', description: 'View budget pacing alerts by manager.' },
    revenue_tool: { icon: '📈', title: 'Metric Comparison Tool', description: 'Find clients with significant metric changes.' },
    custom_titles: { icon: '✍️', title: 'SEO Titles Workflow', description: 'Track custom title uploads for SEO clients.' },
    bulk_url_opener: { icon: '🚀', title: 'Bulk URL Opener', description: 'Open URLs for multiple clients in batches.' },
    strategy_notes: { icon: '📝', title: 'Strategy Notes Viewer', description: 'Review strategy notes by client and month.' },
    google_ads_robot: { icon: '🧪', title: 'Google Ads Playground', description: 'A testing area for new Google Ads management tiles.' },
    tag_creator: { icon: '🏷️', title: 'Tag Creator', description: 'Generate a CSV with part numbers and a custom tag.' },
    search_page_creator: { icon: '🔍', title: 'Search Page Creator', description: 'Generate a CSV for a custom search results page.' },
    free_shipping_tool: { icon: '💸', title: 'Free Shipping Tool', description: 'Generate a CSV to mark items for free shipping.' },
    category_page_creator: { icon: '🗂️', title: 'Category Page Creator', description: 'Create a category page and map products to it.' },
    product_availability: { icon: '💡', title: 'Product Availability Tool', description: 'Set parts as available or not for sale.' },
    bing_ads_playground: { icon: '🔎', title: 'Bing Ads Playground', description: 'Manage campaigns, view performance metrics, and adjust budgets.' },
    google_analytics_playground: { icon: '📊', title: 'Google Analytics Playground', description: 'View traffic by medium, landing pages, and device performance.' },
    merchant_center_playground: { icon: '🛒', title: 'Merchant Center Playground', description: 'View product feed health, performance metrics, and manage products.' },
};

// Define the categories and which tools belong to them
const toolCategories = [
    {
        key: 'analysis',
        title: 'Analysis',
        icon: '🔬',
        tools: [
            'brand_comparison',
            'feed_health',
            'medium_comparison',
            'budget_status',
            'revenue_tool',
        ].sort((a, b) => allTools[a as keyof typeof allTools].title.localeCompare(allTools[b as keyof typeof allTools].title)),
    },
    {
        key: 'playgrounds',
        title: 'Playgrounds',
        icon: '🧪',
        tools: [
            'google_ads_robot',
            'bing_ads_playground',
            'google_analytics_playground',
            'merchant_center_playground',
        ].sort((a, b) => allTools[a as keyof typeof allTools].title.localeCompare(allTools[b as keyof typeof allTools].title)),
    },
    {
        key: 'workflow',
        title: 'Workflows',
        icon: '⚙️',
        tools: [
            'polaris_msrp_updater',
            'custom_titles',
            'strategy_notes',
            'bulk_url_opener',
            'tag_creator',
            'search_page_creator',
            'free_shipping_tool',
            'category_page_creator',
            'product_availability',
        ].sort((a, b) => allTools[a as keyof typeof allTools].title.localeCompare(allTools[b as keyof typeof allTools].title)),
    },
];

const ToolsPopover: React.FC<ToolsPopoverProps> = ({ onClose, onSelectTool, quickLinks, onToggleQuickLink }) => {
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
    const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleMouseEnter = (key: string) => {
        if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
        setHoveredCategory(key);
    };

    const handleMouseLeave = () => {
        leaveTimeoutRef.current = setTimeout(() => {
            setHoveredCategory(null);
        }, 300);
    };
    
    const handleContainerEnter = () => {
        if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    }

    const visibleFlyoutData = toolCategories.find(c => c.key === hoveredCategory);

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div 
                onClick={e => e.stopPropagation()}
                onMouseLeave={handleMouseLeave}
                className="absolute top-full mt-3 right-1/2 translate-x-1/2 z-50 w-64"
            >
                <div 
                    className="relative bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-2xl popover-taper"
                    onMouseEnter={handleContainerEnter}
                >
                    <div className="p-4 border-b border-[var(--color-border)]">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Tools</h3>
                    </div>
                    <div className="p-2">
                        <ul className="space-y-1">
                            {toolCategories.map(({ key, title, icon }) => (
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
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                
                {/* Fly-out Panel */}
                {visibleFlyoutData && (
                    <div 
                        className="absolute top-0 left-full ml-1 w-96 bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl shadow-2xl"
                        onMouseEnter={handleContainerEnter}
                    >
                        <div className="p-4 border-b border-[var(--color-border)]">
                            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{visibleFlyoutData.title}</h3>
                        </div>
                        <div>
                            <ul className="divide-y divide-[var(--color-border)] p-2">
                                {visibleFlyoutData.tools.map(toolKey => {
                                    const item = allTools[toolKey as keyof typeof allTools];
                                    const isAdded = quickLinks.includes(toolKey);
                                    return (
                                        <li key={toolKey} className="flex items-center hover:bg-black/20 rounded-lg transition-colors pr-2">
                                            <button
                                                onClick={() => onSelectTool(toolKey)}
                                                className="flex-grow text-left p-2 flex items-start gap-3"
                                            >
                                                <span className="text-2xl mt-1">{item.icon}</span>
                                                <div>
                                                    <p className="font-semibold text-[var(--color-text-primary)]">{item.title}</p>
                                                    <p className="text-xs text-[var(--color-text-secondary)]">{item.description}</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleQuickLink(toolKey);
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
                )}
            </div>
        </>
    );
};

export default ToolsPopover;
