import React from 'react';

const GapsAndQuestions = ({ data }) => {
    if (!data) return null;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-2">Gaps & Ambiguities</h3>
                <p className="text-slate-400 text-sm">
                    Identified missing requirements, undefined terms, and areas needing clarification.
                </p>
            </div>

            <div className="space-y-4">
                {data.gaps && data.gaps.length > 0 ? (
                    data.gaps.map((gap, idx) => (
                        <div key={idx} className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
                            <div className="p-5 border-b border-slate-700/50 flex items-start gap-4">
                                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400 shrink-0">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium text-slate-200 text-lg">Gap #{idx + 1}</h4>
                                        <span className={`px-2 py-1 rounded text-xs font-medium border ${gap.impact === 'High' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                                                gap.impact === 'Medium' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                                                    'text-blue-400 bg-blue-400/10 border-blue-400/20'
                                            }`}>
                                            {gap.impact} Impact
                                        </span>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed">
                                        {gap.description}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-900/30 p-5">
                                <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                    Recommended Questions
                                </h5>
                                <ul className="space-y-3">
                                    {gap.questions && gap.questions.map((q, qIdx) => (
                                        <li key={qIdx} className="flex items-start gap-3 text-slate-400 text-sm bg-slate-800/50 p-3 rounded-lg border border-slate-700/30">
                                            <span className="text-purple-400 font-bold">?</span>
                                            <span>{q}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-slate-500">
                        No gaps or ambiguities detected.
                    </div>
                )}
            </div>
        </div>
    );
};

export default GapsAndQuestions;
