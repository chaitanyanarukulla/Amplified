import React, { useState } from 'react';
import VoiceSelector from './VoiceSelector';
import { getDefaultVoiceProfile, saveVoicePreference } from '../utils/voiceProfiles';

const MockInterviewSetup = ({ onPrepare, onBack }) => {
    const [resume, setResume] = useState(null);
    const [jdUrl, setJdUrl] = useState('');
    const [role, setRole] = useState('');
    const [selectedVoice, setSelectedVoice] = useState(getDefaultVoiceProfile().id);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleResumeUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!validTypes.includes(file.type)) {
                setError('Please upload a PDF or DOCX file');
                return;
            }
            setResume(file);
            setError(null);
        }
    };

    const handleVoiceSelect = (voiceId) => {
        setSelectedVoice(voiceId);
        saveVoicePreference(voiceId);
    };

    const handlePrepare = async () => {
        // Validation
        if (!resume) {
            setError('Please upload your resume');
            return;
        }
        if (!jdUrl.trim()) {
            setError('Please provide a job description URL');
            return;
        }
        if (!role.trim()) {
            setError('Please enter the role you are applying for');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await onPrepare({
                resume,
                jdUrl: jdUrl.trim(),
                role: role.trim(),
                selectedVoice
            });
        } catch (err) {
            setError(err.message || 'Failed to prepare mock interview');
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-6 md:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    data-testid="btn-back-setup"
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    disabled={isLoading}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-500 bg-clip-text text-transparent">
                        Mock Interview Setup
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Prepare for your interview with AI-powered coaching</p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* Setup Form */}
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Resume Upload */}
                <div className="glass-card border-violet-200 dark:border-violet-500/10 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <label className="block text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        Upload Your Resume
                    </label>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        Your resume will be used to generate personalized interview questions
                    </p>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".pdf,.docx"
                            onChange={handleResumeUpload}
                            disabled={isLoading}
                            className="hidden"
                            id="resume-upload"
                        />
                        <label
                            htmlFor="resume-upload"
                            className={`
                                flex items-center justify-center gap-3 p-4 border-2 border-dashed rounded-xl
                                transition-all duration-200 cursor-pointer
                                ${resume
                                    ? 'border-green-500 bg-green-50 dark:bg-green-500/10'
                                    : 'border-slate-300 dark:border-slate-600 hover:border-violet-400 dark:hover:border-violet-400 bg-white/50 dark:bg-slate-900/50'
                                }
                                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            {resume ? (
                                <>
                                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-green-700 dark:text-green-400 font-medium">{resume.name}</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-slate-600 dark:text-slate-300">Click to upload PDF or DOCX</span>
                                </>
                            )}
                        </label>
                    </div>
                </div>

                {/* Job Description URL */}
                <div className="glass-card border-violet-200 dark:border-violet-500/10 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <label className="block text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        Job Description URL
                    </label>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        Paste the link to the job posting (LinkedIn, company website, etc.)
                    </p>
                    <input
                        type="url"
                        value={jdUrl}
                        onChange={(e) => setJdUrl(e.target.value)}
                        disabled={isLoading}
                        placeholder="https://www.linkedin.com/jobs/view/..."
                        className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
                    />
                </div>

                {/* Role Input */}
                <div className="glass-card border-violet-200 dark:border-violet-500/10 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <label className="block text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        Role / Position
                    </label>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        What position are you applying for?
                    </p>
                    <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        disabled={isLoading}
                        placeholder="e.g., Senior QA Engineer, Staff Backend Engineer, SDET – Mobile Automation"
                        className="w-full px-4 py-3 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
                    />
                </div>

                {/* Voice Selection */}
                <div className="glass-card border-violet-200 dark:border-violet-500/10 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <VoiceSelector
                        selectedVoiceId={selectedVoice}
                        onVoiceSelect={handleVoiceSelect}
                    />
                </div>

                {/* Prepare Button */}
                <button
                    onClick={handlePrepare}
                    disabled={isLoading}
                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Preparing Your Interview...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Prepare Mock Interview
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default MockInterviewSetup;
