"""
Analysis Engines - LLM-powered document analysis functions
Provides 4 analysis stages: Summary, Risks, Gaps, QA Report
"""

import structlog
from typing import Dict, Any
from app.services.llm_router import llm_router

logger = structlog.get_logger(__name__)

async def generate_structured_summary(text: str, user_id: str) -> Dict[str, Any]:
    """
    Generate structured summary from document text
    
    Returns:
        {
            "purpose": str,
            "scope_in": [str],
            "scope_out": [str],
            "key_features": [str],
            "constraints": [str],
            "assumptions": [str],
            "stakeholders": [str]
        }
    """
    system_prompt = """You are an expert technical analyst specializing in requirements documentation.
Your task is to extract and structure key information from design documents, BRDs, and PRDs."""
    
    logger.info(f"Analyzing text (first 200 chars): {text[:200]}...")
    
    prompt = f"""Analyze the following document and extract structured information.

<document>
{text[:100000]}
</document>

Generate a comprehensive structured summary with the following sections:

1. **Purpose/Goals**: What is this document trying to achieve? (1-2 sentences)
2. **In-Scope**: What features/functionality are explicitly included?
3. **Out-of-Scope**: What is explicitly excluded?
4. **Key Features**: List the main features or modules described
5. **Constraints**: Technical, business, or resource constraints mentioned
6. **Assumptions**: Any assumptions stated or implied
7. **Stakeholders**: Roles, teams, or users mentioned

Output as JSON:
{{
    "purpose": "Brief purpose statement",
    "scope_in": ["Feature 1", "Feature 2"],
    "scope_out": ["Excluded item 1", "Excluded item 2"],
    "key_features": ["Feature A", "Feature B"],
    "constraints": ["Constraint 1", "Constraint 2"],
    "assumptions": ["Assumption 1", "Assumption 2"],
    "stakeholders": ["Role/Team 1", "Role/Team 2"]
}}

If any section is not found in the document, use an empty array [] or "Not specified" for purpose.
Keep descriptions concise. Output compact JSON.
"""
    
    try:
        result = await llm_router.generate_json(
            prompt=prompt,
            system_prompt=system_prompt,
            user_id=user_id,
            max_tokens=4096,
            temperature=0.3
        )
        
        if result.get('purpose') == "Not specified" or not result.get('purpose'):
            logger.warning("LLM returned 'Not specified' or empty for purpose. Prompt might be failing.")
            logger.info(f"LLM Result: {result}")
            
        return result
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        raise


async def assess_risks(text: str, user_id: str) -> Dict[str, Any]:
    """
    Identify and categorize quality risks
    
    Returns:
        {
            "overall_risk_level": "Low|Medium|High",
            "risks": [
                {
                    "title": str,
                    "category": str,
                    "description": str,
                    "likelihood": "Low|Medium|High",
                    "impact": "Low|Medium|High",
                    "mitigation": str
                }
            ]
        }
    """
    system_prompt = """You are a Staff QA Engineer with expertise in risk analysis and quality assurance.
Your task is to identify quality risks in requirements documents."""
    
    prompt = f"""Analyze the following document for quality risks.

<document>
{text[:100000]}
</document>

Identify risks in these categories:
1. **Requirements Clarity**: Vague, ambiguous, or conflicting requirements
2. **Testability**: Requirements that are difficult to test or verify
3. **Functional Complexity**: Complex logic, edge cases, or integration points
4. **Non-Functional**: Performance, security, reliability, usability, compatibility concerns
5. **Integration & Dependencies**: External system dependencies, data migration risks
6. **Compliance**: Regulatory, legal, or policy requirements

For each risk, provide:
- **Title**: Short, clear risk name
- **Category**: One of the categories above
- **Description**: What the risk is and why it matters
- **Likelihood**: Low/Medium/High (how likely is this to cause issues?)
- **Impact**: Low/Medium/High (how severe would the impact be?)
- **Mitigation**: Suggested actions to reduce the risk

Also determine an **Overall Risk Level** (Low/Medium/High) based on the top risks.

Output as JSON:
{{
    "overall_risk_level": "Medium",
    "risks": [
        {{
            "title": "Unclear error handling requirements",
            "category": "Requirements Clarity",
            "description": "The document doesn't specify how errors should be handled...",
            "likelihood": "High",
            "impact": "Medium",
            "mitigation": "Ask PM to clarify error handling for each failure scenario"
        }}
    ]
}}

Prioritize risks by severity (High impact + High likelihood first).
Limit to top 5-7 most significant risks. Keep descriptions concise. Output compact JSON.
"""
    
    try:
        result = await llm_router.generate_json(
            prompt=prompt,
            system_prompt=system_prompt,
            user_id=user_id,
            max_tokens=4096,
            temperature=0.4
        )
        return result
    except Exception as e:
        logger.error(f"Risk assessment failed: {e}")
        raise


