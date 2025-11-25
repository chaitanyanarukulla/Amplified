import React, { useState, useEffect } from 'react';
import { VOICE_PROFILES, findBrowserVoice } from '../utils/voiceProfiles';

const VoiceSelector = ({ selectedVoiceId, onVoiceSelect }) => {
    const [previewingVoice, setPreviewingVoice] = useState(null);

    // Load voices on mount
    useEffect(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }
    }, []);

    const previewVoice = (profile) => {
        if (profile.id === 'text-only') {
            return; // No preview for text-only mode
        }

        setPreviewingVoice(profile.id);

        const utterance = new SpeechSynthesisUtterance(
            "Hi, I'll be your interviewer today. Let's begin with a few questions."
        );

        const browserVoice = findBrowserVoice(profile);
        if (browserVoice) {
            utterance.voice = browserVoice;
        }

        utterance.rate = profile.rate;
        utterance.pitch = profile.pitch;
        utterance.lang = profile.lang;

        utterance.onend = () => {
            setPreviewingVoice(null);
        };

        window.speechSynthesis.cancel(); // Stop any ongoing speech
        window.speechSynthesis.speak(utterance);
    };

    const stopPreview = () => {
        window.speechSynthesis.cancel();
        setPreviewingVoice(null);
    };

    return (
        <div className="space-y-4" data-testid="voice-selector">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Interviewer Voice</h3>
                <p className="text-sm text-slate-400">Choose how the AI sounds</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {VOICE_PROFILES.map((profile) => {
                    const isSelected = selectedVoiceId === profile.id;
                    const isPreviewing = previewingVoice === profile.id;

                    return (
                        <div
                            key={profile.id}
                            onClick={() => onVoiceSelect(profile.id)}
                            className={`
                                relative p-4 rounded-lg border-2 cursor-pointer transition-all
                                ${isSelected
                                    ? 'border-orange-500 bg-orange-500/10'
                                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                }
                            `}
                        >
                            {/* Selection Indicator */}
                            {isSelected && (
                                <div className="absolute top-3 right-3 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}

                            {/* Voice Info */}
                            <div className="pr-8">
                                <h4 className="font-medium text-white mb-1">{profile.name}</h4>
                                <p className="text-sm text-slate-400">{profile.description}</p>
                            </div>

                            {/* Preview Button */}
                            {profile.id !== 'text-only' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isPreviewing) {
                                            stopPreview();
                                        } else {
                                            previewVoice(profile);
                                        }
                                    }}
                                    className={`
                                        mt-3 px-3 py-1.5 rounded text-sm font-medium transition-colors
                                        ${isPreviewing
                                            ? 'bg-red-500 hover:bg-red-600 text-white'
                                            : 'bg-green-600 hover:bg-green-500 text-white'
                                        }
                                    `}
                                >
                                    {isPreviewing ? (
                                        <span className="flex items-center gap-1.5">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                                <rect x="6" y="4" width="4" height="16" />
                                                <rect x="14" y="4" width="4" height="16" />
                                            </svg>
                                            Stop Preview
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                            Preview Voice
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default VoiceSelector;
