import React, { useState, useEffect } from 'react';
import JiraConfigPanel from './JiraConfigPanel';
import TicketInput from './TicketInput';
import TicketPreview from './TicketPreview';
import TestCaseList from './TestCaseList';
import HistoryPanel from './HistoryPanel';
import FileUploadPanel from './FileUploadPanel';
import { apiGet, apiPost } from '../../utils/api';

const TestGenDashboard = ({ onBack }) => {
    const [config, setConfig] = useState(null);
    const [currentTicket, setCurrentTicket] = useState(null);
    const [generatedCases, setGeneratedCases] = useState(null);
    const [view, setView] = useState('main'); // 'main' | 'history' | 'config'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Check configuration on mount
    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await apiGet('/test-gen/config');
            if (res.ok) {
                const data = await res.json();
                setConfig(data);
                if (!data.configured) {
                    setView('config');
                }
            }
        } catch (err) {
            console.error("Failed to fetch config:", err);
        }
    };

    const handleTicketFetch = async (ticketKey) => {
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching ticket:', ticketKey);
            const res = await apiPost('/test-gen/fetch-ticket', { ticket_key: ticketKey });

            if (!res.ok) {
                const errorData = await res.json();
                console.error('Fetch error:', errorData);
                throw new Error(errorData.detail || 'Failed to fetch ticket');
            }

            const data = await res.json();
            console.log('Ticket fetched:', data);
            setCurrentTicket(data);
            setGeneratedCases(null); // Reset previous cases
        } catch (err) {
            console.error('Fetch failed:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!currentTicket) return;

        setLoading(true);
        setError(null);
        try {
            const res = await apiPost('/test-gen/generate', { ticket_data: currentTicket });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Generation failed');
            }

            const data = await res.json();
            setGeneratedCases(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentTicket || !generatedCases) return;

        try {
            const res = await apiPost('/test-gen/save', {
                ticket_key: currentTicket.key,
                ticket_title: currentTicket.summary,
                raw_story_data: currentTicket,
                generated_test_cases: generatedCases
            });

            if (res.ok) {
                alert('Saved successfully!');
            }
        } catch (err) {
            console.error("Save failed:", err);
        }
    };

    const handleFileProcessed = (data) => {
        console.log('File processed:', data);
        // Handle different upload types
        if (data.type === 'batch') {
            // Batch processing results
            alert(`Processed ${data.results.length} tickets`);
        } else if (data.type === 'document' || data.type === 'stories') {
            // Generated test cases from document
            setGeneratedCases(data.test_cases);
            setCurrentTicket({
                key: data.source || 'Uploaded Document',
                summary: data.title || 'Test Cases from Document',
                description: data.content_preview || ''
            });
        } else if (data.type === 'import') {
            // Imported test cases
            setGeneratedCases(data.test_cases);
            alert(`Imported ${data.test_cases.test_cases.length} test cases`);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-900 text-white p-6 overflow-y-auto">
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
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Test Case Generator
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

            {view === 'config' && (
                <JiraConfigPanel
                    onSave={() => {
                        fetchConfig();
                        setView('main');
                    }}
                    onCancel={() => setView('main')}
                />
            )}

            {view === 'history' && (
                <HistoryPanel
                    onSelect={(generation) => {
                        setCurrentTicket(generation.raw_story_data);
                        setGeneratedCases(generation.generated_test_cases);
                        setView('main');
                    }}
                    onBack={() => setView('main')}
                />
            )}

            {view === 'main' && (
                <div className="space-y-6 max-w-4xl mx-auto w-full">
                    {!config?.configured && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg text-yellow-200 mb-4">
                            Please configure your Jira settings to get started.
                        </div>
                    )}

                    <TicketInput onFetch={handleTicketFetch} loading={loading} />

                    <FileUploadPanel onFileProcessed={handleFileProcessed} loading={loading} />

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-red-200">
                            {error}
                        </div>
                    )}

                    {currentTicket && (
                        <TicketPreview
                            ticket={currentTicket}
                            onGenerate={handleGenerate}
                            loading={loading}
                        />
                    )}

                    {generatedCases && (
                        <TestCaseList
                            cases={generatedCases}
                            onSave={handleSave}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default TestGenDashboard;
