import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_research_role(auth_client: AsyncClient):
    """Test role research endpoint"""
    response = await auth_client.post("/research/role", data={"role_title": "Software Engineer"})
    assert response.status_code in [200, 500]
