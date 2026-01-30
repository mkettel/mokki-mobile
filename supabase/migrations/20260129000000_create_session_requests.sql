-- ============================================
-- Session Booking Feature Migration
-- ============================================
-- Adds table for one-on-one session booking system:
-- Allows members to request sessions with admins (e.g., check-ins with psychologist)

-- ============================================
-- 1. Create session_requests table
-- ============================================
CREATE TABLE IF NOT EXISTS public.session_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_date DATE NOT NULL,
    requested_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 45,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    responded_at TIMESTAMPTZ
);

-- Prevent double-booking: same admin, same date/time for accepted sessions
-- Using a partial unique index instead of table constraint for better control
CREATE UNIQUE INDEX idx_unique_accepted_session
    ON public.session_requests (house_id, admin_id, requested_date, requested_time)
    WHERE status = 'accepted';

-- Indexes for session_requests
CREATE INDEX idx_session_requests_house_id ON public.session_requests(house_id);
CREATE INDEX idx_session_requests_requester_id ON public.session_requests(requester_id);
CREATE INDEX idx_session_requests_admin_id ON public.session_requests(admin_id);
CREATE INDEX idx_session_requests_house_date ON public.session_requests(house_id, requested_date);
CREATE INDEX idx_session_requests_status ON public.session_requests(status);

-- Enable RLS on session_requests
ALTER TABLE public.session_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. RLS Policies
-- ============================================

-- Policy: Users can view their own requests (as requester or admin)
CREATE POLICY "Users can view own requests"
    ON public.session_requests
    FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = admin_id);

-- Policy: House members can create requests (only for themselves as requester)
CREATE POLICY "Members can create requests"
    ON public.session_requests
    FOR INSERT
    WITH CHECK (
        auth.uid() = requester_id
        AND EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = session_requests.house_id
            AND house_members.user_id = auth.uid()
            AND house_members.invite_status = 'accepted'
        )
        -- Verify admin_id is actually an admin of the house
        AND EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_members.house_id = session_requests.house_id
            AND house_members.user_id = session_requests.admin_id
            AND house_members.invite_status = 'accepted'
            AND house_members.role = 'admin'
        )
    );

-- Policy: Admins can respond to requests they received (accept/decline)
CREATE POLICY "Admins can respond to requests"
    ON public.session_requests
    FOR UPDATE
    USING (auth.uid() = admin_id)
    WITH CHECK (auth.uid() = admin_id);

-- Policy: Requesters can cancel their own pending requests
CREATE POLICY "Users can cancel own pending requests"
    ON public.session_requests
    FOR UPDATE
    USING (auth.uid() = requester_id AND status = 'pending')
    WITH CHECK (auth.uid() = requester_id);

-- Policy: Users can delete their own cancelled/declined requests (cleanup)
CREATE POLICY "Users can delete own completed requests"
    ON public.session_requests
    FOR DELETE
    USING (
        auth.uid() = requester_id
        AND status IN ('cancelled', 'declined')
    );

-- ============================================
-- 3. Function to update responded_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_session_request_responded_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Set responded_at when status changes from pending to accepted/declined
    IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'declined') THEN
        NEW.responded_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update responded_at on session_requests
DROP TRIGGER IF EXISTS trigger_update_session_request_responded_at ON public.session_requests;
CREATE TRIGGER trigger_update_session_request_responded_at
    BEFORE UPDATE ON public.session_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_session_request_responded_at();

-- ============================================
-- 4. Grant permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_requests TO authenticated;

-- ============================================
-- 5. Enable Realtime (optional)
-- ============================================
-- Note: Run this in Supabase dashboard if you want realtime updates:
-- ALTER PUBLICATION supabase_realtime ADD TABLE session_requests;
