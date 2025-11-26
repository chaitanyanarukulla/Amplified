"""
Knowledge Router - Powers the Knowledge Vault UI with RAG
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
import structlog

from app.auth_dependencies import get_current_user
from app.models import User
from app.services.ai_assistant_service import AIAssistantService
from app.services.vector_store_service import VectorStoreService

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/knowledge", tags=["knowledge"])
ai_assistant = AIAssistantService()
vector_store = VectorStoreService(collection_name="unified_knowledge")


class AskRequest(BaseModel):
    question: str
    context_type: Optional[str] = None  # meeting, document, test_case


class SearchResult(BaseModel):
    entity_id: str
    entity_type: str
    content: str
    relevance_score: float
    metadata: dict


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total_results: int


@router.post("/ask")
async def ask_knowledge_base(
    request: AskRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Ask a question and get AI-powered answer from knowledge base.
    This powers the Knowledge Vault Q&A feature.
    """
    result = await ai_assistant.answer_question(
        question=request.question,
        user_id=current_user.id,
        context_type=request.context_type
    )
    return result


@router.get("/search")
async def search_knowledge(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=50),
    entity_type: Optional[str] = Query(None, description="Filter by type"),
    current_user: User = Depends(get_current_user)
):
    """
    Semantic search across all knowledge (documents, meetings, test cases).
    Enhanced version that returns formatted results for the UI.
    """
    try:
        results = vector_store.search(
            query=q,
            user_id=current_user.id,
            limit=limit,
            entity_type=entity_type
        )
        
        search_results = []
        for result in results:
            search_results.append(SearchResult(
                entity_id=result["entity_id"],
                entity_type=result["entity_type"],
                content=result["content"],
                relevance_score=1.0 - result["distance"] if result["distance"] else 0.0,
                metadata=result["metadata"]
            ))
        
        return SearchResponse(
            query=q,
            results=search_results,
            total_results=len(search_results)
        )
        
    except Exception as e:
        logger.error(f"Knowledge search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_knowledge_stats(
    current_user: User = Depends(get_current_user)
):
    """Get statistics about indexed knowledge"""
    try:
        user_id = current_user.id
        
        # Get counts by entity type
        entity_types = ["document", "meeting", "test_case"]
        stats = {}
        
        for entity_type in entity_types:
            results = vector_store.search(
                query="",
                user_id=user_id,
                limit=1000,
                entity_type=entity_type
            )
            stats[entity_type] = len(results)
        
        return {
            "user_id": user_id,
            "indexed_artifacts": stats,
            "total_artifacts": sum(stats.values())
        }
        
    except Exception as e:
        logger.error(f"Failed to get knowledge stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggest-tags")
async def suggest_tags(
    content: str,
    entity_type: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Suggest tags based on similar content"""
    tags = await ai_assistant.suggest_tags(
        content=content,
        user_id=current_user.id,
        entity_type=entity_type
    )
    return {"suggested_tags": tags}


@router.post("/check-duplicate")
async def check_duplicate(
    content: str,
    entity_type: str,
    current_user: User = Depends(get_current_user)
):
    """Check if content is similar to existing content"""
    result = await ai_assistant.check_duplicate(
        content=content,
        user_id=current_user.id,
        entity_type=entity_type
    )
    return result or {"is_duplicate": False}
