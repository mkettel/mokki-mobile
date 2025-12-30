-- ============================================
-- Bed Sign-Up Feature Migration
-- ============================================
-- Adds tables for bed/room sign-up system:
-- 1. rooms - Room definitions per house (admin-configurable)
-- 2. beds - Individual beds within rooms
-- 3. signup_windows - Weekly sign-up windows
-- 4. bed_signups - Bed claims by users
-- Also modifies stays table to optionally link to bed claims

-- ============================================
-- 1. Create rooms table
-- ============================================
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    room_type TEXT NOT NULL DEFAULT 'bedroom', -- 'bedroom', 'bunk_room', etc.
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for rooms
CREATE INDEX idx_rooms_house_id ON public.rooms(house_id);
CREATE INDEX idx_rooms_display_order ON public.rooms(house_id, display_order);

-- Enable RLS on rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Policy: House members can view rooms
CREATE POLICY "House members can view rooms"
    ON public.rooms
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = rooms.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
        )
    );

-- Policy: House admins can insert rooms
CREATE POLICY "House admins can insert rooms"
    ON public.rooms
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = rooms.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
            AND house_members.role = 'admin'
        )
    );

-- Policy: House admins can update rooms
CREATE POLICY "House admins can update rooms"
    ON public.rooms
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = rooms.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
            AND house_members.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = rooms.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
            AND house_members.role = 'admin'
        )
    );

-- Policy: House admins can delete rooms
CREATE POLICY "House admins can delete rooms"
    ON public.rooms
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = rooms.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
            AND house_members.role = 'admin'
        )
    );

-- ============================================
-- 2. Create beds table
-- ============================================
CREATE TABLE IF NOT EXISTS public.beds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bed_type TEXT NOT NULL DEFAULT 'twin', -- 'king', 'queen', 'full', 'twin'
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for beds
CREATE INDEX idx_beds_room_id ON public.beds(room_id);
CREATE INDEX idx_beds_house_id ON public.beds(house_id);
CREATE INDEX idx_beds_display_order ON public.beds(room_id, display_order);

-- Enable RLS on beds
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;

-- Policy: House members can view beds
CREATE POLICY "House members can view beds"
    ON public.beds
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = beds.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
        )
    );

-- Policy: House admins can insert beds
CREATE POLICY "House admins can insert beds"
    ON public.beds
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = beds.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
            AND house_members.role = 'admin'
        )
    );

-- Policy: House admins can update beds
CREATE POLICY "House admins can update beds"
    ON public.beds
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = beds.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
            AND house_members.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = beds.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
            AND house_members.role = 'admin'
        )
    );

-- Policy: House admins can delete beds
CREATE POLICY "House admins can delete beds"
    ON public.beds
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = beds.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
            AND house_members.role = 'admin'
        )
    );

-- ============================================
-- 3. Create signup_windows table
-- ============================================
CREATE TABLE IF NOT EXISTS public.signup_windows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    target_weekend_start DATE NOT NULL,  -- Friday of target weekend
    target_weekend_end DATE NOT NULL,    -- Sunday of target weekend
    opens_at TIMESTAMPTZ NOT NULL,       -- Random Mon/Tue time when window opens
    closed_at TIMESTAMPTZ,               -- When all beds filled or manual close
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'open', 'closed'
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- Unique constraint: one window per house per weekend
    UNIQUE(house_id, target_weekend_start)
);

-- Indexes for signup_windows
CREATE INDEX idx_signup_windows_house_id ON public.signup_windows(house_id);
CREATE INDEX idx_signup_windows_status ON public.signup_windows(house_id, status);
CREATE INDEX idx_signup_windows_opens_at ON public.signup_windows(opens_at);
CREATE INDEX idx_signup_windows_target ON public.signup_windows(house_id, target_weekend_start);

-- Enable RLS on signup_windows
ALTER TABLE public.signup_windows ENABLE ROW LEVEL SECURITY;

-- Policy: House members can view signup windows
CREATE POLICY "House members can view signup windows"
    ON public.signup_windows
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = signup_windows.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
        )
    );

-- Policy: System/Admin can insert signup windows (via edge function or admin)
CREATE POLICY "House admins can insert signup windows"
    ON public.signup_windows
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = signup_windows.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
            AND house_members.role = 'admin'
        )
    );

-- Policy: House admins can update signup windows
CREATE POLICY "House admins can update signup windows"
    ON public.signup_windows
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = signup_windows.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
            AND house_members.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = signup_windows.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
            AND house_members.role = 'admin'
        )
    );

