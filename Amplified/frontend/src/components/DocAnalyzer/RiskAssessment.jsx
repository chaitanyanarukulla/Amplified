import React from 'react';

const RiskAssessment = ({ data }) => {
    if (!data) return null;

    const getRiskColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'low': return 'text-green-400 bg-green-400/10 border-green-400/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    const getRiskBadge = (level) => {
        const colorClass = getRiskColor(level);
        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}>
                {level || 'Unknown'}
            </span>
        );
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Overall Risk Header */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Overall Risk Assessment</h3>
                    <p className="text-slate-400 text-sm mt-1">Based on requirements clarity, complexity, and testability</p>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-sm text-slate-400 mb-1">Risk Level</span>
                    <span className={`text-2xl font-bold ${getRiskColor(data.overall_risk_level).split(' ')[0]}`}>
                        {data.overall_risk_level || 'Unknown'}
                    </span>
                </div>
            </div>

            {/* Risk Cards */}
            <div className="grid gap-4">
                {data.risks && data.risks.length > 0 ? (
                    data.risks.map((risk, idx) => (
                        <div key={idx} className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50 hover:border-slate-600 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${getRiskColor(risk.impact).replace('text-', 'bg-opacity-20 bg-')}`}>
                                        <svg className={`w-5 h-5 ${getRiskColor(risk.impact).split(' ')[0]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-200">{risk.title}</h4>
                                        <span className="text-xs text-slate-500 uppercase tracking-wider">{risk.category}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="flex flex-col items-end">
                                        <span className="text-slate-500 text-[10px] uppercase">Likelihood</span>
                                        {getRiskBadge(risk.likelihood)}
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-slate-500 text-[10px] uppercase">Impact</span>
                                        {getRiskBadge(risk.impact)}
                                    </div>
                                </div>
                            </div>

                            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                                {risk.description}
                            </p>

                            <div className="bg-slate-900/30 rounded-lg p-3 border border-slate-700/30">
                                <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide block mb-1">Mitigation Strategy</span>
                                        <p className="text-sm text-slate-400">{risk.mitigation}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-slate-500">
                        No significant risks identified.
                    </div>
                )}
            </div>
        </div>
    );
};

export default RiskAssessment;
