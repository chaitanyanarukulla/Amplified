"""
Tests for Session Manager
Validates session creation, management, and cleanup
"""

import pytest
from app.services.session_manager import SessionManager


class TestSessionManager:
    """Test suite for SessionManager"""
    
    @pytest.fixture
    def manager(self):
        """Create a SessionManager instance"""
        return SessionManager()
    
    def test_create_session(self, manager):
        """Test creating a new session"""
        session_id = "test_session_123"
        
        manager.create_session(session_id)
        
        assert session_id in manager.active_sessions
        session = manager.active_sessions[session_id]
        assert "started_at" in session
        assert "is_listening" in session
        assert session["is_listening"] == False
        assert "transcript" in session
        assert isinstance(session["transcript"], list)
        assert len(session["transcript"]) == 0
    
    def test_create_session_with_websocket(self, manager):
        """Test creating a session with WebSocket connection"""
        session_id = "test_session_ws"
        mock_websocket = "mock_websocket_connection"
        
        manager.create_session(session_id, websocket=mock_websocket)
        
        assert session_id in manager.active_sessions
        assert manager.active_sessions[session_id]["websocket"] == mock_websocket
    
    def test_end_session(self, manager):
        """Test ending and cleaning up a session"""
        session_id = "test_session_end"
        manager.create_session(session_id)
        
        # Verify session exists
        assert session_id in manager.active_sessions
        
        # End session
        manager.end_session(session_id)
        
        # Verify session is removed
        assert session_id not in manager.active_sessions
    
    def test_end_nonexistent_session(self, manager):
        """Test ending a session that doesn't exist should not raise error"""
        session_id = "nonexistent_session"
        
        # Should not raise exception
        manager.end_session(session_id)
        
        assert session_id not in manager.active_sessions
    
    def test_multiple_active_sessions(self, manager):
        """Test creating and managing multiple sessions"""
        session_ids = ["session_1", "session_2", "session_3"]
        
        # Create multiple sessions
        for sid in session_ids:
            manager.create_session(sid)
        
        # Verify all exist
        for sid in session_ids:
            assert sid in manager.active_sessions
        
        # End one session
        manager.end_session("session_2")
        
        # Verify correct session was removed
        assert "session_1" in manager.active_sessions
        assert "session_2" not in manager.active_sessions
        assert "session_3" in manager.active_sessions
    
    def test_session_state_independence(self, manager):
        """Test that different sessions maintain independent state"""
        session_1 = "session_state_1"
        session_2 = "session_state_2"
        
        manager.create_session(session_1)
        manager.create_session(session_2)
        
        # Modify session 1
        manager.active_sessions[session_1]["is_listening"] = True
        manager.active_sessions[session_1]["transcript"].append("Test transcript")
        
        # Verify session 2 is unaffected
        assert manager.active_sessions[session_2]["is_listening"] == False
        assert len(manager.active_sessions[session_2]["transcript"]) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
