import React from 'react';

const TicketPreview = ({ ticket, onGenerate, loading }) => {
    return (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg animate-fade-in">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-blue-400 font-mono font-bold text-lg">{ticket.key}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${ticket.priority === 'High' ? 'bg-red-500/20 text-red-300' :
                                ticket.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                    'bg-blue-500/20 text-blue-300'
                            }`}>
                            {ticket.priority || 'No Priority'}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                            {ticket.status || 'No Status'}
                        </span>
                    </div>
                    <h3 className="text-xl font-semibold text-white">{ticket.summary}</h3>
                </div>

                <button
                    onClick={onGenerate}
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg font-medium shadow-lg shadow-blue-900/20 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <span>✨</span> Generate Test Cases
                        </>
                    )}
                </button>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 max-h-60 overflow-y-auto">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-wrap">
                    {ticket.description || 'No description provided.'}
                </div>
            </div>
        </div>
    );
};

export default TicketPreview;
