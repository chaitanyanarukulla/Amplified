import React, { useState, useEffect } from 'react';
import StructuredSummary from './StructuredSummary';
import RiskAssessment from './RiskAssessment';
import GapsAndQuestions from './GapsAndQuestions';
import QAReport from './QAReport';
import { apiUpload, apiGet } from '../../utils/api';

const DocumentDetail = ({ document, onBack }) => {
    const [localDocument, setLocalDocument] = useState(document);
    const [activeTab, setActiveTab] = useState('summary');
    const [exporting, setExporting] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDocumentDetails = async () => {
            try {
                const response = await apiGet(`/doc-analyzer/documents/${document.id}`);
                if (response.ok) {
                    const data = await response.json();
                    setLocalDocument(data);
                } else {
                    console.error("Failed to fetch document details:", response.status);
                }
            } catch (error) {
                console.error("Failed to fetch document details:", error);
            } finally {
                setLoading(false);
            }
        };

        if (document.id) {
            fetchDocumentDetails();
        }
    }, [document.id]);

    if (!localDocument) return null;

    const analysis = localDocument.analysis || {};

    // Parse JSON strings if they are strings
    const parseData = (data) => {
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch (e) {
                console.error("Failed to parse JSON:", e);
                return {};
            }
        }
        return data || {};
    };

    const summaryData = parseData(analysis.structured_summary);
    const riskData = parseData(analysis.risk_assessment);
    const gapsData = parseData(analysis.gaps_and_questions);
    const qaData = parseData(analysis.qa_report);

    // Add overall risk to riskData for convenience
    riskData.overall_risk_level = analysis.overall_risk_level;

    const handleExport = async (format) => {
        setExporting(true);
        try {
            const response = await apiUpload(`/doc-analyzer/export/${localDocument.id}`, { format });

            if (response.ok) {
                // Trigger download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${localDocument.name}_analysis.${format === 'markdown' ? 'md' : 'pdf'}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                console.error('Export failed');
                alert('Export failed. Please try again.');
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('Export error occurred.');
        } finally {
            setExporting(false);
        }
    };

    const handleRegenerate = async () => {
        setRegenerating(true);
        try {
            // Use apiUpload for POST request (it handles headers/auth)
            const response = await apiUpload(`/doc-analyzer/regenerate/${localDocument.id}`, {});

            if (response.ok) {
                const newAnalysis = await response.json();
                // Update local document with new analysis
                setLocalDocument(prev => ({
                    ...prev,
                    analysis: newAnalysis,
                    analysis_status: 'completed',
                    error_message: null
                }));
            } else {
                const errorData = await response.json();
                alert(`Regeneration failed: ${errorData.detail || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Regeneration error:', error);
            alert('Regeneration error occurred.');
        } finally {
            setRegenerating(false);
        }
    };

    const tabs = [
        {
            id: 'summary', label: 'Structured Summary', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            id: 'risks', label: 'Risk Assessment', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            )
        },
        {
            id: 'gaps', label: 'Gaps & Questions', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            id: 'qa', label: 'QA Report', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
            )
        },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-900/50">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        data-testid="back-button"
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-white truncate max-w-xl">{localDocument.name}</h2>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                            <span>{localDocument.detected_doc_type || 'Document'}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                            <span>{new Date(localDocument.created_at).toLocaleDateString()}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                            <span>{analysis.model_version || 'AI Analysis'}</span>
                            {localDocument.analysis_status === 'failed' && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                    <span className="text-red-400 font-medium">Analysis Failed</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-purple-900/20"
                    >
                        {regenerating ? (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        )}
                        <span>{localDocument.analysis_status === 'failed' ? 'Retry Analysis' : 'Regenerate'}</span>
                    </button>

                    <div className="relative group">
                        <button
                            disabled={exporting || localDocument.analysis_status === 'failed'}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
                        >
                            {exporting ? (
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            )}
                            <span>Export</span>
                        </button>

                        {/* Dropdown */}
                        <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden hidden group-hover:block z-20">
                            <button
                                onClick={() => handleExport('pdf')}
                                className="w-full text-left px-4 py-3 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-2"
                            >
                                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Export as PDF
                            </button>
                            <button
                                onClick={() => handleExport('markdown')}
                                className="w-full text-left px-4 py-3 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-2"
                            >
                                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export as Markdown
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Message Display */}
            {localDocument.analysis_status === 'failed' && localDocument.error_message && (
                <div className="mx-6 mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h3 className="text-sm font-bold text-red-300">Analysis Failed</h3>
                        <p className="text-sm text-red-400/80 mt-1">{localDocument.error_message}</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 px-6 pt-4 border-b border-slate-700/50 bg-slate-900/50">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors relative ${activeTab === tab.id
                            ? 'text-white bg-slate-800/50 border-t border-x border-slate-700/50'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500"></div>
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-5xl mx-auto">
                    {activeTab === 'summary' && <StructuredSummary data={summaryData} />}
                    {activeTab === 'risks' && <RiskAssessment data={riskData} />}
                    {activeTab === 'gaps' && <GapsAndQuestions data={gapsData} />}
                    {activeTab === 'qa' && <QAReport data={qaData} />}
                </div>
            </div>
        </div>
    );
};

export default DocumentDetail;
