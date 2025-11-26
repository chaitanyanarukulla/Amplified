import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiUpload, apiDelete } from '../utils/api';

const KnowledgeVault = ({ onBack }) => {
    const [documents, setDocuments] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [testCases, setTestCases] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'documents', 'meetings', 'test_cases'

    // New state for AI features
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatQuestion, setChatQuestion] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [stats, setStats] = useState(null);
    const [selectedEntity, setSelectedEntity] = useState(null); // For detail view

    useEffect(() => {
        fetchAllEntities();
        fetchStats();
    }, []);

    const fetchAllEntities = async () => {
        setIsLoading(true);
        try {
            // Fetch documents
            const docsResponse = await apiGet('/documents');
            if (docsResponse.ok) {
                const docsData = await docsResponse.json();
                setDocuments(docsData);
            }

            // Fetch meetings
            const meetingsResponse = await apiGet('/meetings');
            if (meetingsResponse.ok) {
                const meetingsData = await meetingsResponse.json();
                setMeetings(meetingsData);
            }

            // Fetch test cases
            const testCasesResponse = await apiGet('/test-gen/history');
            if (testCasesResponse.ok) {
                const testCasesData = await testCasesResponse.json();
                setTestCases(testCasesData);
            }
        } catch (error) {
            console.error('Failed to fetch entities:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await apiGet('/knowledge/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const handleAskQuestion = async () => {
        if (!chatQuestion.trim()) return;

        setIsAsking(true);
        const userMessage = { role: 'user', content: chatQuestion };
        setChatMessages([...chatMessages, userMessage]);
        setChatQuestion('');

        try {
            const response = await apiPost('/knowledge/ask', {
                question: chatQuestion
            });

            if (response.ok) {
                const data = await response.json();
                const assistantMessage = {
                    role: 'assistant',
                    content: data.answer,
                    sources: data.sources,
                    confidence: data.confidence
                };
                setChatMessages([...chatMessages, userMessage, assistantMessage]);
            }
        } catch (error) {
            console.error('Ask failed:', error);
            const errorMessage = {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                confidence: 'error'
            };
            setChatMessages([...chatMessages, userMessage, errorMessage]);
        } finally {
            setIsAsking(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'general');
        formData.append('tags', 'upload');

        try {
            const response = await apiUpload('/documents', formData);

            if (response.ok) {
                await fetchDocuments();
                await fetchStats(); // Refresh stats
            } else {
                console.error('Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (docId) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;

        try {
            const response = await apiDelete(`/documents/${docId}`);

            if (response.ok) {
                setDocuments(documents.filter(d => d.id !== docId));
                await fetchStats(); // Refresh stats
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    return (
        <div className="flex flex-col h-full text-white p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h1
                        data-testid="knowledge-vault-header"
                        className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent"
                    >
                        Knowledge Vault
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    {/* Stats Badge */}
                    {stats && (
                        <div className="px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                            <div className="text-xs text-slate-400">Total Knowledge</div>
                            <div className="text-lg font-bold text-purple-400">{stats.total_artifacts}</div>
                        </div>
                    )}

                    {/* AI Chat Toggle */}
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${showChat
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                        title="AI Assistant"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <span>AI Chat</span>
                    </button>

                    {/* Upload Button */}
                    <div className="relative">
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            onChange={handleUpload}
                            disabled={uploading}
                        />
                        <label
                            htmlFor="file-upload"
                            data-testid="btn-upload-doc"
                            className={`flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg cursor-pointer transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {uploading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            )}
                            <span>Upload</span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="flex gap-6 flex-1 overflow-hidden">
                {/* Main Content */}
                <div className={`flex flex-col ${showChat ? 'w-2/3' : 'w-full'} transition-all`}>
                    {/* AI Chat Bar */}
                    <div className="mb-6">
                        <div className="relative">
                            <input
                                type="text"
                                value={chatQuestion}
                                onChange={(e) => setChatQuestion(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && !isAsking && chatQuestion.trim() && handleAskQuestion()}
                                placeholder="Ask AI what you're looking for..."
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-4 px-6 pl-14 text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-lg"
                                disabled={isAsking}
                            />
                            <svg className="w-6 h-6 text-purple-400 absolute left-5 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            {isAsking && (
                                <div className="absolute right-5 top-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-4 border-b border-slate-700">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-4 py-2 font-medium transition-colors ${activeTab === 'all'
                                ? 'text-purple-400 border-b-2 border-purple-400'
                                : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            All ({documents.length + meetings.length + testCases.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('documents')}
                            className={`px-4 py-2 font-medium transition-colors ${activeTab === 'documents'
                                ? 'text-purple-400 border-b-2 border-purple-400'
                                : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            Documents ({documents.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('meetings')}
                            className={`px-4 py-2 font-medium transition-colors ${activeTab === 'meetings'
                                ? 'text-purple-400 border-b-2 border-purple-400'
                                : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            Meetings ({meetings.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('test_cases')}
                            className={`px-4 py-2 font-medium transition-colors ${activeTab === 'test_cases'
                                ? 'text-purple-400 border-b-2 border-purple-400'
                                : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            Test Cases ({testCases.length})
                        </button>
                    </div>

                    {/* Entity List */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar" data-testid="documents-list">
                        {isLoading ? (
                            <div className="flex justify-center py-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                            </div>
                        ) : (() => {
                            // Combine and filter entities based on active tab
                            const allEntities = [
                                ...documents.map(d => ({ ...d, type: 'document', name: d.filename || d.name })),
                                ...meetings.map(m => ({ ...m, type: 'meeting', name: m.title })),
                                ...testCases.map(tc => ({ ...tc, type: 'test_case', name: `Test Suite: ${tc.jira_ticket || tc.id}` }))
                            ];

                            const filteredEntities = activeTab === 'all'
                                ? allEntities
                                : allEntities.filter(e => e.type === activeTab || (activeTab === 'test_cases' && e.type === 'test_case'));

                            // Sort by created_at descending
                            filteredEntities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                            return filteredEntities.length === 0 ? (
                                <div className="text-center py-10 text-slate-500">
                                    <p className="text-lg">No {activeTab === 'all' ? 'items' : activeTab.replace('_', ' ')} found.</p>
                                    <p className="text-sm">
                                        {activeTab === 'documents' && 'Upload a PDF or DOCX to get started.'}
                                        {activeTab === 'meetings' && 'Start a meeting to see it here.'}
                                        {activeTab === 'test_cases' && 'Generate test cases to see them here.'}
                                        {activeTab === 'all' && 'Upload documents, hold meetings, or generate test cases to build your knowledge base.'}
                                    </p>
                                </div>
                            ) : (
                                filteredEntities.map((doc) => (
                                    <div
                                        key={`${doc.type}-${doc.id}`}
                                        onClick={() => setSelectedEntity(doc)}
                                        className="group flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/50 hover:border-purple-500/30 rounded-xl transition-all duration-200 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4 overflow-hidden flex-1">
                                            <div className="p-3 bg-slate-700/50 rounded-lg text-purple-400">
                                                {doc.type === 'meeting' ? (
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                ) : doc.type === 'test_case' ? (
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-medium text-slate-200 truncate">{doc.name}</h3>
                                                    {doc.relevance && (
                                                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs font-medium">
                                                            {doc.relevance}% match
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <span className="capitalize">{doc.type}</span>
                                                    <span>•</span>
                                                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                                </div>
                                                {doc.snippet && (
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{doc.snippet}</p>
                                                )}
                                            </div>
                                        </div>

                                        {doc.type === 'document' && (
                                            <button
                                                onClick={() => handleDelete(doc.id)}
                                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete Document"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))
                            );
                        })()}
                    </div>
                </div>

                {/* AI Chat Panel */}
                {showChat && (
                    <div className="w-1/3 flex flex-col bg-slate-800/30 border border-slate-700 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-purple-400">AI Assistant</h2>
                            <button
                                onClick={() => setChatMessages([])}
                                className="text-xs text-slate-400 hover:text-slate-200"
                            >
                                Clear
                            </button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 custom-scrollbar">
                            {chatMessages.length === 0 ? (
                                <div className="text-center text-slate-500 mt-8">
                                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                    <p className="text-sm">Ask me anything about your knowledge base!</p>
                                </div>
                            ) : (
                                chatMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-lg p-3 ${msg.role === 'user'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-slate-700 text-slate-200'
                                            }`}>
                                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                            {msg.sources && msg.sources.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-slate-600">
                                                    <p className="text-xs text-slate-400 mb-1">Sources:</p>
                                                    {msg.sources.slice(0, 3).map((source, i) => (
                                                        <div key={i} className="text-xs text-slate-300 mb-1">
                                                            • {source.type}: {source.snippet.substring(0, 50)}...
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                            {isAsking && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-700 rounded-lg p-3">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Chat Input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={chatQuestion}
                                onChange={(e) => setChatQuestion(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                                placeholder="Ask a question..."
                                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                                disabled={isAsking}
                            />
                            <button
                                onClick={handleAskQuestion}
                                disabled={isAsking || !chatQuestion.trim()}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Entity Detail Modal */}
            {selectedEntity && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedEntity(null)}>
                    <div className="bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-700 flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm font-medium capitalize">
                                        {selectedEntity.type.replace('_', ' ')}
                                    </span>
                                    <span className="text-sm text-slate-400">
                                        {new Date(selectedEntity.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <h2 className="text-2xl font-bold text-white">{selectedEntity.name}</h2>
                            </div>
                            <button
                                onClick={() => setSelectedEntity(null)}
                                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {selectedEntity.type === 'document' && (
                                <div className="space-y-4">
                                    {selectedEntity.type && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-400 mb-2">Document Type</h3>
                                            <p className="text-slate-200 capitalize">{selectedEntity.doc_type || selectedEntity.type}</p>
                                        </div>
                                    )}
                                    {selectedEntity.tags && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-400 mb-2">Tags</h3>
                                            <p className="text-slate-200">{selectedEntity.tags}</p>
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-400 mb-2">Full Content</h3>
                                        <div className="bg-slate-900/50 rounded-lg p-4 text-slate-300 whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                                            {selectedEntity.extracted_text || selectedEntity.content || 'No content available'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedEntity.type === 'meeting' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-400 mb-2">Platform</h3>
                                            <p className="text-slate-200 capitalize">{selectedEntity.platform || 'Not specified'}</p>
                                        </div>
                                        {selectedEntity.start_time && (
                                            <div>
                                                <h3 className="text-sm font-semibold text-slate-400 mb-2">Start Time</h3>
                                                <p className="text-slate-200">{new Date(selectedEntity.start_time).toLocaleString()}</p>
                                            </div>
                                        )}
                                    </div>

                                    {selectedEntity.summaries && selectedEntity.summaries.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-400 mb-3">Summary</h3>
                                            <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                                                {selectedEntity.summaries[0].short_summary && (
                                                    <div>
                                                        <h4 className="text-purple-400 font-medium mb-2">Overview</h4>
                                                        <p className="text-slate-300">{selectedEntity.summaries[0].short_summary}</p>
                                                    </div>
                                                )}
                                                {selectedEntity.summaries[0].detailed_summary && (
                                                    <div>
                                                        <h4 className="text-purple-400 font-medium mb-2">Details</h4>
                                                        <p className="text-slate-300 whitespace-pre-wrap">{selectedEntity.summaries[0].detailed_summary}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {selectedEntity.actions && selectedEntity.actions.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-400 mb-3">Action Items ({selectedEntity.actions.length})</h3>
                                            <div className="space-y-2">
                                                {selectedEntity.actions.map((action, idx) => (
                                                    <div key={idx} className="bg-slate-900/50 rounded-lg p-4 border-l-4 border-purple-500">
                                                        <p className="text-slate-200 font-medium">{action.description}</p>
                                                        <div className="flex gap-4 mt-2 text-sm text-slate-400">
                                                            {action.owner && <span>👤 {action.owner}</span>}
                                                            {action.status && <span className="capitalize">Status: {action.status}</span>}
                                                            {action.due_date && <span>📅 {new Date(action.due_date).toLocaleDateString()}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedEntity.type === 'test_case' && (
                                <div className="space-y-6">
                                    {selectedEntity.jira_ticket && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-400 mb-2">Jira Ticket</h3>
                                            <p className="text-slate-200 font-mono text-lg">{selectedEntity.jira_ticket}</p>
                                        </div>
                                    )}
                                    {selectedEntity.test_cases && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-400 mb-3">Generated Test Cases</h3>
                                            <div className="bg-slate-900/50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                                                {typeof selectedEntity.test_cases === 'string' ? (
                                                    <pre className="text-slate-300 whitespace-pre-wrap text-sm">{selectedEntity.test_cases}</pre>
                                                ) : (
                                                    <pre className="text-slate-300 whitespace-pre-wrap text-sm">{JSON.stringify(selectedEntity.test_cases, null, 2)}</pre>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
};

export default KnowledgeVault;
