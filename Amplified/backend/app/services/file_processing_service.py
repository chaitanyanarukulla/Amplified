from typing import Dict, List, Any
import logging
from pypdf import PdfReader
from docx import Document
import pandas as pd
import json

logger = logging.getLogger(__name__)

class FileProcessingService:
    
    async def process_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF"""
        try:
            from io import BytesIO
            pdf_file = BytesIO(file_content)
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"PDF processing error: {e}")
            raise ValueError(f"Failed to process PDF: {str(e)}")
    
    async def process_word(self, file_content: bytes) -> str:
        """Extract text from Word document"""
        try:
            from io import BytesIO
            doc_file = BytesIO(file_content)
            doc = Document(doc_file)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text.strip()
        except Exception as e:
            logger.error(f"Word processing error: {e}")
            raise ValueError(f"Failed to process Word document: {str(e)}")
    
    async def process_excel_batch(self, file_content: bytes) -> List[str]:
        """Extract Jira ticket IDs from Excel/CSV"""
        try:
            from io import BytesIO
            df = pd.read_excel(BytesIO(file_content)) if file_content.startswith(b'PK') else pd.read_csv(BytesIO(file_content))
            
            # Look for columns containing ticket IDs
            ticket_ids = []
            for col in df.columns:
                if any(keyword in str(col).lower() for keyword in ['ticket', 'id', 'key', 'jira']):
                    ticket_ids.extend(df[col].dropna().astype(str).tolist())
            
            # If no specific column found, try first column
            if not ticket_ids and len(df.columns) > 0:
                ticket_ids = df[df.columns[0]].dropna().astype(str).tolist()
            
            # Filter for valid Jira ticket format
            import re
            valid_tickets = [t.strip() for t in ticket_ids if re.match(r'^[A-Z][A-Z0-9]+-\d+$', t.strip())]
            
            return valid_tickets
        except Exception as e:
            logger.error(f"Excel processing error: {e}")
            raise ValueError(f"Failed to process Excel file: {str(e)}")
    
    async def process_json_import(self, file_content: bytes) -> Dict[str, Any]:
        """Import test cases from JSON"""
        try:
            data = json.loads(file_content.decode('utf-8'))
            return data
        except Exception as e:
            logger.error(f"JSON processing error: {e}")
            raise ValueError(f"Failed to process JSON: {str(e)}")
    
    async def process_text(self, file_content: bytes) -> str:
        """Extract text from text file"""
        try:
            return file_content.decode('utf-8').strip()
        except Exception as e:
            logger.error(f"Text processing error: {e}")
            raise ValueError(f"Failed to process text file: {str(e)}")
