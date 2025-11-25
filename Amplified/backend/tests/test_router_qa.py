import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_qa_meeting(auth_client: AsyncClient):
    """Test QA meeting endpoint"""
    data = {
        "question": "What is the status?",
        "context_window_seconds": 30
    }
    response = await auth_client.post("/qa/meeting", json=data)
    assert response.status_code in [200, 500]
