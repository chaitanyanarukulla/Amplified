import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiUpload, apiDelete } from '../utils/api';

const KnowledgeVault = ({ onBack }) => {
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploading, setUploading] = useState(false);

    // New state for AI features
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatQuestion, setChatQuestion] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchDocuments();
        fetchStats();
    }, []);

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const response = await apiGet('/documents');
            if (response.ok) {
                const data = await response.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error('Failed to fetch documents:', error);
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

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            fetchDocuments();
            return;
        }

        setIsLoading(true);
        try {
            // Use new semantic search endpoint
            const response = await apiGet(`/knowledge/search?q=${encodeURIComponent(searchQuery)}&limit=20`);

            if (response.ok) {
                const data = await response.json();
                // Map results to document format
                setDocuments(data.results.map(r => ({
                    id: r.entity_id,
                    name: r.metadata.filename || r.metadata.meeting_title || r.metadata.jira_ticket || 'Unknown',
                    type: r.entity_type,
                    snippet: r.content.substring(0, 200),
                    created_at: new Date().toISOString(),
                    relevance: (r.relevance_score * 100).toFixed(0)
                })));
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsLoading(false);
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
                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="mb-6">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Ask a question or search your knowledge..."
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 pl-12 text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                            />
                            <svg className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </form>

                    {/* Document List */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar" data-testid="documents-list">
                        {isLoading ? (
                            <div className="flex justify-center py-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">
                                <p className="text-lg">No documents found.</p>
                                <p className="text-sm">Upload a PDF or DOCX to get started.</p>
                            </div>
                        ) : (
                            documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="group flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/50 hover:border-purple-500/30 rounded-xl transition-all duration-200"
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
                        )}
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
        </div>
    );
};

export default KnowledgeVault;
