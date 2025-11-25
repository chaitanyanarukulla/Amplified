"""
Tests for Document Analyzer Service
Validates document upload, analysis pipeline, and management
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch, Mock
from datetime import datetime
from fastapi import UploadFile
from app.services.doc_analyzer_service import DocumentAnalyzerService
from app.models import (
    AnalyzedDocument, DocumentAnalysis, AnalysisStatus, 
    AnalyzedDocFileType, DetectedDocType
)

class TestDocumentAnalyzerService:
    """Test suite for DocumentAnalyzerService"""
    
    @pytest.fixture
    def service(self):
        """Create service instance with mocked dependencies"""
        with patch("app.services.doc_analyzer_service.FileProcessingService") as mock_file_service_cls:
            service = DocumentAnalyzerService()
            # Create a mock instance
            mock_instance = mock_file_service_cls.return_value
            # Configure async methods
            mock_instance.process_pdf = AsyncMock()
            mock_instance.process_word = AsyncMock()
            mock_instance.process_text = AsyncMock()
            
            service.file_service = mock_instance
            return service

    @pytest.fixture
    def mock_session(self):
        """Mock database session"""
        with patch("app.services.doc_analyzer_service.Session") as mock_session_cls:
            session = mock_session_cls.return_value
            session.__enter__.return_value = session
            yield session

    # --- Upload Tests ---

    @pytest.mark.asyncio
    async def test_upload_document_success(self, service, mock_session):
        """Test successful document upload"""
        # Mock file
        mock_file = AsyncMock(spec=UploadFile)
        mock_file.filename = "test.pdf"
        mock_file.read.return_value = b"content"
        
        # Mock text extraction
        service.file_service.process_pdf.return_value = "This is a valid test document with sufficient length for analysis." * 5
        
        # Mock DB add
        def side_effect_add(obj):
            if isinstance(obj, AnalyzedDocument):
                obj.id = "doc_123"
        mock_session.add.side_effect = side_effect_add
        
        result = await service.upload_document(mock_file, "user1")
        
        assert result.id == "doc_123"
        assert result.file_type == AnalyzedDocFileType.PDF
        assert result.analysis_status == AnalysisStatus.PENDING
        mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_document_size_limit(self, service):
        """Test file size limit validation"""
        mock_file = AsyncMock(spec=UploadFile)
        mock_file.filename = "large.pdf"
        # Mock 11MB content
        mock_file.read.return_value = b"0" * (11 * 1024 * 1024)
        
        with pytest.raises(ValueError, match="exceeds limit"):
            await service.upload_document(mock_file, "user1")

    @pytest.mark.asyncio
    async def test_upload_document_invalid_type(self, service):
        """Test unsupported file type"""
        mock_file = AsyncMock(spec=UploadFile)
        mock_file.filename = "test.exe"
        mock_file.read.return_value = b"content"
        
        with pytest.raises(ValueError, match="Unsupported file type"):
            await service.upload_document(mock_file, "user1")

    @pytest.mark.asyncio
    async def test_upload_document_empty_text(self, service):
        """Test empty extracted text validation"""
        mock_file = AsyncMock(spec=UploadFile)
        mock_file.filename = "empty.pdf"
        mock_file.read.return_value = b"content"
        
        service.file_service.process_pdf.return_value = ""
        
        with pytest.raises(ValueError, match="Document appears to be empty"):
            await service.upload_document(mock_file, "user1")

    # --- Analysis Pipeline Tests ---

    @pytest.mark.asyncio
    async def test_analyze_document_success(self, service, mock_session):
        """Test full analysis pipeline"""
        # Mock existing document
        mock_doc = AnalyzedDocument(
            id="doc_123", 
            user_id="user1", 
            extracted_text="Valid text content",
            analysis_status=AnalysisStatus.PENDING
        )
        mock_session.exec.return_value.first.return_value = mock_doc
        mock_session.get.return_value = mock_doc
        
        # Mock analysis engines
        # We patch the source module directly
        with patch("app.services.analysis_engines.generate_structured_summary") as mock_summary, \
             patch("app.services.analysis_engines.assess_risks") as mock_risks, \
             patch("app.services.analysis_engines.detect_gaps_and_ambiguities") as mock_gaps, \
             patch("app.services.analysis_engines.generate_qa_report") as mock_qa, \
             patch("app.services.llm_router.llm_router") as mock_router:
            
            # Configure async mocks
            mock_summary.side_effect = AsyncMock(return_value={"purpose": "Test"})
            mock_risks.side_effect = AsyncMock(return_value={"overall_risk_level": "Low"})
            mock_gaps.side_effect = AsyncMock(return_value={"gaps": []})
            mock_qa.side_effect = AsyncMock(return_value={"feature_summary": "Test"})
            
            mock_router.get_user_engine.return_value = "gpt-4"
            
            result = await service.analyze_document("doc_123", "user1")
            
            assert isinstance(result, DocumentAnalysis)
            assert result.document_id == "doc_123"
            assert result.overall_risk_level == "Low"
            assert mock_doc.analysis_status == AnalysisStatus.COMPLETED
            
            # Verify all stages called
            mock_summary.assert_called_once()
            mock_risks.assert_called_once()
            mock_gaps.assert_called_once()
            mock_qa.assert_called_once()

    @pytest.mark.asyncio
    async def test_analyze_document_not_found(self, service, mock_session):
        """Test analysis on non-existent document"""
        mock_session.exec.return_value.first.return_value = None
        
        with pytest.raises(ValueError, match="Document not found"):
            await service.analyze_document("doc_999", "user1")

    @pytest.mark.asyncio
    async def test_analyze_document_failure(self, service, mock_session):
        """Test analysis failure handling"""
        mock_doc = AnalyzedDocument(
            id="doc_123", 
            user_id="user1", 
            extracted_text="Text",
            analysis_status=AnalysisStatus.PENDING
        )
        mock_session.exec.return_value.first.return_value = mock_doc
        mock_session.get.return_value = mock_doc
        
        with patch("app.services.analysis_engines.generate_structured_summary") as mock_summary:
            # Simulate error in first stage
            mock_summary.side_effect = Exception("Analysis Error")
            
            with pytest.raises(Exception, match="Analysis Error"):
                await service.analyze_document("doc_123", "user1")
            
            # Verify status updated to FAILED
            assert mock_doc.analysis_status == AnalysisStatus.FAILED
            assert "Analysis Error" in mock_doc.error_message

    # --- CRUD Tests ---

    def test_get_document(self, service, mock_session):
        """Test get document"""
        mock_doc = AnalyzedDocument(id="doc_1", user_id="user1")
        mock_session.exec.return_value.first.return_value = mock_doc
        
        result = service.get_document("doc_1", "user1")
        assert result == mock_doc

    def test_list_documents(self, service, mock_session):
        """Test listing documents"""
        mock_docs = [AnalyzedDocument(id="doc_1"), AnalyzedDocument(id="doc_2")]
        mock_session.exec.return_value.all.return_value = mock_docs
        
        result = service.list_documents("user1")
        assert len(result) == 2

    def test_delete_document(self, service, mock_session):
        """Test deleting document"""
        mock_doc = AnalyzedDocument(id="doc_1", user_id="user1")
        mock_session.exec.return_value.first.return_value = mock_doc
        
        service.delete_document("doc_1", "user1")
        
        mock_session.delete.assert_called()
        mock_session.commit.assert_called_once()

    # --- Helper Tests ---

    def test_detect_document_type(self, service):
        """Test document type detection heuristic"""
        assert service._detect_document_type("business requirement stakeholder roi") == DetectedDocType.BRD
        assert service._detect_document_type("user story acceptance criteria") == DetectedDocType.PRD
        assert service._detect_document_type("api specification database schema") == DetectedDocType.DESIGN
        assert service._detect_document_type("random text content") == DetectedDocType.UNKNOWN


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
