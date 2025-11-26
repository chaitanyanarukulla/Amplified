import React, { useState } from 'react';
import { apiPost } from '../../utils/api';

const ConfluenceInput = ({ config, onSuccess }) => {
    const [url, setUrl] = useState('');
    const [outputType, setOutputType] = useState('test_plan');
    const [testLevels, setTestLevels] = useState(['System', 'Regression']);
    const [context, setContext] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const availableLevels = ['Unit', 'Integration', 'System', 'Regression', 'E2E', 'Performance', 'Security'];

    const toggleLevel = (level) => {
        if (testLevels.includes(level)) {
            setTestLevels(testLevels.filter(l => l !== level));
        } else {
            setTestLevels([...testLevels, level]);
        }
    };

    const handleGenerate = async () => {
        if (!url) {
            setError("Please enter a Confluence Page URL");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await apiPost('/test-plan/generate/confluence', {
                page_url: url,
                output_type: outputType,
                test_levels: testLevels,
                context: context
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Generation failed');
            }

            const result = await res.json();
            onSuccess(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!config?.configured) {
        return (
            <div className="text-center py-12">
                <div className="bg-yellow-500/10 text-yellow-200 p-4 rounded-lg inline-block mb-4">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Confluence is not configured. Please go to Settings to connect.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Confluence Page URL
                </label>
                <input
                    type="url"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://company.atlassian.net/wiki/spaces/PROJ/pages/123456/Feature+Spec"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Output Type
                    </label>
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                        <button
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${outputType === 'test_plan' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                            onClick={() => setOutputType('test_plan')}
                        >
                            Test Plan
                        </button>
                        <button
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${outputType === 'test_strategy' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                                }`}
                            onClick={() => setOutputType('test_strategy')}
                        >
                            Test Strategy
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Test Levels
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {availableLevels.map(level => (
                            <button
                                key={level}
                                onClick={() => toggleLevel(level)}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${testLevels.includes(level)
                                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                    }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Additional Context (Optional)
                </label>
                <textarea
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                    placeholder="E.g., Focus heavily on payment security for this release..."
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                />
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
                {loading ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating Plan...
                    </>
                ) : (
                    <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        Generate {outputType === 'test_plan' ? 'Test Plan' : 'Test Strategy'}
                    </>
                )}
            </button>
        </div>
    );
};

export default ConfluenceInput;
