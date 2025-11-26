"""
AI Assistant Service - Provides RAG-powered AI features across the application
"""

import structlog
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.services.vector_store_service import VectorStoreService
from app.services.llm_service import LLMService

logger = structlog.get_logger(__name__)


class AIAssistantService:
    """
    Unified AI assistant service that leverages the RAG system
    to provide intelligent features across the application.
    """
    
    def __init__(self):
        self.vector_store = VectorStoreService(collection_name="unified_knowledge")
        self.llm_service = LLMService()
    
    async def answer_question(
        self,
        question: str,
        user_id: str,
        context_type: Optional[str] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Answer a question using RAG to find relevant context.
        
        Args:
            question: The user's question
            user_id: User ID for isolation
            context_type: Optional filter (meeting, document, test_case)
            limit: Max number of context chunks to retrieve
            
        Returns:
            Dict with answer, sources, and metadata
        """
        try:
            # Search RAG for relevant context
            results = self.vector_store.search(
                query=question,
                user_id=user_id,
                limit=limit,
                entity_type=context_type
            )
            
            if not results:
                return {
                    "answer": "I don't have enough information to answer that question. Try uploading relevant documents or creating meetings with summaries.",
                    "sources": [],
                    "confidence": "low"
                }
            
            # Build context from results
            context_parts = []
            for i, r in enumerate(results, 1):
                entity_type = r["entity_type"]
                content = r["content"][:500]  # Limit context size
                context_parts.append(f"[Source {i} - {entity_type}]\n{content}")
            
            context = "\n\n".join(context_parts)
            
            # Generate answer with LLM
            system_prompt = """You are a helpful AI assistant that answers questions based on the user's knowledge base.
            
Rules:
1. Always cite your sources by number (e.g., "According to Source 1...")
2. If the context doesn't contain enough information, say so clearly
3. Be concise but thorough
4. If multiple sources conflict, mention both perspectives
5. Use bullet points for lists and clarity"""
            
            prompt = f"""Question: {question}

Context from knowledge base:
{context}

Please answer the question based on the context provided. Cite your sources."""
            
            answer = await self.llm_service.generate_text(
                prompt=prompt,
                user_id=user_id,
                system_prompt=system_prompt
            )
            
            # Format sources for response
            sources = [
                {
                    "id": r["entity_id"],
                    "type": r["entity_type"],
                    "snippet": r["content"][:200],
                    "relevance": 1.0 - r["distance"] if r["distance"] else 0.0,
                    "metadata": r["metadata"]
                }
                for r in results[:5]  # Return top 5 sources
            ]
            
            logger.info(
                "Answered question",
                user_id=user_id,
                question=question[:50],
                sources_count=len(sources)
            )
            
            return {
                "answer": answer,
                "sources": sources,
                "confidence": "high" if len(results) >= 3 else "medium"
            }
            
        except Exception as e:
            logger.error(f"Failed to answer question: {e}", error=str(e))
            return {
                "answer": "I encountered an error while processing your question. Please try again.",
                "sources": [],
                "confidence": "error"
            }
    
    async def get_recommendations(
        self,
        content: str,
        user_id: str,
        entity_type: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get recommendations for similar content.
        
        Args:
            content: The content to find similar items for
            user_id: User ID for isolation
            entity_type: Type of entity to search for
            limit: Max number of recommendations
            
        Returns:
            List of similar items with metadata
        """
        try:
            results = self.vector_store.search(
                query=content[:1000],  # Limit query size
                user_id=user_id,
                limit=limit,
                entity_type=entity_type
            )
            
            recommendations = [
                {
                    "id": r["entity_id"],
                    "type": r["entity_type"],
                    "snippet": r["content"][:300],
                    "similarity_score": 1.0 - r["distance"] if r["distance"] else 0.0,
                    "metadata": r["metadata"]
                }
                for r in results
            ]
            
            logger.info(
                "Generated recommendations",
                user_id=user_id,
                entity_type=entity_type,
                count=len(recommendations)
            )
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to get recommendations: {e}", error=str(e))
            return []
    
    async def suggest_tags(
        self,
        content: str,
        user_id: str,
        entity_type: Optional[str] = None
    ) -> List[str]:
        """
        Suggest tags based on similar content.
        
        Args:
            content: The content to analyze
            user_id: User ID for isolation
            entity_type: Optional entity type filter
            
        Returns:
            List of suggested tags
        """
        try:
            # Find similar entities
            results = self.vector_store.search(
                query=content[:500],
                user_id=user_id,
                limit=10,
                entity_type=entity_type
            )
            
            # Extract and count tags
            from collections import Counter
            all_tags = []
            
            for r in results:
                tags_str = r["metadata"].get("tags", "")
                if tags_str:
                    tags = [t.strip() for t in tags_str.split(",") if t.strip()]
                    all_tags.extend(tags)
            
            # Return most common tags
            if not all_tags:
                return []
            
            tag_counts = Counter(all_tags)
            suggested = [tag for tag, count in tag_counts.most_common(5)]
            
            logger.info(
                "Suggested tags",
                user_id=user_id,
                tags=suggested
            )
            
            return suggested
            
        except Exception as e:
            logger.error(f"Failed to suggest tags: {e}", error=str(e))
            return []
    
    async def check_duplicate(
        self,
        content: str,
        user_id: str,
        entity_type: str,
        threshold: float = 0.85
    ) -> Optional[Dict[str, Any]]:
        """
        Check if content is very similar to existing content.
        
        Args:
            content: The content to check
            user_id: User ID for isolation
            entity_type: Type of entity
            threshold: Similarity threshold (0-1)
            
        Returns:
            Dict with duplicate info if found, None otherwise
        """
        try:
            results = self.vector_store.search(
                query=content,
                user_id=user_id,
                limit=3,
                entity_type=entity_type
            )
            
            # Check if any result is very similar
            for result in results:
                similarity = 1.0 - result["distance"] if result["distance"] else 0.0
                
                if similarity > threshold:
                    logger.warning(
                        "Potential duplicate detected",
                        user_id=user_id,
                        entity_type=entity_type,
                        similarity=similarity
                    )
                    
                    return {
                        "is_duplicate": True,
                        "similar_to_id": result["entity_id"],
                        "similarity_score": similarity,
                        "message": f"This looks very similar to an existing {entity_type}",
                        "existing_content": result["content"][:200]
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to check duplicate: {e}", error=str(e))
            return None
    
    async def get_meeting_context(
        self,
        question: str,
        user_id: str,
        meeting_id: str
    ) -> Dict[str, Any]:
        """
        Get context for a question asked during a meeting.
        Searches past meetings, documents, and test cases.
        
        Args:
            question: The question asked
            user_id: User ID
            meeting_id: Current meeting ID
            
        Returns:
            Dict with answer and categorized sources
        """
        try:
            # Search across all entity types
            results = self.vector_store.search(
                query=question,
                user_id=user_id,
                limit=10
            )
            
            # Categorize results
            meetings = [r for r in results if r["entity_type"] == "meeting" and r["entity_id"] != meeting_id]
            documents = [r for r in results if r["entity_type"] == "document"]
            test_cases = [r for r in results if r["entity_type"] == "test_case"]
            
            # Build context
            context_parts = []
            if meetings:
                context_parts.append("From past meetings:\n" + "\n".join([m["content"][:300] for m in meetings[:2]]))
            if documents:
                context_parts.append("From documents:\n" + "\n".join([d["content"][:300] for d in documents[:2]]))
            if test_cases:
                context_parts.append("From test cases:\n" + "\n".join([t["content"][:300] for t in test_cases[:2]]))
            
            context = "\n\n".join(context_parts)
            
            # Generate answer
            system_prompt = """You are an AI meeting assistant. Provide concise, actionable answers based on past meetings, documents, and test cases.
            
Focus on:
1. Key decisions made in the past
2. Relevant action items
3. Important context from documents
4. Related test cases or requirements"""
            
            prompt = f"""Question: {question}
            
Context:
{context}

Please provide a concise answer based on the context."""

            answer = await self.llm_service.generate_text(
                prompt=prompt,
                user_id=user_id,
                system_prompt=system_prompt
            )
            
            return {
                "answer": answer,
                "related_meetings": meetings[:3],
                "related_documents": documents[:3],
                "related_test_cases": test_cases[:2]
            }
            
        except Exception as e:
            logger.error(f"Failed to get meeting context: {e}", error=str(e))
            return {
                "answer": "I encountered an error while searching for context.",
                "related_meetings": [],
                "related_documents": [],
                "related_test_cases": []
            }
