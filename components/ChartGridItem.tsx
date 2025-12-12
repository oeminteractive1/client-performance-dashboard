
import React from 'react';

interface ChartGridItemProps {
    title: string;
    children: React.ReactNode;
    headerControls?: React.ReactNode;
    subtitle?: string;
    onRemove?: () => void;
}

const ChartGridItem: React.FC<ChartGridItemProps> = ({ title, children, headerControls, subtitle, onRemove }) => {
    return (
        <div className="chart-grid-item bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] rounded-xl p-5 shadow-2xl border border-[var(--color-border)] flex flex-col h-full transition-shadow duration-300 group relative">
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="absolute -top-2 -right-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-red-400 hover:border-red-400 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-md z-10"
                    title="Remove Tile"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                </button>
            )}
            <div className="flex items-center justify-between pb-4 text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                 <div className="flex items-center flex-grow min-w-0">
                    <div className="drag-handle p-2 -ml-2 mr-1 cursor-move">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM9 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM9 15.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM14.5 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM14.5 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM14.5 15.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                        </svg>
                    </div>
                    <div className="truncate flex-grow">
                        <h3 className="text-lg font-semibold text-left text-[var(--color-text-primary)] truncate" title={title}>{title}</h3>
                        {subtitle && <p className="text-xs text-[var(--color-text-secondary)] truncate -mt-1">{subtitle}</p>}
                    </div>
                </div>
                 {headerControls && <div className="flex items-center gap-2 flex-shrink-0 ml-4">{headerControls}</div>}
            </div>
            <div className="flex-grow relative pt-4 min-h-0">
                {children}
            </div>
        </div>
    );
};

export default ChartGridItem;
