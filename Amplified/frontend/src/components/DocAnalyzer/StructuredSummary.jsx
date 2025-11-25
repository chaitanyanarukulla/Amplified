import React from 'react';

const StructuredSummary = ({ data }) => {
    if (!data) return null;

    const Section = ({ title, items, emptyText = "None specified" }) => (
        <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</h4>
            {items && items.length > 0 ? (
                <ul className="space-y-2">
                    {items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-slate-500 text-sm italic">{emptyText}</p>
            )}
        </div>
    );

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Purpose */}
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-2">Purpose & Goals</h3>
                <p className="text-slate-300 leading-relaxed">
                    {data.purpose || "No purpose statement identified."}
                </p>
            </div>

            {/* Scope Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-green-500/20 rounded text-green-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white">In Scope</h3>
                    </div>
                    <Section title="" items={data.scope_in} />
                </div>

                <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-red-500/20 rounded text-red-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white">Out of Scope</h3>
                    </div>
                    <Section title="" items={data.scope_out} />
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
                    <Section title="Key Features" items={data.key_features} />
                </div>

                <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 space-y-6">
                    <Section title="Constraints" items={data.constraints} />
                    <div className="border-t border-slate-700/50 pt-6">
                        <Section title="Assumptions" items={data.assumptions} />
                    </div>
                </div>
            </div>

            {/* Stakeholders */}
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
                <Section title="Stakeholders" items={data.stakeholders} />
            </div>
        </div>
    );
};

export default StructuredSummary;
