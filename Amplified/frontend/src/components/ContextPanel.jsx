import React, { useState, useEffect } from 'react';
import { apiUpload } from '../utils/api';

const ContextPanel = ({ onUpdateNotes, isOpen, onClose, initialNotes = '' }) => {
    const [resumeFile, setResumeFile] = useState(null);
    const [jdFile, setJdFile] = useState(null);
    const [notes, setNotes] = useState('');
    const [targetRole, setTargetRole] = useState('');
    const [uploadStatus, setUploadStatus] = useState({ resume: 'idle', jd: 'idle' }); // idle, uploading, success, error
    const [roleResearchStatus, setRoleResearchStatus] = useState('idle'); // idle, researching, success, error
    const [expandedSections, setExpandedSections] = useState({ company: true, role: true });

    // Update local notes when initialNotes changes (from backend)
    useEffect(() => {
        if (initialNotes) {
            setNotes(initialNotes);
        }
    }, [initialNotes]);

    // Parse research sections from notes
    const parseResearch = (text) => {
        const sections = {
            company: null,
            role: null,
            userNotes: ''
        };

        if (!text) return sections;

        // Extract company research
        const companyMatch = text.match(/=== RESEARCH ON (.+?) ===([\s\S]*?)(?=(?:=== ROLE RESEARCH:|$))/);
        if (companyMatch) {
            sections.company = {
                title: companyMatch[1],
                content: companyMatch[2].trim()
            };
        }

        // Extract role research
        const roleMatch = text.match(/=== ROLE RESEARCH: (.+?) ===([\s\S]*?)(?=(?:=== RESEARCH ON|$))/);
        if (roleMatch) {
            sections.role = {
                title: roleMatch[1],
                content: roleMatch[2].trim()
            };
        }

        // Remove research sections from text to get user notes
        let userText = text;
        if (companyMatch) userText = userText.replace(companyMatch[0], '');
        if (roleMatch) userText = userText.replace(roleMatch[0], '');
        sections.userNotes = userText.trim();

        return sections;
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const sections = parseResearch(notes);

    const handleFileUpload = async (file, type) => {
        if (!file) return;

        setUploadStatus(prev => ({ ...prev, [type]: 'uploading' }));
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type === 'resume' ? 'resume' : 'job_description');

        try {
            const response = await apiUpload('/documents/upload/document', formData);

            if (response.ok) {
                setUploadStatus(prev => ({ ...prev, [type]: 'success' }));
                if (type === 'resume') setResumeFile(file);
                else setJdFile(file);
            } else {
                setUploadStatus(prev => ({ ...prev, [type]: 'error' }));
            }
        } catch (error) {
            console.error('Upload failed:', error);
            setUploadStatus(prev => ({ ...prev, [type]: 'error' }));
        }
    };

    const handleRoleResearch = async () => {
        if (!targetRole.trim()) return;

        setRoleResearchStatus('researching');
        const formData = new FormData();
        formData.append('role_title', targetRole);

        try {
            const response = await apiUpload('/research/role', formData);

            if (response.ok) {
                setRoleResearchStatus('success');
                // Notes will update via WebSocket
            } else {
                setRoleResearchStatus('error');
            }
        } catch (error) {
            console.error('Role research failed:', error);
            setRoleResearchStatus('error');
        }
    };

    const handleNotesChange = (e) => {
        const newNotes = e.target.value;
        setNotes(newNotes);
        // Debounce this in a real app, but for now just send it
        onUpdateNotes(newNotes);
    };

    if (!isOpen) return null;

    return (
        <div className="w-80 h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-700 shadow-2xl p-4 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Interview Context</h2>
                <button
                    onClick={onClose}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto">
                {/* Resume Upload */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Resume (PDF/DOCX)</label>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".pdf,.docx,.txt"
                            onChange={(e) => handleFileUpload(e.target.files[0], 'resume')}
                            className="hidden"
                            id="resume-upload"
                        />
                        <label
                            htmlFor="resume-upload"
                            className={`flex items-center justify-center w-full px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploadStatus.resume === 'success'
                                ? 'border-green-500 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                                : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-400 text-slate-500 dark:text-slate-400'
                                }`}
                        >
                            {uploadStatus.resume === 'success' ? (
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    Uploaded
                                </span>
                            ) : (
                                <span>{uploadStatus.resume === 'uploading' ? 'Uploading...' : 'Upload Resume'}</span>
                            )}
                        </label>
                    </div>
                </div>

                {/* JD Upload */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Job Description</label>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".pdf,.docx,.txt"
                            onChange={(e) => handleFileUpload(e.target.files[0], 'jd')}
                            className="hidden"
                            id="jd-upload"
                        />
                        <label
                            htmlFor="jd-upload"
                            className={`flex items-center justify-center w-full px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploadStatus.jd === 'success'
                                ? 'border-green-500 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                                : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-400 text-slate-500 dark:text-slate-400'
                                }`}
                        >
                            {uploadStatus.jd === 'success' ? (
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    Uploaded
                                </span>
                            ) : (
                                <span>{uploadStatus.jd === 'uploading' ? 'Uploading...' : 'Upload JD'}</span>
                            )}
                        </label>
                    </div>
                </div>

                {/* Target Role Research */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Target Role</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                            placeholder="e.g., Senior QA Engineer"
                            className="flex-1 bg-white/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            onKeyPress={(e) => e.key === 'Enter' && handleRoleResearch()}
                        />
                        <button
                            onClick={handleRoleResearch}
                            disabled={!targetRole.trim() || roleResearchStatus === 'researching'}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${roleResearchStatus === 'success'
                                ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-500'
                                : roleResearchStatus === 'researching'
                                    ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-500 cursor-wait'
                                    : roleResearchStatus === 'error'
                                        ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                        >
                            {roleResearchStatus === 'researching' ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Researching...
                                </span>
                            ) : roleResearchStatus === 'success' ? (
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    Done
                                </span>
                            ) : (
                                'Research'
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-500">Get insights on responsibilities, skills & interview questions</p>
                </div>

                {/* Research & Notes Section */}
                <div className="space-y-2 flex-1 flex flex-col overflow-hidden">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Context & Notes</label>

                    <div className="flex-1 overflow-y-auto space-y-3">
                        {/* Company Research Card */}
                        {sections.company && (
                            <div className="glass-card border-blue-200 dark:border-blue-500/10 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                                <button
                                    onClick={() => toggleSection('company')}
                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🏢</span>
                                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">Company: {sections.company.title}</span>
                                    </div>
                                    <svg
                                        className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform ${expandedSections.company ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {expandedSections.company && (
                                    <div className="px-4 pb-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                        {sections.company.content}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Role Research Card */}
                        {sections.role && (
                            <div className="glass-card border-purple-200 dark:border-purple-500/10 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                                <button
                                    onClick={() => toggleSection('role')}
                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🎯</span>
                                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">Role: {sections.role.title}</span>
                                    </div>
                                    <svg
                                        className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform ${expandedSections.role ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {expandedSections.role && (
                                    <div className="px-4 pb-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                        {sections.role.content}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* User's Personal Notes */}
                        <div className="flex-1 flex flex-col min-h-[120px]">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Your Personal Notes</label>
                            <textarea
                                value={sections.userNotes}
                                onChange={(e) => {
                                    // Reconstruct full notes with research sections intact
                                    let fullNotes = '';
                                    if (sections.company) {
                                        fullNotes += `=== RESEARCH ON ${sections.company.title} ===\n${sections.company.content}\n\n`;
                                    }
                                    if (sections.role) {
                                        fullNotes += `=== ROLE RESEARCH: ${sections.role.title} ===\n${sections.role.content}\n\n`;
                                    }
                                    fullNotes += e.target.value;
                                    setNotes(fullNotes.trim());
                                    onUpdateNotes(fullNotes.trim());
                                }}
                                placeholder="Add your own notes here (e.g., 'Ask about team culture', 'Mention Project X')..."
                                className="flex-1 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-xs"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContextPanel;
