import React from 'react';

const BetaModeBadge: React.FC = () => (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/50">
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        <span className="text-xs font-bold text-orange-400">BETA</span>
    </div>
);

export default BetaModeBadge;
