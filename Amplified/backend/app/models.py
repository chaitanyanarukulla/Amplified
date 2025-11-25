from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, Relationship
import uuid

# --- Enums ---
class MeetingPlatform(str, Enum):
    ZOOM = "zoom"
    TEAMS = "teams"
    MEET = "meet"
    IN_PERSON = "in_person"
    OTHER = "other"

class ActionStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"

class DocumentType(str, Enum):
    RESUME = "resume"
    JD = "jd"
    MEETING_NOTES = "meeting_notes"
    AGENDA = "agenda"
    DESIGN_DOC = "design_doc"
    CLIENT_DOC = "client_doc"
    SPEC = "spec"
    OTHER = "other"

class AnalyzedDocFileType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    MD = "md"
    TXT = "txt"

class AnalysisStatus(str, Enum):
    PENDING = "pending"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"

class DetectedDocType(str, Enum):
    BRD = "brd"
    PRD = "prd"
    DESIGN = "design"
    TECHNICAL = "technical"
    UNKNOWN = "unknown"

# --- SQLModel Database Models ---

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

class Meeting(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    title: str
    start_time: datetime = Field(index=True)
    end_time: Optional[datetime] = None
    platform: Optional[str] = None
    tags: Optional[str] = None # Comma-separated tags
    created_at: datetime = Field(default_factory=datetime.now)
    
    # Relationships with cascade delete
    summaries: List["MeetingSummary"] = Relationship(
        back_populates="meeting",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    actions: List["MeetingAction"] = Relationship(
        back_populates="meeting",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class MeetingSummary(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    meeting_id: str = Field(foreign_key="meeting.id", index=True)
    session_number: int = Field(default=1)  # Track which session this summary is for
    short_summary: str
    detailed_summary: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    
    meeting: Optional[Meeting] = Relationship(back_populates="summaries")

class MeetingAction(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    meeting_id: str = Field(foreign_key="meeting.id", index=True)
    owner: Optional[str] = None
    description: str
    due_date: Optional[date] = None
    status: str = Field(default=ActionStatus.OPEN, index=True)
    created_at: datetime = Field(default_factory=datetime.now)
    
    meeting: Optional[Meeting] = Relationship(back_populates="actions")

class Document(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    name: str
    type: str = Field(default=DocumentType.OTHER, index=True)
    meeting_id: Optional[str] = Field(default=None, foreign_key="meeting.id", index=True)  # Associate with meeting
    content_path: Optional[str] = None # Path to file on disk if needed
    extracted_text: Optional[str] = None # Store text for simple RAG
    tags: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

class VoiceProfile(SQLModel, table=True):
    __tablename__ = "voice_profiles"
    id: str = Field(primary_key=True)
    user_id: str = Field(foreign_key="users.id", unique=True)  # One profile per user
    name: str = Field(default="User")  # User's name
    embedding_path: str  # Path to stored voice sample
    created_at: datetime = Field(default_factory=datetime.now)

class JiraSettings(SQLModel, table=True):
    __tablename__ = "jira_settings"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="users.id")
    base_url: str
    email: str
    api_token_encrypted: str
    created_at: datetime = Field(default_factory=datetime.now)

class TestCaseGeneration(SQLModel, table=True):
    __tablename__ = "test_case_generations"
    id: str = Field(primary_key=True)
    user_id: str = Field(foreign_key="users.id")
    jira_ticket_key: str
    jira_title: str
    raw_story_data: str # JSON string
    generated_test_cases: str # JSON string
    created_at: datetime = Field(default_factory=datetime.now)

class UserLLMPreference(SQLModel, table=True):
    __tablename__ = "user_llm_preferences"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="users.id", unique=True)  # One preference per user
    selected_engine: str = Field(default="openai_gpt4o")  # openai_gpt4o, local_llm, claude_3_5_sonnet
    created_at: datetime = Field(default_factory=datetime.now)

class AnalyzedDocument(SQLModel, table=True):
    __tablename__ = "analyzed_documents"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    name: str  # Original filename
    file_type: str = Field(default=AnalyzedDocFileType.PDF)  # pdf, docx, md, txt
    extracted_text: str  # Parsed text content
    file_size_bytes: int
    page_count: Optional[int] = None
    detected_doc_type: Optional[str] = None  # BRD/PRD/Design/Unknown
    analysis_status: str = Field(default=AnalysisStatus.PENDING, index=True)  # pending, analyzing, completed, failed
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    # Relationship
    analysis: Optional["DocumentAnalysis"] = Relationship(back_populates="document")

class DocumentAnalysis(SQLModel, table=True):
    __tablename__ = "document_analyses"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    document_id: str = Field(foreign_key="analyzed_documents.id", unique=True, index=True)
    model_version: str  # Which LLM/engine was used
    structured_summary: str  # JSON: objectives, scope, features, constraints
    risk_assessment: str  # JSON: categorized risks with severity
    gaps_and_questions: str  # JSON: identified gaps, ambiguities
    qa_report: str  # JSON: test ideas, recommendations, edge cases
    overall_risk_level: str  # Low/Medium/High
    analysis_duration_seconds: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.now)
    
    # Relationship
    document: Optional[AnalyzedDocument] = Relationship(back_populates="analysis")

# --- Pydantic Models for API (Legacy & New) ---

class TranscriptUpdate(BaseModel):
    speaker: str
    text: str
    is_final: bool
    timestamp: str

class SuggestionReady(BaseModel):
    answer: str
    extra_points: Optional[List[str]] = None

class CommandMessage(BaseModel):
    type: str
    action: str
    payload: Optional[dict] = None

class ConnectionStatus(BaseModel):
    status: str
    session_id: str
    message: str

# API Request Models
class MeetingCreate(BaseModel):
    title: str
    start_time: Optional[datetime] = None
    tags: Optional[List[str]] = None
    platform: Optional[str] = None

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    end_time: Optional[datetime] = None
    tags: Optional[List[str]] = None

class ActionCreate(BaseModel):
    owner: Optional[str] = None
    description: str
    due_date: Optional[date] = None

class QARequest(BaseModel):
    meeting_id: Optional[str] = None
    question: Optional[str] = None
    context_window_seconds: int = 300

class NeuralEnginePreference(BaseModel):
    selected_engine: str  # openai_gpt4o, local_llm, claude_3_5_sonnet

# Authentication Models
class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

# Document Analyzer Models
class ExportRequest(BaseModel):
    format: str  # "pdf" or "markdown"

class AnalyzedDocumentResponse(BaseModel):
    id: str
    name: str
    file_type: str
    file_size_bytes: int
    page_count: Optional[int]
    detected_doc_type: Optional[str]
    analysis_status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    analysis: Optional[Dict[str, Any]] = None

    analysis: Optional[Dict[str, Any]] = None


class DocumentAnalysisResponse(BaseModel):
    id: str
    document_id: str
    model_version: str
    structured_summary: str
    risk_assessment: str
    gaps_and_questions: str
    qa_report: str
    overall_risk_level: str
    analysis_duration_seconds: Optional[float]
    created_at: datetime
