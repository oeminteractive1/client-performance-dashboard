import React from 'react';
import { FeedItemRecord } from '../types';

interface FeedItemsAlertsProps {
    disapprovedItems: FeedItemRecord[];
}

const FeedItemsAlerts: React.FC<FeedItemsAlertsProps> = ({ disapprovedItems }) => {
    if (disapprovedItems.length === 0) {
        return (
            <div className="bg-green-500/10 border border-green-500 text-green-300 p-4 rounded-lg flex items-center gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                    <h4 className="font-bold">All Clear!</h4>
                    <p className="text-sm">No disapproved items found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-red-500/10 border border-red-500 text-red-300 p-4 rounded-lg">
            <div className="flex items-center gap-4 mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h4 className="font-bold text-lg">{disapprovedItems.length} Disapproved Item{disapprovedItems.length > 1 ? 's' : ''} Found</h4>
            </div>
            <div className="overflow-x-auto max-h-60">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 sticky top-0">
                        <tr>
                            <th className="p-3 font-semibold uppercase text-blue-200">Item ID</th>
                            <th className="p-3 font-semibold uppercase text-blue-200">Title</th>
                            <th className="p-3 font-semibold uppercase text-blue-200">Disapproval Issues</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {disapprovedItems.map((item, index) => (
                            <tr key={`${item.item_id}-${index}`} className="hover:bg-white/5">
                                <td className="p-3 font-mono">{item.item_id}</td>
                                <td className="p-3">{item.title}</td>
                                <td className="p-3 text-red-300">{item.disapproval_issues}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FeedItemsAlerts;