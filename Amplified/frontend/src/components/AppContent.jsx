import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './Dashboard';
import KnowledgeVault from './KnowledgeVault';
import MeetingHistory from './MeetingHistory';
import VoiceEnrollment from './VoiceEnrollment';
import MeetingSummaryModal from './MeetingSummaryModal';
import Header from './Header';
import DashboardHeader from './DashboardHeader';
import Sidebar from './Sidebar';
import MockInterviewPanel from './MockInterviewPanel';
import MockInterviewSetup from './MockInterviewSetup';
import MockInterviewBriefing from './MockInterviewBriefing';
import MeetingAssistant from './MeetingAssistant';
import InterviewAssistant from './InterviewAssistant';
import TestGenDashboard from './TestGen/TestGenDashboard';
import DocAnalyzer from './DocAnalyzer/DocAnalyzer';
import Footer from './Footer';
import Login from './Login';
import Signup from './Signup';
import { useWebSocket } from '../hooks/useWebSocket';
import { useMockInterview } from '../hooks/useMockInterview';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../utils/api';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';
import { useElectronWindow } from '../hooks/useElectronWindow';

export default function AppContent() {
    const { isAuthenticated, loading, token } = useAuth();
    const [showSignup, setShowSignup] = useState(false);

    // UI State
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'meeting', 'mock', 'interview', 'vault', 'history', 'voice'
    const [transparency, setTransparency] = useState(95);
    const [clickThrough, setClickThrough] = useState(false);
    const [currentSuggestion, setCurrentSuggestion] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
    const [error, setError] = useState(null);

    // Auto-clear error after 3 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    // Data State
    const [transcript, setTranscript] = useState([]);
    const [notes, setNotes] = useState('');
    const [coachingMetrics, setCoachingMetrics] = useState({ wpm: 0, fillerCount: 0 });

    // Meeting Summary State
    const [meetingSummary, setMeetingSummary] = useState(null);

    // Meeting Continuation State
    const [activeMeetingId, setActiveMeetingId] = useState(null);  // null = new meeting, otherwise continuing
    const [sessionNumber, setSessionNumber] = useState(1);

    // Voice Profile State
    const [voiceProfile, setVoiceProfile] = useState(null);

    // WebSocket Hook - now with token
    const { isConnected, lastMessage, sendMessage } = useWebSocket('ws://localhost:8000/ws', token);

    // Mock Interview Hook
    const {
        isMockMode,
        mockQuestion,
        mockQuestionNumber,
        mockFeedback,
        mockStage,
        mockSetupData,
        mockBriefing,
        setMockStage,
        handlePrepareMockInterview,
        handleStartMockInterview,
        handleNextMockQuestion,
        endMockInterview
    } = useMockInterview({
        sendMessage,
        isListening,
        setIsListening,
        transcript,
        setCurrentView
    });

    // Actions - Define these before they're used in hooks
    const handleSuggest = useCallback(async () => {
        setIsProcessing(true);
        setError(null);

        // 1. Find the last question from the transcript
        let lastQuestion = "What should I say?"; // Default

        const interviewerLines = transcript.filter(t => t.speaker !== 'You');
        if (interviewerLines.length > 0) {
            lastQuestion = interviewerLines[interviewerLines.length - 1].text;
        }

        try {
            // Use the meeting-specific AI assistant endpoint
            if (!activeMeetingId) {
                setError("No active meeting. Please start a meeting first.");
                setIsProcessing(false);
                return;
            }

            const response = await apiPost(`/meetings/${activeMeetingId}/ask`, {
                question: lastQuestion
            });

            if (response.ok) {
                const result = await response.json();
                // Format the response for display
                setCurrentSuggestion({
                    title: "AI Suggestion",
                    answer: result.answer || "No suggestion available.",
                    extra_points: result.related_documents?.map(d =>
                        (d.snippet || d.content || "").substring(0, 100)
                    ).filter(Boolean) || [],
                    sources: result.related_documents || []
                });
            } else {
                console.error("Failed to get suggestion");
                setError("Failed to get suggestion. Please try again.");
            }
        } catch (error) {
            console.error("Error getting suggestion:", error);
            setError("Error connecting to server.");
        } finally {
            setIsProcessing(false);
        }
    }, [transcript, activeMeetingId]);


    // Handle incoming messages
    useEffect(() => {
        if (!lastMessage) return;

        switch (lastMessage.type) {
            case 'connection_status':
                console.log('Status:', lastMessage.payload);
                break;

            case 'transcript_update':
                // Update coaching metrics FIRST (even for interim results) for real-time feedback
                if (lastMessage.payload.coaching) {
                    console.log('📊 Coaching data received:', lastMessage.payload.coaching);
                    setCoachingMetrics({
                        wpm: lastMessage.payload.coaching.wpm,
                        fillerCount: lastMessage.payload.coaching.filler_count
                    });
                } else {
                    console.log('⚠️ No coaching data in transcript_update:', lastMessage.payload);
                }

                setTranscript(prev => {
                    const newEntry = lastMessage.payload;

                    // Only process final transcripts to avoid fragmention
                    if (!newEntry.is_final) {
                        return prev; // Skip interim results
                    }

                    // Try to merge with the last entry if it's from the same speaker and recent
                    if (prev.length > 0) {
                        const lastEntry = prev[prev.length - 1];
                        const lastTime = new Date(lastEntry.timestamp).getTime();
                        const newTime = new Date(newEntry.timestamp).getTime();

                        // If same speaker and within 5 seconds, merge the text
                        if (lastEntry.speaker === newEntry.speaker && (newTime - lastTime) < 5000) {
                            const mergedEntry = {
                                ...lastEntry,
                                text: lastEntry.text + ' ' + newEntry.text,
                                timestamp: newEntry.timestamp, // Use latest timestamp
                                is_final: newEntry.is_final
                            };
                            return [...prev.slice(0, -1), mergedEntry];
                        }
                    }

                    // Otherwise, add as a new entry
                    const newTranscript = [...prev, newEntry];

                    // Keep last 50 entries to avoid memory issues
                    if (newTranscript.length > 50) {
                        return newTranscript.slice(newTranscript.length - 50);
                    }

                    return newTranscript;
                });
                break;

            case 'suggestion':
            case 'suggestion_ready':
                setCurrentSuggestion(lastMessage.payload);
                setIsProcessing(false);
                break;

            case 'stall_phrase':
                // Show stall phrase as a temporary suggestion or overlay
                setCurrentSuggestion({
                    title: "Stall Strategy",
                    bullets: [lastMessage.payload.phrase],
                    warning: null
                });
                break;

            case 'context_update':
                // Handle context updates if needed
                if (lastMessage.payload.type === 'pinned_notes') {
                    setNotes(lastMessage.payload.data);
                    console.log('Research notes updated:', lastMessage.payload.data);
                }
                break;

            case 'meeting_created':
                console.log("Meeting created:", lastMessage.payload);
                break;

            case 'meeting_continued':
                console.log("Meeting continued:", lastMessage.payload);
                setSessionNumber(lastMessage.payload.session_number);
                break;

            case 'meeting_summary':
                console.log("Meeting summary received:", lastMessage.payload);
                setMeetingSummary(lastMessage.payload);
                setIsListening(false);
                setCurrentView('dashboard'); // Navigate to dashboard so modal is visible
                break;

            case 'error':
                console.error('Backend Error:', lastMessage.payload);
                setIsProcessing(false);
                break;

            default:
                break;
        }
    }, [lastMessage]);

    // Global Shortcuts
    useGlobalShortcuts({ onSuggest: handleSuggest });

    // Transparency & Click-Through (Electron)
    useElectronWindow({ transparency, clickThrough });

    // Load voices for TTS
    useEffect(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }
    }, []);

    // Fetch voice profile on mount
    useEffect(() => {
        const fetchVoiceProfile = async () => {
            try {
                const response = await apiGet('/voice-profile');
                if (response.ok) {
                    const profile = await response.json();
                    setVoiceProfile(profile);
                    console.log('Voice profile loaded:', profile.name);
                }
            } catch (_unused) {
                // No profile exists yet, that's okay
            }
        };
        fetchVoiceProfile();
    }, []);

    const handleStall = useCallback(() => {
        sendMessage({
            type: 'command',
            action: 'get_stall_phrase'
        });
    }, [sendMessage]);

    const handleUpdateNotes = useCallback((notes) => {
        sendMessage({
            type: 'update_context',
            update_type: 'pinned_notes',
            data: notes
        });
        setNotes(notes);
    }, [sendMessage]);

    // Start listening on mount only for continuing meetings
    const hasAutoStarted = React.useRef(false);
    useEffect(() => {
        // Only auto-start if we're continuing an existing meeting
        if (isConnected && !isListening && currentView === 'meeting' && activeMeetingId && !hasAutoStarted.current) {
            hasAutoStarted.current = true;

            // Send start_listening with meeting_id for continuation
            sendMessage({
                type: 'command',
                action: 'start_listening',
                payload: { meeting_id: activeMeetingId }
            });
            setIsListening(true);
        }

        // Reset auto-start flag when leaving meeting view
        if (currentView !== 'meeting') {
            hasAutoStarted.current = false;
        }
    }, [isConnected, sendMessage, isListening, currentView, activeMeetingId]);

    // Notify backend when entering/leaving interview mode to enable automatic suggestions
    useEffect(() => {
        if (isConnected && currentView === 'interview') {
            sendMessage({ type: 'command', action: 'set_interview_mode', active: true });
            return () => {
                sendMessage({ type: 'command', action: 'set_interview_mode', active: false });
            };
        }
    }, [isConnected, currentView, sendMessage]);

    const handleCreateMeeting = useCallback(async (meetingData) => {
        try {
            const response = await apiPost('/meetings', meetingData);
            if (response.ok) {
                const meeting = await response.json();
                setActiveMeetingId(meeting.id);

                // Clear state for new meeting
                setTranscript([]);
                setNotes('');
                setMeetingSummary(null);
                setSessionNumber(1);

                // Start listening with the new meeting ID
                sendMessage({
                    type: 'command',
                    action: 'start_listening',
                    payload: { meeting_id: meeting.id }
                });
                setIsListening(true);
            } else {
                alert('Failed to create meeting. Please try again.');
            }
        } catch (error) {
            console.error('Error creating meeting:', error);
            alert('Error creating meeting. Please try again.');
        }
    }, [sendMessage]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            sendMessage({ type: 'command', action: 'stop_listening' });
            setIsListening(false);
        } else {
            // Resume existing meeting
            if (activeMeetingId) {
                sendMessage({
                    type: 'command',
                    action: 'start_listening',
                    payload: { meeting_id: activeMeetingId }
                });
                setIsListening(true);
            }
            // For new meetings, the form's "Start Meeting" button will call handleCreateMeeting
        }
    }, [isListening, sendMessage, activeMeetingId]);

    const handleEndMeeting = useCallback(() => {
        if (window.confirm("Are you sure you want to end the meeting? This will generate a summary.")) {
            sendMessage({
                type: 'command',
                action: 'end_meeting'
            });
            setIsListening(false);
            // After ending, clear active meeting ID so next start is a new meeting
            setActiveMeetingId(null);
            setSessionNumber(1);
        }
    }, [sendMessage]);

    const handleContinueMeeting = useCallback((meetingId) => {
        // Set up for continuing this meeting
        setActiveMeetingId(meetingId);
        setCurrentView('meeting');
        // Session number will be set when backend responds with meeting_continued
    }, []);

    // Render content based on currentView
    const renderContent = () => {
        switch (currentView) {
            case 'dashboard':
                return <Dashboard onNavigate={setCurrentView} />;

            case 'meeting':
                return (
                    <MeetingAssistant
                        transcript={transcript}
                        isListening={isListening}
                        onToggleListening={toggleListening}
                        onEndMeeting={handleEndMeeting}
                        onUpdateNotes={handleUpdateNotes}
                        initialNotes={notes}
                        voiceProfile={voiceProfile}
                        currentSuggestion={currentSuggestion}
                        onSuggest={handleSuggest}
                        onNavigateToHistory={() => setCurrentView('history')}
                        onCreateMeeting={handleCreateMeeting}
                        activeMeetingId={activeMeetingId}
                    />
                );

            case 'mock':
                if (mockStage === 'setup') {
                    return (
                        <MockInterviewSetup
                            onPrepare={handlePrepareMockInterview}
                            onBack={() => setCurrentView('dashboard')}
                        />
                    );
                }

                if (mockStage === 'briefing') {
                    return (
                        <MockInterviewBriefing
                            briefing={mockBriefing}
                            onStartInterview={handleStartMockInterview}
                            onBack={() => setMockStage('setup')}
                        />
                    );
                }

                return (
                    <div className="flex-1 bg-slate-900/60 backdrop-blur-sm flex flex-col overflow-hidden relative">
                        <MockInterviewPanel
                            isActive={true}
                            currentQuestion={mockQuestion}
                            questionNumber={mockQuestionNumber}
                            totalQuestions={7}
                            feedback={mockFeedback}
                            isListening={isListening}
                            onNext={handleNextMockQuestion}
                            onEnd={endMockInterview}
                            coachingMetrics={coachingMetrics}
                        />
                    </div>
                );

            case 'interview':
                return (
                    <InterviewAssistant
                        transcript={transcript}
                        isListening={isListening}
                        isContextPanelOpen={isContextPanelOpen}
                        setIsContextPanelOpen={setIsContextPanelOpen}
                        handleUpdateNotes={handleUpdateNotes}
                        notes={notes}
                        coachingMetrics={coachingMetrics}
                        currentSuggestion={currentSuggestion}
                        setCurrentSuggestion={setCurrentSuggestion}
                        clickThrough={clickThrough}
                        setClickThrough={setClickThrough}
                    />
                );

            case 'vault':
                return <KnowledgeVault onBack={() => setCurrentView('dashboard')} />;

            case 'history':
                return <MeetingHistory onBack={() => setCurrentView('dashboard')} onContinueMeeting={handleContinueMeeting} />;

            case 'voice':
                return <VoiceEnrollment onBack={() => setCurrentView('dashboard')} />;

            case 'test-gen':
                return <TestGenDashboard onBack={() => setCurrentView('dashboard')} />;

            case 'doc-analyzer':
                return <DocAnalyzer />;

            default:
                return <Dashboard onNavigate={setCurrentView} />;
        }
    };

    const shouldShowSidebar = ['dashboard', 'history', 'vault', 'voice', 'test-gen', 'doc-analyzer', 'settings'].includes(currentView);

    // Show loading while checking auth
    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/50 mb-4 animate-pulse">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <p className="text-slate-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Show Login/Signup if not authenticated
    if (!isAuthenticated) {
        return showSignup ? (
            <Signup onSwitchToLogin={() => setShowSignup(false)} />
        ) : (
            <Login onSwitchToSignup={() => setShowSignup(true)} />
        );
    }

    return (
        <div
            className="h-screen w-screen flex overflow-hidden transition-opacity duration-200"
            style={{ opacity: transparency / 100 }}
        >
            {/* Sidebar */}
            {shouldShowSidebar && (
                <Sidebar currentView={currentView} onNavigate={setCurrentView} />
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-transparent">

                {/* Error Toast */}
                {error && (
                    <div
                        data-testid="toast-error"
                        className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-4"
                    >
                        {error}
                    </div>
                )}

                {/* Dashboard Header */}
                {currentView === 'dashboard' && <DashboardHeader />}

                {/* Interview Mode Header (Stealth) */}
                {currentView === 'interview' && (
                    <Header
                        isConnected={isConnected}
                        isListening={isListening}
                        transparency={transparency}
                        setTransparency={setTransparency}
                        clickThrough={clickThrough}
                        setClickThrough={setClickThrough}
                        onToggleListening={toggleListening}
                        onToggleContext={() => setIsContextPanelOpen(!isContextPanelOpen)}
                        onStartMockInterview={() => { }} // Disabled in this view
                        isMockMode={false}
                        onBack={() => setCurrentView('dashboard')}
                        onEndMeeting={handleEndMeeting}
                    />
                )}

                {/* Back Button / Nav for Mock & Meeting modes (if needed) */}
                {(currentView === 'mock' || currentView === 'meeting') && (
                    <div className="bg-slate-900 border-b border-slate-800 p-2 flex justify-between items-center draggable">
                        <button onClick={() => setCurrentView('dashboard')} className="text-slate-400 hover:text-white px-3 py-1 rounded hover:bg-slate-800 no-drag">
                            ← Back to Dashboard
                        </button>
                        <nav className="flex space-x-2 no-drag">
                            <button
                                onClick={() => setCurrentView('voice')}
                                className={`px-4 py-2 rounded-lg transition-colors ${currentView === 'voice' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                Voice Profile
                            </button>
                            <button
                                onClick={() => setCurrentView('test-gen')}
                                className={`px-4 py-2 rounded-lg transition-colors ${currentView === 'test-gen' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                Test Gen
                            </button>
                        </nav>
                        <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">
                            {currentView === 'mock' ? 'Mock Interview Mode' : 'Meeting Assistant'}
                        </span>
                        <div className="w-20"></div> {/* Spacer */}
                    </div>
                )}

                {/* Render Main Content */}
                <div className="flex-1 overflow-auto">
                    {renderContent()}
                </div>

                {/* Footer only for Interview Mode (Stealth) */}
                {currentView === 'interview' && (
                    <Footer
                        onStall={handleStall}
                        onSuggest={handleSuggest}
                        isProcessing={isProcessing}
                    />
                )}
            </div>

            <MeetingSummaryModal
                summary={meetingSummary}
                onClose={() => setMeetingSummary(null)}
            />
        </div>
    );
}
