import os
import asyncio
import logging
import json
import threading
from typing import Optional, Callable, Awaitable
from datetime import datetime, timedelta
from collections import deque
from dotenv import load_dotenv
import sounddevice as sd
import numpy as np

from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
    Microphone,
)

load_dotenv()
logger = logging.getLogger(__name__)

# Suppress noisy cancellation errors from Deepgram SDK
logging.getLogger("deepgram.clients.common.v1.abstract_async_websocket").setLevel(logging.CRITICAL)

class AudioProcessor:
    """
    Manages audio capture and transcription using Deepgram
    """
    
    def __init__(self):
        self.deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")
        self.is_listening = False
        self.transcript_callback: Optional[Callable[[dict], Awaitable[None]]] = None
        self.dg_connection = None
        self.microphone = None
        
        # Coaching State
        self.word_history = deque() # Stores (timestamp, word_count) tuples for WPM
        self.filler_count = 0
        self.fillers_detected = []
        
        if not self.deepgram_api_key:
            logger.warning("DEEPGRAM_API_KEY not set. Transcription will not work.")

        self.user_name = None

    def set_user_name(self, name: str):
        """Set the user's name for speaker identification"""
        self.user_name = name
        logger.info(f"AudioProcessor user name set to: {name}")

    def set_callback(self, callback: Callable[[dict], Awaitable[None]]):
        """Set callback for transcript updates"""
        self.transcript_callback = callback

    async def start_capture(self):
        """
        Start audio capture and transcription stream
        """
        if self.is_listening:
            return

        if not self.deepgram_api_key:
            logger.error("Cannot start capture: DEEPGRAM_API_KEY missing")
            return

        self.is_listening = True
        logger.info("Starting audio capture...")
        
        # Reset Coaching State
        self.word_history.clear()
        self.filler_count = 0
        self.fillers_detected = []

        try:
            # Initialize Deepgram Client
            config = DeepgramClientOptions(options={"keepalive": "true"})
            deepgram = DeepgramClient(self.deepgram_api_key, config)
            
            # Create a websocket connection to Deepgram
            self.dg_connection = deepgram.listen.asyncwebsocket.v("1")

            # Define Event Handlers
            async def on_message(self_handler, result, **kwargs):
                sentence = result.channel.alternatives[0].transcript
                logger.info(f"[Coaching] Received transcript sentence: '{sentence}'")
                if len(sentence) == 0:
                    return
                
                is_final = result.is_final
                channel_index = result.channel_index if hasattr(result, 'channel_index') else 0
                
                # Extract words for WPM and Filler detection
                words = result.channel.alternatives[0].words
                current_time = datetime.now()
                
                # Initialize wpm to 0
                wpm = 0
                
                # 1. WPM Calculation
                # Calculate word count - prefer 'words' array but fallback to splitting transcript
                word_count = len(words) if words else len(sentence.split())
                logger.info(f"[Coaching] Calculated word_count={word_count}")
                
                if word_count > 0:
                    # Add current word count to history
                    self.word_history.append((current_time, word_count))
                    logger.info(f"[Coaching] Updated word_history length={len(self.word_history)}")
                    
                    # Remove entries older than 10 seconds
                    while self.word_history and (current_time - self.word_history[0][0]).total_seconds() > 10:
                        self.word_history.popleft()
                    
                    # Calculate WPM
                    total_words = sum(count for _, count in self.word_history)
                    # Avoid division by zero, default to small window if history is short
                    window_seconds = 10
                    if self.word_history:
                        oldest_time = self.word_history[0][0]
                        time_diff = (current_time - oldest_time).total_seconds()
                        if time_diff > 1:
                            window_seconds = time_diff
                    
                    wpm = int((total_words / window_seconds) * 60)
                    # Fallback: if wpm is zero (e.g., very short window), estimate using current fragment word count
                    if wpm == 0 and word_count > 0:
                        # Approximate: assume 10-second window, so multiply by 6 to get per minute
                        wpm = int(word_count * 6)
                    logger.info(f"[Coaching] word_count={word_count}, total_words={total_words}, window_seconds={window_seconds}, wpm={wpm}")
                else:
                    wpm = 0
                    
                # 2. Filler Word Detection
                # Deepgram with filler_words=True marks them, or we can check text
                # Common fillers: um, uh, like, you know, hmm
                # We'll do a simple text check on the new sentence fragment
                
                # Check words array first (Deepgram filler detection)
                if words:
                    for word in words:
                        w_text = word.word.lower().strip(".,?!")
                        if w_text in ["um", "uh", "hmm", "like", "you know", "so", "actually"]:
                            self.filler_count += 1
                            self.fillers_detected.append(w_text)
                
                # Fallback: Check raw transcript text if words array is empty
                elif sentence:
                    lower_sentence = sentence.lower()
                    fillers = ["um", "uh", "hmm", "like", "you know"]
                    for filler in fillers:
                        # Simple check - count occurrences in this fragment
                        # Note: This might overcount if fragments overlap, but acceptable for rough coaching
                        count = lower_sentence.count(filler)
                        if count > 0:
                            self.filler_count += count
                            self.fillers_detected.extend([filler] * count)

                # Speaker Identification Logic
                # ... (Existing logic) ...
                speaker_id = 0
                if words and len(words) > 0:
                    speaker_id = words[0].speaker
                
                speaker = f"Speaker {speaker_id}"
                
                if channel_index == 1:
                    speaker = "Interviewer (System)"
                    speaker_id = 0 
                elif channel_index == 0 and self.input_channels > 1:
                    # Use user's name if available, otherwise default
                    speaker = self.user_name if self.user_name else "Candidate (You)"
                    speaker_id = 1 
                else:
                    # For single channel or other cases, try to map speaker 0 to user if name exists
                    # This is a heuristic: usually speaker 0 is the primary speaker (user) in single mic setup
                    if self.user_name and speaker_id == 0:
                        speaker = self.user_name
                    else:
                        speaker = f"Speaker {speaker_id}"
                
                # Simple Question Detection
                is_question = False
                if is_final:
                    if "?" in sentence:
                        is_question = True
                    else:
                        starters = ["who", "what", "where", "when", "why", "how", "can you", "could you", "tell me"]
                        lower_sentence = sentence.lower()
                        if any(lower_sentence.strip().startswith(s) for s in starters):
                            is_question = True

                if self.transcript_callback:
                    await self.transcript_callback({
                        "speaker": speaker,
                        "speaker_id": speaker_id,
                        "text": sentence,
                        "is_final": is_final,
                        "is_question": is_question,
                        "timestamp": datetime.now().isoformat(),
                        "coaching": {
                            "wpm": wpm,
                            "filler_count": self.filler_count,
                            "fillers": self.fillers_detected[-5:] # Last 5 fillers
                        }
                    })

            async def on_error(self, error, **kwargs):
                logger.error(f"Deepgram Error: {error}")

            # Register Handlers
            self.dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
            self.dg_connection.on(LiveTranscriptionEvents.Error, on_error)

            # Determine available channels
            try:
                device_info = sd.query_devices(kind='input')
                max_channels = device_info['max_input_channels']
                self.input_channels = 2 if max_channels >= 2 else 1
                logger.info(f"Selecting input with {self.input_channels} channels")
            except Exception:
                self.input_channels = 1

            # Configure Options
            options = LiveOptions(
                model="nova-2",
                language="en-US",
                smart_format=True,
                encoding="linear16",
                channels=self.input_channels,
                sample_rate=16000,
                interim_results=True,
                utterance_end_ms="1000",
                vad_events=True,
                diarize=True,
                multichannel=True if self.input_channels > 1 else False,
                filler_words=True, # Enable filler word detection
            )

            # Start the connection
            if await self.dg_connection.start(options) is False:
                logger.error("Failed to connect to Deepgram")
                self.is_listening = False
                return

            # Capture the current event loop to schedule async tasks from the sync callback
            loop = asyncio.get_running_loop()

            # Start Microphone using sounddevice directly
            def audio_callback(indata, frames, time, status):
                if not self.is_listening:
                    return
                    
                if status:
                    logger.warning(f"Audio status: {status}")
                if self.dg_connection:
                    # Schedule the async send operation on the main event loop
                    asyncio.run_coroutine_threadsafe(
                        self.dg_connection.send(indata.tobytes()), 
                        loop
                    )

            self.microphone = sd.InputStream(
                channels=self.input_channels,
                samplerate=16000,
                dtype="int16",
                callback=audio_callback,
                blocksize=2048
            )
            self.microphone.start()
            
            logger.info("Deepgram connection and microphone started")

        except Exception as e:
            logger.error(f"Failed to start audio capture: {e}")
            self.is_listening = False
            if self.dg_connection:
                await self.dg_connection.finish()

    async def stop_capture(self):
        """Stop audio capture"""
        self.is_listening = False
        logger.info("Stopping audio capture...")
        
        if self.microphone:
            self.microphone.stop()
            self.microphone.close()
            self.microphone = None
            
        if self.dg_connection:
            await self.dg_connection.finish()
            self.dg_connection = None
