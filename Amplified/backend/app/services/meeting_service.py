import uuid
from datetime import datetime
from typing import List, Optional
from sqlmodel import Session, select
from app.database import engine
from app.models import Meeting, MeetingSummary, MeetingAction, MeetingCreate, MeetingUpdate, ActionCreate
from app.services.llm_service import LLMService
from app.services.vector_store_service import VectorStoreService, SearchableEntity
import structlog

logger = structlog.get_logger(__name__)

class MeetingService:
    def __init__(self):
        self.llm_service = LLMService()
        self.vector_store = VectorStoreService(collection_name="unified_knowledge")

    def create_meeting(self, meeting_data: MeetingCreate, user_id: str) -> Meeting:
        with Session(engine) as session:
            meeting = Meeting(
                id=f"m_{uuid.uuid4().hex[:8]}",
                user_id=user_id,
                title=meeting_data.title,
                start_time=meeting_data.start_time or datetime.now(),
                tags=",".join(meeting_data.tags) if meeting_data.tags else "",
                platform=meeting_data.platform
            )
            session.add(meeting)
            session.commit()
            session.refresh(meeting)
            return meeting

    def get_meeting(self, meeting_id: str, user_id: str) -> Optional[Meeting]:
        from sqlalchemy.orm import selectinload
        with Session(engine) as session:
            statement = select(Meeting).where(
                Meeting.id == meeting_id,
                Meeting.user_id == user_id
            ).options(
                selectinload(Meeting.summaries),
                selectinload(Meeting.actions)
            )
            return session.exec(statement).first()

    def list_meetings(self, user_id: str, limit: int = 20, offset: int = 0) -> List[Meeting]:
        from sqlalchemy.orm import selectinload
        with Session(engine) as session:
            statement = select(Meeting).where(
                Meeting.user_id == user_id
            ).options(
                selectinload(Meeting.summaries),
                selectinload(Meeting.actions)
            ).order_by(Meeting.start_time.desc()).offset(offset).limit(limit)
            results = session.exec(statement).all()
            # Convert to list to ensure they're detached from session
            return list(results)

    def update_meeting(self, meeting_id: str, update_data: MeetingUpdate, user_id: str) -> Optional[Meeting]:
        with Session(engine) as session:
            statement = select(Meeting).where(
                Meeting.id == meeting_id,
                Meeting.user_id == user_id
            )
            meeting = session.exec(statement).first()
            if not meeting:
                return None
            
            if update_data.title:
                meeting.title = update_data.title
            if update_data.end_time:
                meeting.end_time = update_data.end_time
            if update_data.tags:
                meeting.tags = ",".join(update_data.tags)
                
            session.add(meeting)
            session.commit()
            session.refresh(meeting)
            return meeting

    def delete_meeting(self, meeting_id: str, user_id: str):
        """Delete meeting from SQL and vector store"""
        with Session(engine) as session:
            statement = select(Meeting).where(
                Meeting.id == meeting_id,
                Meeting.user_id == user_id
            )
            meeting = session.exec(statement).first()
            if meeting:
                # Database cascade will handle summaries and actions
                session.delete(meeting)
                session.commit()
                
        # Delete from vector store
        self.vector_store.delete_by_entity_id(meeting_id, user_id)
        logger.info(f"Deleted meeting {meeting_id} from SQL and vector store")

    def add_action_item(self, meeting_id: str, action_data: ActionCreate, user_id: str) -> MeetingAction:
        with Session(engine) as session:
            # Verify meeting belongs to user
            meeting = session.exec(
                select(Meeting).where(
                    Meeting.id == meeting_id,
                    Meeting.user_id == user_id
                )
            ).first()
            if not meeting:
                return None
            
            action = MeetingAction(
                id=f"a_{uuid.uuid4().hex[:8]}",
                meeting_id=meeting_id,
                description=action_data.description,
                owner=action_data.owner,
                due_date=action_data.due_date
            )
            session.add(action)
            session.commit()
            session.refresh(action)
            return action

    def get_meeting_actions(self, meeting_id: str, user_id: str) -> List[MeetingAction]:
        with Session(engine) as session:
            # Verify meeting belongs to user first
            meeting = session.exec(
                select(Meeting).where(
                    Meeting.id == meeting_id,
                    Meeting.user_id == user_id
                )
            ).first()
            if not meeting:
                return []
            
            statement = select(MeetingAction).where(MeetingAction.meeting_id == meeting_id)
            return session.exec(statement).all()

    async def generate_meeting_summary(
        self, 
        meeting_id: str, 
        transcript: str,
        user_id: str,
        session_number: int = 1,
        previous_summaries: List[str] = None
    ) -> dict:
        """Generate summary and action items from transcript using LLM"""
        
        # 1. Build context from previous sessions if continuing
        previous_context = ""
        if previous_summaries and len(previous_summaries) > 0:
            previous_context = f"""
Previous Sessions Summary:
{chr(10).join([f"Session {i+1}: {summary}" for i, summary in enumerate(previous_summaries)])}
"""
        
        # 2. Generate Summary & Actions
        system_prompt = "You are an expert meeting secretary and technical analyst. Your goal is to distill meeting transcripts into clear, actionable structured data."
        
        prompt = f"""
        Analyze the following meeting transcript for Session {session_number}.
        
        Context from previous sessions:
        {previous_context if previous_context else "None"}
        
        Instructions:
        1. **Short Summary**: Provide 3-5 concise bullet points highlighting key decisions and progress.
        2. **Detailed Summary**: Write a comprehensive paragraph summarizing the discussion, technical details, and next steps.
        3. **Action Items**: Extract concrete tasks. Identify the Owner (or "Unknown") and a clear Description.
        
        Output Format:
        Return ONLY valid JSON with this structure:
        {{
          "short_summary": ["bullet 1", "bullet 2"],
          "detailed_summary": "paragraph text...",
          "action_items": [
            {{ "owner": "Name", "description": "Task details" }}
          ]
        }}
        
        Transcript:
        {transcript[:15000]}
        """
        
        try:
            # Use router directly for structured output to allow custom system prompt
            # We use the router from llm_service
            response_data = await self.llm_service.router.generate_json(
                prompt=prompt,
                system_prompt=system_prompt,
                user_id=user_id,
                max_tokens=1000,
                temperature=0.7
            )
            
            # 3. Parse Response
            short_summary_list = response_data.get("short_summary", [])
            if isinstance(short_summary_list, list):
                short_summary = "\n".join([f"- {item}" for item in short_summary_list])
            else:
                short_summary = str(short_summary_list)
                
            detailed_summary = response_data.get("detailed_summary", "No summary provided.")
            
            action_items_data = response_data.get("action_items", [])
            action_items = []
            
            for item in action_items_data:
                owner = item.get("owner", "Unknown")
                description = item.get("description", "No description")
                # Create ActionCreate objects (will be converted to DB models later)
                action_items.append(ActionCreate(owner=owner, description=description))
                
        except Exception as e:
            # Fallback if JSON fails
            print(f"Error generating summary: {e}")
            short_summary = "Error generating summary."
            detailed_summary = "Could not process transcript."
            action_items = []
        
        # 4. Save Summary to DB with session number
        with Session(engine) as session:
            summary = MeetingSummary(
                meeting_id=meeting_id,
                session_number=session_number,
                short_summary=short_summary,
                detailed_summary=detailed_summary
            )
            session.add(summary)
            session.commit()
            session.refresh(summary)
            
            # Access all attributes before session closes to avoid detached instance error
            summary_dict = {
                "short_summary": summary.short_summary,
                "detailed_summary": summary.detailed_summary,
                "meeting_id": summary.meeting_id,
                "session_number": summary.session_number
            }
            
            # 5. Save Action Items
            action_list = []
            for action in action_items:
                db_action = MeetingAction(
                    id=f"a_{uuid.uuid4().hex[:8]}",
                    meeting_id=meeting_id,
                    description=action.description,
                    owner=action.owner,
                    status="open"
                )
                session.add(db_action)
                action_list.append(db_action)
            session.commit()
            
            # Refresh and access action attributes
            action_dicts = []
            for action in action_list:
                session.refresh(action)
                action_dicts.append({
                    "id": action.id,
                    "description": action.description,
                    "owner": action.owner,
                    "status": action.status
                })
        
        # 6. Index meeting summary in vector store for RAG (run in background)
        import asyncio
        asyncio.create_task(
            self._index_meeting_summary(meeting_id, user_id, short_summary, detailed_summary, action_dicts)
        )
        
        # Return a dict-based summary that can be used outside the session
        return {
            "short_summary": summary_dict["short_summary"],
            "detailed_summary": summary_dict["detailed_summary"],
            "meeting_id": summary_dict["meeting_id"],
            "session_number": summary_dict["session_number"],
            "action_items": action_dicts
        }
    
    async def _index_meeting_summary(
        self,
        meeting_id: str,
        user_id: str,
        short_summary: str,
        detailed_summary: str,
        action_items: List[dict]
    ):
        """Index meeting summary and actions into vector store"""
        try:
            # Get meeting details for metadata
            meeting = self.get_meeting(meeting_id, user_id)
            if not meeting:
                logger.warning(f"Meeting {meeting_id} not found for indexing")
                return
            
            # Format content for indexing
            action_text = "\n".join([
                f"- {item['description']} (Owner: {item.get('owner', 'Unknown')})"
                for item in action_items
            ])
            
            content = f"""Meeting: {meeting.title}
Date: {meeting.start_time.strftime('%Y-%m-%d %H:%M')}

Summary:
{short_summary}

Details:
{detailed_summary}

Action Items:
{action_text if action_text else 'No action items'}
"""
            
            entity = SearchableEntity(
                entity_id=meeting_id,
                entity_type="meeting",
                content=content,
                user_id=user_id,
                created_at=meeting.created_at,
                updated_at=datetime.now(),
                metadata={
                    "meeting_title": meeting.title,
                    "platform": meeting.platform or "unknown",
                    "tags": meeting.tags or "",
                    "action_count": len(action_items)
                }
            )
            
            self.vector_store.index_entity(entity)
            logger.info(f"Indexed meeting {meeting_id} into vector store")
            
        except Exception as e:
            logger.error(f"Failed to index meeting {meeting_id}: {e}")

    def update_action_status(self, action_id: str, status: str, user_id: str) -> Optional[MeetingAction]:
        with Session(engine) as session:
            # Join with Meeting to verify user ownership
            statement = select(MeetingAction).join(Meeting).where(
                MeetingAction.id == action_id,
                Meeting.user_id == user_id
            )
            action = session.exec(statement).first()
            
            if not action:
                return None
                
            action.status = status
            session.add(action)
            session.commit()
            session.refresh(action)
            return action
