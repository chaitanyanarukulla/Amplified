import React, { useState } from 'react';

const TicketInput = ({ onFetch, loading }) => {
    const [input, setInput] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim()) {
            onFetch(input.trim());
        }
    };

    return (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Fetch Jira Story</h2>
            <form onSubmit={handleSubmit} className="flex gap-4">
                <input
                    type="text"
                    placeholder="Paste Jira URL or Ticket Key (e.g., PROJ-123)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Fetching...
                        </>
                    ) : (
                        'Fetch Story'
                    )}
                </button>
            </form>
            <p className="text-xs text-slate-500 mt-3">
                💡 <strong>Tip:</strong> Enter a ticket key like <code className="bg-slate-900 px-1 rounded">KAN-123</code> or paste the full ticket URL
            </p>
        </div>
    );
};

export default TicketInput;
