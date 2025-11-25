import React, { useState, useRef, useEffect } from 'react';
import { apiGet, apiUpload, apiDelete } from '../utils/api';

const VoiceEnrollment = ({ onBack }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [profile, setProfile] = useState(null);
    const [profileName, setProfileName] = useState('');  // New: User's name

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await apiGet('/voice-profile');
            if (response.ok) {
                const data = await response.json();
                setProfile(data);
            }
        } catch (error) {
            // Ignore 404
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleUpload = async () => {
        if (!audioBlob || !profileName.trim()) {
            alert('Please enter your name before saving.');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice_sample.wav');
        formData.append('name', profileName.trim());

        try {
            const response = await apiUpload('/voice-profile/enroll', formData);

            if (response.ok) {
                const data = await response.json();
                setProfile(data);
                setAudioBlob(null);
                setProfileName('');
                alert('Voice profile enrolled successfully!');
            } else {
                alert('Enrollment failed.');
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete your voice profile?')) return;

        try {
            await apiDelete('/voice-profile');
            setProfile(null);
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    return (
        <div className="flex flex-col h-full text-white p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                    Voice Profile
                </h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                {profile ? (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center max-w-md w-full">
                        <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Voice Enrolled</h2>
                        <p className="text-slate-400 mb-2" data-testid="voice-status">{profile.name}'s voice profile is active.</p>
                        <p className="text-slate-500 text-sm mb-6">The system will recognize you in meetings.</p>

                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            data-testid="btn-delete-voice"
                        >
                            Delete Profile
                        </button>
                    </div>
                ) : (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center max-w-md w-full">
                        <div className="w-20 h-20 bg-slate-700/50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Enroll Your Voice</h2>
                        <p className="text-slate-400 mb-6" data-testid="voice-status">Record yourself reading a short text to help the AI recognize your voice.</p>

                        {!audioBlob ? (
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 mx-auto ${isRecording ? 'bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-orange-500 hover:bg-orange-400 shadow-lg'}`}
                                data-testid={isRecording ? "btn-stop-voice" : "btn-record-voice"}
                            >
                                {isRecording ? (
                                    <div className="w-6 h-6 bg-white rounded-sm"></div>
                                ) : (
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                )}
                            </button>
                        ) : (
                            <div className="space-y-4">
                                {/* Name Input */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Your Name</label>
                                    <input
                                        type="text"
                                        value={profileName}
                                        onChange={(e) => setProfileName(e.target.value)}
                                        placeholder="Enter your name"
                                        className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">This name will appear in transcripts instead of "Speaker 0"</p>
                                </div>

                                {/* Audio Preview */}
                                <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />

                                {/* Action Buttons */}
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => setAudioBlob(null)}
                                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                    >
                                        Retake
                                    </button>
                                    <button
                                        onClick={handleUpload}
                                        disabled={uploading || !profileName.trim()}
                                        data-testid="btn-save-voice"
                                        className="px-6 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {uploading ? 'Uploading...' : 'Save Profile'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {isRecording && (
                            <p className="mt-4 text-orange-400 text-sm animate-pulse">Recording... Read a paragraph of text.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceEnrollment;
