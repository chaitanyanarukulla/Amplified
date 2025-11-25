import logging
import io
from typing import Dict, Any
from PyPDF2 import PdfReader
from docx import Document

logger = logging.getLogger(__name__)

class ResumeParser:
    def __init__(self):
        pass

    async def parse_resume(self, file_content: bytes, filename: str) -> str:
        """
        Parse resume content from PDF or DOCX
        Returns extracted text
        """
        try:
            if filename.lower().endswith('.pdf'):
                return self._parse_pdf(file_content)
            elif filename.lower().endswith('.docx'):
                return self._parse_docx(file_content)
            else:
                raise ValueError("Unsupported file format. Please upload PDF or DOCX.")
        except Exception as e:
            logger.error(f"Error parsing resume: {e}")
            raise

    def _parse_pdf(self, content: bytes) -> str:
        try:
            reader = PdfReader(io.BytesIO(content))
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            logger.error(f"PDF parsing error: {e}")
            raise ValueError("Could not parse PDF file")

    def _parse_docx(self, content: bytes) -> str:
        try:
            doc = Document(io.BytesIO(content))
            text = ""
            for para in doc.paragraphs:
                text += para.text + "\n"
            return text
        except Exception as e:
            logger.error(f"DOCX parsing error: {e}")
            raise ValueError("Could not parse DOCX file")
