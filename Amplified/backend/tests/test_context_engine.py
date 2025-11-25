"""
Tests for Context Engine
Validates document management and context injection functionality
"""

import pytest
from app.services.context_engine import ContextEngine


class TestContextEngine:
    """Test suite for ContextEngine"""
    
    @pytest.fixture
    def engine(self):
        """Create a ContextEngine instance"""
        return ContextEngine()
    
    @pytest.mark.asyncio
    async def test_initialization(self, engine):
        """Test engine initializes with empty documents"""
        assert engine.documents["resume"] == ""
        assert engine.documents["job_description"] == ""
        assert engine.documents["pinned_notes"] == ""
        assert engine.documents["mock_context"] == ""
    
    @pytest.mark.asyncio
    async def test_add_resume_document(self, engine):
        """Test adding resume content"""
        resume_text = "John Doe\nSoftware Engineer\n5 years experience"
        
        await engine.add_document("resume", resume_text)
        
        assert engine.documents["resume"] == resume_text
    
    @pytest.mark.asyncio
    async def test_add_job_description_document(self, engine):
        """Test adding job description content"""
        jd_text = "Senior Engineer position\nRequires Python and AWS"
        
        await engine.add_document("job_description", jd_text)
        
        assert engine.documents["job_description"] == jd_text
    
    @pytest.mark.asyncio
    async def test_add_invalid_document_type(self, engine):
        """Test adding document with invalid type raises error"""
        with pytest.raises(ValueError, match="Invalid document type"):
            await engine.add_document("invalid_type", "content")
    
    @pytest.mark.asyncio
    async def test_update_pinned_notes(self, engine):
        """Test updating pinned notes"""
        notes = "Important: Focus on system design questions"
        
        await engine.update_pinned_notes(notes)
        
        assert engine.documents["pinned_notes"] == notes
    
    @pytest.mark.asyncio
    async def test_get_full_context_empty(self, engine):
        """Test getting context when no documents loaded"""
        context = await engine.get_full_context()
        
        assert context["resume"] == "No resume uploaded"
        assert context["job_description"] == "No job description uploaded"
        assert context["pinned_notes"] == ""
    
    @pytest.mark.asyncio
    async def test_get_full_context_with_documents(self, engine):
        """Test getting context with loaded documents"""
        await engine.add_document("resume", "Resume content")
        await engine.add_document("job_description", "JD content")
        await engine.update_pinned_notes("Notes content")
        
        context = await engine.get_full_context()
        
        assert context["resume"] == "Resume content"
        assert context["job_description"] == "JD content"
        assert context["pinned_notes"] == "Notes content"
    
    def test_get_context_summary_empty(self, engine):
        """Test context summary when empty"""
        summary = engine.get_context_summary()
        
        assert summary["resume_length"] == 0
        assert summary["jd_length"] == 0
        assert summary["notes_length"] == 0
        assert summary["has_resume"] is False
        assert summary["has_jd"] is False
        assert summary["has_notes"] is False
    
    @pytest.mark.asyncio
    async def test_get_context_summary_with_content(self, engine):
        """Test context summary with loaded content"""
        await engine.add_document("resume", "Test resume")
        await engine.add_document("job_description", "Test JD")
        
        summary = engine.get_context_summary()
        
        assert summary["resume_length"] == 11
        assert summary["jd_length"] == 7
        assert summary["has_resume"] is True
        assert summary["has_jd"] is True
        assert summary["has_notes"] is False
    
    @pytest.mark.asyncio
    async def test_parse_text_document(self, engine):
        """Test parsing plain text document"""
        content = b"This is a test document"
        
        result = await engine.parse_document(content, "document.txt")
        
        assert result == "This is a test document"
    
    @pytest.mark.asyncio
    async def test_parse_unsupported_format(self, engine):
        """Test parsing unsupported file format raises error"""
        content = b"Some content"
        
        with pytest.raises(ValueError, match="Unsupported file type"):
            await engine.parse_document(content, "document.xyz")
    
    @pytest.mark.asyncio
    async def test_parse_pdf_document(self, engine):
        """Test parsing PDF document"""
        # Minimal valid PDF
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 0 >>
stream
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000217 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
265
%%EOF
"""
        
        result = await engine.parse_document(pdf_content, "test.pdf")
        
        assert isinstance(result, str)
    
    @pytest.mark.asyncio
    async def test_parse_invalid_pdf(self, engine):
        """Test parsing invalid PDF raises error"""
        invalid_pdf = b"Not a PDF"
        
        with pytest.raises(ValueError, match="Failed to parse PDF"):
            await engine.parse_document(invalid_pdf, "test.pdf")
    
    @pytest.mark.asyncio
    async def test_parse_invalid_docx(self, engine):
        """Test parsing invalid DOCX raises error"""
        invalid_docx = b"Not a DOCX"
        
        with pytest.raises(ValueError, match="Failed to parse DOCX"):
            await engine.parse_document(invalid_docx, "test.docx")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
