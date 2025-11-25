from fastapi import APIRouter, HTTPException, Form, Depends
from app.models import MeetingCreate, MeetingUpdate, ActionCreate, User
from app.dependencies import meeting_service
from app.auth_dependencies import get_current_user

router = APIRouter(prefix="/meetings", tags=["meetings"])

@router.post("")
async def create_meeting(
    meeting: MeetingCreate,
    current_user: User = Depends(get_current_user)
):
    return meeting_service.create_meeting(meeting, current_user.id)

@router.get("")
async def list_meetings(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    meetings = meeting_service.list_meetings(current_user.id, limit, offset)
    # Convert to dicts and include relationships
    result = []
    for meeting in meetings:
        meeting_dict = {
            "id": meeting.id,
            "title": meeting.title,
            "start_time": meeting.start_time.isoformat() if meeting.start_time else None,
            "end_time": meeting.end_time.isoformat() if meeting.end_time else None,
            "platform": meeting.platform,
            "tags": meeting.tags,
            "created_at": meeting.created_at.isoformat() if meeting.created_at else None,
            "summaries": [
                {
                    "id": s.id,
                    "short_summary": s.short_summary,
                    "detailed_summary": s.detailed_summary,
                    "created_at": s.created_at.isoformat() if s.created_at else None
                } for s in (meeting.summaries or [])
            ],
            "actions": [
                {
                    "id": a.id,
                    "description": a.description,
                    "owner": a.owner,
                    "status": a.status,
                    "due_date": a.due_date.isoformat() if a.due_date else None,
                    "created_at": a.created_at.isoformat() if a.created_at else None
                } for a in (meeting.actions or [])
            ]
        }
        result.append(meeting_dict)
    return result

@router.get("/{meeting_id}")
async def get_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_user)
):
    meeting = meeting_service.get_meeting(meeting_id, current_user.id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting

@router.patch("/{meeting_id}")
async def update_meeting(
    meeting_id: str,
    update_data: MeetingUpdate,
    current_user: User = Depends(get_current_user)
):
    return meeting_service.update_meeting(meeting_id, update_data, current_user.id)

@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    current_user: User = Depends(get_current_user)
):
    meeting_service.delete_meeting(meeting_id, current_user.id)
    return {"status": "success", "message": "Meeting deleted"}

@router.post("/{meeting_id}/actions")
async def add_action_item(
    meeting_id: str,
    action: ActionCreate,
    current_user: User = Depends(get_current_user)
):
    return meeting_service.add_action_item(meeting_id, action, current_user.id)

@router.get("/{meeting_id}/actions")
async def get_meeting_actions(
    meeting_id: str,
    current_user: User = Depends(get_current_user)
):
    return meeting_service.get_meeting_actions(meeting_id, current_user.id)

@router.post("/{meeting_id}/summaries/generate")
async def generate_summary(
    meeting_id: str,
    transcript: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Trigger summary generation"""
    return await meeting_service.generate_meeting_summary(meeting_id, transcript, current_user.id)

@router.patch("/{meeting_id}/actions/{action_id}")
async def update_action_status(
    meeting_id: str,
    action_id: str,
    status: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    action = meeting_service.update_action_status(action_id, status, current_user.id)
    if not action:
        raise HTTPException(status_code=404, detail="Action item not found")
    return action
