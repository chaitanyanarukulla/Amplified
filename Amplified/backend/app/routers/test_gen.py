from fastapi import APIRouter, HTTPException, Depends, UploadFile, Form
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import structlog
import json
import uuid
import pandas as pd
from datetime import datetime
from sqlmodel import Session, select
from io import BytesIO

from app.database import engine
from app.models import TestCaseGeneration, User
from app.services.jira_service import JiraService
from app.services.session_manager import session_manager
from app.services.vector_store_service import VectorStoreService, SearchableEntity
from app.auth_dependencies import get_current_user

router = APIRouter(prefix="/test-gen", tags=["test-gen"])
logger = structlog.get_logger(__name__)
jira_service = JiraService()
vector_store = VectorStoreService(collection_name="unified_knowledge")

# --- Request/Response Models ---

class JiraConfig(BaseModel):
    base_url: str
    email: str
    api_token: Optional[str] = None  # Optional for updates

class TicketRequest(BaseModel):
    ticket_key: str

class GenerateRequest(BaseModel):
    ticket_data: Dict[str, Any]
    context: Optional[str] = None

class SaveRequest(BaseModel):
    ticket_key: str
    ticket_title: str
    raw_story_data: Dict[str, Any]
    generated_test_cases: Dict[str, Any]

# --- Endpoints ---

