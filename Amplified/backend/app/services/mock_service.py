import logging
from typing import Dict
from openai import AsyncOpenAI
import os
import json

#Import central router
from app.services.llm_router import llm_router

logger = logging.getLogger(__name__)

class MockInterviewService:
    """Manages mock interview question generation and answer evaluation"""
    
    def __init__(self):
        # Keep OpenAI client for backward compatibility but use router primarily
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini"
        self.questions = []  # Store generated questions
        
        # Use central router
        self.router = llm_router

    def set_questions(self, questions: list, user_id: str = "default"):
        """Store questions for the mock interview. user_id is for future multi-user support."""
        self.questions = questions

    def get_question(self, index: int) -> str:
        if 0 <= index < len(self.questions):
            return self.questions[index]
        return None

    async def generate_question(
        self, 
        context: Dict[str, str], 
        question_number: int = 1,
        user_id: str = "default"
    ) -> Dict:
        """
        Generate an interview question based on context
        """
        # Check if we have a pre-generated question
        pre_generated = self.get_question(question_number - 1)
        if pre_generated:
            return {
                "question": pre_generated,
                "number": question_number,
                "type": "pre-generated"
            }

        try:
            resume = context.get("resume", "")
            jd = context.get("job_description", "")
            notes = context.get("pinned_notes", "")
            mock_context = context.get("mock_context", "")
            
            # Use mock context if available
            if mock_context:
                notes += "\n" + mock_context

            # Extract company and role info from notes
            company_info = ""
            role_info = ""
            if "RESEARCH ON" in notes:
                company_info = notes.split("RESEARCH ON")[1].split("===")[0] if "RESEARCH ON" in notes else ""
            if "ROLE RESEARCH:" in notes:
                role_info = notes.split("ROLE RESEARCH:")[1].split("===")[0] if "ROLE RESEARCH:" in notes else ""
            
            # Determine question type based on sequence
            question_types = [
                "behavioral (teamwork/collaboration)",
                "technical (role-specific skills from Role Research)",
                "situational (problem-solving)",
                "behavioral (leadership/conflict)",
                "technical (system design or testing strategy based on Role Research)",
                "behavioral (growth/learning)",
                "cultural fit (why this company - reference Company Research)"
            ]
            
            question_type = question_types[min(question_number - 1, len(question_types) - 1)]
            
            system_prompt = "You are a seasoned technical hiring manager. Your goal is to ask challenging, relevant questions that assess true competency."
            
            prompt = f"""
Generate a {question_type} interview question for a candidate applying for:
Role: {role_info[:500] if role_info else "Software Engineer"}

Context:
- Resume Snippet: {resume[:2000] if resume else "N/A"}
- JD Requirements: {jd[:2000] if jd else "N/A"}
- Company Research: {company_info[:500] if company_info else "N/A"}

Instructions:
1. **Relevance**: The question MUST connect the candidate's past experience (Resume) to the future role (JD).
2. **Difficulty**: Calibrate to the role level (e.g., Junior = "How do you...", Senior = "Design a system that...").
3. **Specificity**: Avoid generic questions. Ask specific, scenario-based questions derived from the tech stack.
4. **Research Integration**: If company research is available, weave it in.

Return ONLY the question text.
"""

            # Use router for generation
            question_text = await self.router.generate_completion(
                prompt=prompt,
                system_prompt=system_prompt,
                user_id=user_id,
                max_tokens=150,
                temperature=0.8
            )
            
            return {
                "question": question_text.strip(),
                "number": question_number,
                "type": question_type
            }
        
        except Exception as e:
            logger.error(f"Question generation failed: {e}")
            return {
                "question": "Tell me about a challenging project you worked on and how you approached it.",
                "number": question_number,
                "type": "fallback"
            }
    
    async def evaluate_answer(
        self, 
        question: str, 
        answer: str, 
        context: Dict[str, str],
        user_id: str = "default"
    ) -> Dict:
        """
        Provide feedback on candidate's answer
        """
        try:
            if not answer or len(answer.strip()) < 10:
                return {
                    "feedback": {
                        "content": "I didn't catch your answer. Could you try again?",
                        "delivery": "Please speak clearly into the microphone."
                    },
                    "score": 0
                }
            
            system_prompt = "You are a supportive interview coach. Provide constructive, actionable feedback to help the candidate improve."
            
            prompt = f"""
Evaluate this interview answer.

Question: {question}
Answer: {answer}

Criteria:
1. **Clarity**: Was the answer easy to follow?
2. **Structure**: Did they use the STAR method (Situation, Task, Action, Result)?
3. **Relevance**: Did they actually answer the specific question asked?

Output Format (JSON):
{{
    "content": "Feedback on the content. Did they demonstrate the right skills? Did they use STAR?",
    "delivery": "Feedback on structure/clarity. Was it concise?",
    "suggested_answer": "A brief, ideal version of how to answer this (2-3 sentences).",
    "score": (Integer 1-10 based on quality)
}}
"""

            # Use router for evaluation to support different engines
            result = await self.router.generate_json(
                prompt=prompt,
                system_prompt=system_prompt,
                user_id=user_id,
                max_tokens=500,
                temperature=0.7
            )
            
            return {
                "feedback": result,
                "score": result.get("score", 7)
            }
        
        except Exception as e:
            logger.error(f"Answer evaluation failed: {e}")
            return {
                "feedback": {
                    "content": "Great effort! Keep practicing to refine your answer structure.",
                    "delivery": "Focus on speaking clearly and confidently."
                },
                "score": 5
            }