-- ============================================
-- 4. Create bed_signups table
-- ============================================
CREATE TABLE IF NOT EXISTS public.bed_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    signup_window_id UUID NOT NULL REFERENCES public.signup_windows(id) ON DELETE CASCADE,
    bed_id UUID NOT NULL REFERENCES public.beds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stay_id UUID REFERENCES public.stays(id) ON DELETE SET NULL,  -- Optional link to stay
    claimed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- Constraints: one claim per bed per window, one bed per user per window
    UNIQUE(signup_window_id, bed_id),
    UNIQUE(signup_window_id, user_id)
);

-- Indexes for bed_signups
CREATE INDEX idx_bed_signups_signup_window_id ON public.bed_signups(signup_window_id);
CREATE INDEX idx_bed_signups_bed_id ON public.bed_signups(bed_id);
CREATE INDEX idx_bed_signups_user_id ON public.bed_signups(user_id);
CREATE INDEX idx_bed_signups_stay_id ON public.bed_signups(stay_id);

-- Enable RLS on bed_signups
ALTER TABLE public.bed_signups ENABLE ROW LEVEL SECURITY;

-- Policy: House members can view bed signups (via signup window's house)
CREATE POLICY "House members can view bed signups"
    ON public.bed_signups
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.signup_windows sw
            JOIN public.house_members hm ON hm.house_id = sw.house_id
            WHERE sw.id = bed_signups.signup_window_id
            AND hm.user_id = auth.uid()
            AND hm.invite_status = 'accepted'
        )
    );

-- Policy: Users can claim beds when window is open
CREATE POLICY "Users can claim beds when window is open"
    ON public.bed_signups
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.signup_windows sw
            JOIN public.house_members hm ON hm.house_id = sw.house_id
            WHERE sw.id = bed_signups.signup_window_id
            AND sw.status = 'open'
            AND hm.user_id = auth.uid()
            AND hm.invite_status = 'accepted'
        )
    );

-- Policy: Users can update their own bed signups (e.g., link to stay)
CREATE POLICY "Users can update their own bed signups"
    ON public.bed_signups
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can release their own bed claims
CREATE POLICY "Users can release their own bed claims"
    ON public.bed_signups
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 5. Modify stays table to add bed_signup_id
-- ============================================
ALTER TABLE public.stays
ADD COLUMN IF NOT EXISTS bed_signup_id UUID REFERENCES public.bed_signups(id) ON DELETE SET NULL;

-- Index for the new column
CREATE INDEX IF NOT EXISTS idx_stays_bed_signup_id ON public.stays(bed_signup_id);

-- ============================================
-- 6. Function to auto-close window when all beds filled
-- ============================================
CREATE OR REPLACE FUNCTION check_and_close_signup_window()
RETURNS TRIGGER AS $$
DECLARE
    total_beds INTEGER;
    claimed_beds INTEGER;
    window_house_id UUID;
BEGIN
    -- Get the house_id from the signup window
    SELECT sw.house_id INTO window_house_id
    FROM public.signup_windows sw
    WHERE sw.id = NEW.signup_window_id;

    -- Count total beds for this house
    SELECT COUNT(*) INTO total_beds
    FROM public.beds
    WHERE house_id = window_house_id;

    -- Count claimed beds for this window
    SELECT COUNT(*) INTO claimed_beds
    FROM public.bed_signups
    WHERE signup_window_id = NEW.signup_window_id;

    -- If all beds claimed, close the window
    IF claimed_beds >= total_beds AND total_beds > 0 THEN
        UPDATE public.signup_windows
        SET status = 'closed', closed_at = now()
        WHERE id = NEW.signup_window_id
        AND status = 'open';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-close window when all beds are claimed
DROP TRIGGER IF EXISTS trigger_check_close_signup_window ON public.bed_signups;
CREATE TRIGGER trigger_check_close_signup_window
    AFTER INSERT ON public.bed_signups
    FOR EACH ROW
    EXECUTE FUNCTION check_and_close_signup_window();

-- ============================================
-- 7. Grant permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beds TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.signup_windows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bed_signups TO authenticated;

-- ============================================
-- 8. Enable Realtime for bed_signups table
-- ============================================
-- Note: Run this in Supabase dashboard if not using CLI:
-- ALTER PUBLICATION supabase_realtime ADD TABLE bed_signups;
-- ALTER PUBLICATION supabase_realtime ADD TABLE signup_windows;
