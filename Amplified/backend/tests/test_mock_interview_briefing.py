"""
Test Mock Interview Briefing Generation
Tests the fix for empty Company Overview and Role Expectations
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from app.services.jd_analyzer import JDAnalyzer
from app.services.research_service import ResearchService
from app.services.llm_service import LLMService


class TestMockInterviewBriefing:
    """Test suite for mock interview briefing generation"""
    
    @pytest.mark.asyncio
    async def test_jd_analysis_with_valid_response(self):
        """Test JD analysis returns proper structure with valid LLM response"""
        analyzer = JDAnalyzer()
        mock_llm = Mock()
        
        # Mock successful LLM response
        mock_llm.generate_json = AsyncMock(return_value={
            "company_name": "TechCorp",
            "role_title": "Senior QA Engineer",
            "key_responsibilities": [
                "Design test automation frameworks",
                "Lead QA team initiatives",
                "Collaborate with engineering teams"
            ],
            "required_skills": [
                "Python",
                "Selenium",
                "CI/CD",
                "Test Strategy"
            ],
            "summary": "Senior QA role focused on automation and team leadership."
        })
        
        jd_content = """
        TechCorp is hiring a Senior QA Engineer to lead our quality initiatives.
        Responsibilities include designing automation frameworks and mentoring junior engineers.
        """
        
        result = await analyzer.analyze_jd(jd_content, mock_llm)
        
        assert result["company_name"] == "TechCorp"
        assert result["role_title"] == "Senior QA Engineer"
        assert len(result["key_responsibilities"]) == 3
        assert len(result["required_skills"]) == 4
        assert result["summary"] != ""
    
    @pytest.mark.asyncio
    async def test_jd_analysis_with_none_response(self):
        """Test JD analysis handles None response from LLM gracefully"""
        analyzer = JDAnalyzer()
        mock_llm = Mock()
        
        # Mock LLM returning None (failure case)
        mock_llm.generate_json = AsyncMock(return_value=None)
        
        jd_content = "Some job description content"
        
        result = await analyzer.analyze_jd(jd_content, mock_llm)
        
        # Should return fallback structure
        assert result["company_name"] == "Unknown Company"
        assert result["role_title"] == "Unknown Role"
        assert result["key_responsibilities"] == []
        assert result["required_skills"] == []
        assert "Could not analyze" in result["summary"]
    
    @pytest.mark.asyncio
    async def test_jd_analysis_with_exception(self):
        """Test JD analysis handles exceptions gracefully"""
        analyzer = JDAnalyzer()
        mock_llm = Mock()
        
        # Mock LLM throwing exception
        mock_llm.generate_json = AsyncMock(side_effect=Exception("API Error"))
        
        jd_content = "Some job description content"
        
        result = await analyzer.analyze_jd(jd_content, mock_llm)
        
        # Should return fallback structure
        assert result["company_name"] == "Unknown Company"
        assert result["key_responsibilities"] == []
        assert result["required_skills"] == []
    
    def test_company_name_extraction_from_text(self):
        """Test fallback company name extraction using heuristics"""
        research_service = ResearchService()
        
        # Test that extraction works with various patterns
        test_cases = [
            ("About TechCorp. We are a leading technology company...", True),
            ("Join Innovate Inc and help us build the future...", True),
            ("This is a generic job description with no company name.", False),
        ]
        
        for jd_text, should_find in test_cases:
            result = research_service.extract_company_name(jd_text)
            if should_find:
                assert result is not None, f"Should have found company name in: {jd_text[:50]}"
                assert len(result) > 0, "Company name should not be empty"
            else:
                assert result is None, f"Should not have found company name in: {jd_text[:50]}"
    
    def test_company_research_with_valid_name(self):
        """Test company research returns formatted content"""
        research_service = ResearchService()
        
        with patch.object(research_service.ddgs, 'text') as mock_search:
            mock_search.return_value = [
                {
                    'title': 'TechCorp - About Us',
                    'body': 'TechCorp is a leading technology company specializing in AI solutions.',
                    'href': 'https://techcorp.com/about'
                }
            ]
            
            result = research_service.perform_research("TechCorp")
            
            # Check for the actual content instead of the old header format
            assert "TechCorp is a leading technology company" in result
            assert "https://techcorp.com/about" in result
            assert "Interview Tip" in result
    
    def test_company_research_with_empty_name(self):
        """Test company research handles empty company name"""
        research_service = ResearchService()
        
        result = research_service.perform_research("")
        assert result == ""
        
        result = research_service.perform_research(None)
        assert result == ""
    
    @pytest.mark.asyncio
    async def test_role_expectations_formatting(self):
        """Test role expectations are properly formatted"""
        # Simulate the formatting logic from interview.py
        role = "Senior QA Engineer"
        
        jd_analysis = {
            "key_responsibilities": [
                "Design automation frameworks",
                "Lead QA initiatives"
            ],
            "required_skills": [
                "Python",
                "Selenium"
            ]
        }
        
        # Build role expectations as in interview.py (new format)
        responsibilities = jd_analysis.get("key_responsibilities", [])
        skills = jd_analysis.get("required_skills", [])
        
        if responsibilities or skills:
            role_expectations = f"**{role}**\n\n"
            if responsibilities:
                role_expectations += f"**Key Responsibilities:**\n" + "\n".join([f"• {r}" for r in responsibilities])
            if skills:
                role_expectations += f"\n\n**Required Skills:**\n" + "\n".join([f"• {s}" for s in skills])
        
        # Verify formatting
        assert f"**{role}**" in role_expectations
        assert "**Key Responsibilities:**" in role_expectations
        assert "• Design automation frameworks" in role_expectations
        assert "**Required Skills:**" in role_expectations
        assert "• Python" in role_expectations
    
    @pytest.mark.asyncio
    async def test_role_expectations_with_empty_analysis(self):
        """Test role expectations handles empty JD analysis"""
        role = "Senior QA Engineer"
        
        jd_analysis = {
            "key_responsibilities": [],
            "required_skills": []
        }
        
        # Build role expectations (new format with helpful fallback)
        responsibilities = jd_analysis.get("key_responsibilities", [])
        skills = jd_analysis.get("required_skills", [])
        
        if responsibilities or skills:
            role_expectations = f"**{role}**\n\n"
            if responsibilities:
                role_expectations += f"**Key Responsibilities:**\n" + "\n".join([f"• {r}" for r in responsibilities])
            if skills:
                role_expectations += f"\n\n**Required Skills:**\n" + "\n".join([f"• {s}" for s in skills])
        else:
            # New helpful fallback message
            role_expectations = f"""**{role}**

