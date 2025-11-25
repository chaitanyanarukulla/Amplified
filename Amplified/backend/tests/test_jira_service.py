"""
Tests for Jira Service
Validates Jira integration, ticket fetching, and data parsing
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.jira_service import JiraService
from app.models import JiraSettings

class TestJiraService:
    """Test suite for JiraService"""
    
    @pytest.fixture
    def service(self):
        """Create a JiraService instance"""
        return JiraService()
    
    @pytest.fixture
    def mock_settings(self):
        """Create mock JiraSettings"""
        return JiraSettings(
            user_id="default",
            base_url="https://test.atlassian.net",
            email="test@example.com",
            api_token_encrypted="encrypted_token"
        )

    # --- Ticket Key Extraction Tests ---
    
    def test_extract_ticket_key_direct(self, service):
        """Test extracting key from direct string"""
        assert service._extract_ticket_key("PROJ-123") == "PROJ-123"
        assert service._extract_ticket_key("  PROJ-123  ") == "PROJ-123"

    def test_extract_ticket_key_url(self, service):
        """Test extracting key from various URLs"""
        urls = [
            ("https://domain.atlassian.net/browse/PROJ-123", "PROJ-123"),
            ("https://domain.atlassian.net/browse/PROJ-123/", "PROJ-123"),
            ("https://domain.atlassian.net/jira/software/projects/PROJ/boards/1?selectedIssue=PROJ-123", "PROJ-123"),
        ]
        for url, expected in urls:
            assert service._extract_ticket_key(url) == expected

    def test_extract_ticket_key_invalid(self, service):
        """Test invalid ticket keys raise error"""
        invalid_inputs = [
            "INVALID",
            "123-PROJ",
            "https://domain.atlassian.net/browse/",
            ""
        ]
        for inp in invalid_inputs:
            with pytest.raises(ValueError):
                service._extract_ticket_key(inp)

    # --- ADF Parsing Tests ---

    def test_parse_adf_simple_text(self, service):
        """Test parsing simple text ADF"""
        assert service._parse_adf("Simple text") == "Simple text"
        assert service._parse_adf(None) == ""

    def test_parse_adf_complex(self, service):
        """Test parsing complex ADF structure"""
        adf = {
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {"type": "text", "text": "Hello "},
                        {"type": "text", "text": "World"}
                    ]
                },
                {
                    "type": "paragraph",
                    "content": [
                        {"type": "text", "text": "Line 2"}
                    ]
                }
            ]
        }
        # Expect "Hello World\nLine 2" (trimmed)
        result = service._parse_adf(adf)
        assert "Hello World" in result
        assert "Line 2" in result

    # --- API Interaction Tests ---

    @pytest.mark.asyncio
    async def test_validate_connection_success(self, service, mock_settings):
        """Test successful connection validation"""
        with patch.object(service, 'get_settings', return_value=mock_settings), \
             patch.object(service.encryption_service, 'decrypt', return_value="token"), \
             patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            
            mock_get.return_value.status_code = 200
            
            result = await service.validate_connection("default")
            assert result is True

    @pytest.mark.asyncio
    async def test_validate_connection_failure(self, service, mock_settings):
        """Test failed connection validation"""
        with patch.object(service, 'get_settings', return_value=mock_settings), \
             patch.object(service.encryption_service, 'decrypt', return_value="token"), \
             patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            
            mock_get.return_value.status_code = 401
            
            result = await service.validate_connection("default")
            assert result is False

    @pytest.mark.asyncio
    async def test_validate_connection_no_settings(self, service):
        """Test validation fails when no settings exist"""
        with patch.object(service, 'get_settings', return_value=None):
            result = await service.validate_connection("default")
            assert result is False

    @pytest.mark.asyncio
    async def test_fetch_ticket_success(self, service, mock_settings):
        """Test successful ticket fetching"""
        mock_response_data = {
            "key": "PROJ-123",
            "fields": {
                "summary": "Test Ticket",
                "description": "Test Description",
                "status": {"name": "In Progress"},
                "priority": {"name": "High"}
            }
        }

        with patch.object(service, 'get_settings', return_value=mock_settings), \
             patch.object(service.encryption_service, 'decrypt', return_value="token"), \
             patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            
            # Configure the mock response
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_response_data
            mock_get.return_value = mock_response
            
            result = await service.fetch_ticket("PROJ-123")
            
            assert result["key"] == "PROJ-123"
            assert result["summary"] == "Test Ticket"
            assert result["status"] == "In Progress"
            assert result["priority"] == "High"

    @pytest.mark.asyncio
    async def test_fetch_ticket_not_found(self, service, mock_settings):
        """Test fetching non-existent ticket"""
        with patch.object(service, 'get_settings', return_value=mock_settings), \
             patch.object(service.encryption_service, 'decrypt', return_value="token"), \
             patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            
            mock_get.return_value.status_code = 404
            
            with pytest.raises(ValueError, match="Ticket 'PROJ-123' not found"):
                await service.fetch_ticket("PROJ-123")

    @pytest.mark.asyncio
    async def test_fetch_ticket_auth_error(self, service, mock_settings):
        """Test fetching with invalid credentials"""
        with patch.object(service, 'get_settings', return_value=mock_settings), \
             patch.object(service.encryption_service, 'decrypt', return_value="token"), \
             patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            
            mock_get.return_value.status_code = 401
            
            with pytest.raises(ValueError, match="Authentication failed"):
                await service.fetch_ticket("PROJ-123")

    @pytest.mark.asyncio
    async def test_fetch_ticket_missing_settings(self, service):
        """Test fetching without settings raises error"""
        with patch.object(service, 'get_settings', return_value=None):
            with pytest.raises(ValueError, match="Jira settings not configured"):
                await service.fetch_ticket("PROJ-123")

    # --- Database Interaction Tests ---

    def test_save_settings_new(self, service):
        """Test saving new settings"""
        with patch("app.services.jira_service.Session") as mock_session_cls, \
             patch("app.services.jira_service.select") as mock_select:
            
            mock_session = mock_session_cls.return_value
            mock_session.__enter__.return_value = mock_session
            
            # Mock no existing settings
            mock_session.exec.return_value.first.return_value = None
            
            settings = service.save_settings(
                base_url="https://new.atlassian.net",
                email="new@example.com",
                api_token="token123"
            )
            
            # Verify add was called
            mock_session.add.assert_called_once()
            mock_session.commit.assert_called_once()
            mock_session.refresh.assert_called_once()
            
            # Verify settings object
            args = mock_session.add.call_args[0][0]
            assert isinstance(args, JiraSettings)
            assert args.base_url == "https://new.atlassian.net"
            assert args.email == "new@example.com"

    def test_save_settings_update(self, service):
        """Test updating existing settings"""
        existing_settings = JiraSettings(
            user_id="default",
            base_url="https://old.atlassian.net",
            email="old@example.com",
            api_token_encrypted="old_token"
        )
        
        with patch("app.services.jira_service.Session") as mock_session_cls, \
             patch("app.services.jira_service.select") as mock_select:
            
            mock_session = mock_session_cls.return_value
            mock_session.__enter__.return_value = mock_session
            
            # Mock existing settings
            mock_session.exec.return_value.first.return_value = existing_settings
            
            settings = service.save_settings(
                base_url="https://updated.atlassian.net",
                email="updated@example.com",
                api_token="new_token"
            )
            
            # Verify update
            assert existing_settings.base_url == "https://updated.atlassian.net"
            assert existing_settings.email == "updated@example.com"
            mock_session.commit.assert_called_once()
            mock_session.refresh.assert_called_once()

    def test_get_settings(self, service):
        """Test retrieving settings"""
        mock_settings = JiraSettings(user_id="default", email="test@example.com")
        
        with patch("app.services.jira_service.Session") as mock_session_cls, \
             patch("app.services.jira_service.select") as mock_select:
            
            mock_session = mock_session_cls.return_value
            mock_session.__enter__.return_value = mock_session
            
            mock_session.exec.return_value.first.return_value = mock_settings
            
            result = service.get_settings("default")
            
            assert result == mock_settings
            mock_session.exec.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
