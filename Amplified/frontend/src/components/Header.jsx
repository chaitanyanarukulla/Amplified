import React from 'react';

const Header = ({
    isListening,
    transparency,
    setTransparency,
    clickThrough,
    setClickThrough,
    onToggleListening,
    onToggleContext,
    onStartMockInterview,
    isMockMode,
    onBack,
    onEndMeeting
}) => {
    const handleClose = () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('close-app');
        }
    };

    return (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-700 rounded-t-xl draggable select-none">
            <div className="flex items-center gap-3">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors no-drag text-slate-400 hover:text-white"
                        title="Back to Dashboard"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                )}
                {/* Status Indicator / Toggle */}
                <button
                    onClick={onToggleListening}
                    className={`flex items-center space-x-2 group no-drag px-3 py-1.5 rounded-lg transition-all border ${isListening
                            ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50'
                            : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50'
                        }`}
                    title={isListening ? "Click to Pause" : "Click to Start Listening"}
                >
                    <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${isListening ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 group-hover:bg-red-400'}`}></div>
                    <span className={`text-xs font-semibold tracking-wider uppercase transition-colors ${isListening ? 'text-green-400' : 'text-red-400 group-hover:text-red-300'}`}>
                        {isListening ? 'LISTENING' : 'PAUSED'}
                    </span>
                </button>

                {/* End Meeting Button */}
                {isListening && (
                    <button
                        onClick={onEndMeeting}
                        className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded border border-red-500/20 hover:border-red-500/40 transition-all no-drag"
                    >
                        END MEETING
                    </button>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-3 no-drag">
                {/* Mock Interview Button */}
                <button
                    onClick={onStartMockInterview}
                    disabled={isListening || isMockMode}
                    className={`p-1.5 rounded transition-colors ${isMockMode
                        ? 'text-blue-500 bg-blue-500/10'
                        : isListening
                            ? 'text-slate-600 cursor-not-allowed'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-blue-400'
                        }`}
                    title={isListening ? "Stop listening first" : "Start Mock Interview"}
                >
                    <span className="text-lg">🎭</span>
                </button>

                {/* Click-Through Toggle */}
                <button
                    onClick={() => setClickThrough(!clickThrough)}
                    className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${clickThrough ? 'text-amber-500 bg-amber-500/10' : 'text-slate-400'}`}
                    title="Toggle Click-Through Mode"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 9l6 6-6 6" />
                        <path d="M4 4v7a4 4 0 0 0 4 4h12" />
                    </svg>
                </button>

                {/* Context Panel Toggle */}
                <button
                    onClick={onToggleContext}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                    title="Open Context Panel"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                </button>

                {/* Transparency Slider */}
                <div className="flex items-center space-x-2 group">
                    <input
                        type="range"
                        min="20"
                        max="100"
                        value={transparency}
                        onChange={(e) => setTransparency(Number(e.target.value))}
                        className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                </div>

                {/* Divider */}
                <div className="h-4 w-px bg-slate-700 mx-1"></div>

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="text-slate-400 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-400/10"
                    title="Close App"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default Header;
