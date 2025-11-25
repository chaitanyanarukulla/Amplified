import React from 'react';

const CoachingWidget = ({ wpm, fillerCount }) => {
    console.log('🎯 CoachingWidget props:', { wpm, fillerCount });

    // Determine Pace Status
    let paceStatus = 'Good';
    let paceColor = 'text-green-400';

    if (wpm > 160) {
        paceStatus = 'Too Fast!';
        paceColor = 'text-red-400';
    } else if (wpm < 100 && wpm > 0) {
        paceStatus = 'Too Slow';
        paceColor = 'text-yellow-400';
    } else if (wpm === 0) {
        paceStatus = 'Listening...';
        paceColor = 'text-gray-400';
    }

    return (
        <div className="fixed bottom-20 right-6 bg-slate-800/90 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-lg w-48 z-50 transition-all duration-300">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Live Coaching</h3>

            {/* Pace Meter */}
            <div className="mb-4">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-sm text-slate-300">Pace</span>
                    <span className={`text-lg font-bold ${paceColor}`}>{wpm} <span className="text-xs font-normal text-slate-500">WPM</span></span>
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${wpm > 160 ? 'bg-red-500' : wpm < 100 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min((wpm / 200) * 100, 100)}%` }}
                    />
                </div>
                <p className={`text-xs mt-1 text-right ${paceColor}`}>{paceStatus}</p>
            </div>

            {/* Filler Counter */}
            <div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">Fillers</span>
                    <span className={`text-lg font-bold ${fillerCount > 5 ? 'text-red-400' : 'text-slate-200'}`}>
                        {fillerCount}
                    </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">um, uh, like, you know</p>
            </div>
        </div>
    );
};

export default CoachingWidget;
