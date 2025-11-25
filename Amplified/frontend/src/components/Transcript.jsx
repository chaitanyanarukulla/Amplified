import React, { useEffect, useRef } from 'react';

const Transcript = ({ transcript }) => {
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcript]);

    return (
        <div className="px-4 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">
                Live Hearing
            </div>

            <div
                ref={scrollRef}
                className="h-24 overflow-y-auto space-y-2 pr-2 scroll-smooth border-l-2 border-amber-500/50 pl-3 ml-1"
            >
                {transcript.length === 0 ? (
                    <p className="text-slate-600 italic text-sm">Waiting for conversation to start...</p>
                ) : (
                    transcript.map((entry, index) => (
                        <div key={index} className={`flex flex-col ${entry.speaker === 'You' ? 'items-end' : 'items-start'}`}>
                            <span className="text-[10px] text-slate-500 mb-0.5 font-medium">
                                {entry.speaker}
                            </span>
                            <p className={`text-sm leading-relaxed max-w-[90%] ${entry.speaker === 'You'
                                ? 'text-slate-400'
                                : 'text-slate-200 font-medium'
                                } ${!entry.is_final ? 'opacity-70' : ''}`}>
                                {entry.text}
                                {!entry.is_final && <span className="animate-pulse">|</span>}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Transcript;
