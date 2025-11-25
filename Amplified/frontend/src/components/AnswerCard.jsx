import React from 'react';

const AnswerCard = ({ suggestion, onClose }) => {
    if (!suggestion) return null;

    return (
        <div className="mx-4 my-3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border-l-4 border-amber-500 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700/50">
                <div className="flex items-center space-x-2 overflow-hidden">
                    <span className="text-amber-500 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                    </span>
                    <div className="flex flex-col overflow-hidden">
                        <h3 className="text-lg font-bold text-amber-400 truncate">
                            {suggestion.title}
                        </h3>
                        {suggestion.source_citation && (
                            <p className="text-xs text-slate-400 truncate">
                                {suggestion.source_citation}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                    <button className="p-1 text-slate-500 hover:text-slate-300 transition-colors" title="Copy">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                <ul className="space-y-3">
                    {suggestion.bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start space-x-3 text-lg text-slate-200">
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                            <span className="leading-snug">{bullet}</span>
                        </li>
                    ))}
                </ul>

                {/* Warning */}
                {suggestion.warning && (
                    <div className="mt-3 p-2 rounded bg-red-900/20 border border-red-900/30 flex items-start space-x-2">
                        <span className="text-red-400 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </span>
                        <p className="text-xs text-red-300/90 font-medium leading-tight">
                            {suggestion.warning}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnswerCard;
