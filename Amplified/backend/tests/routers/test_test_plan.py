import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from sqlmodel import Session, SQLModel, create_engine
from app.main import app
from app.database import get_session
from app.models import User, ConfluenceSettings
from app.auth_dependencies import get_current_user

# Setup in-memory DB for testing
engine = create_engine("sqlite:///:memory:")

@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session
    
    app.dependency_overrides[get_session] = get_session_override
    
    # Mock auth
    mock_user = User(id="test-user-id", email="test@example.com", password_hash="hash")
    session.add(mock_user)
    session.commit()
    
    app.dependency_overrides[get_current_user] = lambda: mock_user
    
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

def test_save_config(client, session):
    response = client.post("/test-plan/config", json={
        "base_url": "https://test.atlassian.net",
        "username": "test@example.com",
        "api_token": "secret-token"
    })
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Verify in DB
    settings = session.query(ConfluenceSettings).first()
    assert settings.base_url == "https://test.atlassian.net"
    assert settings.username == "test@example.com"

def test_get_config(client, session):
    # Pre-seed config
    settings = ConfluenceSettings(
        user_id="test-user-id",
        base_url="https://test.atlassian.net",
        username="test@example.com",
        api_token_encrypted="encrypted-token"
    )
    session.add(settings)
    session.commit()
    
    response = client.get("/test-plan/config")
    assert response.status_code == 200
    data = response.json()
    assert data["configured"] is True
    assert data["base_url"] == "https://test.atlassian.net"
    assert data["has_token"] is True
    assert "api_token" not in data # Should be masked

@patch("app.services.confluence_service.ConfluenceService.validate_connection")
def test_validate_connection(mock_validate, client):
    mock_validate.return_value = True
    response = client.post("/test-plan/validate")
    assert response.status_code == 200
    assert response.json()["valid"] is True

@patch("app.services.confluence_service.ConfluenceService.resolve_page_id_from_url")
@patch("app.services.confluence_service.ConfluenceService.get_page_content")
@patch("app.services.llm_service.LLMService.generate_text")
def test_generate_from_confluence(mock_llm, mock_get_content, mock_resolve, client):
    mock_resolve.return_value = "12345"
    mock_get_content.return_value = {"body": "Test content", "title": "Test Page"}
    mock_llm.return_value = "# Test Plan\n\nGenerated content"
    
    response = client.post("/test-plan/generate/confluence", json={
        "page_url": "https://test.atlassian.net/wiki/pages/viewpage.action?pageId=12345",
        "output_type": "test_plan",
        "test_levels": ["System"]
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "# Test Plan\n\nGenerated content"
    assert "id" in data

@patch("app.services.file_processing_service.FileProcessingService.process_text")
@patch("app.services.llm_service.LLMService.generate_text")
def test_generate_from_document(mock_llm, mock_process_text, client):
    mock_process_text.return_value = "Document content"
    mock_llm.return_value = "# Test Strategy\n\nGenerated strategy"
    
    files = {'file': ('test.txt', b'Document content', 'text/plain')}
    response = client.post(
        "/test-plan/generate/document",
        files=files,
        data={"output_type": "test_strategy"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "# Test Strategy\n\nGenerated strategy"
