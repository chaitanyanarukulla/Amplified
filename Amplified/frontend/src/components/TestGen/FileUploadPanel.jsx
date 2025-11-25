import React, { useState } from 'react';
import { apiUpload } from '../../utils/api';

const FileUploadPanel = ({ onFileProcessed, loading }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadType, setUploadType] = useState('document'); // document, batch, stories, import
    const [dragActive, setDragActive] = useState(false);

    const fileTypeConfig = {
        document: {
            label: '📄 Requirements Document',
            accept: '.pdf,.doc,.docx,.txt',
            description: 'Upload a requirements doc (PDF, Word, TXT) to generate test cases'
        },
        batch: {
            label: '📊 Batch Jira Tickets',
            accept: '.csv,.xlsx,.xls',
            description: 'Upload CSV/Excel with Jira ticket IDs to process multiple tickets'
        },
        stories: {
            label: '📝 User Stories',
            accept: '.txt,.md',
            description: 'Upload text file with user stories to generate test scenarios'
        },
        import: {
            label: '📥 Import Test Cases',
            accept: '.json,.csv,.xlsx',
            description: 'Import existing test cases from JSON, CSV, or Excel'
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('upload_type', uploadType);

        try {
            const res = await apiUpload('/test-gen/upload', formData);

            if (res.ok) {
                const data = await res.json();
                onFileProcessed(data);
                setSelectedFile(null);
            } else {
                const error = await res.json();
                alert(`Upload failed: ${error.detail}`);
            }
        } catch (err) {
            alert(`Upload error: ${err.message}`);
        }
    };

    return (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">📤 Upload Files</h2>

            {/* Upload Type Selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {Object.entries(fileTypeConfig).map(([key, config]) => (
                    <button
                        key={key}
                        onClick={() => {
                            setUploadType(key);
                            setSelectedFile(null);
                        }}
                        className={`p-3 rounded-lg border-2 transition-all text-sm ${uploadType === key
                            ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                            : 'border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white'
                            }`}
                    >
                        {config.label}
                    </button>
                ))}
            </div>

            {/* Description */}
            <p className="text-xs text-slate-400 mb-4">
                {fileTypeConfig[uploadType].description}
            </p>

            {/* Drop Zone */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                    }`}
            >
                {selectedFile ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-3xl">{getFileIcon(selectedFile.name)}</span>
                            <div className="text-left">
                                <p className="font-medium text-white">{selectedFile.name}</p>
                                <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setSelectedFile(null)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
                            >
                                Remove
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Upload & Process'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="text-5xl">📁</div>
                        <div>
                            <p className="text-white font-medium mb-1">Drop your file here</p>
                            <p className="text-sm text-slate-500 mb-3">or</p>
                            <label className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg cursor-pointer transition-colors inline-block">
                                <span>Browse Files</span>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept={fileTypeConfig[uploadType].accept}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        <p className="text-xs text-slate-500">
                            Accepted: {fileTypeConfig[uploadType].accept.split(',').join(', ')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        pdf: '📕',
        doc: '📘',
        docx: '📘',
        txt: '📝',
        csv: '📊',
        xlsx: '📗',
        xls: '📗',
        json: '📋',
        md: '📄'
    };
    return icons[ext] || '📄';
};

export default FileUploadPanel;
