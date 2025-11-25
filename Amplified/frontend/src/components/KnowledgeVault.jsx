import React, { useState, useEffect } from 'react';
import { apiGet, apiUpload, apiDelete } from '../utils/api';

const KnowledgeVault = ({ onBack }) => {
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchDocuments();
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

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            fetchDocuments();
            return;
        }

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('query', searchQuery);

            const response = await apiUpload('/documents/search', formData);

            if (response.ok) {
                const data = await response.json();
                // Search returns snippets, but we might want to map them to docs or just show them
                // For now, let's just show the docs that matched if possible, or just the snippets
                // The backend search returns {id, filename, snippet, score}
                setDocuments(data.map(d => ({
                    id: d.id,
                    name: d.filename,
                    type: 'search_result',
                    snippet: d.snippet,
                    created_at: new Date().toISOString() // Mock date for search results
                })));
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'general'); // Default type
        formData.append('tags', 'upload');

        try {
            const response = await apiUpload('/documents', formData);

            if (response.ok) {
                await fetchDocuments(); // Refresh list
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
                        <span>Upload Document</span>
                    </label>
                </div>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-6">
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search your documents..."
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
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="p-3 bg-slate-700/50 rounded-lg text-purple-400">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-medium text-slate-200 truncate">{doc.name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                        {doc.type === 'search_result' && (
                                            <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">Match</span>
                                        )}
                                    </div>
                                    {doc.snippet && (
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{doc.snippet}</p>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => handleDelete(doc.id)}
                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete Document"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default KnowledgeVault;
