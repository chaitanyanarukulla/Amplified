"""
Tests for Export Service
Validates Markdown and PDF export functionality
"""

import pytest
import json
from unittest.mock import MagicMock, patch, Mock
import sys
from app.services.export_service import ExportService


class TestExportService:
    """Test suite for ExportService"""
    
    @pytest.fixture
    def service(self):
        """Create an ExportService instance"""
        return ExportService()
    
    @pytest.fixture
    def sample_analysis_data(self):
        """Create sample analysis data"""
        return {
            "structured_summary": json.dumps({
                "purpose": "Test Purpose",
                "scope_in": ["Feature A", "Feature B"],
                "scope_out": ["Feature C"],
                "key_features": ["Login", "Dashboard"],
                "constraints": ["Time", "Budget"],
                "assumptions": ["User is admin"],
                "stakeholders": ["Client", "Team"]
            }),
            "risk_assessment": json.dumps({
                "risks": [
                    {
                        "title": "Data Loss",
                        "category": "Security",
                        "likelihood": "Low",
                        "impact": "High",
                        "description": "DB crash",
                        "mitigation": "Backups"
                    }
                ]
            }),
            "gaps_and_questions": json.dumps({
                "gaps": [
                    {
                        "description": "Missing Auth",
                        "impact": "High",
                        "questions": ["How to login?"]
                    }
                ]
            }),
            "qa_report": json.dumps({
                "feature_summary": "Good coverage",
                "recommended_test_types": ["Unit", "Integration"],
                "test_ideas": [
                    {
                        "area": "Auth",
                        "test_cases": ["Valid login", "Invalid login"]
                    }
                ],
                "high_risk_scenarios": ["Concurrent users"],
                "open_questions": ["Timeline?"]
            }),
            "overall_risk_level": "Medium",
            "model_version": "GPT-4",
            "created_at": "2023-01-01"
        }

    # --- Markdown Export Tests ---

    def test_export_to_markdown_structure(self, service, sample_analysis_data):
        """Test markdown export contains key sections"""
        md = service.export_to_markdown("test_doc.pdf", sample_analysis_data)
        
        assert "# Document Quality Analysis Report" in md
        assert "**Document:** test_doc.pdf" in md
        assert "## 📋 Structured Summary" in md
        assert "## ⚠️ Risk Assessment" in md
        assert "## 🔍 Gaps & Questions" in md
        assert "## ✅ QA Report" in md
        
        # Check content
        assert "Test Purpose" in md
        assert "- Feature A" in md
        assert "Data Loss" in md
        assert "Missing Auth" in md
        assert "Valid login" in md

    def test_export_to_markdown_empty(self, service):
        """Test markdown export with empty data"""
        empty_data = {}
        md = service.export_to_markdown("empty.pdf", empty_data)
        
        assert "Not specified" in md
        assert "*No significant risks identified*" in md
        assert "*No significant gaps identified*" in md
        assert "*No test ideas generated*" in md

    # --- Formatting Helper Tests ---

    def test_format_list(self, service):
        """Test list formatting"""
        assert service._format_list(["A", "B"]) == "- A\n- B"
        assert service._format_list([]) == "- *None specified*"

    def test_format_numbered_list(self, service):
        """Test numbered list formatting"""
        assert service._format_numbered_list(["A", "B"]) == "1. A\n2. B"
        assert service._format_numbered_list([]) == "1. *None specified*"

    def test_format_risks(self, service):
        """Test risk formatting"""
        risks = [{"title": "Risk 1", "category": "Cat 1"}]
        formatted = service._format_risks(risks)
        assert "#### 1. Risk 1" in formatted
        assert "**Category:** Cat 1" in formatted
        
        assert service._format_risks([]) == "*No significant risks identified*"

    def test_format_gaps(self, service):
        """Test gap formatting"""
        gaps = [{"description": "Gap 1", "questions": ["Q1"]}]
        formatted = service._format_gaps(gaps)
        assert "#### 1. Gap 1" in formatted
        assert "- Q1" in formatted
        
        assert service._format_gaps([]) == "*No significant gaps identified*"

    def test_format_test_ideas(self, service):
        """Test test ideas formatting"""
        ideas = [{"area": "Area 1", "test_cases": ["TC1"]}]
        formatted = service._format_test_ideas(ideas)
        assert "#### Area 1" in formatted
        assert "- TC1" in formatted
        
        assert service._format_test_ideas([]) == "*No test ideas generated*"

    # --- PDF Export Tests ---

    def test_export_to_pdf_success(self, service, sample_analysis_data):
        """Test successful PDF export with mocked libraries"""
        # Mock markdown and weasyprint
        mock_markdown = MagicMock()
        mock_markdown.markdown.return_value = "<html>Content</html>"
        
        mock_html_cls = MagicMock()
        mock_html_instance = mock_html_cls.return_value
        mock_html_instance.write_pdf.side_effect = lambda f: f.write(b"PDF CONTENT")
        
        with patch.dict(sys.modules, {
            'markdown': mock_markdown,
            'weasyprint': MagicMock(HTML=mock_html_cls, CSS=MagicMock())
        }):
            pdf_bytes = service.export_to_pdf("test.pdf", sample_analysis_data)
            
            assert pdf_bytes == b"PDF CONTENT"
            mock_markdown.markdown.assert_called_once()
            mock_html_cls.assert_called_once()

    def test_export_to_pdf_import_error(self, service, sample_analysis_data):
        """Test PDF export raises NotImplementedError when libraries missing"""
        # Mock missing weasyprint
        with patch.dict(sys.modules, {'weasyprint': None}):
            # We need to ensure import raises ImportError
            # Since we can't easily unimport, we'll patch the import inside the method
            # But the method does 'import markdown' and 'from weasyprint import HTML'
            # The easiest way is to mock the built-in __import__ but that's risky.
            # Instead, we can rely on the fact that if we set sys.modules['weasyprint'] to None, 
            # subsequent imports might fail or we can patch the method logic if needed.
            # Actually, let's just patch the imports by wrapping the function execution 
            # in a context where imports fail.
            
            # A better approach for testing ImportError inside a function:
            with patch('builtins.__import__', side_effect=ImportError("No module named weasyprint")):
                with pytest.raises(NotImplementedError, match="PDF export requires 'weasyprint'"):
                    service.export_to_pdf("test.pdf", sample_analysis_data)

    def test_export_to_pdf_general_error(self, service, sample_analysis_data):
        """Test PDF export handles general errors"""
        mock_markdown = MagicMock()
        mock_markdown.markdown.side_effect = Exception("Conversion failed")
        
        with patch.dict(sys.modules, {
            'markdown': mock_markdown,
            'weasyprint': MagicMock()
        }):
            with pytest.raises(Exception, match="Conversion failed"):
                service.export_to_pdf("test.pdf", sample_analysis_data)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
