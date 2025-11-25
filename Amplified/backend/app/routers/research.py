from fastapi import APIRouter, Form, HTTPException, Depends
import structlog
from app.dependencies import research_service
from app.services.session_manager import session_manager
from app.models import User
from app.auth_dependencies import get_current_user

router = APIRouter(prefix="/research", tags=["research"])
logger = structlog.get_logger(__name__)

@router.post("/role")
async def research_role(
    role_title: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """
    Research a specific job role and append results to pinned notes
    """
    # Use user_id as session_id for now
    session_id = current_user.id
    
    try:
        logger.info(f"Researching role: {role_title} for user {current_user.id}")
        research_summary = research_service.perform_role_research(role_title)
        
        # Add to Context Engine
        # Note: ContextEngine is currently global/singleton in session_manager
        # We need to make sure we're updating the right context if we move to per-user context
        current_context = await session_manager.context_engine.get_full_context()
        current_notes = current_context.get("pinned_notes", "")
        
        # Append role research
        updated_notes = f"{current_notes}\n\n{research_summary}".strip()
        await session_manager.context_engine.add_document("pinned_notes", updated_notes)
        logger.info(f"Role research added to pinned_notes")
        
        # Notify Frontend if session exists
        # We need to check if there is an active session for this user
        # In the updated WebSocket logic (to be implemented), we will map session_id to user_id or use user_id as key
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
                logger.info(f"Notified frontend of role research update")

        return {
            "status": "success",
            "role_title": role_title,
            "summary_length": len(research_summary)
        }
    except Exception as e:
        logger.error(f"Role research failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
