-- Empathetic AI Healthcare Companion - Initial Database Schema
-- Purpose: Store daily conversations, messages, and crisis detection flags
-- Constraints: Minimal data, hard deletes, user isolation via RLS

-- Enable UUID extension (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================
-- One conversation per user per day
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one conversation per user per day
    UNIQUE(user_id, date)
);

-- Index for fast lookups by user and date
CREATE INDEX idx_conversations_user_date ON conversations(user_id, date DESC);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
-- Messages within conversations (user or assistant)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    
    -- Simple audio analysis features (nullable for text-only messages)
    audio_volume FLOAT,
    audio_pace FLOAT, -- words per minute
    audio_pause_count INTEGER,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for querying messages by conversation
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- ============================================================================
-- CRISIS FLAGS TABLE
-- ============================================================================
-- Log crisis detection events for debugging/audit
CREATE TABLE crisis_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    keywords_detected TEXT[] -- Array of detected crisis keywords
);

-- Index for querying crisis flags by user
CREATE INDEX idx_crisis_flags_user_id ON crisis_flags(user_id);
CREATE INDEX idx_crisis_flags_triggered_at ON crisis_flags(triggered_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Auto-update updated_at timestamp on conversations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Users can only access their own data

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_flags ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: CONVERSATIONS
-- ============================================================================
-- Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
    ON conversations FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own conversations
CREATE POLICY "Users can insert own conversations"
    ON conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations"
    ON conversations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own conversations
CREATE POLICY "Users can delete own conversations"
    ON conversations FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: MESSAGES
-- ============================================================================
-- Users can only see messages in their own conversations
CREATE POLICY "Users can view messages in own conversations"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Users can insert messages into their own conversations
CREATE POLICY "Users can insert messages in own conversations"
    ON messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- Note: We don't allow UPDATE or DELETE on messages for MVP

-- ============================================================================
-- RLS POLICIES: CRISIS FLAGS
-- ============================================================================
-- Users can view their own crisis flags
CREATE POLICY "Users can view own crisis flags"
    ON crisis_flags FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own crisis flags (for logging)
-- Note: In practice, backend will insert these, but policy allows user context
CREATE POLICY "Users can insert own crisis flags"
    ON crisis_flags FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Note: No UPDATE or DELETE on crisis flags (immutable audit log)