async def detect_gaps_and_ambiguities(text: str, user_id: str) -> Dict[str, Any]:
    """
    Detect gaps, ambiguities, and missing requirements
    
    Returns:
        {
            "gaps": [
                {
                    "description": str,
                    "impact": "Low|Medium|High",
                    "questions": [str]
                }
            ]
        }
    """
    system_prompt = """You are a Staff QA Engineer specializing in requirements analysis.
Your task is to identify gaps, ambiguities, and missing information in requirements documents."""
    
    prompt = f"""Analyze the following document for gaps and ambiguities.

<document>
{text[:100000]}
</document>

Look for:
1. **Missing Acceptance Criteria**: User stories or features without clear success criteria
2. **Undefined Terms**: References to systems, roles, states, or concepts that aren't defined
3. **Conflicts/Contradictions**: Statements that contradict each other
4. **Implicit Non-Functional Requirements**: Performance, security, or reliability needs that are implied but not explicit
5. **Edge Cases Not Addressed**: Boundary conditions, error states, or unusual scenarios not covered
6. **Incomplete Workflows**: User flows or processes that are partially described

For each gap, provide:
- **Description**: What is missing or unclear
- **Impact**: Low/Medium/High (how much does this affect quality/testing?)
- **Questions**: 2-3 specific questions to ask stakeholders to clarify

Output as JSON:
{{
    "gaps": [
        {{
            "description": "No acceptance criteria defined for user login failure states",
            "impact": "High",
            "questions": [
                "What should the user see when login fails 3 times?",
                "Should the account be locked after multiple failures?",
                "What error messages should be displayed for different failure reasons?"
            ]
        }}
    ]
}}

Limit to top 5-7 most critical gaps. Keep descriptions concise. Output compact JSON.
"""
    
    try:
        result = await llm_router.generate_json(
            prompt=prompt,
            system_prompt=system_prompt,
            user_id=user_id,
            max_tokens=4096,
            temperature=0.4
        )
        return result
    except Exception as e:
        logger.error(f"Gap detection failed: {e}")
        raise


async def generate_qa_report(
    text: str,
    summary: Dict[str, Any],
    risks: Dict[str, Any],
    gaps: Dict[str, Any],
    user_id: str
) -> Dict[str, Any]:
    """
    Generate comprehensive QA report combining all analysis
    
    Returns:
        {
            "feature_summary": str,
            "recommended_test_types": [str],
            "test_ideas": [
                {
                    "area": str,
                    "test_cases": [str]
                }
            ],
            "high_risk_scenarios": [str],
            "open_questions": [str]
        }
    """
    system_prompt = """You are a Staff QA Engineer creating a comprehensive test strategy.
Your task is to synthesize analysis results into actionable QA recommendations."""
    
    # Prepare context from previous analyses
    risk_summary = f"Overall Risk: {risks.get('overall_risk_level', 'Unknown')}\n"
    risk_summary += f"Top Risks: {', '.join([r['title'] for r in risks.get('risks', [])[:3]])}"
    
    gap_summary = f"Critical Gaps: {len(gaps.get('gaps', []))}\n"
    gap_summary += f"Top Gaps: {', '.join([g['description'][:50] for g in gaps.get('gaps', [])[:3]])}"
    
    prompt = f"""Generate a comprehensive QA report for this feature.

**Document Summary:**
Purpose: {summary.get('purpose', 'Not specified')}
Key Features: {', '.join(summary.get('key_features', [])[:5])}

**Risk Analysis:**
{risk_summary}

**Gap Analysis:**
{gap_summary}

**Original Document (excerpt):**
<document>
{text[:100000]}
</document>

Create a QA-focused report with:

1. **Feature Summary**: 2-3 sentence overview for QA team
2. **Recommended Test Types**: Which types of testing are most important?
   - Options: Unit, Integration, System, Regression, Performance, Security, Usability, Compatibility, UAT, Exploratory
3. **Test Ideas by Area**: Group test scenarios by functional area
   - For each area, list 3-5 specific test ideas/charters
4. **High-Risk Scenarios**: 5-8 critical scenarios to prioritize based on risk analysis
5. **Open Questions**: 5-10 questions QA should ask in refinement/grooming

Output as JSON:
{{
    "feature_summary": "Brief QA-oriented summary",
    "recommended_test_types": ["Integration", "Security", "Performance"],
    "test_ideas": [
        {{
            "area": "Authentication",
            "test_cases": [
                "Verify login with valid credentials",
                "Test account lockout after 3 failed attempts",
                "Validate password complexity requirements"
            ]
        }}
    ],
    "high_risk_scenarios": [
        "Test concurrent user sessions with same account",
        "Verify data integrity during network interruption"
    ],
    "open_questions": [
        "What is the expected response time for login API?",
        "Should we support SSO integration in v1?"
    ]
}}

Limit to top 5 items per list. Keep descriptions concise. Output compact JSON.
"""
    
    try:
        result = await llm_router.generate_json(
            prompt=prompt,
            system_prompt=system_prompt,
            user_id=user_id,
            max_tokens=4096,
            temperature=0.5
        )
        return result
    except Exception as e:
        logger.error(f"QA report generation failed: {e}")
        raise
