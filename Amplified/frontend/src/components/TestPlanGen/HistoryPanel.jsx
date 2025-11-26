import React, { useState, useEffect } from 'react';
import { apiGet } from '../../utils/api';

const HistoryPanel = ({ onSelect, onBack }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await apiGet('/test-plan/history');
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (err) {
            console.error("Failed to fetch history:", err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                <h2 className="text-lg font-bold text-white">Generation History</h2>
                <button
                    onClick={onBack}
                    className="text-slate-400 hover:text-white text-sm"
                >
                    Close
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="text-center py-8 text-slate-400">Loading history...</div>
                ) : history.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">No history found.</div>
                ) : (
                    history.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => onSelect(item)}
                            className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-blue-500/50 hover:bg-slate-800 transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                                    {item.raw_input_summary || 'Untitled'}
                                </h3>
                                <span className={`text-xs px-2 py-1 rounded-full border ${item.output_type === 'test_plan'
                                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                                        : 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                                    }`}>
                                    {item.output_type === 'test_plan' ? 'Plan' : 'Strategy'}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-xs text-slate-500">
                                <div className="flex items-center gap-2">
                                    <span className="capitalize bg-slate-800 px-1.5 py-0.5 rounded">
                                        {item.source_type === 'confluence' ? 'Confluence' : 'Document'}
                                    </span>
                                </div>
                                <span>{formatDate(item.created_at)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HistoryPanel;
