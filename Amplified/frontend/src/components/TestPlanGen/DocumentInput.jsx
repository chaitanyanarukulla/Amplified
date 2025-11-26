import React, { useState, useRef } from 'react';
import { apiPost } from '../../utils/api';

const DocumentInput = ({ onSuccess }) => {
    const [file, setFile] = useState(null);
    const [outputType, setOutputType] = useState('test_plan');
    const [testLevels, setTestLevels] = useState(['System', 'Regression']);
    const [context, setContext] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const availableLevels = ['Unit', 'Integration', 'System', 'Regression', 'E2E', 'Performance', 'Security'];

    const toggleLevel = (level) => {
        if (testLevels.includes(level)) {
            setTestLevels(testLevels.filter(l => l !== level));
        } else {
            setTestLevels([...testLevels, level]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleGenerate = async () => {
        if (!file) {
            setError("Please select a document to upload");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('output_type', outputType);
            formData.append('test_levels', testLevels.join(','));
            formData.append('context', context);

            // Using fetch directly for FormData or need to adjust apiPost to handle it
            // Assuming apiPost handles JSON, we might need a custom call or ensure apiPost handles FormData
            // Let's use standard fetch with auth header logic if needed, or assume apiPost can be adapted.
            // For safety, I'll use a direct fetch here to ensure FormData is handled correctly with boundaries.

            // Get token from localStorage if your api wrapper does that
            const token = localStorage.getItem('token');

            const res = await fetch('http://localhost:8000/test-plan/generate/document', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
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

    return (
        <div className="space-y-6">
            <div
                className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-slate-900/50"
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.docx,.doc,.txt,.md"
                    onChange={handleFileChange}
                />

                {file ? (
                    <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-green-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-white font-medium text-lg">{file.name}</span>
                        <span className="text-slate-400 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</span>
                        <button
                            className="mt-4 text-sm text-red-400 hover:text-red-300"
                            onClick={(e) => {
                                e.stopPropagation();
                                setFile(null);
                            }}
                        >
                            Remove
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-slate-300 font-medium text-lg">Click to Upload Document</span>
                        <span className="text-slate-500 text-sm mt-2">PDF, DOCX, TXT, MD (Max 10MB)</span>
                    </div>
                )}
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Generate {outputType === 'test_plan' ? 'Test Plan' : 'Test Strategy'}
                    </>
                )}
            </button>
        </div>
    );
};

export default DocumentInput;
