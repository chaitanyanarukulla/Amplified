-- Migration 001: Add Missing Indexes
-- This migration adds strategic indexes to improve query performance

-- Meeting table indexes
CREATE INDEX IF NOT EXISTS ix_meeting_user_id ON meeting(user_id);
CREATE INDEX IF NOT EXISTS ix_meeting_start_time ON meeting(start_time);

-- Document table indexes
CREATE INDEX IF NOT EXISTS ix_document_user_id ON document(user_id);
CREATE INDEX IF NOT EXISTS ix_document_type ON document(type);
CREATE INDEX IF NOT EXISTS ix_document_meeting_id ON document(meeting_id);

-- MeetingSummary table indexes
CREATE INDEX IF NOT EXISTS ix_meetingsummary_meeting_id ON meetingsummary(meeting_id);

-- MeetingAction table indexes
CREATE INDEX IF NOT EXISTS ix_meetingaction_meeting_id ON meetingaction(meeting_id);
CREATE INDEX IF NOT EXISTS ix_meetingaction_status ON meetingaction(status);

-- VoiceProfile unique constraint (one profile per user)
CREATE UNIQUE INDEX IF NOT EXISTS ix_voice_profiles_user_id ON voice_profiles(user_id);

-- UserLLMPreference unique constraint (one preference per user)
CREATE UNIQUE INDEX IF NOT EXISTS ix_user_llm_preferences_user_id ON user_llm_preferences(user_id);
