// Voice profiles for Mock Interview TTS
export const VOICE_PROFILES = [
    {
        id: 'neutral-us',
        name: 'Neutral – US English',
        description: 'Clear, professional tone',
        voiceName: 'Samantha',
        rate: 0.95,
        pitch: 1.0,
        lang: 'en-US',
        gender: 'female'
    },
    {
        id: 'friendly-us',
        name: 'Friendly – US English',
        description: 'Warm, conversational tone',
        voiceName: 'Karen',
        rate: 1.0,
        pitch: 1.1,
        lang: 'en-US',
        gender: 'female'
    },
    {
        id: 'formal-uk',
        name: 'Formal – UK English',
        description: 'Professional British accent',
        voiceName: 'Daniel',
        rate: 0.9,
        pitch: 0.95,
        lang: 'en-GB',
        gender: 'male'
    },
    {
        id: 'calm-female',
        name: 'Calm – Female Voice',
        description: 'Soothing, measured pace',
        voiceName: 'Victoria',
        rate: 0.85,
        pitch: 1.0,
        lang: 'en-US',
        gender: 'female'
    },
    {
        id: 'energetic-male',
        name: 'Energetic – Male Voice',
        description: 'Dynamic, engaging tone',
        voiceName: 'Alex',
        rate: 1.05,
        pitch: 1.0,
        lang: 'en-US',
        gender: 'male'
    },
    {
        id: 'text-only',
        name: 'Text Only',
        description: 'No voice, display questions as text',
        voiceName: null,
        rate: 0,
        pitch: 0,
        lang: 'en-US',
        gender: null
    }
];

// Get voice profile by ID
export const getVoiceProfile = (id) => {
    return VOICE_PROFILES.find(profile => profile.id === id) || VOICE_PROFILES[0];
};

// Get default voice profile
export const getDefaultVoiceProfile = () => {
    const savedVoiceId = localStorage.getItem('mockInterviewVoice');
    return savedVoiceId ? getVoiceProfile(savedVoiceId) : VOICE_PROFILES[0];
};

// Save voice preference
export const saveVoicePreference = (voiceId) => {
    localStorage.setItem('mockInterviewVoice', voiceId);
};

// Find best matching browser voice for a profile
export const findBrowserVoice = (profile) => {
    if (!profile.voiceName) return null;

    const voices = window.speechSynthesis.getVoices();

    // Try exact match
    let voice = voices.find(v => v.name === profile.voiceName);

    // Try partial match
    if (!voice) {
        voice = voices.find(v => v.name.includes(profile.voiceName));
    }

    // Try language + gender match
    if (!voice && profile.gender) {
        voice = voices.find(v =>
            v.lang.includes(profile.lang.split('-')[0]) &&
            v.name.toLowerCase().includes(profile.gender)
        );
    }

    // Try language match
    if (!voice) {
        voice = voices.find(v => v.lang.includes(profile.lang.split('-')[0]));
    }

    // Fallback to first available voice
    return voice || voices[0];
};
