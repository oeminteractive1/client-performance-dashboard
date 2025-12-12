import React from 'react';

interface ChangeInfo {
    value: string;
    positive: boolean;
    label: string;
}

interface KpiCardProps {
    value: string;
    changes: ChangeInfo[];
    positive: boolean; // Explicit prop to control the border color
}

const KpiCard: React.FC<KpiCardProps> = ({ value, changes, positive }) => {
    return (
        <div className={`kpi-card ${positive ? 'positive' : 'negative'} bg-slate-800/30 rounded-xl p-5 shadow-lg relative overflow-hidden flex flex-col h-full`}>
            {/* The main content area with value and changes, aligned to the bottom */}
            <div className="mt-auto">
                <p className="text-4xl font-bold text-white mb-3 break-words">{value}</p>
                {/* Container for stacked comparison pills */}
                <div className="flex flex-col items-start gap-1.5">
                    {changes.map((change, index) => {
                        // Don't render a change indicator if there's no comparison data (e.g., 'N/A')
                        if (change.value === 'N/A') return null; 
                        
                        const changeColor = change.positive ? 'text-green-300' : 'text-red-300';
                        const bgColor = change.positive ? 'bg-green-500/20' : 'bg-red-500/20';
                        
                        return (
                            <div key={index} className={`text-sm inline-flex items-center px-3 py-1 rounded-full ${bgColor} ${changeColor}`}>
                                <span>{change.value}</span>
                                <span className="ml-1.5 text-gray-400 font-normal">{change.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default KpiCard;
