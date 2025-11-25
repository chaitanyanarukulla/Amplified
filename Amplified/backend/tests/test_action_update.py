"""
Test for Action Item Status Update
Verifies that action items can be toggled via the API
"""
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_update_action_status():
    """
    Test updating the status of an action item.
    """
    # Mock the LLM router's generate_json method
    with patch("app.services.llm_service.llm_router.generate_json", new_callable=AsyncMock) as mock_generate:
        # Configure the mock to return a valid response
        mock_generate.return_value = {
            "short_summary": ["Action item created"],
            "detailed_summary": "Discussion about tasks.",
            "action_items": [
                {
                    "owner": "Speaker 1",
                    "description": "Complete the task by tomorrow"
                }
            ]
        }

        # 1. Create User & Login
        signup_response = client.post(
            "/api/auth/signup",
            json={
                "email": "test_action_update@example.com",
                "password": "testpass123",
                "name": "Action Tester"
            }
        )
        
        if signup_response.status_code == 400:
            login_response = client.post(
                "/api/auth/login",
                data={
                    "username": "test_action_update@example.com",
                    "password": "testpass123"
                }
            )
            token = login_response.json()["access_token"]
        else:
            token = signup_response.json()["access_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Create Meeting
        meeting_response = client.post(
            "/meetings",
            json={
                "title": "Action Item Test Meeting",
                "platform": "zoom"
            },
            headers=headers
        )
        assert meeting_response.status_code == 200
        meeting_id = meeting_response.json()["id"]
        
        # 3. Add Action Item (Simulate via DB or if endpoint exists)
        # Since we don't have a direct "add action" endpoint exposed in the test snippet I saw earlier,
        # I'll use the generate summary endpoint which creates actions.
        
        summary_response = client.post(
            f"/meetings/{meeting_id}/summaries/generate",
            data={
                "transcript": "Speaker 1: I will complete the task by tomorrow."
            },
            headers=headers
        )
        assert summary_response.status_code == 200
        data = summary_response.json()
        
        assert len(data["action_items"]) > 0
        action_id = data["action_items"][0]["id"]
        initial_status = data["action_items"][0]["status"]
        print(f"Created action {action_id} with status: {initial_status}")
        
        # 4. Update Action Status to 'done'
        update_response = client.patch(
            f"/meetings/{meeting_id}/actions/{action_id}",
            data={"status": "done"},
            headers=headers
        )
        
        if update_response.status_code != 200:
            print(f"Update failed: {update_response.text}")
            
        assert update_response.status_code == 200
        updated_action = update_response.json()
        assert updated_action["status"] == "done"
        print("Successfully updated status to 'done'")
        
        # 5. Verify persistence via List Meetings
        list_response = client.get("/meetings", headers=headers)
        meetings = list_response.json()
        
        target_meeting = next(m for m in meetings if m["id"] == meeting_id)
        target_action = next(a for a in target_meeting["actions"] if a["id"] == action_id)
        
        assert target_action["status"] == "done"
        print("Verified persistence in meeting list")
        
        print("\\n✅ Test passed: Action item status updated successfully")

if __name__ == "__main__":
    test_update_action_status()
