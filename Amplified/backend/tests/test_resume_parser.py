"""
Tests for Resume Parser Service
Validates resume parsing from PDF and DOCX files
"""

import pytest
from app.services.resume_parser import ResumeParser


class TestResumeParser:
    """Test suite for ResumeParser"""
    
    @pytest.fixture
    def parser(self):
        """Create a ResumeParser instance"""
        return ResumeParser()
    
    @pytest.mark.asyncio
    async def test_parse_pdf_resume(self, parser):
        """Test parsing a valid PDF resume"""
        # Create a minimal valid PDF
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>
endobj
4 0 obj
<< /Length 88 >>
stream
BT
/F1 12 Tf
100 700 Td
(John Doe) Tj
0 -20 Td
(Software Engineer) Tj
0 -20 Td
(Python, JavaScript) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000317 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
453
%%EOF
"""
        
        result = await parser.parse_resume(pdf_content, "resume.pdf")
        
        assert isinstance(result, str)
        assert len(result) > 0
    
    @pytest.mark.asyncio
    async def test_parse_pdf_with_uppercase_extension(self, parser):
        """Test parsing PDF with uppercase extension"""
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
        
        result = await parser.parse_resume(pdf_content, "RESUME.PDF")
        
        assert isinstance(result, str)
    
    @pytest.mark.asyncio
    async def test_parse_invalid_pdf(self, parser):
        """Test parsing invalid PDF raises error"""
        invalid_pdf = b"This is not a PDF file"
        
        with pytest.raises(ValueError, match="Could not parse PDF file"):
            await parser.parse_resume(invalid_pdf, "resume.pdf")
    
    @pytest.mark.asyncio
    async def test_parse_invalid_docx(self, parser):
        """Test parsing invalid DOCX raises error"""
        invalid_docx = b"This is not a DOCX file"
        
        with pytest.raises(ValueError, match="Could not parse DOCX file"):
            await parser.parse_resume(invalid_docx, "resume.docx")
    
    @pytest.mark.asyncio
    async def test_parse_unsupported_format(self, parser):
        """Test parsing unsupported file format raises error"""
        content = b"Some content"
        
        with pytest.raises(ValueError, match="Unsupported file format"):
            await parser.parse_resume(content, "resume.txt")
    
    @pytest.mark.asyncio
    async def test_parse_unsupported_format_various_extensions(self, parser):
        """Test various unsupported file formats"""
        content = b"Some content"
        unsupported_files = [
            "resume.doc",
            "resume.rtf",
            "resume.odt",
            "resume.jpg",
            "resume"
        ]
        
        for filename in unsupported_files:
            with pytest.raises(ValueError, match="Unsupported file format"):
                await parser.parse_resume(content, filename)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
