import structlog
from typing import Dict
from datetime import datetime
from fastapi import WebSocket

from app.services.audio_processor import AudioProcessor
from app.services.context_engine import ContextEngine
from app.services.llm_service import LLMService

logger = structlog.get_logger(__name__)

class SessionManager:
    def __init__(self):
        self.active_sessions: Dict[str, dict] = {}
        self.audio_processor = AudioProcessor()
        self.context_engine = ContextEngine()
        self.llm_service = LLMService()
        
        # Import here to avoid circular dependency
        from app.services.mock_service import MockInterviewService
        self.mock_service = MockInterviewService()
    
    def create_session(self, session_id: str, websocket: WebSocket = None):
        """Create a new session"""
        self.active_sessions[session_id] = {
            "started_at": datetime.now(),
            "is_listening": False,
            "transcript": [],
            "last_activity": datetime.now(),
            "websocket": websocket
        }
        logger.info(f"Session created: {session_id}")
    
    def end_session(self, session_id: str):
        """End and cleanup session"""
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]
            logger.info(f"Session ended: {session_id}")

# Global instance
session_manager = SessionManager()
