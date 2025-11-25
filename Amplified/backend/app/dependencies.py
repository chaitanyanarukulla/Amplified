from app.services.document_service import DocumentService
from app.services.meeting_service import MeetingService
from app.services.voice_service import VoiceService
from app.services.resume_parser import ResumeParser
from app.services.jd_analyzer import JDAnalyzer
from app.services.research_service import ResearchService

# Initialize Services
research_service = ResearchService()
document_service = DocumentService()
meeting_service = MeetingService()
voice_service = VoiceService()
resume_parser = ResumeParser()
jd_analyzer = JDAnalyzer()
