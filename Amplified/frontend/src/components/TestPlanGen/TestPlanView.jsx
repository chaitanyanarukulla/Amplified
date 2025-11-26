import React from 'react';
import ReactMarkdown from 'react-markdown';

const TestPlanView = ({ result, onBack }) => {
    const handleCopy = () => {
        navigator.clipboard.writeText(result.content);
        alert('Copied to clipboard!');
    };

    const handleExport = () => {
        const blob = new Blob([result.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-plan-${new Date().toISOString().slice(0, 10)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full bg-slate-900/50 -m-6 rounded-none md:rounded-2xl md:m-0 border-0 md:border md:border-slate-700/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-white truncate max-w-xl">Test Plan</h2>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                            <span>Generated Plan</span>
                            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                            <span>{new Date(result.created_at).toLocaleDateString()}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                            <span>AI Generated</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        <span>Copy</span>
                    </button>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors shadow-lg shadow-cyan-900/20"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Export MD</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-slate-900/30">
                <div className="max-w-4xl mx-auto bg-slate-900/80 border border-slate-700/50 rounded-xl p-8 md:p-12 shadow-2xl">
                    <div className="prose prose-invert prose-lg max-w-none 
                        prose-headings:font-bold prose-headings:tracking-tight
                        prose-h1:text-4xl prose-h1:bg-gradient-to-r prose-h1:from-cyan-400 prose-h1:to-blue-500 prose-h1:bg-clip-text prose-h1:text-transparent prose-h1:mb-8 prose-h1:pb-4 prose-h1:border-b prose-h1:border-slate-700/50
                        prose-h2:text-2xl prose-h2:text-cyan-200 prose-h2:mt-12 prose-h2:mb-6 prose-h2:flex prose-h2:items-center prose-h2:gap-3
                        prose-h3:text-xl prose-h3:text-blue-300 prose-h3:mt-8 prose-h3:mb-4
                        prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-6
                        prose-li:text-slate-300 prose-li:marker:text-cyan-500
                        prose-strong:text-white prose-strong:font-semibold
                        prose-code:text-cyan-300 prose-code:bg-cyan-900/20 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-cyan-500/20 prose-code:before:content-none prose-code:after:content-none
                        prose-pre:bg-slate-950/50 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-xl prose-pre:shadow-inner
                        prose-blockquote:border-l-4 prose-blockquote:border-cyan-500 prose-blockquote:bg-cyan-500/5 prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:rounded-r-lg prose-blockquote:text-slate-400 prose-blockquote:italic
                        prose-table:w-full prose-table:text-left prose-table:border-collapse prose-table:my-8
                        prose-th:p-4 prose-th:bg-slate-800/50 prose-th:text-cyan-200 prose-th:font-semibold prose-th:border-b prose-th:border-slate-700
                        prose-td:p-4 prose-td:border-b prose-td:border-slate-800 prose-td:text-slate-300
                        ">
                        <ReactMarkdown
                            components={{
                                h1: ({ node, ...props }) => <h1 {...props} className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-8 pb-4 border-b border-slate-700/50" />,
                                h2: ({ node, ...props }) => (
                                    <h2 {...props} className="text-2xl font-bold text-cyan-200 mt-12 mb-6 flex items-center gap-3">
                                        <span className="w-2 h-8 rounded-full bg-cyan-500 inline-block"></span>
                                        {props.children}
                                    </h2>
                                ),
                                ul: ({ node, ...props }) => <ul {...props} className="list-none space-y-2 my-6" />,
                                li: ({ node, ...props }) => (
                                    <li {...props} className="flex items-start gap-3 text-slate-300">
                                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0"></span>
                                        <span>{props.children}</span>
                                    </li>
                                ),
                                table: ({ node, ...props }) => (
                                    <div className="overflow-x-auto my-8 rounded-xl border border-slate-700/50 shadow-lg">
                                        <table {...props} className="w-full text-left border-collapse bg-slate-900/50" />
                                    </div>
                                ),
                                th: ({ node, ...props }) => <th {...props} className="p-4 bg-slate-800/80 text-cyan-200 font-semibold border-b border-slate-700" />,
                                td: ({ node, ...props }) => <td {...props} className="p-4 border-b border-slate-800 text-slate-300 hover:bg-slate-800/30 transition-colors" />,
                            }}
                        >
                            {result.content}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestPlanView;
