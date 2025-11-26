from fastapi import APIRouter, HTTPException, Depends, UploadFile, Form
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import structlog
import json
import uuid
from datetime import datetime
from sqlmodel import Session, select

from app.database import engine
from app.models import TestPlanGenerationHistory, User, ConfluenceSettings
from app.services.confluence_service import ConfluenceService
from app.services.session_manager import session_manager
from app.services.file_processing_service import FileProcessingService
from app.auth_dependencies import get_current_user

router = APIRouter(prefix="/test-plan", tags=["test-plan"])
logger = structlog.get_logger(__name__)
confluence_service = ConfluenceService()
file_service = FileProcessingService()

# --- Request Models ---

class ConfluenceConfig(BaseModel):
    base_url: str
    username: str
    api_token: Optional[str] = None

class ConfluenceGenerateRequest(BaseModel):
    page_url: str
    output_type: str = "test_plan" # test_plan | test_strategy
    test_levels: List[str] = []
    context: Optional[str] = None

class DocumentGenerateRequest(BaseModel):
    document_id: str
    output_type: str = "test_plan"
    test_levels: List[str] = []
    context: Optional[str] = None

# --- Endpoints ---

@router.post("/config")
async def save_config(
    config: ConfluenceConfig,
    current_user: User = Depends(get_current_user)
):
    """Save Confluence configuration"""
    try:
        if config.api_token:
            confluence_service.save_settings(
                config.base_url, 
                config.username, 
                config.api_token, 
                user_id=current_user.id
            )
        else:
            # Update non-sensitive fields only if token not provided
            existing = confluence_service.get_settings(user_id=current_user.id)
            if not existing:
                raise HTTPException(status_code=400, detail="API token required for new configuration")
            
            # Re-save with existing token (decrypted)
            token = confluence_service.encryption_service.decrypt(existing.api_token_encrypted)
            confluence_service.save_settings(
                config.base_url,
                config.username,
                token,
                user_id=current_user.id
            )
            
        return {"status": "success", "message": "Settings saved"}
    except Exception as e:
        logger.error(f"Failed to save settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
async def get_config(current_user: User = Depends(get_current_user)):
    """Get current configuration (masked)"""
    settings = confluence_service.get_settings(user_id=current_user.id)
    if not settings:
        return {"configured": False}
    
    return {
        "configured": True,
        "base_url": settings.base_url,
        "username": settings.username,
        "has_token": True
    }

@router.post("/validate")
async def validate_connection(current_user: User = Depends(get_current_user)):
    """Validate Confluence connection"""
    is_valid = confluence_service.validate_connection(user_id=current_user.id)
    if is_valid:
        return {"valid": True, "message": "Connection successful"}
    else:
        return {"valid": False, "error": "Connection failed. Check your settings."}

@router.post("/generate/confluence")
async def generate_from_confluence(
    request: ConfluenceGenerateRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate Test Plan/Strategy from Confluence page"""
    try:
        # 1. Resolve Page ID
        try:
            page_id = confluence_service.resolve_page_id_from_url(request.page_url, current_user.id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # 2. Fetch Content
        page_data = confluence_service.get_page_content(page_id, current_user.id)
        content = page_data.get("body", "")
        title = page_data.get("title", "Untitled Page")
        
        # 3. Generate
        return await _generate_plan(
            content=content,
            title=title,
            source_type="confluence",
            source_id=page_id,
            output_type=request.output_type,
            test_levels=request.test_levels,
            context=request.context,
            user_id=current_user.id
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Confluence generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate/document")
async def generate_from_document(
    file: UploadFile,
    output_type: str = Form("test_plan"),
    test_levels: str = Form(""), # Comma separated
    context: str = Form(""),
    current_user: User = Depends(get_current_user)
):
    """Generate Test Plan/Strategy from uploaded document"""
    try:
        # 1. Extract Text
        content = await file.read()
        filename = file.filename.lower()
        
        if filename.endswith('.pdf'):
            text = await file_service.process_pdf(content)
        elif filename.endswith(('.doc', '.docx')):
            text = await file_service.process_word(content)
        elif filename.endswith(('.txt', '.md')):
            text = await file_service.process_text(content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        # 2. Generate
        levels = [l.strip() for l in test_levels.split(",")] if test_levels else []
        
        return await _generate_plan(
            content=text,
            title=file.filename,
            source_type="uploaded_document",
            source_id=file.filename, # Using filename as ID for uploads for now
            output_type=output_type,
            test_levels=levels,
            context=context,
            user_id=current_user.id
        )

    except Exception as e:
        logger.error(f"Document generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def _generate_plan(
    content: str,
    title: str,
    source_type: str,
    source_id: str,
    output_type: str,
    test_levels: List[str],
    context: Optional[str],
    user_id: str
):
    """Core generation logic using LLM"""
    
    # Truncate content if too long (simple safety, ideally we chunk)
    # 50k chars is roughly 12k tokens, safe for GPT-4o/Claude
    safe_content = content[:50000] 
    
    role = "Seasoned Senior Automation Software Quality Engineer"
    task = "Test Plan" if output_type == "test_plan" else "Test Strategy"
    
    system_prompt = f"You are a {role} with extensive experience in designing robust testing frameworks and strategies for enterprise-grade applications. Your goal is to generate a highly detailed, professional, and actionable {task} based on the provided documentation."
    
    prompt = f"""
    Generate a **{task}** for the following feature/project: "{title}".
    
    **Context**: {context if context else "None provided"}
    **Test Levels in Scope**: {', '.join(test_levels) if test_levels else "All relevant levels"}
    
    **Source Documentation**:
    {safe_content}
    
    """
    
    if output_type == "test_plan":
        prompt += """
        **Required Sections & Detail Level**:
        1. **Objective**: Clearly define the goal of this testing effort, aligning with business objectives.
        2. **Scope**: 
           - **In-Scope**: Detailed list of features, workflows, and integrations to be tested.
           - **Out-of-Scope**: Explicitly state what is NOT covered to manage expectations.
        3. **Test Approach**:
           - **Test Levels**: Define strategy for Unit, Integration, System, and E2E testing.
           - **Test Types**: Cover Functional, UI/UX, API, Performance, Security, and Accessibility testing.
           - **Automation Strategy**: Identify candidates for automation vs. manual testing.
        4. **Test Environment & Data**: 
           - Hardware/Software requirements.
           - Test Data strategy (Synthetic vs. Anonymized Production data).
        5. **Test Execution**:
           - **Entry Criteria**: What must be ready before testing starts?
           - **Exit Criteria**: What defines "Done"? (e.g., Zero critical bugs, 95% pass rate).
        6. **Risks & Mitigations**: Identify technical, schedule, and resource risks with concrete mitigation plans.
        7. **Deliverables**: Comprehensive list (Test Plan, Test Cases, Bug Reports, RTM, Test Summary Report).
        
        **Tone**: Professional, authoritative, and detail-oriented. Use industry-standard terminology.
        **Format**: Clean Markdown with clear headings, bullet points, and tables where appropriate.
        """
    else: # Test Strategy
        prompt += """
        **Required Sections & Detail Level**:
        1. **Executive Summary**: High-level overview of the strategy for stakeholders.
        2. **Product Risk Analysis**: 
           - Identify critical business flows.
           - Risk Impact vs. Likelihood analysis.
        3. **Quality Goals**: Define measurable success metrics (e.g., Defect Removal Efficiency, Code Coverage, Performance benchmarks).
        4. **Test Strategy Matrix**:
           - Create a table mapping Component/Feature -> Risk Level -> Test Approach (Manual/Auto) -> Test Depth.
        5. **Automation Strategy**: 
           - Tool selection (e.g., Playwright, Selenium, Pytest).
           - Framework design (Page Object Model, Data-Driven).
           - CI/CD Integration plan.
        6. **Non-Functional Testing Strategy**: 
           - **Performance**: Load, Stress, Scalability testing.
           - **Security**: Auth, OWASP Top 10, Data Privacy.
           - **Usability/Accessibility**: WCAG compliance.
        7. **Tooling & Infrastructure**: 
           - Test Management Tools (Jira, Xray).
           - CI/CD Pipelines (GitHub Actions, Jenkins).
           - Environment Management (Docker, K8s).
        8. **Release Control**: Define the Gatekeeping process and Sign-off requirements.
        
        **Tone**: Strategic, forward-looking, and expert. Focus on long-term quality and efficiency.
        **Format**: Clean Markdown with clear headings, bullet points, and tables where appropriate.
        """

    # Call LLM
    # We use generate_text for Markdown output, not JSON
    generated_text = await session_manager.llm_service.generate_text(
        prompt, 
        user_id=user_id, 
        system_prompt=system_prompt
    )
    
    # Save History
    with Session(engine) as session:
        history = TestPlanGenerationHistory(
            user_id=user_id,
            source_type=source_type,
            source_identifier=source_id,
            output_type=output_type,
            raw_input_summary=title,
            generated_content=generated_text,
            # llm_model_used could be retrieved if generate_text returned metadata
        )
        session.add(history)
        session.commit()
        session.refresh(history)
        
        return {
            "id": history.id,
            "content": generated_text,
            "created_at": history.created_at
        }

@router.get("/history")
async def get_history(current_user: User = Depends(get_current_user)):
    """Get generation history"""
    with Session(engine) as session:
        history = session.exec(
            select(TestPlanGenerationHistory)
            .where(TestPlanGenerationHistory.user_id == current_user.id)
            .order_by(TestPlanGenerationHistory.created_at.desc())
        ).all()
        return history

@router.get("/{history_id}")
async def get_generation(
    history_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get specific generation"""
    with Session(engine) as session:
        item = session.exec(
            select(TestPlanGenerationHistory).where(
                TestPlanGenerationHistory.id == history_id,
                TestPlanGenerationHistory.user_id == current_user.id
            )
        ).first()
        
        if not item:
            raise HTTPException(status_code=404, detail="Not found")
            
        return item
