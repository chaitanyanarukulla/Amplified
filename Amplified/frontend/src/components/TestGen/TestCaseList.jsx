import React from 'react';

const TestCaseList = ({ cases, onSave }) => {
    const testCases = cases.test_cases || [];

    const getTypeColor = (type) => {
        switch (type?.toLowerCase()) {
            case 'positive': return 'bg-green-500/20 text-green-300 border-green-500/30';
            case 'negative': return 'bg-red-500/20 text-red-300 border-red-500/30';
            case 'edge': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
            case 'exploratory': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
            default: return 'bg-slate-700 text-slate-300 border-slate-600';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Generated Test Cases ({testCases.length})</h2>
                <button
                    onClick={onSave}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2"
                >
                    <span>💾</span> Save to Library
                </button>
            </div>

            <div className="grid gap-4">
                {testCases.map((tc, index) => (
                    <div
                        key={index}
                        className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-slate-600 transition-colors"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <h3 className="font-medium text-lg">{tc.title}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getTypeColor(tc.type)}`}>
                                {tc.type}
                            </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Steps</h4>
                                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-sm">
                                    {tc.steps?.map((step, i) => (
                                        <li key={i}>{step}</li>
                                    ))}
                                </ol>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expected Result</h4>
                                <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                    {tc.expected_result}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TestCaseList;
