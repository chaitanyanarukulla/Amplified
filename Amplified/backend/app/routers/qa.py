from fastapi import APIRouter, HTTPException, Depends
import logging
from app.models import QARequest, User
from app.dependencies import document_service
from app.services.session_manager import session_manager
from app.auth_dependencies import get_current_user

router = APIRouter(prefix="/qa", tags=["qa"])
logger = logging.getLogger(__name__)

@router.post("/meeting")
async def generate_qa_response(
    request: QARequest,
    current_user: User = Depends(get_current_user)
):
    """Generate a suggested answer using RAG + Context"""
    try:
        question = request.question
        
        # If no question provided, try to find one from active session (if meeting_id matches)
        # For now, we'll just require a question or use a placeholder if testing
        if not question:
            # TODO: Implement logic to fetch last question from session transcript if available
            question = "Tell me about yourself." # Fallback
            
        # 1. Retrieve Context (RAG)
        # Filter by user_id
        relevant_docs = document_service.search_documents(question, limit=3, user_id=current_user.id)
        
        # Format docs for prompt
        doc_context = ""
        for doc in relevant_docs:
            doc_context += f"--- Document: {doc['filename']} ---\n{doc['snippet']}\n\n"
            
        # 2. Get Base Context (Resume, JD, Notes)
        # We need to access the context engine. 
        # Ideally we should pass session_id to get specific context, but for now we use "default" or global
        # In a real app, meeting_id would link to a user/session.
        
        # We can use session_manager to find the session if active
        # Use user_id as session_id for now
        session_id = current_user.id
        
        # Note: ContextEngine is currently global/singleton
        # We need to ensure we get context relevant to the user
        base_context = await session_manager.context_engine.get_full_context()
        
        # 3. Combine Context
        full_context = base_context.copy()
        full_context["relevant_documents"] = doc_context
        
        # 4. Generate Answer
        # Pass user_id to generate_answer to use user's preferred engine
        suggestion = await session_manager.llm_service.generate_answer(
            question=question,
            context=full_context,
            user_id=current_user.id
        )
        
        return suggestion
        
    except Exception as e:
        logger.error(f"QA generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
