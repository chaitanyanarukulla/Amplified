import React, { useState, useEffect, useRef } from 'react';
import { apiUpload } from '../utils/api';

const MeetingAssistant = ({
    transcript,
    isListening,
    onToggleListening,
    onEndMeeting,
    onUpdateNotes,
    initialNotes = '',
    voiceProfile = null,
    currentSuggestion = null,
    onSuggest = () => { },
    onNavigateToHistory = () => { },
    onCreateMeeting = () => { },  // New prop for creating meeting
    activeMeetingId = null  // New prop to check if meeting exists
}) => {
    const [activeTab, setActiveTab] = useState('notes'); // 'notes' or 'context'
    const [notes, setNotes] = useState(initialNotes);
    const [actionItems, setActionItems] = useState([]);

    // Meeting creation form state
    const [meetingTitle, setMeetingTitle] = useState('');
    const [meetingPlatform, setMeetingPlatform] = useState('zoom');
    const [meetingStartTime, setMeetingStartTime] = useState(new Date().toISOString().slice(0, 16));

    // Meeting Documents State
    const [uploadedDocs, setUploadedDocs] = useState([]);
    const [selectedDocType, setSelectedDocType] = useState('agenda');
    const [uploadStatus, setUploadStatus] = useState('idle');

    const notesEndRef = useRef(null);

    // Helper function to get speaker display name
    const getSpeakerName = (speaker) => {
        // If speaker is "0" or "You", check if we have a voice profile
        if ((speaker === '0' || speaker === 'You') && voiceProfile && voiceProfile.name) {
            return voiceProfile.name;
        }
        return speaker === '0' ? 'You' : speaker;
    };

    // Auto-scroll notes
    useEffect(() => {
        notesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [notes, actionItems]);

    // Reset form when starting a new meeting (activeMeetingId becomes null)
    useEffect(() => {
        if (!activeMeetingId && !isListening) {
            setMeetingTitle('');
            setMeetingPlatform('zoom');
            setMeetingStartTime(new Date().toISOString().slice(0, 16));
        }
    }, [activeMeetingId, isListening]);

    // Simulate live note extraction
    useEffect(() => {
        if (isListening && transcript.length > 0) {
            const lastEntry = transcript[transcript.length - 1];
            if (lastEntry.is_final) {
                const text = lastEntry.text.toLowerCase();
                if (text.includes("i will") || text.includes("let's") || text.includes("action item")) {
                    setActionItems(prev => [...prev, { text: lastEntry.text, timestamp: new Date().toLocaleTimeString() }]);
                }
            }
        }
    }, [transcript, isListening]);

    const handleFileUpload = async (file) => {
        if (!file) return;

        setUploadStatus('uploading');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', selectedDocType);

        try {
            const response = await apiUpload('/documents/upload/document', formData);

            if (response.ok) {
                const data = await response.json();
                setUploadedDocs(prev => [...prev, {
                    id: data.id || Date.now(),
                    name: file.name,
                    type: selectedDocType,
                    uploadedAt: new Date().toLocaleString()
                }]);
                setUploadStatus('success');
                setTimeout(() => setUploadStatus('idle'), 2000);
            } else {
                setUploadStatus('error');
                setTimeout(() => setUploadStatus('idle'), 3000);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            setUploadStatus('error');
            setTimeout(() => setUploadStatus('idle'), 3000);
        }
    };

    const removeDocument = (docId) => {
        setUploadedDocs(prev => prev.filter(d => d.id !== docId));
    };

    const handleStartMeeting = () => {
        if (!meetingTitle.trim()) {
            alert('Please enter a meeting title');
            return;
        }

        onCreateMeeting({
            title: meetingTitle.trim(),
            platform: meetingPlatform,
            start_time: new Date(meetingStartTime).toISOString()
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-6 md:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">Meeting Assistant</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Real-time transcription & note-taking</p>
                    </div>
                    <button
                        onClick={onNavigateToHistory}
                        className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-all duration-200 flex items-center gap-2"
                        title="View Meeting History"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        History
                    </button>
                </div>

                {/* Meeting Creation Form or Controls */}
                {!activeMeetingId && !isListening ? (
                    <div className="glass-card rounded-2xl p-6 border-blue-200 dark:border-blue-500/10">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Create New Meeting</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            {/* Title */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Meeting Title *
                                </label>
                                <input
                                    type="text"
                                    value={meetingTitle}
                                    onChange={(e) => setMeetingTitle(e.target.value)}
                                    placeholder="e.g., Sprint Planning, Client Review"
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Platform */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Platform
                                </label>
                                <select
                                    value={meetingPlatform}
                                    onChange={(e) => setMeetingPlatform(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="zoom">Zoom</option>
                                    <option value="teams">Microsoft Teams</option>
                                    <option value="meet">Google Meet</option>
                                    <option value="webex">Webex</option>
                                    <option value="in-person">In-Person</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            {/* Start Time */}
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Start Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={meetingStartTime}
                                    onChange={(e) => setMeetingStartTime(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleStartMeeting}
                            data-testid="btn-start-meeting"
                            className="w-full px-5 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-green-500/20"
                        >
                            Start Meeting
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <button
                            onClick={onToggleListening}
                            data-testid="btn-start-meeting"
                            className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${isListening
                                ? 'bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/50 hover:bg-red-500/20'
                                : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20'
                                }`}
                        >
                            {isListening ? 'Pause Listening' : 'Resume Meeting'}
                        </button>
                        {isListening && (
                            <>
                                <button
                                    onClick={onSuggest}
                                    data-testid="btn-suggest-answer"
                                    className="px-5 py-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/50 hover:bg-amber-500/20 rounded-lg transition-all duration-200"
                                >
                                    Suggest Answer
                                </button>
                                <button
                                    onClick={onEndMeeting}
                                    data-testid="btn-end-meeting"
                                    className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-all duration-200"
                                >
                                    End & Summarize
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="flex gap-6 flex-1 overflow-hidden">
                {/* Left: Live Transcript */}
                <div className="flex-1 flex flex-col glass-card rounded-2xl border-blue-200 dark:border-blue-500/10 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/80">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse"></span>
                            Live Transcript
                        </h3>
                    </div>
                    {currentSuggestion && (
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800/90 dark:to-slate-700/90 border-b border-amber-200 dark:border-amber-500/30 p-4 animate-in slide-in-from-top-2">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <h4 className="text-amber-600 dark:text-amber-400 font-bold text-sm mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        AI Suggestion
                                    </h4>
                                    <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed mb-2">{currentSuggestion.answer}</p>
                                    {currentSuggestion.extra_points && currentSuggestion.extra_points.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                            {currentSuggestion.extra_points.map((point, i) => (
                                                <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1">
                                                    <span className="text-amber-500">•</span> {point}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <button
                                    onClick={() => onSuggest(null)}
                                    className="p-1 hover:bg-amber-200 dark:hover:bg-slate-600 rounded transition-colors flex-shrink-0"
                                    title="Dismiss suggestion"
                                >
                                    <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/30 dark:bg-slate-900/30" data-testid="live-notes-panel">
                        {transcript.length === 0 ? (
                            <div className="text-center text-slate-400 dark:text-slate-500 mt-10">
                                <p>Waiting for speech...</p>
                            </div>
                        ) : (
                            transcript.map((entry, i) => (
                                <div key={i} className={`flex flex-col ${getSpeakerName(entry.speaker) === voiceProfile?.name || entry.speaker === 'You' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] rounded-xl p-3.5 ${getSpeakerName(entry.speaker) === voiceProfile?.name || entry.speaker === 'You'
                                        ? 'bg-blue-500/20 dark:bg-blue-500/20 text-blue-900 dark:text-blue-100 border border-blue-400/30 dark:border-blue-500/30'
                                        : 'bg-white/80 dark:bg-slate-700/50 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
                                        }`}>
                                        <div className="text-xs opacity-70 mb-1 flex justify-between gap-4">
                                            <span className="font-bold">{getSpeakerName(entry.speaker)}</span>
                                            <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="leading-relaxed">{entry.text}</p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={notesEndRef} />
                    </div>
                </div>

                {/* Right: Tabs for Notes & Meeting Documents */}
                <div className="w-1/3 flex flex-col glass-card rounded-2xl border-slate-200 dark:border-white/5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    {/* Tab Header */}
                    <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${activeTab === 'notes'
                                ? 'bg-blue-50 dark:bg-slate-700/50 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                                }`}
                        >
                            Notes & Actions
                        </button>
                        <button
                            onClick={() => setActiveTab('context')}
                            data-testid="tab-meeting-documents"
                            className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${activeTab === 'context'
                                ? 'bg-purple-50 dark:bg-slate-700/50 text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                                }`}
                        >
                            Meeting Documents
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-hidden flex flex-col p-4 bg-white/30 dark:bg-slate-900/30">
                        {activeTab === 'notes' ? (
                            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                                {/* Action Items */}
                                <div className="flex-1 bg-white/60 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/50 flex flex-col overflow-hidden">
                                    <div className="p-3 border-b border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/30">
                                        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                            <svg className="w-3 h-3 text-yellow-500 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            Action Items
                                        </h4>
                                    </div>
                                    <div className="flex-1 p-3 overflow-y-auto" data-testid="action-items-list">
                                        {actionItems.length === 0 ? (
                                            <p className="text-slate-400 dark:text-slate-500 text-xs italic">No action items detected yet...</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {actionItems.map((item, i) => (
                                                    <li key={i} className="flex gap-2 items-start bg-white/70 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700/30">
                                                        <input type="checkbox" className="mt-1 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-500 focus:ring-offset-white dark:focus:ring-offset-slate-900 w-3 h-3" />
                                                        <span className="text-xs text-slate-700 dark:text-slate-300">{item.text}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                {/* Manual Notes */}
                                <div className="flex-1 bg-white/60 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/50 flex flex-col overflow-hidden">
                                    <div className="p-3 border-b border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/30">
                                        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">My Notes</h4>
                                    </div>
                                    <textarea
                                        className="flex-1 bg-transparent p-3 resize-none focus:outline-none text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 text-sm"
                                        placeholder="Type your notes here..."
                                        value={notes}
                                        onChange={(e) => {
                                            setNotes(e.target.value);
                                            if (onUpdateNotes) onUpdateNotes(e.target.value);
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto space-y-6 p-4">
                                {/* Document Type Selector & Upload */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Document Type</label>
                                    <select
                                        value={selectedDocType}
                                        onChange={(e) => setSelectedDocType(e.target.value)}
                                        className="w-full bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                    >
                                        <option value="agenda">Agenda</option>
                                        <option value="design_doc">Design Doc / Spec</option>
                                        <option value="client_doc">Client Document</option>
                                        <option value="meeting_notes">Meeting Notes</option>
                                    </select>

                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept=".pdf,.docx,.txt"
                                            onChange={(e) => handleFileUpload(e.target.files[0])}
                                            className="hidden"
                                            id="meeting-doc-upload"
                                        />
                                        <label
                                            htmlFor="meeting-doc-upload"
                                            className={`flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${uploadStatus === 'success'
                                                ? 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'
                                                : uploadStatus === 'uploading'
                                                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                    : uploadStatus === 'error'
                                                        ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400'
                                                        : 'border-slate-300 dark:border-slate-600 hover:border-purple-400 dark:hover:border-purple-400 text-slate-500 dark:text-slate-400 hover:bg-purple-50 dark:hover:bg-slate-800'
                                                }`}
                                        >
                                            {uploadStatus === 'success' ? (
                                                <span className="flex items-center gap-2 text-sm">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                    Uploaded Successfully!
                                                </span>
                                            ) : uploadStatus === 'uploading' ? (
                                                <span className="text-sm">Uploading...</span>
                                            ) : uploadStatus === 'error' ? (
                                                <span className="text-sm">Upload Failed</span>
                                            ) : (
                                                <span className="flex items-center gap-2 text-sm">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                                    Upload Document
                                                </span>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                {/* Uploaded Documents List */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Uploaded Documents</h4>
                                    {uploadedDocs.length === 0 ? (
                                        <p className="text-slate-400 dark:text-slate-500 text-xs italic py-4">No documents uploaded yet</p>
                                    ) : (
                                        <div className="space-y-2" data-testid="documents-list">
                                            {uploadedDocs.map((doc) => (
                                                <div key={doc.id} className="bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg p-3 flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${doc.type === 'agenda' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                                                                doc.type === 'design_doc' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400' :
                                                                    doc.type === 'client_doc' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' :
                                                                        'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400'
                                                                }`}>
                                                                {doc.type === 'design_doc' ? 'Design Doc' :
                                                                    doc.type === 'client_doc' ? 'Client Doc' :
                                                                        doc.type === 'meeting_notes' ? 'Notes' :
                                                                            'Agenda'}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{doc.name}</p>
                                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{doc.uploadedAt}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => removeDocument(doc.id)}
                                                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 rounded transition-colors"
                                                        title="Remove document"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MeetingAssistant;
