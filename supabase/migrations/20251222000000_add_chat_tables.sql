-- ============================================
-- Chat Feature Migration
-- ============================================
-- Adds tables for house group chat and direct messages:
-- 1. conversations - DM conversations between members
-- 2. message_attachments - Media attachments for messages
-- 3. chat_read_receipts - Track read status for unread counts
-- Also modifies existing messages table for DM support

-- ============================================
-- 1. Create conversations table (for DMs)
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    participant_1 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- Ensure unique conversation per pair in a house
    UNIQUE(house_id, participant_1, participant_2),
    -- Ensure participant_1 < participant_2 to avoid duplicate conversations
    CHECK (participant_1 < participant_2)
);

-- Indexes for conversations
CREATE INDEX idx_conversations_house_id ON public.conversations(house_id);
CREATE INDEX idx_conversations_participant_1 ON public.conversations(participant_1);
CREATE INDEX idx_conversations_participant_2 ON public.conversations(participant_2);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view conversations they're part of (within houses they belong to)
CREATE POLICY "Users can view their conversations"
    ON public.conversations
    FOR SELECT
    USING (
        auth.uid() IN (participant_1, participant_2)
        AND EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = conversations.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
        )
    );

-- Policy: Users can create conversations with other house members
CREATE POLICY "Users can create conversations"
    ON public.conversations
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (participant_1, participant_2)
        AND EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = conversations.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
        )
        -- Ensure the other participant is also a house member
        AND EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = conversations.house_id
            AND house_members.user_id = CASE
                WHEN auth.uid() = participant_1 THEN participant_2
                ELSE participant_1
            END
            AND house_members.invite_status = 'accepted'
        )
    );

-- Policy: Update last_message_at when new messages are sent
CREATE POLICY "Users can update their conversations"
    ON public.conversations
    FOR UPDATE
    USING (auth.uid() IN (participant_1, participant_2))
    WITH CHECK (auth.uid() IN (participant_1, participant_2));

-- ============================================
-- 2. Modify messages table for DM support
-- ============================================
-- Add conversation_id column for DMs
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Add has_attachments flag
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT FALSE;

-- Make house_id nullable (null for DMs, set for house chat)
ALTER TABLE public.messages
ALTER COLUMN house_id DROP NOT NULL;

-- Add constraint: either house_id or conversation_id must be set, but not both
-- Note: We add this as a check constraint only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'messages_scope_check'
    ) THEN
        ALTER TABLE public.messages ADD CONSTRAINT messages_scope_check CHECK (
            (house_id IS NOT NULL AND conversation_id IS NULL) OR
            (house_id IS NULL AND conversation_id IS NOT NULL)
        );
    END IF;
END $$;

-- Index for conversation messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Update RLS policy for messages to include DM access
-- First drop existing select policy if it exists
DROP POLICY IF EXISTS "House members can view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages" ON public.messages;

-- Create new comprehensive select policy
CREATE POLICY "Users can view messages"
    ON public.messages
    FOR SELECT
    USING (
        -- House chat: user is a member of the house
        (house_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = messages.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
        ))
        OR
        -- DM: user is a participant in the conversation
        (conversation_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND auth.uid() IN (conversations.participant_1, conversations.participant_2)
        ))
    );

-- Update insert policy
DROP POLICY IF EXISTS "House members can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;

CREATE POLICY "Users can insert messages"
    ON public.messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND (
            -- House chat: user is a member of the house
            (house_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.house_members
                WHERE house_members.house_id = messages.house_id
                AND house_members.user_id = auth.uid()
                AND house_members.invite_status = 'accepted'
            ))
            OR
            -- DM: user is a participant in the conversation
            (conversation_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.conversations
                WHERE conversations.id = messages.conversation_id
                AND auth.uid() IN (conversations.participant_1, conversations.participant_2)
            ))
        )
    );

-- ============================================
-- 3. Create message_attachments table
-- ============================================
CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- seconds, for videos
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for message attachments
CREATE INDEX idx_message_attachments_message_id ON public.message_attachments(message_id);

-- Enable RLS on message_attachments
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view attachments for messages they can see
CREATE POLICY "Users can view message attachments"
    ON public.message_attachments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.messages
            WHERE messages.id = message_attachments.message_id
            AND (
                -- House chat access
                (messages.house_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.house_members
                    WHERE house_members.house_id = messages.house_id
                    AND house_members.user_id = auth.uid()
                    AND house_members.invite_status = 'accepted'
                ))
                OR
                -- DM access
                (messages.conversation_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.conversations
                    WHERE conversations.id = messages.conversation_id
                    AND auth.uid() IN (conversations.participant_1, conversations.participant_2)
                ))
            )
        )
    );

-- Policy: Users can insert attachments for their own messages
CREATE POLICY "Users can insert message attachments"
    ON public.message_attachments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.messages
            WHERE messages.id = message_attachments.message_id
            AND messages.user_id = auth.uid()
        )
    );

-- ============================================
-- 4. Create chat_read_receipts table
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_read_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_read_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    -- Unique constraints for each chat type
    UNIQUE(user_id, house_id),
    UNIQUE(user_id, conversation_id),
    -- Either house_id or conversation_id must be set, but not both
    CHECK (
        (house_id IS NOT NULL AND conversation_id IS NULL) OR
        (house_id IS NULL AND conversation_id IS NOT NULL)
    )
);

-- Indexes for read receipts
CREATE INDEX idx_chat_read_receipts_user_id ON public.chat_read_receipts(user_id);
CREATE INDEX idx_chat_read_receipts_house_id ON public.chat_read_receipts(house_id);
CREATE INDEX idx_chat_read_receipts_conversation_id ON public.chat_read_receipts(conversation_id);

-- Enable RLS on chat_read_receipts
ALTER TABLE public.chat_read_receipts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own read receipts
CREATE POLICY "Users can view their own read receipts"
    ON public.chat_read_receipts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own read receipts
CREATE POLICY "Users can insert their own read receipts"
    ON public.chat_read_receipts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own read receipts
CREATE POLICY "Users can update their own read receipts"
    ON public.chat_read_receipts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. Function to update conversation last_message_at
-- ============================================
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.conversation_id IS NOT NULL THEN
        UPDATE public.conversations
        SET last_message_at = NEW.created_at
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update conversation timestamp
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    WHEN (NEW.conversation_id IS NOT NULL)
    EXECUTE FUNCTION update_conversation_last_message();

-- ============================================
-- 6. Grant permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.message_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chat_read_receipts TO authenticated;

-- ============================================
-- 7. Enable Realtime for chat tables
-- ============================================
-- Note: Run these in Supabase dashboard if not using CLI:
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
