import React from 'react';

const Footer = ({ onStall, onSuggest, isProcessing }) => {
    return (
        <div className="p-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-700 rounded-b-xl flex space-x-3">
            <button
                onClick={onStall}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-slate-900/20 active:scale-95"
            >
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                <span>Stall / Pivot</span>
            </button>

            <button
                onClick={onSuggest}
                disabled={isProcessing}
                data-testid="btn-suggest-answer"
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isProcessing ? (
                    <svg className="animate-spin h-4 w-4 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                )}
                <span>Suggest</span>
            </button>
        </div>
    );
};

export default Footer;
