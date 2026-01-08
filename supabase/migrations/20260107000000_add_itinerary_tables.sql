-- ============================================
-- Itinerary Feature Migration
-- ============================================
-- Adds tables for retreat itinerary system:
-- 1. itinerary_events - Scheduled events for retreats
-- 2. itinerary_event_signups - User signups for events

-- ============================================
-- 1. Create itinerary_events table
-- ============================================
CREATE TABLE IF NOT EXISTS public.itinerary_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,
    category TEXT, -- 'meal', 'workshop', 'activity', 'free_time', 'travel', 'other'
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    capacity INTEGER, -- null = unlimited, otherwise max signups
    links JSONB DEFAULT '[]'::jsonb, -- [{label: string, url: string}]
    checklist JSONB DEFAULT '[]'::jsonb, -- [{text: string}]
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for itinerary_events
CREATE INDEX idx_itinerary_events_house_id ON public.itinerary_events(house_id);
CREATE INDEX idx_itinerary_events_house_date ON public.itinerary_events(house_id, event_date);
CREATE INDEX idx_itinerary_events_created_by ON public.itinerary_events(created_by);

-- Enable RLS on itinerary_events
ALTER TABLE public.itinerary_events ENABLE ROW LEVEL SECURITY;

-- Policy: House members can view itinerary events
CREATE POLICY "House members can view itinerary events"
    ON public.itinerary_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = itinerary_events.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
        )
    );

-- Policy: House admins can insert itinerary events
CREATE POLICY "House admins can insert itinerary events"
    ON public.itinerary_events
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = itinerary_events.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
            AND house_members.role = 'admin'
        )
    );

-- Policy: House admins can update itinerary events
CREATE POLICY "House admins can update itinerary events"
    ON public.itinerary_events
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = itinerary_events.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
            AND house_members.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = itinerary_events.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
            AND house_members.role = 'admin'
        )
    );

-- Policy: House admins can delete itinerary events
CREATE POLICY "House admins can delete itinerary events"
    ON public.itinerary_events
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = itinerary_events.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
            AND house_members.role = 'admin'
        )
    );

-- ============================================
-- 2. Create itinerary_event_signups table
-- ============================================
CREATE TABLE IF NOT EXISTS public.itinerary_event_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.itinerary_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- Prevent duplicate signups
    UNIQUE(event_id, user_id)
);

-- Indexes for itinerary_event_signups
CREATE INDEX idx_itinerary_event_signups_event_id ON public.itinerary_event_signups(event_id);
CREATE INDEX idx_itinerary_event_signups_user_id ON public.itinerary_event_signups(user_id);

-- Enable RLS on itinerary_event_signups
ALTER TABLE public.itinerary_event_signups ENABLE ROW LEVEL SECURITY;

-- Policy: House members can view event signups (via event's house)
CREATE POLICY "House members can view event signups"
    ON public.itinerary_event_signups
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.itinerary_events ie
            JOIN public.house_members hm ON hm.house_id = ie.house_id
            WHERE ie.id = itinerary_event_signups.event_id
            AND hm.user_id = auth.uid()
            AND hm.invite_status = 'accepted'
        )
    );

-- Policy: House members can sign up for events
CREATE POLICY "House members can sign up for events"
    ON public.itinerary_event_signups
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.itinerary_events ie
            JOIN public.house_members hm ON hm.house_id = ie.house_id
            WHERE ie.id = itinerary_event_signups.event_id
            AND hm.user_id = auth.uid()
            AND hm.invite_status = 'accepted'
        )
    );

-- Policy: Users can withdraw from events (delete their own signups)
CREATE POLICY "Users can withdraw from events"
    ON public.itinerary_event_signups
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 3. Function to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_itinerary_event_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on itinerary_events
DROP TRIGGER IF EXISTS trigger_update_itinerary_event_updated_at ON public.itinerary_events;
CREATE TRIGGER trigger_update_itinerary_event_updated_at
    BEFORE UPDATE ON public.itinerary_events
    FOR EACH ROW
    EXECUTE FUNCTION update_itinerary_event_updated_at();

-- ============================================
-- 4. Grant permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itinerary_events TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.itinerary_event_signups TO authenticated;

-- ============================================
-- 5. Enable Realtime (optional)
-- ============================================
-- Note: Run this in Supabase dashboard if you want realtime updates:
-- ALTER PUBLICATION supabase_realtime ADD TABLE itinerary_events;
-- ALTER PUBLICATION supabase_realtime ADD TABLE itinerary_event_signups;
