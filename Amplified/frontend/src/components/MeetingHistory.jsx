import React, { useState, useEffect } from 'react';
import { apiGet, apiDelete, apiRequest } from '../utils/api';

const MeetingHistory = ({ onBack, onContinueMeeting }) => {
    const [meetings, setMeetings] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedMeeting, setExpandedMeeting] = useState(null);
    const [editingMeetingId, setEditingMeetingId] = useState(null);
    const [editedTitle, setEditedTitle] = useState('');

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        setIsLoading(true);
        try {
            const response = await apiGet('/meetings');
            if (response.ok) {
                const data = await response.json();
                // Sort by date desc
                data.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
                setMeetings(data);
            }
        } catch (error) {
            console.error('Failed to fetch meetings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (e, meetingId) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this meeting?')) return;

        try {
            const response = await apiDelete(`/meetings/${meetingId}`);

            if (response.ok) {
                setMeetings(meetings.filter(m => m.id !== meetingId));
                if (expandedMeeting === meetingId) setExpandedMeeting(null);
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const toggleExpand = (meetingId) => {
        setExpandedMeeting(expandedMeeting === meetingId ? null : meetingId);
    };

    const startEditTitle = (e, meeting) => {
        e.stopPropagation();
        setEditingMeetingId(meeting.id);
        setEditedTitle(meeting.title || 'Untitled Meeting');
    };

    const cancelEditTitle = () => {
        setEditingMeetingId(null);
        setEditedTitle('');
    };

    const saveTitle = async (e, meetingId) => {
        e.stopPropagation();
        if (!editedTitle.trim()) return;

        try {
            const response = await apiRequest(`/meetings/${meetingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editedTitle.trim() })
            });

            if (response.ok) {
                setMeetings(meetings.map(m =>
                    m.id === meetingId ? { ...m, title: editedTitle.trim() } : m
                ));
                setEditingMeetingId(null);
                setEditedTitle('');
            }
        } catch (error) {
            console.error('Failed to update title:', error);
        }
    };

    const toggleActionStatus = async (e, meetingId, actionId, currentStatus) => {
        e.stopPropagation();
        const newStatus = currentStatus === 'done' ? 'open' : 'done';

        // Optimistic update
        setMeetings(meetings.map(m => {
            if (m.id === meetingId) {
                return {
                    ...m,
                    actions: m.actions.map(a =>
                        a.id === actionId ? { ...a, status: newStatus } : a
                    )
                };
            }
            return m;
        }));

        try {
            const formData = new FormData();
            formData.append('status', newStatus);

            const response = await apiRequest(`/meetings/${meetingId}/actions/${actionId}`, {
                method: 'PATCH',
                body: formData
            });

            if (!response.ok) {
                // Revert on failure
                setMeetings(meetings.map(m => {
                    if (m.id === meetingId) {
                        return {
                            ...m,
                            actions: m.actions.map(a =>
                                a.id === actionId ? { ...a, status: currentStatus } : a
                            )
                        };
                    }
                    return m;
                }));
                console.error('Failed to update action status');
            }
        } catch (error) {
            console.error('Failed to update action status:', error);
            // Revert on error
            setMeetings(meetings.map(m => {
                if (m.id === meetingId) {
                    return {
                        ...m,
                        actions: m.actions.map(a =>
                            a.id === actionId ? { ...a, status: currentStatus } : a
                        )
                    };
                }
                return m;
            }));
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-6 md:p-8 overflow-hidden">
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
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-500 bg-clip-text text-transparent">
                    Meeting History
                </h1>
            </div>

            {/* Meeting List */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    </div>
                ) : meetings.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                        <p className="text-lg">No meetings recorded yet.</p>
                        <p className="text-sm">Start a meeting from the dashboard to see it here.</p>
                    </div>
                ) : (
                    meetings.map((meeting) => (
                        <div
                            key={meeting.id}
                            data-testid={`meeting-row-${meeting.id}`}
                            className={`group glass-card rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${expandedMeeting === meeting.id ? 'border-green-500/30 dark:border-green-500/30 shadow-lg shadow-green-500/10' : 'border-slate-200 dark:border-slate-700/50 hover:border-green-300 dark:hover:border-green-500/20 hover:shadow-xl'}`}
                        >
                            {/* Meeting Header (Clickable) */}
                            <div
                                onClick={() => toggleExpand(meeting.id)}
                                className="p-4 flex items-center justify-between cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${expandedMeeting === meeting.id ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400'}`}>
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        {editingMeetingId === meeting.id ? (
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="text"
                                                    value={editedTitle}
                                                    onChange={(e) => setEditedTitle(e.target.value)}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') saveTitle(e, meeting.id);
                                                        if (e.key === 'Escape') cancelEditTitle();
                                                    }}
                                                    className="flex-1 bg-slate-900/50 border border-blue-500 rounded px-2 py-1 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={(e) => saveTitle(e, meeting.id)}
                                                    className="p-1 text-green-400 hover:text-green-300"
                                                    title="Save"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); cancelEditTitle(); }}
                                                    className="p-1 text-slate-400 hover:text-slate-300"
                                                    title="Cancel"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-lg">{meeting.title || 'Untitled Meeting'}</h3>
                                                <button
                                                    onClick={(e) => startEditTitle(e, meeting)}
                                                    className="p-1 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Edit title"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                                            <span>{new Date(meeting.start_time).toLocaleString()}</span>
                                            {meeting.platform && (
                                                <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs uppercase tracking-wide text-slate-700 dark:text-slate-300">{meeting.platform}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {onContinueMeeting && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onContinueMeeting(meeting.id);
                                            }}
                                            className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium"
                                            title="Continue Meeting"
                                            data-testid="btn-continue-meeting"
                                        >
                                            Continue
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => handleDelete(e, meeting.id)}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                        title="Delete Meeting"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                    <svg
                                        className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${expandedMeeting === meeting.id ? 'rotate-180' : ''}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedMeeting === meeting.id && (
                                <div className="px-4 pb-4 pt-0 border-t border-slate-700/50">
                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Summary Section */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-2">Summary</h4>
                                            {meeting.summaries && meeting.summaries.length > 0 ? (
                                                <div className="text-slate-300 text-sm space-y-2">
                                                    <p className="italic text-slate-400">{meeting.summaries[0].short_summary}</p>
                                                    <div className="mt-2 p-3 bg-slate-900/50 rounded-lg text-xs text-slate-400 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                                                        {meeting.summaries[0].detailed_summary}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-slate-500 text-sm italic">No summary generated.</p>
                                            )}
                                        </div>

                                        {/* Action Items Section */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2">Action Items</h4>
                                            {meeting.actions && meeting.actions.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {meeting.actions.map(action => (
                                                        <li
                                                            key={action.id}
                                                            className={`flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg transition-colors cursor-pointer hover:bg-slate-800/50 ${action.status === 'done' ? 'opacity-75' : ''}`}
                                                            onClick={(e) => toggleActionStatus(e, meeting.id, action.id, action.status)}
                                                        >
                                                            <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${action.status === 'done' ? 'bg-green-500 border-green-500' : 'border-slate-500 hover:border-green-400'}`}>
                                                                {action.status === 'done' && (
                                                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className={`text-sm transition-colors ${action.status === 'done' ? 'text-green-400/90 line-through decoration-green-500/30' : 'text-slate-300'}`}>
                                                                    {action.description}
                                                                </p>
                                                                {action.owner && (
                                                                    <span className={`text-xs px-1.5 rounded mt-1 inline-block ${action.status === 'done' ? 'text-green-400 bg-green-400/10' : 'text-blue-400 bg-blue-400/10'}`}>
                                                                        {action.owner}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-slate-500 text-sm italic">No action items found.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MeetingHistory;
