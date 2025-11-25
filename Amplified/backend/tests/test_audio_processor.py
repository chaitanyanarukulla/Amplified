"""
Tests for Audio Processor
Validates audio capture, transcription handling, and coaching metrics
"""

import pytest
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock
from app.services.audio_processor import AudioProcessor


class TestAudioProcessor:
    """Test suite for AudioProcessor"""
    
    @pytest.fixture
    def processor(self):
        """Create an AudioProcessor instance with mocked API key"""
        with patch.dict("os.environ", {"DEEPGRAM_API_KEY": "test_key"}):
            return AudioProcessor()
    
    def test_initialization(self, processor):
        """Test initialization state"""
        assert processor.deepgram_api_key == "test_key"
        assert processor.is_listening is False
        assert processor.word_history is not None
        assert len(processor.word_history) == 0
        assert processor.filler_count == 0

    def test_set_user_name(self, processor):
        """Test setting user name"""
        processor.set_user_name("Test User")
        assert processor.user_name == "Test User"

    def test_set_callback(self, processor):
        """Test setting callback"""
        callback = AsyncMock()
        processor.set_callback(callback)
        assert processor.transcript_callback == callback

    @pytest.mark.asyncio
    async def test_start_capture_missing_key(self):
        """Test start capture fails without API key"""
        with patch.dict("os.environ", {}, clear=True):
            processor = AudioProcessor()
            await processor.start_capture()
            assert processor.is_listening is False

    @pytest.mark.asyncio
    async def test_start_capture_success(self, processor):
        """Test successful capture start"""
        # Mock Deepgram and SoundDevice
        with patch("app.services.audio_processor.DeepgramClient") as mock_client_cls, \
             patch("app.services.audio_processor.sd") as mock_sd, \
             patch("asyncio.get_running_loop") as mock_loop:
            
            # Setup Deepgram mock
            mock_client = mock_client_cls.return_value
            mock_connection = AsyncMock()
            mock_client.listen.asyncwebsocket.v.return_value = mock_connection
            mock_connection.start.return_value = True
            
            # Setup SoundDevice mock
            mock_sd.query_devices.return_value = {'max_input_channels': 2}
            
            # Start capture
            await processor.start_capture()
            
            assert processor.is_listening is True
            assert processor.dg_connection is not None
            assert processor.microphone is not None
            
            # Verify connection start called
            mock_connection.start.assert_called_once()
            
            # Verify microphone start called
            mock_sd.InputStream.assert_called_once()
            processor.microphone.start.assert_called_once()

    @pytest.mark.asyncio
    async def test_stop_capture(self, processor):
        """Test stopping capture"""
        # Manually set state
        processor.is_listening = True
        processor.microphone = MagicMock()
        processor.dg_connection = AsyncMock()
        
        await processor.stop_capture()
        
        assert processor.is_listening is False
        assert processor.microphone is None
        assert processor.dg_connection is None

    @pytest.mark.asyncio
    async def test_on_message_logic(self, processor):
        """Test transcript processing logic (WPM, fillers, speaker ID)"""
        mock_callback = AsyncMock()
        processor.set_callback(mock_callback)
        
        with patch("app.services.audio_processor.DeepgramClient") as mock_client_cls, \
             patch("app.services.audio_processor.sd"), \
             patch("asyncio.get_running_loop"):
            
            mock_connection = AsyncMock()
            mock_connection.start.return_value = True
            
            mock_client_cls.return_value.listen.asyncwebsocket.v.return_value = mock_connection
            
            await processor.start_capture()
            
            # Extract handler from call_args
            # self.dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
            assert mock_connection.on.called
            # Find the call where the second arg is a function (the handler)
            # or just take the first call if we assume order
            captured_handler = mock_connection.on.call_args_list[0][0][1]
            
            assert captured_handler is not None
            
            # Create a mock result object simulating Deepgram response
            mock_result = MagicMock()
            mock_result.channel.alternatives[0].transcript = "So, um, I think that is basically correct."
            mock_result.is_final = True
            mock_result.channel_index = 0
            
            # Mock words for filler detection
            word1 = MagicMock()
            word1.word = "So"
            word1.speaker = 0
            word2 = MagicMock()
            word2.word = "um"
            word2.speaker = 0
            
            mock_result.channel.alternatives[0].words = [word1, word2]
            
            # Call the handler
            await captured_handler(None, mock_result)
            
            # Verify callback called
            mock_callback.assert_called_once()
            call_args = mock_callback.call_args[0][0]
            
            assert call_args["text"] == "So, um, I think that is basically correct."
            assert call_args["is_final"] is True
            assert call_args["coaching"]["filler_count"] == 2
            assert "um" in call_args["coaching"]["fillers"]
            assert "so" in call_args["coaching"]["fillers"]

    @pytest.mark.asyncio
    async def test_wpm_calculation(self, processor):
        """Test WPM calculation logic"""
        with patch("app.services.audio_processor.DeepgramClient") as mock_client_cls, \
             patch("app.services.audio_processor.sd"), \
             patch("asyncio.get_running_loop"):
            
            mock_connection = AsyncMock()
            mock_connection.start.return_value = True
            mock_client_cls.return_value.listen.asyncwebsocket.v.return_value = mock_connection
            
            await processor.start_capture()
            
            # Extract handler
            assert mock_connection.on.called
            captured_handler = mock_connection.on.call_args_list[0][0][1]
            
            # Mock a long sentence to generate WPM
            mock_result = MagicMock()
            sentence = "This is a test sentence to calculate words per minute correctly."
            mock_result.channel.alternatives[0].transcript = sentence
            mock_result.channel.alternatives[0].words = [MagicMock() for _ in sentence.split()]
            mock_result.is_final = True
            
            await captured_handler(None, mock_result)
            
            # Check history updated
            assert len(processor.word_history) == 1
            assert processor.word_history[0][1] == len(sentence.split())


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
