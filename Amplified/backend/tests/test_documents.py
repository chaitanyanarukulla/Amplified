import pytest
from httpx import AsyncClient
import os

@pytest.mark.asyncio
async def test_upload_document(auth_client: AsyncClient, temp_file: str):
    """
    Test uploading a valid document.
    """
    with open(temp_file, "rb") as f:
        files = {"file": (os.path.basename(temp_file), f, "text/plain")}
        data = {"type": "spec", "tags": "test_tag"}
        response = await auth_client.post("/documents", files=files, data=data)
    
    assert response.status_code == 200
    res_data = response.json()
    assert "id" in res_data
    assert res_data["name"] == os.path.basename(temp_file)
    
    # Store ID for cleanup/search test if we were chaining, 
    # but tests should be independent. We'll rely on the service logic.

@pytest.mark.asyncio
async def test_upload_document_missing_type(auth_client: AsyncClient, temp_file: str):
    """
    Test uploading without the required 'type' field.
    """
    with open(temp_file, "rb") as f:
        files = {"file": (os.path.basename(temp_file), f, "text/plain")}
        # Missing 'type' in data
        response = await auth_client.post("/documents", files=files, data={})
    
    # FastAPI should return 422 Unprocessable Entity for missing Form field
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_search_documents(auth_client: AsyncClient):
    """
    Test searching for documents.
    """
    # Search should return 200 even if empty
    response = await auth_client.post("/documents/search", data={"query": "test", "limit": 5})
    assert response.status_code == 200
    assert isinstance(response.json(), list)
