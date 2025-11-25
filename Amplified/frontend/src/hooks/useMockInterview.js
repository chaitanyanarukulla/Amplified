import { useState, useEffect, useCallback } from 'react';
import { getVoiceProfile, findBrowserVoice } from '../utils/voiceProfiles';
import { apiUpload, apiPost } from '../utils/api';

export const useMockInterview = ({
    sendMessage,
    isListening,
    setIsListening,
    transcript,
    setCurrentView
}) => {
    const [isMockMode, setIsMockMode] = useState(false);
    const [mockQuestion, setMockQuestion] = useState(null);
    const [mockQuestionNumber, setMockQuestionNumber] = useState(1);
    const [mockFeedback, setMockFeedback] = useState(null);
    const [mockAnswer, setMockAnswer] = useState('');
    const [mockStage, setMockStage] = useState('setup'); // 'setup' | 'briefing' | 'interview'
    const [mockSetupData, setMockSetupData] = useState(null);
    const [mockBriefing, setMockBriefing] = useState(null);
    const [selectedVoice, setSelectedVoice] = useState('neutral-us');

    // Mock Interview Functions
    const speakQuestion = useCallback((text, voiceId = selectedVoice) => {
        const voiceProfile = getVoiceProfile(voiceId);

        // Skip TTS for text-only mode
        if (voiceProfile.id === 'text-only') {
            return Promise.resolve(); // Return resolved promise for text-only mode
        }

        return new Promise((resolve) => {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);

                // Use voice profile settings
                const browserVoice = findBrowserVoice(voiceProfile);
                if (browserVoice) {
                    utterance.voice = browserVoice;
                }

                utterance.rate = voiceProfile.rate;
                utterance.pitch = voiceProfile.pitch;
                utterance.lang = voiceProfile.lang;
                utterance.volume = 1.0;

                // Resolve promise when speech ends
                utterance.onend = () => {
                    console.log('[Mock Interview] TTS finished speaking');
                    resolve();
                };

                utterance.onerror = (error) => {
                    console.error('[Mock Interview] TTS error:', error);
                    resolve(); // Resolve anyway to not block the flow
                };

                window.speechSynthesis.speak(utterance);
            } else {
                resolve(); // No speech synthesis available
            }
        });
    }, [selectedVoice]);

    const fetchNextQuestion = useCallback(async (questionNum) => {
        try {
            const formData = new FormData();
            formData.append('question_number', questionNum);

            const response = await apiUpload('/mock/question', formData);

            if (response.ok) {
                const data = await response.json();
                setMockQuestion(data.question);
                setMockQuestionNumber(data.number);
                setMockFeedback(null);
                setMockAnswer('');

                // Speak the question and wait for it to finish
                const ttsPromise = speakQuestion(data.question);

                // Start listening after TTS finishes
                ttsPromise.then(() => {
                    console.log('[Mock Interview] TTS complete, starting to listen for answer');
                    if (!isListening) {
                        sendMessage({ type: 'command', action: 'start_listening' });
                        setIsListening(true);
                    }
                });

            }
        } catch (error) {
            console.error('Failed to fetch mock question:', error);
        }
    }, [speakQuestion, isListening, sendMessage, setIsListening]);

    const startMockInterview = useCallback(async () => {
        setIsMockMode(true);
        setMockQuestionNumber(1);
        setMockFeedback(null);
        setMockAnswer('');

        // Notify backend to suppress standard suggestions
        sendMessage({ type: 'command', action: 'set_mock_mode', active: true });

        await fetchNextQuestion(1);
    }, [sendMessage, fetchNextQuestion]);

    const submitMockAnswer = useCallback(async (answerText) => {
        try {
            console.log('[Mock Interview] Submitting answer:', answerText.substring(0, 100) + '...');
            const formData = new FormData();
            formData.append('question', mockQuestion);
            formData.append('answer', answerText);

            const response = await apiUpload('/mock/feedback', formData);

            if (response.ok) {
                const data = await response.json();
                console.log('[Mock Interview] Received feedback:', data);
                if (data && data.feedback) {
                    setMockFeedback(data);
                } else {
                    console.error('[Mock Interview] Empty feedback received');
                    setMockFeedback({
                        feedback: {
                            content: 'Unable to generate feedback at this time.',
                            delivery: 'Please try again.'
                        },
                        score: 0
                    });
                }
            } else {
                console.error('[Mock Interview] Feedback request failed:', response.status);
            }
        } catch (error) {
            console.error('Failed to submit mock answer:', error);
        }
    }, [mockQuestion]);

    const handleNextMockQuestion = useCallback(() => {
        const nextNum = mockQuestionNumber + 1;
        if (nextNum <= 7) { // Assuming 7 questions for now
            fetchNextQuestion(nextNum);
        } else {
            // End mock interview if no more questions
            endMockInterview();
        }
    }, [mockQuestionNumber, fetchNextQuestion]);

    const handlePrepareMockInterview = useCallback(async (data) => {
        setMockSetupData(data);
        setSelectedVoice(data.selectedVoice);

        // Simulate API call for now (replace with actual backend call later)
        // In a real implementation, this would call /mock/prepare
        try {
            const formData = new FormData();
            formData.append('resume', data.resume);
            formData.append('jd_url', data.jdUrl);
            formData.append('role', data.role);
            formData.append('voice_id', data.selectedVoice);

            const response = await apiUpload('/mock/prepare', formData);

            if (!response.ok) {
                throw new Error('Failed to prepare mock interview');
            }

            const briefingData = await response.json();

            setMockBriefing(briefingData);
            setMockStage('briefing');
        } catch (error) {
            console.error("Error preparing mock interview:", error);
            // Handle error
        }
    }, []);

    const handleStartMockInterview = useCallback(() => {
        setMockStage('interview');
        startMockInterview();
    }, [startMockInterview]);

    const endMockInterview = useCallback(() => {
        setIsMockMode(false);
        setMockQuestion(null);
        setMockFeedback(null);
        setMockAnswer('');
        setMockStage('setup');
        setMockSetupData(null);
        setMockBriefing(null);

        // Notify backend to resume standard suggestions
        sendMessage({ type: 'command', action: 'set_mock_mode', active: false });

        if (isListening) {
            sendMessage({ type: 'command', action: 'stop_listening' });
            setIsListening(false);
        }

        // Go back to dashboard
        setCurrentView('dashboard');
    }, [sendMessage, isListening, setIsListening, setCurrentView]);

    // Monitor transcript in mock mode to capture answer
    useEffect(() => {
        if (isMockMode && isListening && transcript.length > 0) {
            const lastEntry = transcript[transcript.length - 1];

            // Only process final transcripts to avoid duplicates
            if (!lastEntry.is_final) {
                return;
            }

            console.log('[Mock Interview] Transcript entry:', {
                speaker: lastEntry.speaker,
                speaker_id: lastEntry.speaker_id,
                text: lastEntry.text?.substring(0, 50),
                is_final: lastEntry.is_final
            });

            // Capture user speech - check for various speaker labels from backend
            // Backend can send: "Candidate (You)", "Speaker 0", "Speaker 1", etc.
            const isUserSpeech = lastEntry.speaker && (
                lastEntry.speaker.includes('You') ||
                lastEntry.speaker.includes('Candidate') ||
                lastEntry.speaker === 'Speaker 0' || // Default single channel
                lastEntry.speaker_id === 0 // Check speaker_id if available
            );

            console.log('[Mock Interview] Is user speech:', isUserSpeech);

            if (isUserSpeech && lastEntry.text) {
                setMockAnswer(prev => {
                    // Use the full text from the transcript entry (it's already merged by backend)
                    // Just replace the entire answer with the latest version
                    const newAnswer = lastEntry.text.trim();
                    console.log('[Mock Interview] Updated answer:', newAnswer.substring(0, 100) + '...');
                    console.log('[Mock Interview] Answer length:', newAnswer.length);
                    return newAnswer;
                });
            }
        }
    }, [transcript, isMockMode, isListening]);

    // Auto-submit answer after silence in mock mode
    useEffect(() => {
        if (isMockMode && mockAnswer.trim().length > 0 && !mockFeedback) {
            console.log('[Mock Interview] Setting auto-submit timer (8 seconds), answer length:', mockAnswer.trim().length);
            const timer = setTimeout(() => {
                // Only submit if we have enough text
                if (mockAnswer.trim().length > 20) {
                    console.log('[Mock Interview] Auto-submitting answer after 8 seconds of silence');
                    submitMockAnswer(mockAnswer);
                    if (isListening) {
                        sendMessage({ type: 'command', action: 'stop_listening' });
                        setIsListening(false);
                    }
                } else {
                    console.log('[Mock Interview] Answer too short to submit:', mockAnswer.trim().length);
                }
            }, 8000); // Increased from 5000ms to 8000ms (8 seconds)
            return () => clearTimeout(timer);
        }
    }, [mockAnswer, isMockMode, mockFeedback, isListening, sendMessage, submitMockAnswer, setIsListening]);

    // Suppress standard suggestions in mock mode
    useEffect(() => {
        if (isMockMode && isListening) {
            // Backend handles suppression via 'set_mock_mode'
        }
    }, [isMockMode, isListening]);

    return {
        isMockMode,
        mockQuestion,
        mockQuestionNumber,
        mockFeedback,
        mockAnswer,
        mockStage,
        mockSetupData,
        mockBriefing,
        selectedVoice,
        setMockStage,
        handlePrepareMockInterview,
        handleStartMockInterview,
        handleNextMockQuestion,
        endMockInterview,
        coachingMetrics: { wpm: 0, fillerCount: 0 } // Placeholder if needed, or pass from App
    };
};
