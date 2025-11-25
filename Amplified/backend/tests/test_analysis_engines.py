"""
Tests for Analysis Engines
Validates LLM-powered document analysis functions
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.analysis_engines import (
    generate_structured_summary,
    assess_risks,
    detect_gaps_and_ambiguities,
    generate_qa_report
)


class TestAnalysisEngines:
    """Test suite for Analysis Engines"""
    
    @pytest.fixture
    def mock_llm_router(self):
        """Mock the LLM router"""
        with patch("app.services.analysis_engines.llm_router") as mock:
            mock.generate_json = AsyncMock()
            yield mock

    @pytest.mark.asyncio
    async def test_generate_structured_summary_success(self, mock_llm_router):
        """Test successful summary generation"""
        mock_response = {
            "purpose": "Test Purpose",
            "scope_in": ["Feature A"],
            "scope_out": ["Feature B"],
            "key_features": ["Login"],
            "constraints": ["Time"],
            "assumptions": ["User is admin"],
            "stakeholders": ["Team"]
        }
        mock_llm_router.generate_json.return_value = mock_response
        
        result = await generate_structured_summary("Test document text", "user123")
        
        assert result == mock_response
        mock_llm_router.generate_json.assert_called_once()
        call_args = mock_llm_router.generate_json.call_args[1]
        assert call_args["user_id"] == "user123"
        assert "Test document text" in call_args["prompt"]

    @pytest.mark.asyncio
    async def test_generate_structured_summary_error(self, mock_llm_router):
        """Test error handling in summary generation"""
        mock_llm_router.generate_json.side_effect = Exception("LLM Error")
        
        with pytest.raises(Exception, match="LLM Error"):
            await generate_structured_summary("text", "user1")

    @pytest.mark.asyncio
    async def test_assess_risks_success(self, mock_llm_router):
        """Test successful risk assessment"""
        mock_response = {
            "overall_risk_level": "Medium",
            "risks": [
                {
                    "title": "Risk 1",
                    "category": "Security",
                    "description": "Desc",
                    "likelihood": "Low",
                    "impact": "High",
                    "mitigation": "Fix it"
                }
            ]
        }
        mock_llm_router.generate_json.return_value = mock_response
        
        result = await assess_risks("Test text", "user1")
        
        assert result == mock_response
        mock_llm_router.generate_json.assert_called_once()

    @pytest.mark.asyncio
    async def test_assess_risks_error(self, mock_llm_router):
        """Test error handling in risk assessment"""
        mock_llm_router.generate_json.side_effect = Exception("Risk Error")
        
        with pytest.raises(Exception, match="Risk Error"):
            await assess_risks("text", "user1")

    @pytest.mark.asyncio
    async def test_detect_gaps_success(self, mock_llm_router):
        """Test successful gap detection"""
        mock_response = {
            "gaps": [
                {
                    "description": "Gap 1",
                    "impact": "High",
                    "questions": ["Q1"]
                }
            ]
        }
        mock_llm_router.generate_json.return_value = mock_response
        
        result = await detect_gaps_and_ambiguities("Test text", "user1")
        
        assert result == mock_response
        mock_llm_router.generate_json.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_qa_report_success(self, mock_llm_router):
        """Test successful QA report generation"""
        mock_response = {
            "feature_summary": "Summary",
            "recommended_test_types": ["Unit"],
            "test_ideas": [{"area": "Auth", "test_cases": ["TC1"]}],
            "high_risk_scenarios": ["Scenario 1"],
            "open_questions": ["Q1"]
        }
        mock_llm_router.generate_json.return_value = mock_response
        
        # Mock inputs
        summary = {"purpose": "P", "key_features": ["F1"]}
        risks = {"overall_risk_level": "Low", "risks": []}
        gaps = {"gaps": []}
        
        result = await generate_qa_report("Text", summary, risks, gaps, "user1")
        
        assert result == mock_response
        mock_llm_router.generate_json.assert_called_once()
        # Verify context injection in prompt
        prompt = mock_llm_router.generate_json.call_args[1]["prompt"]
        assert "Purpose: P" in prompt
        assert "Overall Risk: Low" in prompt


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
