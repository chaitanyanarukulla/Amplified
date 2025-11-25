"""
Document Analyzer Service - Orchestrates document analysis pipeline
Handles file upload, text extraction, and coordinates 4-stage analysis
"""

import logging
import json
import time
from typing import Optional, List
from datetime import datetime
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from fastapi import UploadFile

from app.database import engine
from app.models import (
    AnalyzedDocument, DocumentAnalysis,
    AnalysisStatus, AnalyzedDocFileType, DetectedDocType
)
from app.services.file_processing_service import FileProcessingService
from app.services import analysis_engines

logger = logging.getLogger(__name__)

# File size limits
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_PAGE_COUNT = 200

class DocumentAnalyzerService:
    def __init__(self):
        self.file_service = FileProcessingService()
    
    async def upload_document(
        self,
        file: UploadFile,
        user_id: str
    ) -> AnalyzedDocument:
        """
        Upload and process a document for analysis
        
        Args:
            file: Uploaded file
            user_id: User ID
            
        Returns:
            AnalyzedDocument with status=PENDING
        """
        # Read file content
        content = await file.read()
        filename = file.filename.lower()
        
        # Validate file size
        file_size = len(content)
        if file_size > MAX_FILE_SIZE_BYTES:
            raise ValueError(f"File size ({file_size} bytes) exceeds limit of {MAX_FILE_SIZE_BYTES} bytes (10 MB)")
        
        # Determine file type
        if filename.endswith('.pdf'):
            file_type = AnalyzedDocFileType.PDF
        elif filename.endswith(('.doc', '.docx')):
            file_type = AnalyzedDocFileType.DOCX
        elif filename.endswith('.md'):
            file_type = AnalyzedDocFileType.MD
        elif filename.endswith('.txt'):
            file_type = AnalyzedDocFileType.TXT
        else:
            raise ValueError(f"Unsupported file type. Supported: PDF, DOCX, MD, TXT")
        
        # Extract text using existing FileProcessingService
        try:
            if file_type == AnalyzedDocFileType.PDF:
                extracted_text = await self.file_service.process_pdf(content)
            elif file_type == AnalyzedDocFileType.DOCX:
                extracted_text = await self.file_service.process_word(content)
            else:  # MD or TXT
                extracted_text = await self.file_service.process_text(content)
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            raise ValueError(f"Failed to extract text from file: {str(e)}")
        
        if not extracted_text or len(extracted_text.strip()) < 100:
            raise ValueError("Document appears to be empty or too short (minimum 100 characters)")
        
        # Estimate page count (rough estimate: 500 chars per page)
        estimated_pages = max(1, len(extracted_text) // 500)
        if estimated_pages > MAX_PAGE_COUNT:
            raise ValueError(f"Document is too long (~{estimated_pages} pages). Maximum: {MAX_PAGE_COUNT} pages")
        
        # Detect document type (heuristic)
        detected_type = self._detect_document_type(extracted_text)
        
        # Create database record
        document = AnalyzedDocument(
            user_id=user_id,
            name=file.filename,
            file_type=file_type,
            extracted_text=extracted_text,
            file_size_bytes=file_size,
            page_count=estimated_pages,
            detected_doc_type=detected_type,
            analysis_status=AnalysisStatus.PENDING
        )
        
        with Session(engine) as session:
            session.add(document)
            session.commit()
            session.refresh(document)
        
        logger.info(f"Document uploaded: {document.id} ({file.filename}, {file_size} bytes, ~{estimated_pages} pages)")
        return document
    
    def _detect_document_type(self, text: str) -> str:
        """
        Heuristic detection of document type based on keywords
        """
        text_lower = text.lower()
        
        # Check for BRD indicators
        brd_keywords = ['business requirement', 'business case', 'stakeholder', 'roi', 'business objective']
        brd_score = sum(1 for kw in brd_keywords if kw in text_lower)
        
        # Check for PRD indicators
        prd_keywords = ['product requirement', 'user story', 'acceptance criteria', 'feature specification']
        prd_score = sum(1 for kw in prd_keywords if kw in text_lower)
        
        # Check for Design/Technical indicators
        design_keywords = ['architecture', 'technical design', 'system design', 'api specification', 'database schema']
        design_score = sum(1 for kw in design_keywords if kw in text_lower)
        
        # Determine type based on scores
        scores = {
            DetectedDocType.BRD: brd_score,
            DetectedDocType.PRD: prd_score,
            DetectedDocType.DESIGN: design_score
        }
        
        max_score = max(scores.values())
        if max_score >= 2:
            return max(scores, key=scores.get)
        else:
            return DetectedDocType.UNKNOWN
    
    async def analyze_document(
        self,
        document_id: str,
        user_id: str
    ) -> DocumentAnalysis:
        """
        Run full analysis pipeline on a document
        
        Stages:
        1. Structured Summary
        2. Risk Assessment
        3. Gap & Ambiguity Detection
        4. QA Report Generation
        
        Args:
            document_id: Document ID
            user_id: User ID (for ownership verification and LLM preference)
            
        Returns:
            DocumentAnalysis with all results
        """
        start_time = time.time()
        
        # Get document and verify ownership
        with Session(engine) as session:
            document = session.exec(
                select(AnalyzedDocument).where(
                    AnalyzedDocument.id == document_id,
                    AnalyzedDocument.user_id == user_id
                )
            ).first()
            
            if not document:
                raise ValueError("Document not found or access denied")
            
            # Update status to ANALYZING
            document.analysis_status = AnalysisStatus.ANALYZING
            document.updated_at = datetime.now()
            session.add(document)
            session.commit()
            session.refresh(document)
        
        try:
            text = document.extracted_text
            if not text:
                raise ValueError("Document has no extracted text")
                
            logger.info(f"Starting analysis for doc {document_id}. Text length: {len(text)} chars")
            
            # Stage 1: Structured Summary
            logger.info(f"Generating structured summary for {document_id}")
            summary = await analysis_engines.generate_structured_summary(text, user_id)
            
            # Stage 2: Risk Assessment
            logger.info(f"Assessing risks for {document_id}")
            risks = await analysis_engines.assess_risks(text, user_id)
            
            # Stage 3: Gap & Ambiguity Detection
            logger.info(f"Detecting gaps for {document_id}")
            gaps = await analysis_engines.detect_gaps_and_ambiguities(text, user_id)
            
            # Stage 4: QA Report Generation
            logger.info(f"Generating QA report for {document_id}")
            qa_report = await analysis_engines.generate_qa_report(text, summary, risks, gaps, user_id)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Get user's LLM preference for model_version
            from app.services.llm_router import llm_router
            model_version = llm_router.get_user_engine(user_id)
            
            # Create analysis record
            analysis = DocumentAnalysis(
                document_id=document_id,
                model_version=model_version,
                structured_summary=json.dumps(summary),
                risk_assessment=json.dumps(risks),
                gaps_and_questions=json.dumps(gaps),
                qa_report=json.dumps(qa_report),
                overall_risk_level=risks.get('overall_risk_level', 'Unknown'),
                analysis_duration_seconds=duration
            )
            
            with Session(engine) as session:
                # Update document status
                doc = session.get(AnalyzedDocument, document_id)
                doc.analysis_status = AnalysisStatus.COMPLETED
                doc.updated_at = datetime.now()
                
                # Save analysis
                session.add(analysis)
                session.add(doc)
                session.commit()
                session.refresh(analysis)
            
            logger.info(f"Analysis completed for {document_id} in {duration:.2f}s")
            return analysis
            
        except Exception as e:
            logger.error(f"Analysis failed for {document_id}: {e}")
            
            # Update status to FAILED
            with Session(engine) as session:
                doc = session.get(AnalyzedDocument, document_id)
                doc.analysis_status = AnalysisStatus.FAILED
                doc.error_message = str(e)
                doc.updated_at = datetime.now()
                session.add(doc)
                session.commit()
            
            raise
    
    def get_document(
        self,
        document_id: str,
        user_id: str,
        include_analysis: bool = True
    ) -> Optional[AnalyzedDocument]:
        """Get document with optional analysis"""
        with Session(engine) as session:
            statement = select(AnalyzedDocument).where(
                AnalyzedDocument.id == document_id,
                AnalyzedDocument.user_id == user_id
            )
            
            if include_analysis:
                statement = statement.options(selectinload(AnalyzedDocument.analysis))
            
            document = session.exec(statement).first()
            return document
    
    def list_documents(
        self,
        user_id: str,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[AnalyzedDocument]:
        """List documents for a user with optional status filter"""
        with Session(engine) as session:
            statement = select(AnalyzedDocument).where(
                AnalyzedDocument.user_id == user_id
            ).order_by(AnalyzedDocument.created_at.desc()).offset(offset).limit(limit)
            
            if status:
                statement = statement.where(AnalyzedDocument.analysis_status == status)
            
            documents = session.exec(statement).all()
            return documents
    
    def delete_document(
        self,
        document_id: str,
        user_id: str
    ):
        """Delete document and associated analysis"""
        with Session(engine) as session:
            # Verify ownership
            document = session.exec(
                select(AnalyzedDocument).where(
                    AnalyzedDocument.id == document_id,
                    AnalyzedDocument.user_id == user_id
                )
            ).first()
            
            if not document:
                raise ValueError("Document not found or access denied")
            
            # Delete analysis if exists (cascade should handle this, but being explicit)
            analysis = session.exec(
                select(DocumentAnalysis).where(
                    DocumentAnalysis.document_id == document_id
                )
            ).first()
            
            if analysis:
                session.delete(analysis)
            
            # Delete document
            session.delete(document)
            session.commit()
            
        logger.info(f"Deleted document {document_id}")
    
    async def regenerate_analysis(
        self,
        document_id: str,
        user_id: str
    ) -> DocumentAnalysis:
        """
        Regenerate analysis for an existing document
        Deletes old analysis and creates new one
        """
        # Delete existing analysis
        with Session(engine) as session:
            analysis = session.exec(
                select(DocumentAnalysis).where(
                    DocumentAnalysis.document_id == document_id
                )
            ).first()
            
            if analysis:
                session.delete(analysis)
                session.commit()
        
        # Run new analysis
        return await self.analyze_document(document_id, user_id)


# Global singleton
doc_analyzer_service = DocumentAnalyzerService()
