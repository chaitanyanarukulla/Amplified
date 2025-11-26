import asyncio
import os
from app.services.ai_assistant_service import AIAssistantService
from app.core.logging import setup_logging

# Mock the LLM service to avoid actual API calls if needed, 
# but here we want to test the integration, so we'll let it try to call the mock/router.
# We just want to ensure no TypeError is raised.

async def test_ai_fix():
    setup_logging()
    print("Initializing AIAssistantService...")
    service = AIAssistantService()
    
    print("Testing answer_question...")
    try:
        # We don't need real context for this test, just want to check method signature compatibility
        result = await service.answer_question(
            question="What is DQA?",
            user_id="test_user",
            context_type=None
        )
        print("✅ answer_question executed successfully!")
        print(f"Response keys: {result.keys()}")
        if result.get("confidence") == "error":
             print(f"❌ Service returned error: {result.get('answer')}")
        else:
             print("✅ Service returned valid response")
             
    except TypeError as e:
        print(f"❌ TypeError detected: {e}")
    except Exception as e:
        print(f"⚠️ Other error (expected if no DB/LLM creds): {e}")

if __name__ == "__main__":
    asyncio.run(test_ai_fix())
