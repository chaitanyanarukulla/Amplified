import React, { useState, useEffect } from 'react';
import ConfluenceConfigPanel from './ConfluenceConfigPanel';
import ConfluenceInput from './ConfluenceInput';
import DocumentInput from './DocumentInput';
import TestPlanView from './TestPlanView';
import HistoryPanel from './HistoryPanel';
import { apiGet } from '../../utils/api';

const TestPlanGenDashboard = ({ onBack }) => {
    const [view, setView] = useState('main'); // 'main' | 'history' | 'config' | 'result'
    const [mode, setMode] = useState('confluence'); // 'confluence' | 'document'
    const [config, setConfig] = useState(null);
    const [generatedResult, setGeneratedResult] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await apiGet('/test-plan/config');
            if (res.ok) {
                const data = await res.json();
                setConfig(data);
            }
        } catch (err) {
            console.error("Failed to fetch config:", err);
        }
    };

    const handleGenerateSuccess = (result) => {
        setGeneratedResult(result);
        setView('result');
    };

    return (
        <div className="h-full flex flex-col bg-slate-900 text-white p-6 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">
                        Test Plan Generator
                    </h1>
                </div>
                <div className="space-x-4">
                    <button
                        onClick={() => setView('history')}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        History
                    </button>
                    <button
                        onClick={() => setView('config')}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        Settings
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 max-w-5xl mx-auto w-full">

                {view === 'config' && (
                    <ConfluenceConfigPanel
                        onSave={() => {
                            fetchConfig();
                            setView('main');
                        }}
                        onCancel={() => setView('main')}
                    />
                )}

                {view === 'history' && (
                    <HistoryPanel
                        onSelect={(item) => {
                            setGeneratedResult({
                                content: item.generated_content,
                                id: item.id,
                                created_at: item.created_at
                            });
                            setView('result');
                        }}
                        onBack={() => setView('main')}
                    />
                )}

                {view === 'result' && generatedResult && (
                    <TestPlanView
                        result={generatedResult}
                        onBack={() => setView('main')}
                    />
                )}

                {view === 'main' && (
                    <div className="space-y-8">
                        {/* Mode Selector */}
                        <div className="flex justify-center gap-4 mb-8">
                            <button
                                onClick={() => setMode('confluence')}
                                className={`px-6 py-3 rounded-lg font-medium transition-all ${mode === 'confluence'
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                            >
                                From Confluence
                            </button>
                            <button
                                onClick={() => setMode('document')}
                                className={`px-6 py-3 rounded-lg font-medium transition-all ${mode === 'document'
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                            >
                                From Document
                            </button>
                        </div>

                        {/* Input Forms */}
                        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 shadow-xl">
                            {mode === 'confluence' ? (
                                <ConfluenceInput
                                    config={config}
                                    onSuccess={handleGenerateSuccess}
                                />
                            ) : (
                                <DocumentInput
                                    onSuccess={handleGenerateSuccess}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestPlanGenDashboard;
