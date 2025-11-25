"""
Test Neural Engine Selection API
Tests the /neural-engine endpoint with various scenarios
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from app.models import User
from app.services.auth_service import create_access_token
from app.database import engine
from sqlmodel import Session, select
from app.models import UserLLMPreference

client = TestClient(app)


@pytest.fixture
def test_user_token():
    """Create a test user and return auth token"""
    # Create test user
    with Session(engine) as session:
        # Check if test user exists
        statement = select(User).where(User.email == "test_neural@example.com")
        existing_user = session.exec(statement).first()
        
        if existing_user:
            user = existing_user
        else:
            from app.services.auth_service import get_password_hash
            user = User(
                email="test_neural@example.com",
                password_hash=get_password_hash("testpass123"),
                name="Test User"
            )
            session.add(user)
            session.commit()
            session.refresh(user)
    
    # Generate token
    token = create_access_token(data={"sub": user.id})
    return token, user.id


def test_get_default_engine(test_user_token):
    """Test getting default engine preference"""
    token, user_id = test_user_token
    
    response = client.get(
        "/neural-engine",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "selected_engine" in data
    assert data["selected_engine"] in ["openai_gpt4o", "local_llm", "claude_3_5_sonnet"]


def test_set_valid_engine(test_user_token):
    """Test setting a valid engine (OpenAI - should always be configured)"""
    token, user_id = test_user_token
    
    response = client.post(
        "/neural-engine",
        headers={"Authorization": f"Bearer {token}"},
        json={"selected_engine": "openai_gpt4o"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["selected_engine"] == "openai_gpt4o"
    
    # Verify it was saved
    response = client.get(
        "/neural-engine",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["selected_engine"] == "openai_gpt4o"


def test_set_invalid_engine(test_user_token):
    """Test setting an invalid engine name"""
    token, user_id = test_user_token
    
    response = client.post(
        "/neural-engine",
        headers={"Authorization": f"Bearer {token}"},
        json={"selected_engine": "invalid_engine"}
    )
    
    assert response.status_code == 400
    assert "Invalid engine" in response.json()["detail"]


def test_set_unconfigured_engine(test_user_token):
    """Test setting an engine that's not configured (Claude or Local LLM)"""
    token, user_id = test_user_token
    
    # Try to set Local LLM (likely not running in test environment)
    response = client.post(
        "/neural-engine",
        headers={"Authorization": f"Bearer {token}"},
        json={"selected_engine": "local_llm"}
    )
    
    # Should return 400 with helpful error message, not 500
    if response.status_code != 200:
        assert response.status_code == 400
        error_detail = response.json()["detail"]
        assert "Ollama" in error_detail or "connect" in error_detail.lower()


def test_unauthorized_access():
    """Test accessing endpoint without authentication"""
    response = client.get("/neural-engine")
    assert response.status_code == 403  # FastAPI returns 403 for missing credentials


def test_engine_persistence(test_user_token):
    """Test that engine preference persists across requests"""
    token, user_id = test_user_token
    
    # Set engine
    client.post(
        "/neural-engine",
        headers={"Authorization": f"Bearer {token}"},
        json={"selected_engine": "openai_gpt4o"}
    )
    
    # Get engine multiple times
    for _ in range(3):
        response = client.get(
            "/neural-engine",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert response.json()["selected_engine"] == "openai_gpt4o"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
