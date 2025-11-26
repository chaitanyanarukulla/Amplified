#!/usr/bin/env python3
"""Test DuckDuckGo search functionality"""

import sys
sys.path.insert(0, '/Users/chaitanyanarukulla/Projects/Chai_Tools_v4/Amplified/backend')

from app.services.research_service import ResearchService

def test_ddg_search():
    """Test if DuckDuckGo search is working"""
    print("Testing DuckDuckGo Search...")
    print("=" * 50)
    
    service = ResearchService()
    
    # Test 1: Company research
    print("\n1. Testing company research for 'Google':")
    print("-" * 50)
    result = service.perform_research("Google")
    print(result)
    print()
    
    # Test 2: Role research (web search fallback)
    print("\n2. Testing role research for 'Senior Software Engineer' (web search):")
    print("-" * 50)
    result = service.perform_role_research("Senior Software Engineer", use_llm=False)
    print(result)
    print()
    
    # Test 3: Direct DDGS test
    print("\n3. Testing direct DDGS search:")
    print("-" * 50)
    try:
        from ddgs import DDGS
        ddgs = DDGS()
        results = ddgs.text("Python programming", max_results=3)
        print(f"Found {len(results)} results")
        for i, r in enumerate(results):
            print(f"\nResult {i+1}:")
            print(f"  Title: {r.get('title', 'N/A')}")
            print(f"  Body: {r.get('body', 'N/A')[:100]}...")
            print(f"  URL: {r.get('href', 'N/A')}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_ddg_search()
