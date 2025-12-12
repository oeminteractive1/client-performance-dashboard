
import React from 'react';

interface ChangeInfo {
    value: string;
    positive: boolean;
    label: string;
}

interface KpiGridItemProps {
    title: string;
    icon: string;
    value: string;
    changes: ChangeInfo[];
    positive: boolean;
}

const KpiGridItem: React.FC<KpiGridItemProps> = ({ title, icon, value, changes, positive }) => {
    return (
        <div className="bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] rounded-xl shadow-2xl border border-[var(--color-border)] flex flex-col h-full transition-shadow duration-300 chart-grid-item">
            {/* Drag Handle and Title */}
            <div className="flex items-center p-5 pb-0 mb-4 text-[var(--color-text-secondary)]">
                 <div className="drag-handle p-2 -ml-3 mr-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM9 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM9 15.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM14.5 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM14.5 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM14.5 15.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                    </svg>
                 </div>
                <h3 className="text-lg font-semibold text-left text-[var(--color-text-primary)] truncate">{icon} {title}</h3>
            </div>
            
            {/* KPI Content Area */}
            <div className="flex-grow flex flex-col h-full relative px-5 pb-5">
                 {/* This inner div is the "inner card" from the reference image. */}
                 <div className={`bg-[var(--color-card-bg)] rounded-xl p-5 shadow-lg relative overflow-hidden flex flex-col h-full`}>
                     {/* Themed top border */}
                     {positive ? (
                         <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-accent-secondary)] to-[var(--color-accent)]" />
                     ) : (
                         <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--color-negative)]" />
                     )}
                     {/* The main content area with value and changes, aligned to the bottom */}
                     <div className="mt-auto">
                         <p className="text-4xl font-bold text-[var(--color-text-primary)] mb-3 break-words">{value}</p>
                         <div className="flex flex-col items-start gap-1.5">
                             {changes.map((change, index) => {
                                 if (change.value === 'N/A') return null; 
                                 const changeColor = change.positive ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]';
                                 const bgColor = change.positive ? 'bg-[var(--color-positive-bg)]' : 'bg-[var(--color-negative-bg)]';
                                 return (
                                     <div key={index} className={`text-sm inline-flex items-center px-3 py-1 rounded-full ${bgColor} ${changeColor}`}>
                                         <span>{change.value}</span>
                                         <span className="ml-1.5 text-[var(--color-text-secondary)] font-normal">{change.label}</span>
                                     </div>
                                 );
                             })}
                         </div>
                     </div>
                 </div>
            </div>
        </div>
    );
};

export default KpiGridItem;