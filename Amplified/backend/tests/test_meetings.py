import pytest
from httpx import AsyncClient
from datetime import datetime

@pytest.mark.asyncio
async def test_create_meeting(auth_client: AsyncClient):
    """
    Test creating a new meeting.
    """
    meeting_data = {
        "title": "Integration Test Meeting",
        "start_time": datetime.now().isoformat(),
        "platform": "zoom",
        "tags": ["test", "integration"]
    }
    response = await auth_client.post("/meetings", json=meeting_data)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == meeting_data["title"]
    assert "id" in data
    return data["id"]

@pytest.mark.asyncio
async def test_get_meeting_list(auth_client: AsyncClient):
    """
    Test retrieving the list of meetings.
    """
    response = await auth_client.get("/meetings")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_meeting_lifecycle(auth_client: AsyncClient):
    """
    Test full lifecycle: Create -> Add Action -> Get -> Delete
    """
    # 1. Create
    meeting_data = {
        "title": "Lifecycle Test",
        "start_time": datetime.now().isoformat(),
        "platform": "meet"
    }
    create_res = await auth_client.post("/meetings", json=meeting_data)
    if create_res.status_code != 200:
        print(f"Create Meeting Failed: {create_res.text}")
    assert create_res.status_code == 200
    meeting_id = create_res.json()["id"]
    
    # 2. Add Action
    action_data = {
        "description": "Test Action Item",
        "owner": "Tester",
        "due_date": datetime.now().date().isoformat()
    }
    action_res = await auth_client.post(f"/meetings/{meeting_id}/actions", json=action_data)
    assert action_res.status_code == 200
    
    # 3. Get Meeting details
    get_res = await auth_client.get(f"/meetings/{meeting_id}")
    assert get_res.status_code == 200
    details = get_res.json()
    assert details["id"] == meeting_id
    # Note: The GET /meetings/{meeting_id} endpoint returns the ORM object, 
    # we need to check if 'actions' are included or if we need to fetch them separately.
    # Based on main.py, get_meeting returns the object. FastAPI usually serializes relationships if configured.
    
    # 4. Delete
    del_res = await auth_client.delete(f"/meetings/{meeting_id}")
    assert del_res.status_code == 200
    
    # 5. Verify Deletion
    get_res_after = await auth_client.get(f"/meetings/{meeting_id}")
    assert get_res_after.status_code == 404
