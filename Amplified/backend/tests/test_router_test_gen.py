import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
async def test_config_endpoints(auth_client: AsyncClient):
    """Test saving and retrieving configuration"""
    # 1. Save config
    config_data = {
        "base_url": "https://test.atlassian.net",
        "email": "test@example.com",
        "api_token": "test-token"
    }
    response = await auth_client.post("/test-gen/config", json=config_data)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # 2. Get config
    response = await auth_client.get("/test-gen/config")
    assert response.status_code == 200
    data = response.json()
    assert data["configured"] is True
    assert data["base_url"] == "https://test.atlassian.net"
    assert data["email"] == "test@example.com"
    assert data["has_token"] is True

@pytest.mark.asyncio
async def test_fetch_ticket_mock(auth_client: AsyncClient):
    """Test fetching ticket with mocked Jira service"""
    with patch("app.routers.test_gen.jira_service.fetch_ticket") as mock_fetch:
        mock_fetch.return_value = {
            "key": "PROJ-123",
            "summary": "Test Ticket",
            "description": "Test Description",
            "status": "Open",
            "priority": "High"
        }
        
        response = await auth_client.post("/test-gen/fetch-ticket", json={"ticket_key": "PROJ-123"})
        assert response.status_code == 200
        data = response.json()
        assert data["key"] == "PROJ-123"
        assert data["summary"] == "Test Ticket"

@pytest.mark.asyncio
async def test_generate_test_cases_mock(auth_client: AsyncClient):
    """Test generating test cases with mocked LLM"""
    with patch("app.services.session_manager.session_manager.llm_service.generate_json") as mock_generate:
        mock_generate.return_value = {
            "test_cases": [
                {
                    "type": "positive",
                    "title": "Test 1",
                    "steps": ["Step 1"],
                    "expected_result": "Success"
                }
            ]
        }
        
        ticket_data = {
            "key": "PROJ-123",
            "summary": "Test Ticket",
            "description": "Test Description"
        }
        
        response = await auth_client.post("/test-gen/generate", json={"ticket_data": ticket_data})
        assert response.status_code == 200
        data = response.json()
        assert len(data["test_cases"]) == 1
        assert data["test_cases"][0]["title"] == "Test 1"

@pytest.mark.asyncio
async def test_save_and_history(auth_client: AsyncClient):
    """Test saving generation and retrieving history"""
    # 1. Save
    save_data = {
        "ticket_key": "PROJ-123",
        "ticket_title": "Test Ticket",
        "raw_story_data": {"key": "PROJ-123"},
        "generated_test_cases": {"test_cases": []}
    }
    response = await auth_client.post("/test-gen/save", json=save_data)
    assert response.status_code == 200
    gen_id = response.json()["id"]
    
    # 2. Get History
    response = await auth_client.get("/test-gen/history")
    assert response.status_code == 200
    history = response.json()
    assert len(history) > 0
    assert history[0]["id"] == gen_id
    
    # 3. Get Specific Generation
    response = await auth_client.get(f"/test-gen/{gen_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == gen_id
    assert data["ticket_key"] == "PROJ-123"
