"""
Neural Engine API Router
Endpoints for managing user LLM engine preferences
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import logging

from app.models import NeuralEnginePreference, User
from app.services.llm_router import llm_router
from app.auth_dependencies import get_current_user

router = APIRouter(prefix="/neural-engine", tags=["neural-engine"])
logger = logging.getLogger(__name__)


@router.get("")
async def get_neural_engine(current_user: User = Depends(get_current_user)):
    """
    Get the currently selected neural engine for the user
    
    Returns:
        dict: {"selected_engine": "openai_gpt4o"}
    """
    try:
        selected_engine = llm_router.get_user_engine(user_id=current_user.id)
        return {"selected_engine": selected_engine}
    except Exception as e:
        logger.error(f"Failed to get neural engine preference: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve engine preference")


@router.post("")
async def set_neural_engine(
    preference: NeuralEnginePreference,
    current_user: User = Depends(get_current_user)
):
    """
    Set the neural engine preference for the user
    
    Args:
        preference: NeuralEnginePreference with selected_engine field
        
    Returns:
        dict: {"status": "success", "selected_engine": "local_llm"}
    """
    # Validate engine value
    if preference.selected_engine not in llm_router.VALID_ENGINES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid engine. Must be one of: {', '.join(llm_router.VALID_ENGINES)}"
        )
    
    # Validate configuration for the selected engine
    validation_error = _validate_engine_config(preference.selected_engine)
    if validation_error:
        raise HTTPException(
            status_code=400,
            detail=validation_error
        )
    
    try:
        success = llm_router.set_user_engine(
            engine_name=preference.selected_engine,
            user_id=current_user.id
        )
        
        if success:
            return {
                "status": "success",
                "selected_engine": preference.selected_engine
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update engine preference")
    except Exception as e:
        logger.error(f"Failed to set neural engine preference: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _validate_engine_config(engine_name: str) -> str:
    """
    Validate that the selected engine is properly configured
    
    Args:
        engine_name: The engine to validate
        
    Returns:
        Error message if validation fails, None if valid
    """
    import os
    
    if engine_name == "openai_gpt4o":
        if not llm_router.openai_client:
            return "OpenAI is not configured. Please set OPENAI_API_KEY in your environment variables."
    
    elif engine_name == "claude_3_5_sonnet":
        if not llm_router.claude_client:
            return (
                "Claude is not configured. Please:\n"
                "1. Install the Anthropic SDK: pip install anthropic\n"
                "2. Set ANTHROPIC_API_KEY in your environment variables"
            )
    
    elif engine_name == "local_llm":
        # Check if Ollama is reachable
        import requests
        ollama_url = os.getenv("LOCAL_LLM_URL", "http://localhost:11434")
        try:
            response = requests.get(f"{ollama_url}/api/tags", timeout=2)
            if response.status_code != 200:
                return f"Ollama is not responding correctly at {ollama_url}. Please ensure Ollama is running."
        except requests.exceptions.ConnectionError:
            return (
                f"Cannot connect to Ollama at {ollama_url}. Please ensure:\n"
                "1. Ollama is installed (visit https://ollama.ai)\n"
                "2. Ollama is running (run 'ollama serve' if needed)\n"
                f"3. Ollama is accessible at {ollama_url}"
            )
        except Exception as e:
            return f"Error checking Ollama availability: {str(e)}"
    
    return None