@router.post("/config")
async def save_config(
    config: JiraConfig,
    current_user: User = Depends(get_current_user)
):
    """Save Jira configuration"""
    try:
        # If api_token is not provided, keep the existing one
        if config.api_token:
            jira_service.save_settings(config.base_url, config.email, config.api_token, user_id=current_user.id)
        else:
            # Update only base_url and email, keep existing token
            existing = jira_service.get_settings(user_id=current_user.id)
            if not existing:
                raise HTTPException(status_code=400, detail="Cannot update: no existing configuration found. API token is required for new configuration.")
            
            jira_service.save_settings(
                config.base_url,
                config.email,
                jira_service.encryption_service.decrypt(existing.api_token_encrypted),
                user_id=current_user.id
            )
        
        return {"status": "success", "message": "Settings saved"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
async def get_config(current_user: User = Depends(get_current_user)):
    """Get current configuration (masked)"""
    settings = jira_service.get_settings(user_id=current_user.id)
    if not settings:
        return {"configured": False}
    
    return {
        "configured": True,
        "base_url": settings.base_url,
        "email": settings.email,
        "has_token": True
    }

@router.post("/validate")
async def validate_connection(current_user: User = Depends(get_current_user)):
    """Validate Jira connection with detailed diagnostics"""
    try:
        # Check if settings exist
        settings = jira_service.get_settings(user_id=current_user.id)
        if not settings:
            return {
                "valid": False,
                "error": "No Jira configuration found",
                "details": "Please configure your Jira settings first"
            }
        
        # Test authentication
        is_valid = await jira_service.validate_connection(user_id=current_user.id)
        
        if is_valid:
            return {
                "valid": True,
                "message": "Connection successful",
                "base_url": settings.base_url,
                "email": settings.email
            }
        else:
            return {
                "valid": False,
                "error": "Authentication failed",
                "details": "Please check your email and API token",
                "base_url": settings.base_url,
                "email": settings.email
            }
    except Exception as e:
        logger.error(f"Validation error: {e}")
        return {
            "valid": False,
            "error": "Validation failed",
            "details": str(e)
        }

@router.post("/fetch-ticket")
async def fetch_ticket(
    request: TicketRequest,
    current_user: User = Depends(get_current_user)
):
    """Fetch ticket details from Jira"""
    try:
        ticket = await jira_service.fetch_ticket(request.ticket_key, user_id=current_user.id)
        return ticket
    except ValueError as e:
        # Handle known errors (not found, auth, etc.)
        error_msg = str(e)
        status_code = 404 if "not found" in error_msg.lower() else 400
        raise HTTPException(status_code=status_code, detail=error_msg)
    except Exception as e:
        logger.error(f"Fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate")
async def generate_test_cases(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate test cases using LLM"""
    try:
        ticket = request.ticket_data
        
        system_prompt = "You are an expert QA engineer and test architect. Your goal is to create comprehensive, risk-based test coverage."
        
        prompt = f"""
        Generate comprehensive test cases for this Jira story:
        
        Ticket: {ticket.get('key')}
        Summary: {ticket.get('summary')}
        Description: {ticket.get('description')}
        Acceptance Criteria: {ticket.get('raw', {}).get('fields', {}).get('customfield_10000', 'Not specified')}
        
        Instructions:
        1. **Risk Analysis**: Identify the highest-risk areas (e.g., data validation, edge cases, security).
        2. **Coverage**: Ensure test cases cover:
           - Positive scenarios (happy path)
           - Negative scenarios (invalid inputs, error handling)
           - Edge cases (boundary values, empty states)
           - Exploratory ideas (creative scenarios to break the feature)
        3. **Traceability**: Map each test case to a specific acceptance criterion if available.
        
        Output Format (JSON):
        {{
            "test_cases": [
                {{
                    "type": "positive|negative|edge|exploratory",
                    "title": "Clear, action-oriented test case title",
                    "steps": ["Step 1", "Step 2", "Step 3"],
                    "expected_result": "Specific, measurable expected outcome",
                    "priority": "high|medium|low"
                }}
            ]
        }}
        """
        
        # Pass user_id to generate_json to use user's preferred engine
        result = await session_manager.llm_service.generate_json(prompt, user_id=current_user.id, system_prompt=system_prompt)
        return result
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save")
async def save_test_cases(
    request: SaveRequest,
    current_user: User = Depends(get_current_user)
):
    """Save generated test cases and index them for RAG"""
    try:
        with Session(engine) as session:
            generation = TestCaseGeneration(
                id=f"tc_{uuid.uuid4().hex[:8]}",
                user_id=current_user.id,
                jira_ticket_key=request.ticket_key,
                jira_title=request.ticket_title,
                raw_story_data=json.dumps(request.raw_story_data),
                generated_test_cases=json.dumps(request.generated_test_cases)
            )
            session.add(generation)
            session.commit()
            
            # Index test cases for RAG
            await _index_test_cases(
                generation_id=generation.id,
                ticket_key=request.ticket_key,
                ticket_title=request.ticket_title,
                test_cases=request.generated_test_cases,
                user_id=current_user.id
            )
            
            return {"status": "success", "id": generation.id}
    except Exception as e:
        logger.error(f"Save failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _index_test_cases(
    generation_id: str,
    ticket_key: str,
    ticket_title: str,
    test_cases: Dict[str, Any],
    user_id: str
):
    """Index test cases into vector store for RAG"""
    try:
        # Format test cases as searchable text
        test_case_list = test_cases.get("test_cases", [])
        
        formatted_cases = []
        for i, tc in enumerate(test_case_list, 1):
            tc_type = tc.get("type", "unknown")
            title = tc.get("title", "Untitled")
            steps = tc.get("steps", [])
            expected = tc.get("expected_result", "")
            priority = tc.get("priority", "medium")
            
            formatted = f"""Test Case {i}: {title}
Type: {tc_type}
Priority: {priority}

Steps:
{chr(10).join([f"{j}. {step}" for j, step in enumerate(steps, 1)])}

Expected Result:
{expected}
"""
            formatted_cases.append(formatted)
        
        content = f"""Test Suite for: {ticket_key} - {ticket_title}

Total Test Cases: {len(test_case_list)}

{chr(10).join(formatted_cases)}
"""
        
        entity = SearchableEntity(
            entity_id=generation_id,
            entity_type="test_case",
            content=content,
            user_id=user_id,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            metadata={
                "jira_ticket": ticket_key,
                "ticket_title": ticket_title,
                "test_count": len(test_case_list),
                "test_types": list(set(tc.get("type", "unknown") for tc in test_case_list))
            }
        )
        
        vector_store.index_entity(entity)
        logger.info(f"Indexed test suite {generation_id} for ticket {ticket_key}")
        
    except Exception as e:
        logger.error(f"Failed to index test cases {generation_id}: {e}")
        # Don't raise - indexing failure shouldn't block save


@router.get("/history")
async def get_history(current_user: User = Depends(get_current_user)):
    """Get history of generated test cases"""
    with Session(engine) as session:
        generations = session.exec(
            select(TestCaseGeneration)
            .where(TestCaseGeneration.user_id == current_user.id)
            .order_by(TestCaseGeneration.created_at.desc())
        ).all()
        return [
            {
                "id": g.id,
                "ticket_key": g.jira_ticket_key,
                "title": g.jira_title,
                "created_at": g.created_at
            }
            for g in generations
        ]

@router.post("/upload")
async def upload_file(
    file: UploadFile,
    upload_type: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Handle file uploads for various purposes"""
    from app.services.file_processing_service import FileProcessingService
    
    file_service = FileProcessingService()
    
    try:
        # Read file content
        content = await file.read()
        filename = file.filename.lower()
        
        if upload_type == "document":
            # Process requirements document
            if filename.endswith('.pdf'):
                text = await file_service.process_pdf(content)
            elif filename.endswith(('.doc', '.docx')):
                text = await file_service.process_word(content)
            elif filename.endswith('.txt'):
                text = await file_service.process_text(content)
            else:
                raise HTTPException(status_code=400, detail="Unsupported document format")
            
            # Generate test cases from document
            system_prompt = "You are an expert QA engineer specializing in requirements analysis and test design."
            
            prompt = f"""
            Generate test cases from the following requirements document:
            
            {text[:4000]}  # Limit to avoid token limits
            
            Instructions:
            1. **Extract Testable Requirements**: Identify all functional requirements.
            2. **Coverage**: Create test cases for positive, negative, and edge scenarios.
            3. **Clarity**: Each test case should be clear enough for a manual tester to execute.
            
            Output Format (JSON):
            {{
                "test_cases": [
                    {{
                        "type": "positive|negative|edge|exploratory",
                        "title": "Test Case Title",
                        "steps": ["Step 1", "Step 2"],
                        "expected_result": "Expected outcome"
                    }}
                ]
            }}
            """
            
            result = await session_manager.llm_service.generate_json(prompt, user_id=current_user.id, system_prompt=system_prompt)
            return {
                "type": "document",
                "source": file.filename,
                "title": f"Test Cases from {file.filename}",
                "content_preview": text[:200],
                "test_cases": result
            }
        
        elif upload_type == "batch":
            # Process batch Jira tickets
            if filename.endswith(('.csv', '.xlsx', '.xls')):
                ticket_ids = await file_service.process_excel_batch(content)
            else:
                raise HTTPException(status_code=400, detail="Batch processing requires CSV or Excel file")
            
            # Fetch and process each ticket
            results = []
            for ticket_id in ticket_ids[:10]:  # Limit to 10 for safety
                try:
                    ticket = await jira_service.fetch_ticket(ticket_id, user_id=current_user.id)
                    results.append({
                        "ticket_id": ticket_id,
                        "summary": ticket.get("summary"),
                        "status": "success"
                    })
                except Exception as e:
                    results.append({
                        "ticket_id": ticket_id,
                        "error": str(e),
                        "status": "failed"
                    })
            
            return {
                "type": "batch",
                "total": len(ticket_ids),
                "processed": len(results),
                "results": results
            }
        
        elif upload_type == "stories":
            # Process user stories
            if filename.endswith(('.txt', '.md')):
                text = await file_service.process_text(content)
            else:
                raise HTTPException(status_code=400, detail="User stories require TXT or MD file")
            
            # Generate test scenarios from user stories
            system_prompt = "You are an expert QA engineer specializing in requirements analysis and test design."
            
            prompt = f"""
            Generate test scenarios based on these user stories:
            
            {text[:4000]}
            
            Instructions:
            1. **Extract Testable Requirements**: Identify all functional requirements.
            2. **Coverage**: Create test cases for positive, negative, and edge scenarios.
            3. **Clarity**: Each test case should be clear enough for a manual tester to execute.
            
            Output Format (JSON):
            {{
                "test_cases": [
                    {{
                        "type": "positive|negative|edge|exploratory",
                        "title": "Test Scenario Title",
                        "steps": ["Step 1", "Step 2"],
                        "expected_result": "Expected outcome"
                    }}
                ]
            }}
            """
            
            result = await session_manager.llm_service.generate_json(prompt, user_id=current_user.id, system_prompt=system_prompt)
            return {
                "type": "stories",
                "source": file.filename,
                "title": f"Test Scenarios from {file.filename}",
                "content_preview": text[:200],
                "test_cases": result
            }
        
        elif upload_type == "import":
            # Import existing test cases
            if filename.endswith('.json'):
                data = await file_service.process_json_import(content)
            elif filename.endswith(('.csv', '.xlsx', '.xls')):
                # Convert Excel/CSV to test case format
                df = pd.read_excel(BytesIO(content)) if filename.endswith(('.xlsx', '.xls')) else pd.read_csv(BytesIO(content))
                test_cases = []
                for _, row in df.iterrows():
                    test_cases.append({
                        "type": row.get("Type", "positive"),
                        "title": row.get("Title", row.get("TestCase", "Untitled")),
                        "steps": str(row.get("Steps", "")).split("\n") if "Steps" in row else [],
                        "expected_result": row.get("ExpectedResult", row.get("Expected", ""))
                    })
                data = {"test_cases": test_cases}
            else:
                raise HTTPException(status_code=400, detail="Import requires JSON, CSV, or Excel file")
            
            return {
                "type": "import",
                "source": file.filename,
                "test_cases": data
            }
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown upload type: {upload_type}")
            
    except Exception as e:
        logger.error(f"File upload processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{generation_id}")
async def get_generation(
    generation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific generation"""
    with Session(engine) as session:
        # Verify ownership
        generation = session.exec(
            select(TestCaseGeneration).where(
                TestCaseGeneration.id == generation_id,
                TestCaseGeneration.user_id == current_user.id
            )
        ).first()
        
        if not generation:
            raise HTTPException(status_code=404, detail="Not found")
        
        return {
            "id": generation.id,
            "ticket_key": generation.jira_ticket_key,
            "title": generation.jira_title,
            "raw_story_data": json.loads(generation.raw_story_data),
            "generated_test_cases": json.loads(generation.generated_test_cases),
            "created_at": generation.created_at
        }

@router.delete("/{generation_id}")
async def delete_generation(
    generation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a test case generation from SQL and vector store"""
    with Session(engine) as session:
        # Verify ownership
        generation = session.exec(
            select(TestCaseGeneration).where(
                TestCaseGeneration.id == generation_id,
                TestCaseGeneration.user_id == current_user.id
            )
        ).first()
        
        if not generation:
            raise HTTPException(status_code=404, detail="Not found")
        
        # Delete from SQL
        session.delete(generation)
        session.commit()
    
    # Delete from vector store
    vector_store.delete_by_entity_id(generation_id, current_user.id)
    logger.info(f"Deleted test generation {generation_id} from SQL and vector store")
    
    return {"status": "success", "message": "Test generation deleted"}
