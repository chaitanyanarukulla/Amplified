import os
import uuid
import structlog
from typing import List, Optional
from datetime import datetime
from fastapi import UploadFile
from sqlmodel import Session, select
from pypdf import PdfReader
from docx import Document as DocxDocument

from app.models import Document, DocumentType
from app.database import engine
from app.services.vector_store_service import VectorStoreService, SearchableEntity

logger = structlog.get_logger(__name__)

class DocumentService:
    def __init__(self):
        # Use unified vector store service
        self.vector_store = VectorStoreService(collection_name="unified_knowledge")
        
    async def process_upload(self, file: UploadFile, type: str, tags: List[str], user_id: str) -> Document:
        """
        Process uploaded file: save to DB, extract text, generate embeddings
        """
        content = await file.read()
        filename = file.filename
        
        # 1. Extract Text
        text_content = self._extract_text(content, filename)
        
        if not text_content:
            raise ValueError("Could not extract text from file")
            
        # 2. Save to SQL DB
        doc_id = str(uuid.uuid4())
        document = Document(
            id=doc_id,
            user_id=user_id,
            name=filename,
            type=type,
            extracted_text=text_content,
            tags=",".join(tags) if tags else "",
            created_at=datetime.now()
        )
        
        with Session(engine) as session:
            session.add(document)
            session.commit()
            session.refresh(document)
            
        # 3. Index using unified vector store
        entity = SearchableEntity(
            entity_id=doc_id,
            entity_type="document",
            content=text_content,
            user_id=user_id,
            created_at=document.created_at,
            updated_at=document.created_at,
            metadata={
                "filename": filename,
                "doc_type": type,
                "tags": ",".join(tags) if tags else ""
            }
        )
        
        chunk_count = self.vector_store.index_entity(entity)
        logger.info(f"Processed document {filename} with {chunk_count} chunks")
        
        return document

    def _extract_text(self, content: bytes, filename: str) -> str:
        """Extract text based on file extension"""
        import io
        
        if filename.lower().endswith('.pdf'):
            try:
                reader = PdfReader(io.BytesIO(content))
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                return text
            except Exception as e:
                logger.error(f"PDF extraction error: {e}")
                return ""
                
        elif filename.lower().endswith('.docx'):
            try:
                doc = DocxDocument(io.BytesIO(content))
                text = "\n".join([para.text for para in doc.paragraphs])
                return text
            except Exception as e:
                logger.error(f"DOCX extraction error: {e}")
                return ""
                
        else:
            # Assume text/plain
            try:
                return content.decode('utf-8', errors='ignore')
            except Exception:
                return ""

    def search_documents(self, query: str, limit: int = 5, user_id: str = None) -> List[dict]:
        """Search for relevant document chunks using unified vector store"""
        if not user_id:
            return []
            
        results = self.vector_store.search(
            query=query,
            user_id=user_id,
            limit=limit,
            entity_type="document"
        )
        
        # Format results for backwards compatibility
        formatted_results = []
        for result in results:
            formatted_results.append({
                "document_id": result["entity_id"],
                "filename": result["metadata"].get("filename", "Unknown"),
                "snippet": result["content"],
                "score": 1.0 - result["distance"] if result["distance"] else 0.0
            })
                
        return formatted_results


    def list_documents(
        self, 
        user_id: str, 
        type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Document]:
        with Session(engine) as session:
            statement = select(Document).where(
                Document.user_id == user_id
            ).order_by(Document.created_at.desc()).offset(offset).limit(limit)
            if type:
                statement = statement.where(Document.type == type)
            results = session.exec(statement).all()
            return results

    def delete_document(self, document_id: str, user_id: str):
        """Delete document from SQL and vector store"""
        with Session(engine) as session:
            # Verify ownership
            statement = select(Document).where(
                Document.id == document_id,
                Document.user_id == user_id
            )
            doc = session.exec(statement).first()
            if doc:
                session.delete(doc)
                session.commit()
                
        # Delete from Vector Store using unified service
        self.vector_store.delete_by_entity_id(document_id, user_id)
