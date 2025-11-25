"""
Unified Vector Store Service
Handles all RAG indexing and retrieval operations across different artifact types.
"""

import structlog
from typing import List, Dict, Any, Optional
from datetime import datetime
import chromadb
from chromadb.config import Settings

logger = structlog.get_logger(__name__)


class SearchableEntity:
    """
    Unified model for all indexable artifacts.
    This is the interface that all services should adapt to before indexing.
    """
    def __init__(
        self,
        entity_id: str,
        entity_type: str,
        content: str,
        user_id: str,
        created_at: datetime,
        updated_at: datetime,
        parent_id: Optional[str] = None,
        project_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.entity_id = entity_id
        self.entity_type = entity_type  # "meeting", "document", "test_case", "jira_ticket"
        self.content = content
        self.user_id = user_id
        self.parent_id = parent_id
        self.project_id = project_id
        self.created_at = created_at
        self.updated_at = updated_at
        self.metadata = metadata or {}
        
    def to_chroma_format(self, chunk_index: int = 0) -> Dict[str, Any]:
        """Convert to ChromaDB format"""
        chunk_id = f"{self.entity_id}_{chunk_index}"
        
        metadata = {
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            **self.metadata
        }
        
        if self.parent_id:
            metadata["parent_id"] = self.parent_id
        if self.project_id:
            metadata["project_id"] = self.project_id
            
        return {
            "id": chunk_id,
            "document": self.content,
            "metadata": metadata
        }


class VectorStoreService:
    """
    Generic service for vector store operations.
    All artifact-specific services should use this for RAG operations.
    """
    
    def __init__(self, collection_name: str = "unified_knowledge"):
        self.chroma_client = chromadb.PersistentClient(path="./amplified_vectors")
        self.collection = self.chroma_client.get_or_create_collection(name=collection_name)
        logger.info(f"VectorStoreService initialized with collection: {collection_name}")
        
    def index_entity(
        self,
        entity: SearchableEntity,
        chunk_size: int = 1000,
        overlap: int = 100
    ) -> int:
        """
        Index a searchable entity into the vector store.
        
        Args:
            entity: The entity to index
            chunk_size: Size of text chunks
            overlap: Overlap between chunks
            
        Returns:
            Number of chunks created
        """
        try:
            # First, delete any existing chunks for this entity (for updates)
            self.delete_by_entity_id(entity.entity_id, entity.user_id)
            
            # Chunk the content
            chunks = self._chunk_text(entity.content, chunk_size, overlap)
            
            if not chunks:
                logger.warning(f"No chunks created for entity {entity.entity_id}")
                return 0
            
            # Prepare batch data
            ids = []
            documents = []
            metadatas = []
            
            for i, chunk in enumerate(chunks):
                chunk_data = entity.to_chroma_format(chunk_index=i)
                ids.append(chunk_data["id"])
                documents.append(chunk)
                metadatas.append(chunk_data["metadata"])
            
            # Add to ChromaDB
            self.collection.add(
                ids=ids,
                documents=documents,
                metadatas=metadatas
            )
            
            logger.info(
                f"Indexed {len(chunks)} chunks for {entity.entity_type} {entity.entity_id}",
                entity_type=entity.entity_type,
                entity_id=entity.entity_id,
                chunk_count=len(chunks)
            )
            
            return len(chunks)
            
        except Exception as e:
            logger.error(
                f"Failed to index entity {entity.entity_id}: {e}",
                entity_id=entity.entity_id,
                error=str(e)
            )
            raise
    
    def search(
        self,
        query: str,
        user_id: str,
        limit: int = 5,
        entity_type: Optional[str] = None,
        project_id: Optional[str] = None,
        additional_filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for relevant chunks across all indexed entities.
        
        Args:
            query: Search query
            user_id: User ID for isolation
            limit: Maximum number of results
            entity_type: Optional filter by entity type
            project_id: Optional filter by project
            additional_filters: Additional metadata filters
            
        Returns:
            List of matching chunks with metadata
        """
        try:
            # Build where filter using ChromaDB's $and operator
            conditions = [{"user_id": {"$eq": user_id}}]
            
            if entity_type:
                conditions.append({"entity_type": {"$eq": entity_type}})
            
            if project_id:
                conditions.append({"project_id": {"$eq": project_id}})
                
            if additional_filters:
                for key, value in additional_filters.items():
                    conditions.append({key: {"$eq": value}})
            
            # Build the where clause
            where_filter = {"$and": conditions} if len(conditions) > 1 else conditions[0]
            
            results = self.collection.query(
                query_texts=[query],
                n_results=limit,
                where=where_filter
            )
            
            # Format results
            formatted_results = []
            if results['documents'] and results['documents'][0]:
                for i, doc_text in enumerate(results['documents'][0]):
                    metadata = results['metadatas'][0][i]
                    distance = results['distances'][0][i] if 'distances' in results else None
                    
                    formatted_results.append({
                        "entity_id": metadata.get('entity_id'),
                        "entity_type": metadata.get('entity_type'),
                        "content": doc_text,
                        "metadata": metadata,
                        "distance": distance
                    })
            
            logger.info(
                f"Search returned {len(formatted_results)} results",
                query=query[:50],
                user_id=user_id,
                result_count=len(formatted_results)
            )
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Search failed: {e}", error=str(e))
            raise
    
    def delete_by_entity_id(self, entity_id: str, user_id: str) -> None:
        """
        Delete all chunks associated with an entity.
        This is used for both updates (delete then re-index) and hard deletes.
        
        Args:
            entity_id: The entity ID to delete
            user_id: User ID for verification
        """
        try:
            # ChromaDB requires $and operator for multiple conditions
            self.collection.delete(
                where={
                    "$and": [
                        {"entity_id": {"$eq": entity_id}},
                        {"user_id": {"$eq": user_id}}
                    ]
                }
            )
            logger.info(
                f"Deleted all chunks for entity {entity_id}",
                entity_id=entity_id,
                user_id=user_id
            )
        except Exception as e:
            logger.error(
                f"Failed to delete entity {entity_id}: {e}",
                entity_id=entity_id,
                error=str(e)
            )
            # Don't raise - deletion might fail if entity doesn't exist, which is OK

    
    def _chunk_text(
        self,
        text: str,
        chunk_size: int = 1000,
        overlap: int = 100
    ) -> List[str]:
        """
        Simple text chunking with overlap.
        TODO: Implement semantic chunking for better context preservation.
        """
        if not text or len(text.strip()) == 0:
            return []
            
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end].strip()
            
            if chunk:
                chunks.append(chunk)
            
            start = end - overlap
            
        return chunks
    
    def get_entity_chunk_count(self, entity_id: str, user_id: str) -> int:
        """Get the number of chunks for a specific entity"""
        try:
            results = self.collection.get(
                where={
                    "$and": [
                        {"entity_id": {"$eq": entity_id}},
                        {"user_id": {"$eq": user_id}}
                    ]
                }
            )
            return len(results['ids']) if results['ids'] else 0
        except Exception as e:
            logger.error(f"Failed to get chunk count: {e}")
            return 0
