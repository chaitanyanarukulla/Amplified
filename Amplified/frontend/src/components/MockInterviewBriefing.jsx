import React from 'react';

const MockInterviewBriefing = ({ briefing, onStartInterview, onBack }) => {
    if (!briefing) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white">
                <svg className="animate-spin h-12 w-12 text-orange-500 mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-lg text-slate-300">Preparing your interview briefing...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-6 md:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-500 bg-clip-text text-transparent">
                        Interview Briefing
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Review this information before starting your mock interview</p>
                </div>
            </div>

            {/* Briefing Content */}
            <div className="max-w-4xl mx-auto space-y-6 mb-6">
                {/* Company Overview */}
                {briefing.company_overview && (
                    <div className="glass-card border-blue-200 dark:border-blue-500/10 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Company Overview</h2>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {briefing.company_overview}
                        </div>
                    </div>
                )}

                {/* Role Expectations */}
                {briefing.role_expectations && (
                    <div className="glass-card border-purple-200 dark:border-purple-500/10 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Role Expectations</h2>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {briefing.role_expectations}
                        </div>
                    </div>
                )}

                {/* Potential Questions */}
                {briefing.potential_questions && briefing.potential_questions.length > 0 && (
                    <div className="glass-card border-violet-200 dark:border-violet-500/10 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-500/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Potential Questions</h2>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                            Here are some questions you might be asked based on the role and company:
                        </p>
                        <div className="space-y-3">
                            {briefing.potential_questions.map((question, index) => (
                                <div key={index} className="flex gap-3 p-3 bg-white/70 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
                                    <span className="flex-shrink-0 w-6 h-6 bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 rounded-full flex items-center justify-center text-sm font-semibold">
                                        {index + 1}
                                    </span>
                                    <p className="text-slate-700 dark:text-slate-300 flex-1">{question}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Start Interview Button */}
            <div className="sticky bottom-0 bg-slate-50 dark:bg-slate-900 pt-4 pb-2 border-t border-slate-200 dark:border-slate-800">
                <button
                    onClick={onStartInterview}
                    className="w-full max-w-md mx-auto block py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Mock Interview
                </button>
            </div>
        </div>
    );
};

export default MockInterviewBriefing;
