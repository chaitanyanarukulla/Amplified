import React, { useState } from 'react';
import DocumentList from './DocumentList';
import DocumentDetail from './DocumentDetail';

const DocAnalyzer = () => {
    const [selectedDocument, setSelectedDocument] = useState(null);

    return (
        <div className="flex flex-col h-full text-white overflow-hidden">
            {/* Header (only shown in list view) */}
            {!selectedDocument && (
                <div className="flex items-center justify-between px-6 pt-6 pb-2">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                            Document Quality Analyzer
                        </h1>
                        <p className="text-slate-400 mt-1">
                            AI-powered analysis for BRDs, PRDs, and Design Docs
                        </p>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-hidden p-6 pt-4">
                {selectedDocument ? (
                    <DocumentDetail
                        document={selectedDocument}
                        onBack={() => setSelectedDocument(null)}
                    />
                ) : (
                    <DocumentList
                        onSelectDocument={setSelectedDocument}
                    />
                )}
            </div>
        </div>
    );
};

export default DocAnalyzer;
