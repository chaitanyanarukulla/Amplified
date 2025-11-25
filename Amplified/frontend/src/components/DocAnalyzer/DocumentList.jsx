import React, { useState, useEffect } from 'react';
import { apiGet, apiUpload, apiDelete } from '../../utils/api';

const DocumentList = ({ onSelectDocument }) => {
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchDocuments();

        // Poll for updates if any document is analyzing
        const interval = setInterval(() => {
            setDocuments(prevDocs => {
                const hasAnalyzing = prevDocs.some(d => d.analysis_status === 'analyzing' || d.analysis_status === 'pending');
                if (hasAnalyzing) {
                    fetchDocuments(true); // Silent fetch
                }
                return prevDocs;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const fetchDocuments = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const response = await apiGet('/doc-analyzer/documents');
            if (response.ok) {
                const data = await response.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await apiUpload('/doc-analyzer/upload', formData);
            if (response.ok) {
                const newDoc = await response.json();
                setDocuments([newDoc, ...documents]);

                // Auto-trigger analysis
                triggerAnalysis(newDoc.id);
            } else {
                console.error('Upload failed');
                alert('Upload failed. Please check file size and type.');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload error occurred.');
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = null;
        }
    };

    const triggerAnalysis = async (docId) => {
        try {
            // Optimistic update
            setDocuments(docs => docs.map(d =>
                d.id === docId ? { ...d, analysis_status: 'analyzing' } : d
            ));

            const response = await apiUpload(`/doc-analyzer/analyze/${docId}`, {});
            if (response.ok) {
                fetchDocuments(true);
            } else {
                // Revert or show error
                fetchDocuments(true);
            }
        } catch (error) {
            console.error('Analysis trigger failed:', error);
            fetchDocuments(true);
        }
    };

    const handleDelete = async (e, docId) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this document and its analysis?')) return;

        try {
            const response = await apiDelete(`/doc-analyzer/documents/${docId}`);
            if (response.ok) {
                setDocuments(documents.filter(d => d.id !== docId));
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const getStatusBadge = (doc) => {
        switch (doc.analysis_status) {
            case 'completed':
                return <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs border border-green-500/30">Analyzed</span>;
            case 'analyzing':
                return (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs border border-blue-500/30 flex items-center gap-1">
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                    </span>
                );
            case 'failed':
                return (
                    <span
                        className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs border border-red-500/30 cursor-help relative group/tooltip"
                    >
                        Failed
                        {doc.error_message && (
                            <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 shadow-xl z-50 hidden group-hover/tooltip:block">
                                {doc.error_message}
                            </div>
                        )}
                    </span>
                );
            default:
                return <span className="px-2 py-1 bg-slate-500/20 text-slate-300 rounded text-xs border border-slate-500/30">Pending</span>;
        }
    };

    const getFileIcon = (type) => {
        if (type === 'pdf') return (
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        );
        if (type === 'docx') return (
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        );
        return (
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        );
    };

    const filteredDocuments = documents.filter(doc => {
        if (filterStatus === 'all') return true;
        return doc.analysis_status === filterStatus;
    });

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${filterStatus === 'all' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterStatus('completed')}
                        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${filterStatus === 'completed' ? 'bg-green-900/30 text-green-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Analyzed
                    </button>
                    <button
                        onClick={() => setFilterStatus('analyzing')}
                        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${filterStatus === 'analyzing' ? 'bg-blue-900/30 text-blue-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Processing
                    </button>
                </div>

                <div className="relative">
                    <input
                        type="file"
                        id="doc-upload"
                        className="hidden"
                        onChange={handleUpload}
                        accept=".pdf,.docx,.doc,.md,.txt"
                        disabled={uploading}
                    />
                    <label
                        htmlFor="doc-upload"
                        className={`flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg cursor-pointer transition-colors shadow-lg shadow-purple-900/20 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {uploading ? (
                            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        )}
                        <span className="font-medium">Analyze Document</span>
                    </label>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {isLoading && documents.length === 0 ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
                    </div>
                ) : filteredDocuments.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 border-2 border-dashed border-slate-700/50 rounded-xl">
                        <div className="w-16 h-16 mx-auto mb-4 text-slate-600">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-400">No documents found</h3>
                        <p className="text-sm mt-2 max-w-xs mx-auto">Upload a BRD, PRD, or Design Doc to generate a quality analysis report.</p>
                    </div>
                ) : (
                    filteredDocuments.map((doc) => (
                        <div
                            key={doc.id}
                            onClick={() => onSelectDocument(doc)}
                            className="group flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-purple-500/30 rounded-xl transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="p-3 bg-slate-900/50 rounded-lg shrink-0">
                                    {getFileIcon(doc.file_type)}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-medium text-slate-200 truncate pr-4">{doc.name}</h3>
                                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                        <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                        {doc.detected_doc_type && doc.detected_doc_type !== 'unknown' && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                                <span className="uppercase tracking-wider text-[10px] font-semibold text-purple-400">{doc.detected_doc_type}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                                {getStatusBadge(doc)}

                                <button
                                    onClick={(e) => handleDelete(e, doc.id)}
                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete Document"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>

                                <div className="text-slate-500 group-hover:text-purple-400 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DocumentList;
