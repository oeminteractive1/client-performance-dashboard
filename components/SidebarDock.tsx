import React from 'react';

interface SidebarDockProps {
    quickLinks: string[];
    onSelectTool: (toolId: string) => void;
    onToggleQuickLink: (toolId: string) => void;
}

// Tool definitions matching the ones in WelcomeScreen and App
const TOOL_ICONS: { [key: string]: { icon: string; label: string } } = {
    // Dashboards
    'client': { icon: '👤', label: 'Client' },
    'multi_client': { icon: '📊', label: 'Multi-Client' },
    'manager_dashboard': { icon: '👨‍💼', label: 'Manager' },
    // Analysis Tools
    'brand_comparison': { icon: '🔍', label: 'Brand Comp' },
    'feed_health': { icon: '🩺', label: 'Feed Health' },
    'medium_comparison': { icon: '📈', label: 'Medium Comp' },
    'budget_status': { icon: '💰', label: 'Budget' },
    'revenue_tool': { icon: '💵', label: 'Revenue' },
    // Workflow Tools
    'polaris_msrp_updater': { icon: '💲', label: 'MSRP' },
    'custom_titles': { icon: '✏️', label: 'Titles' },
    'bulk_url_opener': { icon: '🔗', label: 'Bulk URL' },
    'strategy_notes': { icon: '📝', label: 'Notes' },
    'google_ads_robot': { icon: '🤖', label: 'Ads Robot' },
    'tag_creator': { icon: '🏷️', label: 'Tags' },
    'search_page_creator': { icon: '🔎', label: 'Search' },
    'free_shipping_tool': { icon: '🚚', label: 'Shipping' },
    'category_page_creator': { icon: '📑', label: 'Category' },
    'product_availability': { icon: '✅', label: 'Availability' },
    'file_uploader': { icon: '📤', label: 'Upload' },
    // Playgrounds
    'bing_ads_playground': { icon: '🅱️', label: 'Bing Ads' },
    'google_analytics_playground': { icon: '📊', label: 'GA' },
    'merchant_center_playground': { icon: '🛒', label: 'MC' },
};

const SidebarDock: React.FC<SidebarDockProps> = ({
    quickLinks,
    onSelectTool,
    onToggleQuickLink,
}) => {
    return (
        <div
            className="flex-shrink-0 flex items-center justify-center p-4"
            style={{ width: '130px' }}
        >
            <div className="bg-[var(--color-card-bg)]/90 backdrop-blur-md flex flex-col items-center justify-center gap-4 p-4 rounded-3xl shadow-2xl border border-[var(--color-border)]/30"
            >
            {quickLinks.map((toolId) => {
                const tool = TOOL_ICONS[toolId];
                if (!tool) return null;

                return (
                    <div
                        key={toolId}
                        onClick={() => onSelectTool(toolId)}
                        className="dock-item group relative flex flex-col items-center justify-center w-20 h-20 bg-[var(--color-input-bg)]/80 hover:bg-blue-600/90 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-110 shadow-lg hover:shadow-blue-500/50 border border-[var(--color-border)]/50"
                        title={tool.label}
                    >
                        <div className="text-4xl mb-1">{tool.icon}</div>
                        <div className="text-xs text-[var(--color-text-primary)] font-bold truncate w-full text-center px-1">
                            {tool.label}
                        </div>
                    </div>
                );
            })}
            </div>
        </div>
    );
};

export default SidebarDock;
