"""
Unified Knowledge Search Router
Provides RAG-powered search across all indexed artifacts (documents, meetings, test cases, etc.)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
import structlog

from app.auth_dependencies import get_current_user
from app.services.vector_store_service import VectorStoreService

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

# Initialize vector store service
vector_store = VectorStoreService(collection_name="unified_knowledge")


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


@router.get("/search", response_model=SearchResponse)
async def search_knowledge(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (document, meeting, test_case)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Search across all indexed knowledge artifacts.
    
    This endpoint uses RAG to find relevant content from:
    - Documents (uploaded files, specs, BRDs, etc.)
    - Meetings (summaries and action items)
    - Test Cases (generated test suites)
    - Jira Tickets (synced tickets)
    """
    try:
        user_id = current_user["id"]
        
        results = vector_store.search(
            query=q,
            user_id=user_id,
            limit=limit,
            entity_type=entity_type
        )
        
        # Format results
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
        logger.error(f"Knowledge search failed: {e}", error=str(e))
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/stats")
async def get_knowledge_stats(
    current_user: dict = Depends(get_current_user)
):
    """
    Get statistics about indexed knowledge for the current user.
    """
    try:
        user_id = current_user["id"]
        
        # Get counts by entity type
        entity_types = ["document", "meeting", "test_case", "jira_ticket"]
        stats = {}
        
        for entity_type in entity_types:
            # Do a dummy search to get count (not ideal, but works for now)
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
