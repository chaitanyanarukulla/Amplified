from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
import structlog
from app.dependencies import voice_service
from app.models import User
from app.auth_dependencies import get_current_user

router = APIRouter(prefix="/voice-profile", tags=["voice"])
logger = structlog.get_logger(__name__)

@router.post("/enroll")
async def enroll_voice(
    audio: UploadFile = File(...),
    name: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Enroll user voice with name"""
    try:
        return await voice_service.enroll_voice(audio, name, current_user.id)
    except Exception as e:
        logger.error(f"Voice enrollment failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def get_voice_profile(current_user: User = Depends(get_current_user)):
    """Get current voice profile"""
    profile = voice_service.get_profile(current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="No voice profile found")
    return profile

@router.delete("")
async def delete_voice_profile(current_user: User = Depends(get_current_user)):
    """Delete voice profile"""
    voice_service.delete_profile(current_user.id)
    return {"status": "success", "message": "Voice profile deleted"}
