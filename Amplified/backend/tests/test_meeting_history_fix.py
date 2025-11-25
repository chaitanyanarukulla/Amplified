"""
Test for Meeting History Bug Fix
Verifies that meetings list includes summaries and actions
"""
import pytest
from fastapi.testclient import TestClient
from main import app
from app.services.auth_service import create_access_token

client = TestClient(app)

def test_list_meetings_includes_relationships():
    """
    Test that list_meetings returns summaries and actions relationships.
    This test verifies the fix for the bug where Meeting History was empty.
    """
    # Create a test user and get auth token
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": "test_meeting_history@example.com",
            "password": "testpass123",
            "name": "Test User"
        }
    )
    
    if signup_response.status_code == 400:
        # User might already exist, try login
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": "test_meeting_history@example.com",
                "password": "testpass123"
            }
        )
        token = login_response.json()["access_token"]
    else:
        token = signup_response.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a meeting
    meeting_response = client.post(
        "/meetings",
        json={
            "title": "Test Meeting for History",
            "platform": "zoom"
        },
        headers=headers
    )
    assert meeting_response.status_code == 200
    meeting_data = meeting_response.json()
    meeting_id = meeting_data["id"]
    
    print(f"Created meeting: {meeting_id}")
    
    # Simulate generating a summary
    # (In real flow, this happens via WebSocket end_meeting, but we can call the endpoint directly)
    summary_response = client.post(
        f"/meetings/{meeting_id}/summaries/generate",
        data={
            "transcript": "Speaker 1: We need to finish the project by Friday. Speaker 2: I'll handle the testing. Speaker 1: Great, let's sync tomorrow."
        },
        headers=headers
    )
    
    if summary_response.status_code == 200:
        print("Summary generated successfully")
    else:
        print(f"Summary generation status: {summary_response.status_code}")
        print(f"Response: {summary_response.text}")
    
    # List meetings
    list_response = client.get("/meetings", headers=headers)
    assert list_response.status_code == 200
    
    meetings = list_response.json()
    print(f"\\nFound {len(meetings)} meeting(s)")
    
    # Verify we have at least one meeting
    assert len(meetings) > 0, "No meetings found in history"
    
    # Find our test meeting
    test_meeting = None
    for meeting in meetings:
        if meeting["id"] == meeting_id:
            test_meeting = meeting
            break
    
    assert test_meeting is not None, f"Test meeting {meeting_id} not found in list"
    
    # Verify the meeting has the expected structure
    assert "id" in test_meeting
    assert "title" in test_meeting
    assert "summaries" in test_meeting, "Summaries relationship not loaded"
    assert "actions" in test_meeting, "Actions relationship not loaded"
    
    print(f"\\nMeeting data:")
    print(f"  ID: {test_meeting['id']}")
    print(f"  Title: {test_meeting['title']}")
    print(f"  Summaries: {len(test_meeting['summaries'])}")
    print(f"  Actions: {len(test_meeting['actions'])}")
    
    # If summary was generated, verify it's present
    if summary_response.status_code == 200:
        assert len(test_meeting["summaries"]) > 0, "Summary was generated but not in list"
        print(f"\\n  Summary preview: {test_meeting['summaries'][0]['short_summary'][:100]}...")
        
        # Check if actions were extracted
        if len(test_meeting["actions"]) > 0:
            print(f"  Action items:")
            for action in test_meeting["actions"]:
                print(f"    - {action['description']} (Owner: {action['owner']})")
    
    print("\\n✅ Test passed: Meeting History includes relationships correctly")

if __name__ == "__main__":
    test_list_meetings_includes_relationships()
