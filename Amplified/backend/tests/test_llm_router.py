"""
Tests for LLM Router Service
Validates routing logic, provider integration, and error handling
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch, Mock
import json
from app.services.llm_router import LLMRouter
from app.models import UserLLMPreference

class TestLLMRouter:
    """Test suite for LLMRouter"""
    
    @pytest.fixture
    def mock_env(self):
        """Mock environment variables"""
        with patch.dict("os.environ", {
            "OPENAI_API_KEY": "sk-test",
            "ANTHROPIC_API_KEY": "sk-ant-test",
            "LOCAL_LLM_URL": "http://localhost:11434"
        }):
            yield

    @pytest.fixture
    def router(self, mock_env):
        """Create router instance with mocked clients"""
        with patch("app.services.llm_router.AsyncOpenAI") as mock_openai, \
             patch("app.services.llm_router.AsyncAnthropic", create=True) as mock_claude:
            
            router = LLMRouter()
            router.openai_client = mock_openai.return_value
            router.claude_client = mock_claude.return_value
            return router

    @pytest.fixture
    def mock_session(self):
        """Mock database session"""
        with patch("app.services.llm_router.Session") as mock_session_cls:
            session = mock_session_cls.return_value
            session.__enter__.return_value = session
            yield session

    # --- Engine Preference Tests ---

    def test_get_user_engine_existing(self, router, mock_session):
        """Test getting existing user engine preference"""
        mock_pref = UserLLMPreference(user_id="user1", selected_engine="claude_3_5_sonnet")
        mock_session.exec.return_value.first.return_value = mock_pref
        
        engine = router.get_user_engine("user1")
        assert engine == "claude_3_5_sonnet"

    def test_get_user_engine_default(self, router, mock_session):
        """Test getting default engine when no preference exists"""
        mock_session.exec.return_value.first.return_value = None
        
        engine = router.get_user_engine("user1")
        assert engine == router.DEFAULT_ENGINE
        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()

    def test_set_user_engine_valid(self, router, mock_session):
        """Test setting valid engine"""
        mock_session.exec.return_value.first.return_value = None
        
        success = router.set_user_engine("local_llm", "user1")
        assert success is True
        mock_session.add.assert_called()
        mock_session.commit.assert_called()

    def test_set_user_engine_invalid(self, router):
        """Test setting invalid engine"""
        success = router.set_user_engine("invalid_engine", "user1")
        assert success is False

    # --- Generation Tests ---

    @pytest.mark.asyncio
    async def test_generate_completion_openai(self, router):
        """Test completion with OpenAI"""
        with patch.object(router, "get_user_engine", return_value="openai_gpt4o"):
            # Mock OpenAI response
            mock_response = MagicMock()
            mock_response.choices[0].message.content = "OpenAI Response"
            router.openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            response = await router.generate_completion("Test prompt", user_id="user1")
            
            assert response == "OpenAI Response"
            router.openai_client.chat.completions.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_completion_claude(self, router):
        """Test completion with Claude"""
        with patch.object(router, "get_user_engine", return_value="claude_3_5_sonnet"):
            # Mock Claude response
            mock_response = MagicMock()
            mock_response.content = [MagicMock(text="Claude Response")]
            router.claude_client.messages.create = AsyncMock(return_value=mock_response)
            
            response = await router.generate_completion("Test prompt", user_id="user1")
            
            assert response == "Claude Response"
            router.claude_client.messages.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_completion_local(self, router):
        """Test completion with Local LLM"""
        with patch.object(router, "get_user_engine", return_value="local_llm"):
            # Mock aiohttp
            with patch("aiohttp.ClientSession") as mock_session_cls:
                mock_session = mock_session_cls.return_value
                mock_session.__aenter__.return_value = mock_session
                
                mock_post = mock_session.post.return_value
                mock_post.__aenter__.return_value = mock_post
                mock_post.status = 200
                mock_post.json = AsyncMock(return_value={"response": "Local Response"})
                
                response = await router.generate_completion("Test prompt", user_id="user1")
                
                assert response == "Local Response"

    # --- JSON Generation Tests ---

    @pytest.mark.asyncio
    async def test_generate_json_openai(self, router):
        """Test JSON generation with OpenAI"""
        with patch.object(router, "get_user_engine", return_value="openai_gpt4o"):
            mock_response = MagicMock()
            mock_response.choices[0].message.content = '{"key": "value"}'
            router.openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            result = await router.generate_json("Test prompt", user_id="user1")
            
            assert result == {"key": "value"}
            # Verify JSON mode was requested
            call_kwargs = router.openai_client.chat.completions.create.call_args[1]
            assert call_kwargs["response_format"] == {"type": "json_object"}

    @pytest.mark.asyncio
    async def test_generate_json_claude(self, router):
        """Test JSON generation with Claude"""
        with patch.object(router, "get_user_engine", return_value="claude_3_5_sonnet"):
            # Mock Claude returning JSON string (without opening brace as it is prefilled)
            mock_response = MagicMock()
            mock_response.content = [MagicMock(text='"key": "value"}')]
            router.claude_client.messages.create = AsyncMock(return_value=mock_response)
            
            result = await router.generate_json("Test prompt", user_id="user1")
            
            assert result == {"key": "value"}
            # Verify prefill was used
            call_kwargs = router.claude_client.messages.create.call_args[1]
            assert any(m["role"] == "assistant" and m["content"] == "{" for m in call_kwargs["messages"])

    # --- Helper Tests ---

    def test_extract_json_from_text(self, router):
        """Test JSON extraction logic"""
        # Direct JSON
        assert router._extract_json_from_text('{"a": 1}') == {"a": 1}
        
        # Markdown block
        assert router._extract_json_from_text('Text ```json\n{"a": 1}\n```') == {"a": 1}
        
        # Embedded
        assert router._extract_json_from_text('Sure! {"a": 1} is the answer.') == {"a": 1}
        
        # Invalid
        with pytest.raises(ValueError):
            router._extract_json_from_text("Invalid JSON")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
