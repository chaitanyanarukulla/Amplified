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
            const res = await apiGet('/test-gen/history');
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

    const handleSelect = async (id) => {
        try {
            const res = await apiGet(`/test-gen/${id}`);
            if (res.ok) {
                const data = await res.json();
                onSelect(data);
            }
        } catch (err) {
            console.error("Failed to load generation:", err);
        }
    };

    return (
        <div className="max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                    ← Back
                </button>
                <h2 className="text-xl font-semibold">Generation History</h2>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading history...</div>
            ) : history.length === 0 ? (
                <div className="text-center py-12 bg-slate-800 rounded-xl border border-slate-700">
                    <p className="text-slate-400">No history found. Generate your first test cases!</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {history.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleSelect(item.id)}
                            className="w-full text-left bg-slate-800 hover:bg-slate-750 p-4 rounded-xl border border-slate-700 hover:border-blue-500/50 transition-all group"
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-mono text-blue-400 font-bold">{item.ticket_key}</span>
                                <span className="text-xs text-slate-500">
                                    {new Date(item.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="text-slate-200 group-hover:text-white transition-colors truncate">
                                {item.title}
                            </h3>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HistoryPanel;
