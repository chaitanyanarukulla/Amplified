"""
Tests for File Processing Service
Validates file processing for PDF, Word, Excel, CSV, JSON, and text files
"""

import pytest
import json
from io import BytesIO
from app.services.file_processing_service import FileProcessingService


class TestFileProcessingService:
    """Test suite for FileProcessingService"""
    
    @pytest.fixture
    def service(self):
        """Create a FileProcessingService instance"""
        return FileProcessingService()
    
    @pytest.mark.asyncio
    async def test_process_text_file(self, service):
        """Test processing a plain text file"""
        text_content = "This is a test text file with some content.\nMultiple lines."
        file_bytes = text_content.encode('utf-8')
        
        result = await service.process_text(file_bytes)
        
        assert result == text_content
    
    @pytest.mark.asyncio
    async def test_process_text_file_with_unicode(self, service):
        """Test processing text file with unicode characters"""
        text_content = "Unicode test: 测试 🎉 über"
        file_bytes = text_content.encode('utf-8')
        
        result = await service.process_text(file_bytes)
        
        assert result == text_content
    
    @pytest.mark.asyncio
    async def test_process_text_file_empty(self, service):
        """Test processing empty text file"""
        file_bytes = b""
        
        result = await service.process_text(file_bytes)
        
        assert result == ""
    
    @pytest.mark.asyncio
    async def test_process_text_file_invalid_encoding(self, service):
        """Test processing text file with invalid encoding raises error"""
        # Invalid UTF-8 sequence
        file_bytes = b'\xff\xfe'
        
        with pytest.raises(ValueError, match="Failed to process text file"):
            await service.process_text(file_bytes)
    
    @pytest.mark.asyncio
    async def test_process_json_import_valid(self, service):
        """Test importing valid JSON data"""
        json_data = {
            "test_cases": [
                {"id": 1, "name": "Test Case 1"},
                {"id": 2, "name": "Test Case 2"}
            ],
            "metadata": {"version": "1.0"}
        }
        file_bytes = json.dumps(json_data).encode('utf-8')
        
        result = await service.process_json_import(file_bytes)
        
        assert result == json_data
        assert "test_cases" in result
        assert len(result["test_cases"]) == 2
    
    @pytest.mark.asyncio
    async def test_process_json_import_empty_object(self, service):
        """Test importing empty JSON object"""
        json_data = {}
        file_bytes = json.dumps(json_data).encode('utf-8')
        
        result = await service.process_json_import(file_bytes)
        
        assert result == {}
    
    @pytest.mark.asyncio
    async def test_process_json_import_array(self, service):
        """Test importing JSON array"""
        json_data = [1, 2, 3, "test"]
        file_bytes = json.dumps(json_data).encode('utf-8')
        
        result = await service.process_json_import(file_bytes)
        
        assert result == json_data
    
    @pytest.mark.asyncio
    async def test_process_json_import_invalid(self, service):
        """Test importing invalid JSON raises error"""
        file_bytes = b"This is not valid JSON {invalid}"
        
        with pytest.raises(ValueError, match="Failed to process JSON"):
            await service.process_json_import(file_bytes)
    
    @pytest.mark.asyncio
    async def test_process_pdf_simple(self, service):
        """Test PDF processing with minimal valid PDF"""
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
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF) Tj
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
409
%%EOF
"""
        
        result = await service.process_pdf(pdf_content)
        
        # Just verify it returns a string and doesn't crash
        assert isinstance(result, str)
    
    @pytest.mark.asyncio
    async def test_process_pdf_invalid(self, service):
        """Test PDF processing with invalid PDF raises error"""
        invalid_pdf = b"This is not a PDF file"
        
        with pytest.raises(ValueError, match="Failed to process PDF"):
            await service.process_pdf(invalid_pdf)
    
    @pytest.mark.asyncio
    async def test_process_word_invalid(self, service):
        """Test Word processing with invalid DOCX raises error"""
        invalid_docx = b"This is not a Word document"
        
        with pytest.raises(ValueError, match="Failed to process Word document"):
            await service.process_word(invalid_docx)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
