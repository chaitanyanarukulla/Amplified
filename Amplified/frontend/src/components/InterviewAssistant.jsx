import React from 'react';
import ContextPanel from './ContextPanel';
import Transcript from './Transcript';
import CoachingWidget from './CoachingWidget';
import AnswerCard from './AnswerCard';

const InterviewAssistant = ({
    transcript,
    isListening,
    isContextPanelOpen,
    setIsContextPanelOpen,
    handleUpdateNotes,
    notes,
    coachingMetrics,
    currentSuggestion,
    setCurrentSuggestion,
    clickThrough,
    setClickThrough,
    interviewState,
    updateInterviewState
}) => {
    return (
        <div className="flex-1 flex flex-row overflow-hidden relative"
            onMouseEnter={() => clickThrough && setClickThrough(false)}
        >
            {/* Main Content Area */}
            <div className="flex-1 bg-slate-900/60 backdrop-blur-sm flex flex-col overflow-hidden">
                <Transcript transcript={transcript} />

                <div className="flex-1 overflow-y-auto">
                    <AnswerCard
                        suggestion={currentSuggestion}
                        onClose={() => setCurrentSuggestion(null)}
                    />
                </div>

                {/* Coaching Widget - Only show when listening */}
                {isListening && (
                    <CoachingWidget
                        wpm={coachingMetrics.wpm}
                        fillerCount={coachingMetrics.fillerCount}
                    />
                )}
            </div>

            {/* Context Panel Column */}
            <ContextPanel
                isOpen={isContextPanelOpen}
                onClose={() => setIsContextPanelOpen(false)}
                onUpdateNotes={handleUpdateNotes}
                initialNotes={notes}
                interviewState={interviewState}
                updateInterviewState={updateInterviewState}
            />
        </div>
    );
};

export default InterviewAssistant;
