import structlog
import re
from ddgs import DDGS

logger = structlog.get_logger(__name__)

class ResearchService:
    def __init__(self):
        self.ddgs = DDGS()

    def extract_company_name(self, jd_text: str) -> str:
        """
        Attempts to extract the company name from the JD text using heuristics.
        """
        # Heuristic 1: Look for "About [Company]" or "Join [Company]"
        patterns = [
            r"About\s+([A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)*)",
            r"Join\s+([A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)*)",
            r"Welcome to\s+([A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)*)",
            r"at\s+([A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)*)\s+we",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, jd_text)
            if match:
                name = match.group(1).strip()
                # Filter out common false positives
                if name.lower() not in ["us", "the", "our", "team", "engineering"]:
                    return name
        
        # Fallback: Return None if not found (caller can handle or default to generic)
        return None

    def perform_research(self, company_name: str) -> str:
        """
        Performs web research on the company and returns a summarized string.
        """
        if not company_name:
            return ""

        logger.info(f"Starting research for: {company_name}")
        results = []
        
        try:
            # Single search query - more reliable
            query = f"{company_name} company about mission"
            logger.info(f"Searching: {query}")
            
            search_results = self.ddgs.text(query, max_results=3)
            
            if search_results and len(search_results) > 0:
                # Extract useful information from top results
                for i, result in enumerate(search_results[:2]):
                    title = result.get('title', '')
                    body = result.get('body', '')
                    href = result.get('href', '')
                    
                    if body:
                        results.append(f"**{body[:200]}...**")
                        if href:
                            results.append(f"[Source]({href})")
                
                if results:
                    research_summary = "\n\n".join(results)
                    return f"{research_summary}\n\n💡 **Interview Tip:** Use this company context to personalize your 'Why this company?' answers."
                else:
                    return self._get_manual_research_message(company_name)
            else:
                return self._get_manual_research_message(company_name)

        except Exception as e:
            logger.error(f"Research failed: {e}")
            return self._get_manual_research_message(company_name)
    
    def _get_manual_research_message(self, company_name: str) -> str:
        """Return a helpful message when automated research fails"""
        return f"""We couldn't find detailed information about **{company_name}** automatically.

**What to do:**
• Visit the company's official website and read their "About" page
• Check their LinkedIn company page for recent updates
• Look for recent news articles or press releases
• Review their products, services, and mission statement

**Why this matters:**
Understanding the company helps you answer "Why do you want to work here?" authentically and shows genuine interest in the role.

💡 **Pro tip:** Take 5-10 minutes to research before your interview. It makes a huge difference!"""

    def perform_role_research(self, role_title: str, use_llm: bool = True) -> str:
        """
        Performs research on the role using OpenAI (more accurate than web search).
        Falls back to web search if OpenAI is unavailable.
        """
        if not role_title:
            return ""

        logger.info(f"Starting role research for: {role_title}")
        
        if use_llm:
            try:
                # Use OpenAI to generate role insights
                from openai import OpenAI
                import os
                
                client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                
                system_prompt = "You are an expert technical career coach and industry analyst."
                
                prompt = f"""
Provide a strategic interview preparation guide for the role of: {role_title}

Structure your response into these concise sections:

1. **Core Expectations**: What is the primary value proposition of this role? (e.g., "Shipping code" vs "System Design" vs "Team Leadership")
2. **Must-Have Technical Stack**: List the 5-7 most critical technologies or concepts for this specific role title.
3. **Key Interview Topics**: 3-4 specific themes likely to appear in the interview (e.g., "Concurrency in Java", "React State Management").
4. **Insider Tips**: 1-2 actionable tips to stand out (e.g., "Focus on scalability", "Mention TDD").

Keep it concise, professional, and high-impact. Use bullet points.
"""

                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=600
                )
                
                insights = response.choices[0].message.content.strip()
                
                return f"=== ROLE RESEARCH: {role_title.upper()} ===\n\n{insights}\n\n💡 Use this to understand what interviewers expect from this role!"
            
            except Exception as e:
                logger.error(f"OpenAI role research failed: {e}, falling back to web search")
                use_llm = False
        
        # Fallback to web search if OpenAI fails
        if not use_llm:
            try:
                query = f"{role_title} responsibilities interview questions skills"
                logger.info(f"Searching: {query}")
                
                search_results = self.ddgs.text(query, max_results=3)
                
                if search_results and len(search_results) > 0:
                    results = []
                    for i, result in enumerate(search_results[:2]):
                        body = result.get('body', '')
                        href = result.get('href', '')
                        
                        if body:
                            results.append(f"**Insight {i+1}**: {body[:250]}...")
                            if href:
                                results.append(f"Source: {href}")
                    
                    if results:
                        research_summary = "\n\n".join(results)
                        return f"=== ROLE RESEARCH: {role_title.upper()} ===\n\n{research_summary}\n\n💡 Use this to understand what interviewers expect from this role!"
                    else:
                        return f"=== ROLE RESEARCH: {role_title.upper()} ===\n\n⚠️ No detailed results found."
                else:
                    return f"=== ROLE RESEARCH: {role_title.upper()} ===\n\n⚠️ Search returned no results."

            except Exception as e:
                logger.error(f"Role research failed: {e}")
                return f"=== ROLE RESEARCH: {role_title.upper()} ===\n\n❌ Research failed: {str(e)}\n\n💡 Tip: You can manually add role research to your notes."
