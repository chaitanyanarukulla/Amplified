import React, { useState } from 'react';
import { apiRequest } from '../utils/api';

const MeetingSummaryModal = ({ summary: initialSummary, onClose }) => {
    const [summary, setSummary] = useState(initialSummary);

    // Update local state if prop changes
    React.useEffect(() => {
        setSummary(initialSummary);
    }, [initialSummary]);

    if (!summary) return null;

    const toggleActionStatus = async (actionId, currentStatus) => {
        const newStatus = currentStatus === 'done' ? 'open' : 'done';

        // Optimistic update
        setSummary(prev => ({
            ...prev,
            action_items: prev.action_items.map(a =>
                a.id === actionId ? { ...a, status: newStatus } : a
            )
        }));

        try {
            const formData = new FormData();
            formData.append('status', newStatus);

            const response = await apiRequest(`/meetings/${summary.meeting_id}/actions/${actionId}`, {
                method: 'PATCH',
                body: formData
            });

            if (!response.ok) {
                // Revert on failure
                setSummary(prev => ({
                    ...prev,
                    action_items: prev.action_items.map(a =>
                        a.id === actionId ? { ...a, status: currentStatus } : a
                    )
                }));
                console.error('Failed to update action status');
            }
        } catch (error) {
            console.error('Failed to update action status:', error);
            // Revert on error
            setSummary(prev => ({
                ...prev,
                action_items: prev.action_items.map(a =>
                    a.id === actionId ? { ...a, status: currentStatus } : a
                )
            }));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                    <h2 className="text-2xl font-bold text-white">Meeting Summary</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* Short Summary */}
                    <div>
                        <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-3">Overview</h3>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 text-slate-200 leading-relaxed">
                            {summary.short_summary}
                        </div>
                    </div>

                    {/* Action Items */}
                    {summary.action_items && summary.action_items.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3">Action Items</h3>
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <ul className="space-y-3">
                                    {summary.action_items.map((action, index) => (
                                        <li
                                            key={index}
                                            className={`flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg transition-colors cursor-pointer hover:bg-slate-800/50 ${action.status === 'done' ? 'opacity-75' : ''}`}
                                            onClick={() => toggleActionStatus(action.id, action.status)}
                                        >
                                            <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${action.status === 'done' ? 'bg-green-500 border-green-500' : 'border-slate-500 hover:border-green-400'}`}>
                                                {action.status === 'done' && (
                                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-sm transition-colors ${action.status === 'done' ? 'text-green-400/90 line-through decoration-green-500/30' : 'text-slate-200'}`}>
                                                    {action.description}
                                                </p>
                                                {action.owner && (
                                                    <span className={`text-xs px-2 py-0.5 rounded mt-1.5 inline-block font-medium ${action.status === 'done' ? 'text-green-400 bg-green-400/10' : 'text-blue-400 bg-blue-400/10'}`}>
                                                        {action.owner}
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Detailed Summary */}
                    <div>
                        <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-3">Detailed Notes</h3>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                            {summary.detailed_summary}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MeetingSummaryModal;
