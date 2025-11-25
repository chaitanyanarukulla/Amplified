"""
Backfill Script - Index Existing Data into RAG System

This script indexes all existing documents and meetings into the unified vector store.
Run this once after deploying the new RAG system to populate it with historical data.

Usage:
    python backfill_rag.py
"""

import asyncio
import structlog
from sqlmodel import Session, select
from datetime import datetime

from app.database import engine
from app.models import Document, Meeting, MeetingSummary, MeetingAction
from app.services.vector_store_service import VectorStoreService, SearchableEntity

logger = structlog.get_logger(__name__)

vector_store = VectorStoreService(collection_name="unified_knowledge")


async def backfill_documents():
    """Index all existing documents"""
    logger.info("Starting document backfill...")
    
    with Session(engine) as session:
        statement = select(Document)
        documents = session.exec(statement).all()
        
        indexed_count = 0
        failed_count = 0
        
        for doc in documents:
            try:
                if not doc.extracted_text:
                    logger.warning(f"Skipping document {doc.id} - no extracted text")
                    continue
                
                entity = SearchableEntity(
                    entity_id=doc.id,
                    entity_type="document",
                    content=doc.extracted_text,
                    user_id=doc.user_id,
                    created_at=doc.created_at,
                    updated_at=doc.created_at,
                    metadata={
                        "filename": doc.name,
                        "doc_type": doc.type,
                        "tags": doc.tags or ""
                    }
                )
                
                chunk_count = vector_store.index_entity(entity)
                indexed_count += 1
                logger.info(f"Indexed document {doc.id} ({doc.name}) - {chunk_count} chunks")
                
            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to index document {doc.id}: {e}")
        
        logger.info(f"Document backfill complete: {indexed_count} indexed, {failed_count} failed")


async def backfill_meetings():
    """Index all existing meetings with summaries"""
    logger.info("Starting meeting backfill...")
    
    with Session(engine) as session:
        # Get all meetings that have summaries
        statement = select(Meeting).join(MeetingSummary)
        meetings = session.exec(statement).all()
        
        indexed_count = 0
        failed_count = 0
        
        for meeting in meetings:
            try:
                # Get summaries and actions
                summaries = session.exec(
                    select(MeetingSummary).where(MeetingSummary.meeting_id == meeting.id)
                ).all()
                
                actions = session.exec(
                    select(MeetingAction).where(MeetingAction.meeting_id == meeting.id)
                ).all()
                
                if not summaries:
                    logger.warning(f"Skipping meeting {meeting.id} - no summaries")
                    continue
                
                # Combine all summaries (for multi-session meetings)
                short_summary = "\n".join([s.short_summary for s in summaries])
                detailed_summary = "\n\n".join([s.detailed_summary for s in summaries if s.detailed_summary])
                
                # Format action items
                action_text = "\n".join([
                    f"- {action.description} (Owner: {action.owner or 'Unknown'})"
                    for action in actions
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
                    entity_id=meeting.id,
                    entity_type="meeting",
                    content=content,
                    user_id=meeting.user_id,
                    created_at=meeting.created_at,
                    updated_at=datetime.now(),
                    metadata={
                        "meeting_title": meeting.title,
                        "platform": meeting.platform or "unknown",
                        "tags": meeting.tags or "",
                        "action_count": len(actions)
                    }
                )
                
                chunk_count = vector_store.index_entity(entity)
                indexed_count += 1
                logger.info(f"Indexed meeting {meeting.id} ({meeting.title}) - {chunk_count} chunks")
                
            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to index meeting {meeting.id}: {e}")
        
        logger.info(f"Meeting backfill complete: {indexed_count} indexed, {failed_count} failed")


async def main():
    """Run all backfill operations"""
    logger.info("=== Starting RAG Backfill ===")
    
    await backfill_documents()
    await backfill_meetings()
    
    logger.info("=== Backfill Complete ===")


if __name__ == "__main__":
    from app.core.logging import setup_logging
    setup_logging()
    
    asyncio.run(main())
