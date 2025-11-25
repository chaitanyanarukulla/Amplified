from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
import logging
from app.dependencies import resume_parser, jd_analyzer, research_service
from app.services.session_manager import session_manager
from app.models import User
from app.auth_dependencies import get_current_user

router = APIRouter(prefix="/mock", tags=["mock"])
logger = logging.getLogger(__name__)

@router.post("/prepare")
async def prepare_mock_interview(
    resume: UploadFile = File(...),
    jd_url: str = Form(...),
    role: str = Form(...),
    voice_id: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """
    Prepare for mock interview by analyzing resume and JD
    """
    try:
        # 1. Parse Resume
        content = await resume.read()
        resume_text = await resume_parser.parse_resume(content, resume.filename)
        
        # 2. Analyze JD
        jd_content = await jd_analyzer.fetch_jd_content(jd_url)
        jd_analysis = await jd_analyzer.analyze_jd(jd_content, session_manager.llm_service)
        
        # 3. Research Company
        company_name = jd_analysis.get("company_name")
        
        # Fallback: Try to extract company name from text if LLM failed
        if not company_name or company_name == "Unknown Company":
            extracted_name = research_service.extract_company_name(jd_content)
            if extracted_name:
                company_name = extracted_name
                logger.info(f"Extracted company name from text: {company_name}")
        
        company_overview = ""
        if company_name and company_name != "Unknown Company":
            company_overview = research_service.perform_research(company_name)
            
        # 4. Research Role (Combine JD analysis with Role Research)
        responsibilities = jd_analysis.get("key_responsibilities", [])
        skills = jd_analysis.get("required_skills", [])
        
        if responsibilities or skills:
            role_expectations = f"**{role}**\n\n"
            if responsibilities:
                role_expectations += f"**Key Responsibilities:**\n" + "\n".join([f"• {r}" for r in responsibilities])
            if skills:
                role_expectations += f"\n\n**Required Skills:**\n" + "\n".join([f"• {s}" for s in skills])
        else:
            # Fallback if analysis failed - provide helpful guidance
            role_expectations = f"""**{role}**

We couldn't automatically extract role details from the job description. This might happen if:
• The JD link is behind a login/paywall
• The page structure is unusual
• The content is in an image or PDF

**What to do:**
1. **Review the original JD** and note the key responsibilities and required skills
2. **Focus on these common areas** for a {role}:
   • Test automation frameworks and tools
   • CI/CD pipeline integration
   • Test strategy and planning
   • Cross-functional collaboration
   • Quality metrics and reporting

**Interview Prep Tips:**
• Prepare examples from your experience that match the role's focus areas
• Think about how your background aligns with typical {role.split()[0] if role.split() else 'senior'}-level expectations
• Be ready to discuss your approach to test automation, quality processes, and team collaboration

💡 **Remember:** Even without auto-extracted details, you can still have a great mock interview by focusing on core competencies for this role!"""
        
        
        # 5. Generate Potential Questions
        questions = await session_manager.llm_service.generate_mock_questions(
            resume_text, 
            jd_analysis, 
            role,
            user_id=current_user.id
        )
        
        # Store context in session for the interview
        # We'll update the session context for this user
        
        mock_context = f"""
        === MOCK INTERVIEW CONTEXT ===
        Role: {role}
        Company: {company_name}
        
        Resume Summary:
        {resume_text[:2000]}
        
        Job Description:
        {jd_analysis.get('summary', '')}
        """
        
        # Update context engine for this user (assuming context engine supports user_id or we use session_id=user_id)
        # For now, we'll assume session_manager handles sessions by ID, and we'll use user_id as session_id for simplicity in this transition
        # In a real app, we might map user_id to active session_id
        
        # Note: ContextEngine currently doesn't take user_id in add_document, it's global or per-instance
        # We need to ensure session_manager.context_engine is user-aware or we get the user's session
        
        # For now, let's assume we are using the user_id as the session key in session_manager
        # But session_manager.context_engine is a single instance in the current code structure
        # We should probably update session_manager to manage context per session/user
        
        # TEMPORARY FIX: We'll use the global context engine but prefix keys or just accept it's shared for now until ContextEngine is refactored
        # Ideally, we should pass user_id to add_document if we updated it
        await session_manager.context_engine.add_document("mock_context", mock_context)
        
        # Also store the questions to serve them sequentially
        session_manager.mock_service.set_questions(questions, user_id=current_user.id)
        
        return {
            "company_overview": company_overview,
            "role_expectations": role_expectations,
            "potential_questions": questions
        }
        
    except Exception as e:
        logger.error(f"Mock interview preparation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/question")
async def generate_mock_question(
    question_number: int = Form(1),
    current_user: User = Depends(get_current_user)
):
    """
    Get the next mock interview question
    """
    try:
        # Try to get pre-generated question
        question = session_manager.mock_service.get_question(question_number - 1, user_id=current_user.id)
        
        if not question:
            # Fallback to generating one on the fly if not found
            context = await session_manager.context_engine.get_full_context()
            result = await session_manager.mock_service.generate_question(context, question_number, user_id=current_user.id)
            question = result['question']
        
        return {
            "status": "success",
            "question": question,
            "number": question_number
        }
    except Exception as e:
        logger.error(f"Mock question generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feedback")
async def evaluate_mock_answer(
    question: str = Form(...),
    answer: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluate candidate's answer and provide feedback
    """
    try:
        # Get context for reference
        context = await session_manager.context_engine.get_full_context()
        
        # Evaluate answer
        result = await session_manager.mock_service.evaluate_answer(question, answer, context, user_id=current_user.id)
        
        logger.info(f"Evaluated answer, score: {result.get('score', 'N/A')}")
        
        return {
            "status": "success",
            **result
        }
    except Exception as e:
        logger.error(f"Mock answer evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
