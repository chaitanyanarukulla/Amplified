"""
Tests for JD (Job Description) Analyzer Service
Validates job description parsing and analysis functionality
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.jd_analyzer import JDAnalyzer


class TestJDAnalyzer:
    """Test suite for JDAnalyzer"""
    
    @pytest.fixture
    def analyzer(self):
        """Create a JDAnalyzer instance"""
        return JDAnalyzer()
    
    @pytest.mark.asyncio
    async def test_analyze_jd_with_valid_text(self, analyzer):
        """Test analyzing a valid job description"""
        jd_text = """
        Senior Software Engineer
        
        Requirements:
        - 5+ years of Python experience
        - Knowledge of FastAPI and SQLModel
        - Experience with async/await
        - Strong problem-solving skills
        
        Responsibilities:
        - Design and implement backend services
        - Write unit tests
        -Collaborate with team members
        """
        
        # Mock the LLM service
        mock_llm_service = AsyncMock()
        mock_response = {
            "role_title": "Senior Software Engineer",
            "required_skills": ["Python", "FastAPI", "SQLModel", "async/await"],
            "key_responsibilities": [
                "Design and implement backend services",
                "Write unit tests",
                "Collaborate with team members"
            ]
        }
        mock_llm_service.generate_json = AsyncMock(return_value=mock_response)
        
        result = await analyzer.analyze_jd(jd_text, mock_llm_service)
        
        assert result == mock_response
        mock_llm_service.generate_json.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_jd_with_empty_text(self, analyzer):
        """Test analyzing empty job description falls back gracefully"""
        jd_text = ""
        
        mock_llm_service = AsyncMock()
        mock_llm_service.generate_json = AsyncMock(return_value={
            "company_name": "Unknown Company",
            "role_title": "Unknown Role",
            "key_responsibilities": [],
            "required_skills": [],
            "summary": "Could not analyze job description."
        })
        
        result = await analyzer.analyze_jd(jd_text, mock_llm_service)
        
        assert isinstance(result, dict)
        assert "role_title" in result
    
    @pytest.mark.asyncio
    async def test_analyze_jd_extracts_skills(self, analyzer):
        """Test that skills are correctly extracted from JD"""
        jd_text = """
        We need someone with Python, JavaScript, React, and Docker experience.
        """
        
        mock_llm_service = AsyncMock()
        mock_response = {
            "required_skills": ["Python", "JavaScript", "React", "Docker"],
            "key_responsibilities": ["Build applications"],
            "summary": "Developer position"
        }
        mock_llm_service.generate_json = AsyncMock(return_value=mock_response)
        
        result = await analyzer.analyze_jd(jd_text, mock_llm_service)
        
        assert "required_skills" in result
        assert len(result["required_skills"]) > 0
    
    @pytest.mark.asyncio
    async def test_analyze_jd_handles_llm_error(self, analyzer):
        """Test handling of LLM service errors falls back gracefully"""
        jd_text = "Software Engineer position"
        
        mock_llm_service = AsyncMock()
        mock_llm_service.generate_json = AsyncMock(side_effect=Exception("LLM service error"))
        
        # Should not raise, but return fallback structure
        result = await analyzer.analyze_jd(jd_text, mock_llm_service)
        
        assert isinstance(result, dict)
        assert result["role_title"] == "Unknown Role"
        assert result["company_name"] == "Unknown Company"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
