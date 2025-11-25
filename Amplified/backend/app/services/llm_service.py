"""
LLM Service - LLM Integration (now using central router)
Generates context-aware interview answers
"""

import os
import structlog
from typing import Dict, List, Optional
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Import central router
from app.services.llm_router import llm_router

load_dotenv()
logger = structlog.get_logger(__name__)


class LLMService:
    """Service for generating AI suggestions using LLMs via central router"""
    
    def __init__(self):
        # Keep the OpenAI client for fallback/backward compatibility
        # but primarily use the router
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            logger.warning("OPENAI_API_KEY not found")
            self.client = None
        else:
            try:
                self.client = AsyncOpenAI(api_key=self.api_key)
                self.model = "gpt-4o-mini"
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
                self.client = None
        
        # Use central router for all new operations
        self.router = llm_router
        self.max_tokens = int(os.getenv("MAX_TOKENS", "1024"))
        self.temperature = float(os.getenv("TEMPERATURE", "0.7"))
    
    async def generate_answer(
        self, 
        question: str, 
        context: Dict[str, str],
        user_id: str = "default"
    ) -> Dict[str, any]:
        """
        Generate an answer suggestion based on the question and context
        """
        if not question:
            return self._get_fallback_response()
        
        try:
            # Truncate context to fit within token limits
            context = self._truncate_context(context)
            
            # Build context string
            context_str = self._build_context_string(context)
            
            # System Prompt
            system_prompt = "You are a senior technical interviewer and communication coach. Your goal is to help candidates give authentic, high-impact answers based ONLY on their actual experience."
            
            # User Prompt
            user_prompt = f"""
{context_str}

Based on the provided context, generate a concise, professional answer to:
Question: {question}

Instructions:
1. **Analyze Seniority**: Tailor the response to the candidate's level (e.g., Junior = learning/execution, Senior = system design/trade-offs).
2. **Use STAR Method**: Structure the bullets as Context -> Action -> Result.
3. **Be Authentic**: Use ONLY facts from the Resume. Do NOT invent projects.
4. **Gap Handling**: If the resume lacks direct experience, suggest a pivot to a related skill or a "willingness to learn" angle.

Output Format (JSON):
{{
    "title": "Punchy 5-8 word headline",
    "bullets": [
        "Context/Situation...",
        "Action taken...",
        "Result/Impact..."
    ],
    "warning": "Optional: Pitfall to avoid or missing experience warning"
}}
"""

            # Use the router to generate response
            result = await self.router.generate_json(
                prompt=user_prompt,
                system_prompt=system_prompt,
                user_id=user_id,
                max_tokens=800,
                temperature=0.7
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Answer generation failed: {str(e)}")
            return self._get_fallback_response()
            
    def _truncate_context(self, context: Dict[str, str]) -> Dict[str, str]:
        """Truncate context fields to ensure they fit within token limits"""
        # Approx 4 chars per token. Limit total context to ~10k tokens (~40k chars)
        # Allocate: Resume (15k), JD (10k), Notes (10k)
        
        truncated = {}
        
        if "resume" in context:
            truncated["resume"] = context["resume"][:15000]
        
        if "job_description" in context:
            truncated["job_description"] = context["job_description"][:10000]
            
        if "pinned_notes" in context:
            truncated["pinned_notes"] = context["pinned_notes"][:10000]
            
        if "relevant_documents" in context:
            truncated["relevant_documents"] = context["relevant_documents"][:10000]
            
        return truncated
    
    def _build_context_string(self, context: Dict[str, str]) -> str:
        """Build the context string for the prompt"""
        resume_text = context.get("resume", "No resume provided")
        jd_text = context.get("job_description", "No job description provided")
        notes_text = context.get("pinned_notes", "")
        
        context_str = f"""
=== CANDIDATE RESUME ===
{resume_text}

=== JOB DESCRIPTION ===
{jd_text}
"""
        
        if notes_text:
            context_str += f"""
=== RESEARCH & NOTES ===
{notes_text}
"""

        relevant_docs = context.get("relevant_documents", "")
        if relevant_docs:
            context_str += f"""
=== RELEVANT KNOWLEDGE VAULT DOCUMENTS ===
{relevant_docs}
"""
        
        return context_str
    
    def _get_fallback_response(self) -> Dict:
        """Fallback response when LLM is unavailable"""
        return {
            "title": "LLM Unavailable",
            "bullets": [
                "Take a moment to think about your relevant experience",
                "Structure your answer using STAR method if applicable",
                "Be specific with examples and outcomes"
            ],
            "warning": "AI service is currently unavailable. Using fallback guidance."
        }
    
    async def generate_stall_phrase(self) -> str:
        """Generate a natural stall phrase"""
        phrases = [
            "That's a great question. Let me take a moment to structure my thoughts...",
            "Interesting question. I want to give you a thoughtful answer...",
            "Let me think about the best way to approach this...",
            "That's an important point. Let me organize my response...",
            "Good question. I want to make sure I give you a complete answer...",
            "Let me reflect on that for a moment..."
        ]
        
        import random
        return random.choice(phrases)

    async def generate_json(self, prompt: str, user_id: str = "default", system_prompt: str = "You are a helpful assistant that outputs valid JSON.") -> Optional[Dict]:
        """Generic method to generate JSON output from a prompt"""
        # Use the router which delegates to the selected engine
        # We allow exceptions to propagate so the caller can handle them (e.g. return 500 to frontend)
        result = await self.router.generate_json(
            prompt=prompt,
            system_prompt=system_prompt,
            user_id=user_id,
            max_tokens=self.max_tokens,
            temperature=self.temperature
        )
        return result

    async def generate_mock_questions(
        self, 
        resume: str, 
        jd_analysis: Dict, 
        role: str,
        user_id: str = "default"
    ) -> List[str]:
        """Generate mock interview questions based on context"""
        if not self.client:
            return [
                "Tell me about yourself.",
                "Why are you interested in this role?",
                "What are your greatest strengths?",
                "Describe a challenging project you worked on.",
                "Where do you see yourself in 5 years?"
            ]

        system_prompt = "You are a strategic interview panelist. Your goal is to create a balanced and challenging interview plan."
        
        prompt = f"""
        Generate 5-7 interview questions for a {role} position.
        
        Context:
        Resume Summary: {resume[:2000]}...
        Job Description Key Skills: {', '.join(jd_analysis.get('required_skills', []))}
        Job Description Responsibilities: {', '.join(jd_analysis.get('key_responsibilities', []))}
        
        Instructions:
        1. **Mix of Types**: Include 2 Technical, 2 Behavioral, and 1 Situational question.
        2. **Resume Probing**: Ask at least one question specifically about a project listed in the resume.
        3. **Role Alignment**: Ensure technical questions match the JD's required skills.
        
        Output Format (JSON):
        {{
            "questions": [
                "Question 1 (Technical)...",
                "Question 2 (Behavioral)...",
                ...
            ]
        }}
        """
        
        result = await self.generate_json(prompt, user_id=user_id, system_prompt=system_prompt)
        return result.get("questions", [])
