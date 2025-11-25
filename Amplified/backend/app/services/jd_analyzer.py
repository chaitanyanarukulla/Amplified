import structlog
import httpx
from typing import Dict, Any

logger = structlog.get_logger(__name__)

class JDAnalyzer:
    def __init__(self):
        pass

    async def fetch_jd_content(self, url: str) -> str:
        """
        Fetch content from a Job Description URL
        """
        try:
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                
                # Simple text extraction (in a real app, use BeautifulSoup or similar)
                # For now, we'll return the raw HTML or text and let the LLM handle it
                # or try to strip tags if possible.
                # Since we don't have bs4 guaranteed, we'll return a truncated version of text
                # or just the body content if we can find it.
                
                return response.text
        except Exception as e:
            logger.error(f"Error fetching JD URL: {e}")
            raise ValueError(f"Could not fetch Job Description from URL: {str(e)}")

    async def analyze_jd(self, content: str, llm_service) -> Dict[str, Any]:
        """
        Analyze JD content using LLM to extract key details
        """
        system_prompt = "You are an expert HR analyst and technical recruiter. Your goal is to extract structured data from unstructured job descriptions."
        
        prompt = f"""
        Analyze the following Job Description and extract key details.
        
        Content:
        {content[:4000]}
        
        Instructions:
        1. **Ignore Boilerplate**: Skip EEO statements, generic company fluff, and perks. Focus on the ROLE.
        2. **Extract Skills**: Identify specific technologies, languages, and frameworks.
        3. **Infer Level**: If not stated, infer the seniority (Junior/Senior/Lead) based on responsibilities.
        
        Output Format (JSON):
        {{
            "company_name": "Name of the company",
            "role_title": "Title of the role",
            "key_responsibilities": ["Resp 1", "Resp 2", "Resp 3", "Resp 4", "Resp 5"],
            "required_skills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5"],
            "summary": "A concise 2-sentence summary of the role's core purpose."
        }}
        """
        
        try:
            # We need to use the LLM service here. 
            # Assuming llm_service has a method to generate JSON or structured output.
            # For now, we'll use a generic generate method and parse JSON.
            
            response = await llm_service.generate_json(prompt, system_prompt=system_prompt)
            
            if not response:
                raise ValueError("LLM service returned empty response")
                
            return response
        except Exception as e:
            logger.error(f"Error analyzing JD: {e}")
            # Return a fallback structure
            return {
                "company_name": "Unknown Company",
                "role_title": "Unknown Role",
                "key_responsibilities": [],
                "required_skills": [],
                "summary": "Could not analyze job description."
            }
