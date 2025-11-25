"""
Document Analyzer Router - API endpoints for Document Quality Analyzer
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks, Response
from fastapi.responses import JSONResponse

from app.models import (
    User, 
    AnalyzedDocument, 
    DocumentAnalysis, 
    AnalyzedDocumentResponse,
    DocumentAnalysisResponse,
    ExportRequest
)
from app.auth_dependencies import get_current_user
from app.services.doc_analyzer_service import doc_analyzer_service
from app.services.export_service import export_service

router = APIRouter(prefix="/doc-analyzer", tags=["doc-analyzer"])
logger = logging.getLogger(__name__)

@router.post("/upload", response_model=AnalyzedDocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a document for analysis
    """
    try:
        document = await doc_analyzer_service.upload_document(file, current_user.id)
        # Manually construct response to avoid DetachedInstanceError on lazy-loaded analysis
        response = AnalyzedDocumentResponse(
            id=document.id,
            name=document.name,
            file_type=document.file_type,
            file_size_bytes=document.file_size_bytes,
            page_count=document.page_count,
            detected_doc_type=document.detected_doc_type,
            analysis_status=document.analysis_status,
            error_message=document.error_message,
            created_at=document.created_at,
            updated_at=document.updated_at,
            analysis=None
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during upload")

@router.post("/analyze/{document_id}", response_model=DocumentAnalysisResponse)
async def analyze_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Trigger analysis for a document
    """
    try:
        # Check if document exists and user owns it
        doc = doc_analyzer_service.get_document(document_id, current_user.id, include_analysis=False)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Run analysis
        analysis = await doc_analyzer_service.analyze_document(document_id, current_user.id)
        return analysis
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/regenerate/{document_id}", response_model=DocumentAnalysisResponse)
async def regenerate_analysis(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Regenerate analysis for a document
    """
    try:
        analysis = await doc_analyzer_service.regenerate_analysis(document_id, current_user.id)
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Regeneration failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents", response_model=List[AnalyzedDocumentResponse])
async def list_documents(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """
    List analyzed documents
    """
    documents = doc_analyzer_service.list_documents(
        current_user.id, status, limit, offset
    )
    
    # Manually construct response to avoid DetachedInstanceError and reduce payload
    return [
        AnalyzedDocumentResponse(
            id=doc.id,
            name=doc.name,
            file_type=doc.file_type,
            file_size_bytes=doc.file_size_bytes,
            page_count=doc.page_count,
            detected_doc_type=doc.detected_doc_type,
            analysis_status=doc.analysis_status,
            error_message=doc.error_message,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
            analysis=None
        ) for doc in documents
    ]

@router.get("/documents/{document_id}", response_model=AnalyzedDocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get document details and analysis
    """
    document = doc_analyzer_service.get_document(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Convert to response model which handles the optional analysis field
    # SQLModel object might need explicit conversion if relationships aren't loaded automatically in a way Pydantic likes
    # But FastAPI usually handles SQLModel -> Pydantic conversion well.
    
    # Manually constructing response to ensure analysis is included if present
    response = AnalyzedDocumentResponse(
        id=document.id,
        name=document.name,
        file_type=document.file_type,
        file_size_bytes=document.file_size_bytes,
        page_count=document.page_count,
        detected_doc_type=document.detected_doc_type,
        analysis_status=document.analysis_status,
        created_at=document.created_at,
        updated_at=document.updated_at
    )
    
    if document.analysis:
        # Convert analysis SQLModel to dict for the response
        response.analysis = document.analysis.model_dump()
        
    return response

@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a document and its analysis
    """
    try:
        doc_analyzer_service.delete_document(document_id, current_user.id)
        return {"status": "success", "message": "Document deleted"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Deletion failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/export/{document_id}")
async def export_report(
    document_id: str,
    request: ExportRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Export analysis report as PDF or Markdown
    """
    # Get document with analysis
    document = doc_analyzer_service.get_document(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not document.analysis:
        raise HTTPException(status_code=400, detail="Analysis not available for this document")
    
    # Prepare analysis data dict
    analysis_data = document.analysis.model_dump()
    
    try:
        if request.format.lower() == "markdown":
            content = export_service.export_to_markdown(document.name, analysis_data)
            return Response(
                content=content,
                media_type="text/markdown",
                headers={
                    "Content-Disposition": f"attachment; filename={document.name}_analysis.md"
                }
            )
        
        elif request.format.lower() == "pdf":
            try:
                pdf_bytes = export_service.export_to_pdf(document.name, analysis_data)
                return Response(
                    content=pdf_bytes,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f"attachment; filename={document.name}_analysis.pdf"
                    }
                )
            except NotImplementedError as e:
                raise HTTPException(status_code=501, detail=str(e))
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported format. Use 'pdf' or 'markdown'")
            
    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
