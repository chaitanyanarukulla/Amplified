import os
import uuid
import structlog
from fastapi import UploadFile
from sqlmodel import Session, select
from app.database import engine
from app.models import VoiceProfile

logger = structlog.get_logger(__name__)

class VoiceService:
    def __init__(self):
        self.upload_dir = "voice_profiles"
        os.makedirs(self.upload_dir, exist_ok=True)

    async def enroll_voice(self, file: UploadFile, name: str, user_id: str) -> VoiceProfile:
        """Save voice sample and create profile with user's name"""
        # 1. Save File
        file_ext = file.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{file_ext}"
        file_path = os.path.join(self.upload_dir, filename)
        
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
            
        # 2. Create or Update DB Record
        # Check if profile exists for this user
        with Session(engine) as session:
            existing = session.exec(
                select(VoiceProfile).where(VoiceProfile.user_id == user_id)
            ).first()
            if existing:
                # Update existing
                existing.embedding_path = file_path
                existing.name = name
                session.add(existing)
                session.commit()
                session.refresh(existing)
                return existing
            else:
                # Create new
                profile = VoiceProfile(
                    id=f"vp_{uuid.uuid4().hex[:8]}",
                    user_id=user_id,
                    name=name,
                    embedding_path=file_path
                )
                session.add(profile)
                session.commit()
                session.refresh(profile)
                return profile

    def get_profile(self, user_id: str) -> VoiceProfile:
        with Session(engine) as session:
            return session.exec(
                select(VoiceProfile).where(VoiceProfile.user_id == user_id)
            ).first()

    def delete_profile(self, user_id: str):
        with Session(engine) as session:
            profile = session.exec(
                select(VoiceProfile).where(VoiceProfile.user_id == user_id)
            ).first()
            if profile:
                # Delete file
                if os.path.exists(profile.embedding_path):
                    os.remove(profile.embedding_path)
                
                session.delete(profile)
                session.commit()