We couldn't automatically extract role details from the job description."""
        
        # Verify fallback message appears
        assert f"**{role}**" in role_expectations
        assert "couldn't automatically extract" in role_expectations
    
    @pytest.mark.asyncio
    async def test_json_extraction_from_markdown(self):
        """Test JSON extraction from markdown code blocks"""
        from app.services.llm_router import LLMRouter
        
        router = LLMRouter()
        
        # Test markdown code block
        text = """```json
        {
            "company_name": "TechCorp",
            "role_title": "Engineer"
        }
        ```"""
        
        result = router._extract_json_from_text(text)
        assert result["company_name"] == "TechCorp"
        assert result["role_title"] == "Engineer"
    
    @pytest.mark.asyncio
    async def test_json_extraction_with_extra_text(self):
        """Test JSON extraction when LLM adds extra text"""
        from app.services.llm_router import LLMRouter
        
        router = LLMRouter()
        
        # Test with extra text before and after
        text = """Here is the analysis you requested:
        
        {
            "company_name": "TechCorp",
            "role_title": "Engineer"
        }
        
        I hope this helps!"""
        
        result = router._extract_json_from_text(text)
        assert result["company_name"] == "TechCorp"
        assert result["role_title"] == "Engineer"
    
    @pytest.mark.asyncio
    async def test_json_extraction_failure(self):
        """Test JSON extraction raises error on invalid JSON"""
        from app.services.llm_router import LLMRouter
        
        router = LLMRouter()
        
        # Test with completely invalid JSON
        text = "This is not JSON at all, just plain text."
        
        with pytest.raises(ValueError, match="Could not extract valid JSON"):
            router._extract_json_from_text(text)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
