"""
Chai Prep - Main FastAPI Application
Real-time AI interview coach backend
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import json
import structlog
from app.core.logging import setup_logging
from typing import Optional
from datetime import datetime
from contextlib import asynccontextmanager

from app.models import (
    MeetingCreate,
    MeetingUpdate,
)
from app.database import create_db_and_tables
from app.services.session_manager import session_manager
from app.dependencies import meeting_service, voice_service
from app.services.auth_service import decode_access_token

# Import Routers
from app.routers import documents, meetings, voice, interview, research, qa, test_gen, neural_engine, auth, doc_analyzer, knowledge, test_plan

# Configure logging
# Configure logging
setup_logging()
logger = structlog.get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    logger.info("Database initialized")
    yield
    # Shutdown (if needed)
    logger.info("Shutting down")

app = FastAPI(
    title="Amplified API",
    description="Backend for Amplified Interview Assistant",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware for Electron frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(meetings.router)
app.include_router(voice.router)
app.include_router(interview.router)
app.include_router(research.router)
app.include_router(qa.router)
app.include_router(test_gen.router)
app.include_router(neural_engine.router)
app.include_router(doc_analyzer.router)
app.include_router(knowledge.router)
app.include_router(test_plan.router)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Amplified Backend",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "active_sessions": len(session_manager.active_sessions),
        "services": {
            "audio_processor": "ready",
            "context_engine": "ready",
            "llm_service": "ready"
        }
    }

# --- WebSocket & Real-time Logic ---

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    """
    Main WebSocket endpoint for real-time communication
    Handles audio streaming, transcription, and AI suggestions
    """
    # Authenticate User
    user_id = None
    if token:
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub")
    
    if not user_id:
        # Close connection if unauthorized
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        logger.warning("WebSocket connection rejected: Invalid or missing token")
        return

    await websocket.accept()
    
    # Create session using user_id as session_id
    session_id = user_id
    session_manager.create_session(session_id, websocket)
    
    logger.info(f"WebSocket connected: {session_id}")
    
    try:
        # Send connection confirmation
        await websocket.send_json({
            "type": "connection_status",
            "payload": {
                "status": "connected",
                "session_id": session_id,
                "message": "Amplified is ready"
            }
        })
        
        # Main message loop
        while True:
            try:
                # Receive message from frontend
                data = await websocket.receive_text()
                message = json.loads(data)
                
                message_type = message.get("type")
                
                if message_type == "command":
                    await handle_command(websocket, session_id, message)
                
                elif message_type == "audio_chunk":
                    await handle_audio_chunk(websocket, session_id, message)
                
                elif message_type == "update_context":
                    await handle_context_update(websocket, session_id, message)
                
                else:
                    logger.warning(f"Unknown message type: {message_type}")
            
            except json.JSONDecodeError:
                logger.error("Invalid JSON received")
                await websocket.send_json({
                    "type": "error",
                    "payload": {"message": "Invalid JSON format"}
                })
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")
        session_manager.end_session(session_id)
    
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        try:
            await websocket.send_json({
                "type": "error",
                "payload": {"message": f"Server error: {str(e)}"}
            })
        except:
            pass # Connection might be closed already
        session_manager.end_session(session_id)


async def handle_command(websocket: WebSocket, session_id: str, message: dict):
    """Handle command messages from frontend"""
    action = message.get("action")
    
    # session_id is the user_id in this implementation
    user_id = session_id
    
    # Ensure session exists
    session = session_manager.active_sessions.get(session_id)
    if not session:
        logger.warning(f"Session {session_id} not found in handle_command. Recreating.")
        session_manager.create_session(session_id, websocket)
        session = session_manager.active_sessions.get(session_id)
        
    if not session:
        logger.error(f"Critical error: Could not create/retrieve session {session_id}")
        return
    
    if action == "start_listening":
        # Get payload from message
        payload = message.get("payload", {})
        continuing_meeting_id = payload.get("meeting_id")  # If provided, we're continuing an existing meeting
        

        
        if continuing_meeting_id:
            # Continuing an existing meeting
            logger.info(f"Continuing meeting {continuing_meeting_id} for session {session_id}")
            session["meeting_id"] = continuing_meeting_id
            
            # Get existing summaries to determine session number
            meeting = meeting_service.get_meeting(continuing_meeting_id, user_id)
            if meeting and meeting.summaries:
                session["session_number"] = len(meeting.summaries) + 1
                # Get previous summaries for context
                session["previous_summaries"] = [s.short_summary for s in sorted(meeting.summaries, key=lambda x: x.session_number)]
            else:
                session["session_number"] = 1
                session["previous_summaries"] = []
            
            # Notify frontend
            await websocket.send_json({
                "type": "meeting_continued",
                "payload": {
                    "meeting_id": continuing_meeting_id,
                    "session_number": session["session_number"]
                }
            })
        elif session and "meeting_id" not in session:
            # Create a new meeting record
            meeting_data = MeetingCreate(
                title=f"Meeting {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                start_time=datetime.now(),
                platform="unknown"
            )
            meeting = meeting_service.create_meeting(meeting_data, user_id)
            session["meeting_id"] = meeting.id
            session["session_number"] = 1
            session["previous_summaries"] = []
            logger.info(f"Created new meeting {meeting.id} for session {session_id}")

            # Notify frontend of meeting ID
            await websocket.send_json({
                "type": "meeting_created",
                "payload": {
                    "meeting_id": meeting.id,
                    "title": meeting.title
                }
            })

        # Setup callback to send transcript updates to this websocket
        async def transcript_callback(data):
            try:
                # Extract variables first
                text = data.get("text", "")
                is_final = data.get("is_final", False)
                speaker_id = data.get("speaker_id", 0)

                # Send transcript update to frontend
                await websocket.send_json({
                    "type": "transcript_update",
                    "payload": data
                })
                
                session = session_manager.active_sessions.get(session_id)
                if not session:
                    return

                # Store transcript if needed (optional, for now just in memory or log)
                if is_final:
                    # Append to session transcript
                    if "transcript_text" not in session:
                        session["transcript_text"] = ""
                    
                    session["transcript_text"] += f"{data.get('speaker', 'Unknown')}: {text}\n"
                
                # Initialize buffer if needed
                if "question_buffer" not in session:
                    session["question_buffer"] = []
                    session["trigger_task"] = None
                    session["has_seen_question"] = False

                # Logic:
                # 1. Append ALL speech to buffer (to capture full context).
                # 2. If Question Detected OR We are already waiting for a question end:
                #    - Reset Timer (Debounce)
                
                if is_final:
                    session["question_buffer"].append(text)
                    
                    # Keep buffer size manageable
                    if len(session["question_buffer"]) > 10:
                        session["question_buffer"].pop(0)

                # Check if this is a question OR if we are already tracking a question
                is_new_question = data.get("is_question")
                
                if is_new_question:
                    session["has_seen_question"] = True
                
                # If we have seen a question recently, ANY speech should reset the timer
                if session["has_seen_question"]:
                    # Cancel existing task to reset timer (debounce)
                    if session["trigger_task"] and not session["trigger_task"].done():
                        session["trigger_task"].cancel()
                    
                    # Define the delayed trigger function
                    async def delayed_trigger():
                        try:
                            await asyncio.sleep(3.0) # Wait for 3 seconds of silence
                            
                            # Combine buffer for context
                            full_question = " ".join(session["question_buffer"])
                            logger.info(f"Triggering suggestion for: {full_question}")
                            
                            should_suggest = not session.get("mock_mode_active", False)
                            
                            if should_suggest:
                                await generate_suggestion(
                                    websocket, 
                                    session_id, 
                                    context_window_seconds=30, 
                                    detected_question=full_question
                                )
                            
                            # Clear buffer and state after triggering
                            session["question_buffer"] = []
                            session["has_seen_question"] = False
                            
                        except asyncio.CancelledError:
                            logger.info("Trigger cancelled (new input received)")
                    
                    # Schedule new task
                    session["trigger_task"] = asyncio.create_task(delayed_trigger())

            except Exception as e:
                logger.error(f"Error sending transcript: {e}")

        session_manager.audio_processor.set_callback(transcript_callback)
        
        # Set user name from voice profile if available
        try:
            profile = voice_service.get_profile(user_id)
            if profile:
                session_manager.audio_processor.set_user_name(profile.name)
            else:
                session_manager.audio_processor.set_user_name(None)
        except Exception as e:
            logger.error(f"Failed to set user name from profile: {e}")
            session_manager.audio_processor.set_user_name(None)

        # Start audio processing
        session_manager.active_sessions[session_id]["is_listening"] = True
        await session_manager.audio_processor.start_capture()
        
        await websocket.send_json({
            "type": "connection_status",
            "payload": {
                "status": "listening",
                "message": "Audio capture started"
            }
        })
        logger.info(f"Started listening: {session_id}")
    
    elif action == "stop_listening":
        # Stop audio processing
        session_manager.active_sessions[session_id]["is_listening"] = False
        await session_manager.audio_processor.stop_capture()
        
        await websocket.send_json({
            "type": "connection_status",
            "payload": {
                "status": "paused",
                "message": "Audio capture stopped"
            }
        })
        logger.info(f"Stopped listening: {session_id}")

    elif action == "end_meeting":
        logger.info(f"End meeting requested for session {session_id}")
        
        # Stop listening if active
        if session_manager.active_sessions[session_id].get("is_listening"):
            session_manager.active_sessions[session_id]["is_listening"] = False
            await session_manager.audio_processor.stop_capture()
            logger.info("Audio capture stopped")

        # Finalize meeting
        session = session_manager.active_sessions.get(session_id)
        meeting_id = session.get("meeting_id")
        
        logger.info(f"Meeting ID: {meeting_id}")
        
        if meeting_id:
            # Update end time
            meeting_service.update_meeting(meeting_id, MeetingUpdate(end_time=datetime.now()), user_id)
            
            # Generate Summary
            transcript = session.get("transcript_text", "")
            logger.info(f"Transcript length: {len(transcript)} characters")
            
            if transcript:
                logger.info(f"Generating summary for meeting {meeting_id}")
                # Get session information
                session_number = session.get("session_number", 1)
                previous_summaries = session.get("previous_summaries", [])
                
                try:
                    summary = await meeting_service.generate_meeting_summary(
                        meeting_id, 
                        transcript,
                        user_id=user_id,
                        session_number=session_number,
                        previous_summaries=previous_summaries
                    )
                    logger.info(f"Summary generated successfully")
                    await websocket.send_json({
                        "type": "meeting_summary",
                        "payload": summary  # summary is now a dict, can be sent directly
                    })
                except Exception as e:
                    logger.error(f"Summary generation failed: {e}", exc_info=True)
                    await websocket.send_json({
                        "type": "error",
                        "payload": {
                            "message": f"Failed to generate summary: {str(e)}"
                        }
                    })
            else:
                logger.warning("No transcript available for summary generation")
                await websocket.send_json({
                    "type": "meeting_summary",
                    "payload": {
                        "meeting_id": meeting_id,
                        "short_summary": "No transcript was recorded for this meeting.",
                        "key_points": [],
                        "action_items": []
                    }
                })
            
            # Clear session meeting state
            if "meeting_id" in session:
                del session["meeting_id"]
            if "transcript_text" in session:
                del session["transcript_text"]
                
            await websocket.send_json({
                "type": "connection_status",
                "payload": {
                    "status": "stopped",
                    "message": "Meeting ended"
                }
            })
            logger.info("Meeting ended successfully")
        else:
            logger.warning("No meeting_id found in session")
            await websocket.send_json({
                "type": "error",
                "payload": {
                    "message": "No active meeting found"
                }
            })

    
    elif action == "generate_suggestion":
        # Generate AI suggestion based on recent transcript
        context_window_seconds = message.get("context_window_seconds", 30)
        await generate_suggestion(websocket, session_id, context_window_seconds)
    
    elif action == "get_stall_phrase":
        # Return a stall phrase immediately
        stall_phrases = [
            "That's a great question. Let me take a moment to structure my thoughts...",
            "Interesting question. I want to give you a thoughtful answer...",
            "Let me think about the best way to approach this...",
            "That's an important point. Let me organize my response..."
        ]
        import random
        await websocket.send_json({
            "type": "stall_phrase",
            "payload": {
                "phrase": random.choice(stall_phrases)
            }
        })
    
    elif action == "set_mock_mode":
        # Set mock mode flag in session
        active = message.get("active", False)
        session = session_manager.active_sessions.get(session_id)
        if session:
            session["mock_mode_active"] = active
            logger.info(f"Mock mode {'activated' if active else 'deactivated'} for session {session_id}")
    
    elif action == "set_interview_mode":
        # Set interview mode flag in session
        active = message.get("active", False)
        session = session_manager.active_sessions.get(session_id)
        if session:
            session["interview_mode_active"] = active
            logger.info(f"Interview mode {'activated' if active else 'deactivated'} for session {session_id}")


async def handle_audio_chunk(websocket: WebSocket, session_id: str, message: dict):
    """Process audio chunk and perform transcription"""
    # This will be implemented with actual audio processing
    # For now, return a mock transcript
    audio_data = message.get("audio_data")
    source = message.get("source", "system")  # "system" or "microphone"
    
    # TODO: Implement actual Deepgram streaming transcription
    # For now, send mock transcript update
    await websocket.send_json({
        "type": "transcript_update",
        "payload": {
            "speaker": "Interviewer" if source == "system" else "You",
            "text": "[Processing audio...]",
            "is_final": False,
            "timestamp": datetime.now().isoformat()
        }
    })


async def handle_context_update(websocket: WebSocket, session_id: str, message: dict):
    """Update context (pinned notes, documents)"""
    update_type = message.get("update_type")
    data = message.get("data")
    
    if update_type == "pinned_notes":
        await session_manager.context_engine.update_pinned_notes(data)
        await websocket.send_json({
            "type": "context_updated",
            "payload": {
                "update_type": "pinned_notes",
                "status": "success"
            }
        })


async def generate_suggestion(
    websocket: WebSocket, 
    session_id: str, 
    context_window_seconds: int,
    detected_question: Optional[str] = None
):
    """Generate AI suggestion based on conversation context"""
    try:
        # Get recent transcript
        session = session_manager.active_sessions.get(session_id)
        if not session:
            return
        
        # Get context from context engine
        context = await session_manager.context_engine.get_full_context()
        
        # Determine question to ask LLM
        if detected_question:
            question_to_process = detected_question
        else:
            # Fallback or manual trigger: use last part of transcript (mock for now or implement history fetch)
            # But since we don't store full history in memory yet (only frontend does), 
            # we'll use a generic prompt or the detected question if available.
            question_to_process = "Could you tell me about a time you handled a difficult client?" # Fallback
        
        # Generate suggestion using LLM
        # Pass user_id (session_id) to use user's preferred engine
        suggestion = await session_manager.llm_service.generate_answer(
            question=question_to_process,
            context=context,
            user_id=session_id
        )
        
        # Send suggestion to frontend
        await websocket.send_json({
            "type": "suggestion",
            "payload": suggestion
        })
        
        logger.info(f"Suggestion generated for session: {session_id}")
    
    except Exception as e:
        logger.error(f"Suggestion generation failed: {str(e)}")
        await websocket.send_json({
            "type": "error",
            "payload": {"message": f"Failed to generate suggestion: {str(e)}"}
        })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
