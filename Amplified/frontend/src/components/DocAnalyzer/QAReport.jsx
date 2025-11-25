import React from 'react';

const QAReport = ({ data }) => {
    if (!data) return null;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Feature Summary */}
            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl p-6 border border-purple-500/20">
                <h3 className="text-lg font-semibold text-white mb-3">QA Feature Summary</h3>
                <p className="text-slate-300 leading-relaxed">
                    {data.feature_summary}
                </p>
            </div>

            {/* Recommended Test Types */}
            <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Recommended Test Strategy</h3>
                <div className="flex flex-wrap gap-3">
                    {data.recommended_test_types && data.recommended_test_types.map((type, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                            {type}
                        </span>
                    ))}
                </div>
            </div>

            {/* High Risk Scenarios */}
            <div className="bg-red-900/10 rounded-xl p-6 border border-red-500/20">
                <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-white">High-Risk Scenarios</h3>
                </div>
                <ul className="space-y-3">
                    {data.high_risk_scenarios && data.high_risk_scenarios.map((scenario, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-slate-300 bg-red-900/20 p-3 rounded-lg border border-red-500/10">
                            <span className="font-mono text-red-400 text-sm mt-0.5">{idx + 1}.</span>
                            <span>{scenario}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Test Ideas by Area */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-6">Test Ideas & Charters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {data.test_ideas && data.test_ideas.map((area, idx) => (
                        <div key={idx} className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50">
                            <h4 className="font-medium text-purple-300 mb-4 pb-2 border-b border-slate-700/50">
                                {area.area}
                            </h4>
                            <ul className="space-y-2">
                                {area.test_cases && area.test_cases.map((tc, tcIdx) => (
                                    <li key={tcIdx} className="flex items-start gap-2 text-sm text-slate-400">
                                        <svg className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{tc}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Open Questions */}
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Open Questions for Stakeholders</h3>
                <ul className="space-y-3">
                    {data.open_questions && data.open_questions.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-slate-300">
                            <span className="text-purple-400 font-bold">?</span>
                            <span>{q}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default QAReport;
