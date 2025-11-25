from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Optional
import logging

from app.dependencies import document_service, research_service
from app.services.session_manager import session_manager
from app.models import User
from app.auth_dependencies import get_current_user

router = APIRouter(prefix="/documents", tags=["documents"])
logger = logging.getLogger(__name__)

@router.post("/upload/document", deprecated=True) # Keeping old path for compatibility if needed, but maybe better to move to /documents/upload
async def upload_document_legacy(
    file: UploadFile = File(...), 
    type: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload and parse documents (Resume, Job Description) - Legacy Endpoint
    """
    # For now, we'll use a default session ID for document uploads
    session_id = "default" 
    
    try:
        content = await file.read()
        
        # Decode content to text
        text_content = content.decode('utf-8', errors='ignore')

        # Store in context engine via session_manager
        await session_manager.context_engine.add_document(type, text_content)
        
        # Trigger Research if JD
        if type == "job_description":
            company_name = research_service.extract_company_name(text_content)
            if company_name:
                logger.info(f"Extracted company name: {company_name}. Performing research...")
                research_summary = research_service.perform_research(company_name)
                
                # Add to Context Engine
                current_context = await session_manager.context_engine.get_full_context()
                current_notes = current_context.get("pinned_notes", "")
                
                updated_notes = f"{current_notes}\n\n--- Research Summary for {company_name} ---\n{research_summary}".strip()
                await session_manager.context_engine.add_document("pinned_notes", updated_notes)
                logger.info(f"Research summary added to pinned_notes")
                
                # Notify Frontend if session exists
                if session_id in session_manager.active_sessions:
                    ws = session_manager.active_sessions[session_id].get("websocket")
                    if ws:
                        await ws.send_json({
                            "type": "context_update",
                            "payload": {
                                "type": "pinned_notes",
                                "data": updated_notes
                            }
                        })
                        logger.info(f"Notified frontend of context update for session {session_id}")

        return {
            "status": "success",
            "filename": file.filename,
            "length": len(text_content),
            "preview": text_content[:200] + "..." if len(text_content) > 200 else text_content
        }
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def upload_document_endpoint(
    file: UploadFile = File(...), 
    type: str = Form(...),
    tags: str = Form(None),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a document to the Knowledge Vault
    """
    try:
        tag_list = tags.split(",") if tags else []
        doc = await document_service.process_upload(file, type, tag_list, current_user.id)
        return doc
    except Exception as e:
        logger.error(f"Document upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def list_documents(
    type: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """List documents"""
    return document_service.list_documents(current_user.id, type)

@router.post("/search")
async def search_documents(
    query: str = Form(...),
    limit: int = Form(5),
    current_user: User = Depends(get_current_user)
):
    """Search documents"""
    return document_service.search_documents(query, limit, current_user.id)

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a document"""
    document_service.delete_document(document_id, current_user.id)
    return {"status": "success", "message": "Document deleted"}
