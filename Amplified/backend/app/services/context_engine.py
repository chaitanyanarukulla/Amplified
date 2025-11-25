"""
Context Engine - Document Management and Context Injection
Handles resume, job descriptions, and pinned notes
"""

import logging
from typing import Dict, Optional
import PyPDF2
import docx
import io

logger = logging.getLogger(__name__)


class ContextEngine:
    """Manages interview context (resume, JD, notes)"""
    
    def __init__(self):
        self.documents: Dict[str, str] = {
            "resume": "",
            "job_description": "",
            "pinned_notes": "",
            "mock_context": ""
        }
    
    async def parse_document(self, content: bytes, filename: str) -> str:
        """
        Parse document content based on file type
        
        Args:
            content: Raw file bytes
            filename: Original filename with extension
        
        Returns:
            Extracted text content
        """
        try:
            if filename.lower().endswith('.pdf'):
                return self._parse_pdf(content)
            elif filename.lower().endswith('.docx'):
                return self._parse_docx(content)
            elif filename.lower().endswith('.txt'):
                return content.decode('utf-8')
            else:
                raise ValueError(f"Unsupported file type: {filename}")
        
        except Exception as e:
            logger.error(f"Document parsing failed: {str(e)}")
            raise
    
    def _parse_pdf(self, content: bytes) -> str:
        """Extract text from PDF"""
        try:
            pdf_file = io.BytesIO(content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            return text.strip()
        
        except Exception as e:
            logger.error(f"PDF parsing failed: {str(e)}")
            raise ValueError(f"Failed to parse PDF: {str(e)}")
    
    def _parse_docx(self, content: bytes) -> str:
        """Extract text from DOCX"""
        try:
            docx_file = io.BytesIO(content)
            doc = docx.Document(docx_file)
            
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            return text.strip()
        
        except Exception as e:
            logger.error(f"DOCX parsing failed: {str(e)}")
            raise ValueError(f"Failed to parse DOCX: {str(e)}")
    
    async def add_document(self, doc_type: str, content: str):
        """
        Store parsed document content
        
        Args:
            doc_type: "resume", "job_description", or "pinned_notes"
            content: Parsed text content
        """
        if doc_type not in self.documents:
            raise ValueError(f"Invalid document type: {doc_type}")
        
        self.documents[doc_type] = content
        logger.info(f"Document added: {doc_type} ({len(content)} characters)")
    
    async def update_pinned_notes(self, notes: str):
        """Update pinned notes"""
        self.documents["pinned_notes"] = notes
        logger.info(f"Pinned notes updated ({len(notes)} characters)")
    
    async def get_full_context(self) -> Dict[str, str]:
        """
        Get all context for LLM injection
        
        Returns:
            Dictionary with resume, job_description, and pinned_notes
        """
        return {
            "resume": self.documents["resume"] or "No resume uploaded",
            "job_description": self.documents["job_description"] or "No job description uploaded",
            "pinned_notes": self.documents["pinned_notes"] or "",
            "mock_context": self.documents.get("mock_context", "")
        }
    
    def get_context_summary(self) -> Dict[str, int]:
        """Get summary of loaded context"""
        return {
            "resume_length": len(self.documents["resume"]),
            "jd_length": len(self.documents["job_description"]),
            "notes_length": len(self.documents["pinned_notes"]),
            "has_resume": bool(self.documents["resume"]),
            "has_jd": bool(self.documents["job_description"]),
            "has_notes": bool(self.documents["pinned_notes"])
        }
