import pytest
from httpx import AsyncClient
import os
from unittest.mock import patch, MagicMock
from app.models import DocumentAnalysisResponse

@pytest.mark.asyncio
async def test_upload_document(auth_client: AsyncClient, temp_file: str):
    """
    Test uploading a document for analysis.
    """
    # Overwrite temp file with larger content to pass length check
    with open(temp_file, "w") as f:
        f.write("This is a dummy file content for testing. " * 10)  # > 100 chars

    with open(temp_file, "rb") as f:
        files = {"file": (os.path.basename(temp_file), f, "text/plain")}
        response = await auth_client.post("/doc-analyzer/upload", files=files)
    
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["name"] == os.path.basename(temp_file)
    assert data["analysis_status"] == "pending"
    
    return data["id"]

@pytest.mark.asyncio
async def test_analyze_document(auth_client: AsyncClient, temp_file: str):
    """
    Test triggering analysis for a document.
    """
    # 1. Upload first
    with open(temp_file, "rb") as f:
        files = {"file": (os.path.basename(temp_file), f, "text/plain")}
        upload_res = await auth_client.post("/doc-analyzer/upload", files=files)
    
    doc_id = upload_res.json()["id"]
    
    # 2. Mock the analysis service method
    # We mock the service method directly to avoid complex LLM mocking
    from datetime import datetime
    mock_analysis = DocumentAnalysisResponse(
        id="analysis_123",
        document_id=doc_id,
        model_version="test_model",
        structured_summary='{"purpose": "Test Purpose"}',
        risk_assessment='{"risks": []}',
        gaps_and_questions='{"gaps": []}',
        qa_report='{"test_cases": []}',
        overall_risk_level="Low",
        analysis_duration_seconds=1.5,
        created_at=datetime.now()
    )
    
    with patch("app.services.doc_analyzer_service.doc_analyzer_service.analyze_document", return_value=mock_analysis) as mock_method:
        response = await auth_client.post(f"/doc-analyzer/analyze/{doc_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["document_id"] == doc_id
        assert "structured_summary" in data
        assert "Test Purpose" in data["structured_summary"]
        
        mock_method.assert_called_once()

@pytest.mark.asyncio
async def test_get_document_details(auth_client: AsyncClient, temp_file: str):
    """
    Test retrieving document details.
    """
    # 1. Upload
    with open(temp_file, "rb") as f:
        files = {"file": (os.path.basename(temp_file), f, "text/plain")}
        upload_res = await auth_client.post("/doc-analyzer/upload", files=files)
    doc_id = upload_res.json()["id"]
    
    # 2. Get details
    response = await auth_client.get(f"/doc-analyzer/documents/{doc_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == doc_id
    assert data["name"] == os.path.basename(temp_file)

@pytest.mark.asyncio
async def test_list_documents(auth_client: AsyncClient, temp_file: str):
    """
    Test listing documents.
    """
    # 1. Upload
    with open(temp_file, "rb") as f:
        files = {"file": (os.path.basename(temp_file), f, "text/plain")}
        await auth_client.post("/doc-analyzer/upload", files=files)
    
    # 2. List
    response = await auth_client.get("/doc-analyzer/documents")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Check if our uploaded doc is in the list
    found = any(d["name"] == os.path.basename(temp_file) for d in data)
    assert found

@pytest.mark.asyncio
async def test_delete_document(auth_client: AsyncClient, temp_file: str):
    """
    Test deleting a document.
    """
    # 1. Upload
    with open(temp_file, "rb") as f:
        files = {"file": (os.path.basename(temp_file), f, "text/plain")}
        upload_res = await auth_client.post("/doc-analyzer/upload", files=files)
    doc_id = upload_res.json()["id"]
    
    # 2. Delete
    response = await auth_client.delete(f"/doc-analyzer/documents/{doc_id}")
    assert response.status_code == 200
    
    # 3. Verify deletion
    get_res = await auth_client.get(f"/doc-analyzer/documents/{doc_id}")
    assert get_res.status_code == 404
