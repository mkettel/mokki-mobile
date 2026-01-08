-- Migration: Add co-booker feature for couples booking together
-- This allows a stay to have a co-booker, and a bed claim to have a co-claimer

-- ============================================
-- 1. Add co_booker_id to stays table
-- ============================================

ALTER TABLE public.stays
ADD COLUMN IF NOT EXISTS co_booker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_stays_co_booker_id ON public.stays(co_booker_id);

-- Constraint: co_booker cannot be the same as user_id
ALTER TABLE public.stays
ADD CONSTRAINT stays_co_booker_not_self CHECK (co_booker_id IS NULL OR co_booker_id != user_id);

-- ============================================
-- 2. Add co_claimer_id to bed_signups table
-- ============================================

ALTER TABLE public.bed_signups
ADD COLUMN IF NOT EXISTS co_claimer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_bed_signups_co_claimer_id ON public.bed_signups(co_claimer_id);

-- Constraint: co_claimer cannot be the same as user_id (primary claimer)
ALTER TABLE public.bed_signups
ADD CONSTRAINT bed_signups_co_claimer_not_self CHECK (co_claimer_id IS NULL OR co_claimer_id != user_id);

-- Unique constraint: a user cannot be a co-claimer on multiple beds in the same window
-- This prevents someone from being co-claimer on bed A while already being co-claimer on bed B
CREATE UNIQUE INDEX IF NOT EXISTS idx_bed_signups_co_claimer_unique
ON public.bed_signups(signup_window_id, co_claimer_id)
WHERE co_claimer_id IS NOT NULL;

-- ============================================
-- 3. Auto-cleanup trigger
-- When a user who is a co-claimer claims their own bed,
-- automatically remove them as co-claimer from the other bed
-- ============================================

CREATE OR REPLACE FUNCTION remove_co_claimer_on_primary_claim()
RETURNS TRIGGER AS $$
BEGIN
    -- When a user claims a bed, remove them as co-claimer from any other bed in the same window
    UPDATE public.bed_signups
    SET co_claimer_id = NULL
    WHERE signup_window_id = NEW.signup_window_id
    AND co_claimer_id = NEW.user_id
    AND id != NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_remove_co_claimer_on_primary_claim ON public.bed_signups;

CREATE TRIGGER trigger_remove_co_claimer_on_primary_claim
    AFTER INSERT ON public.bed_signups
    FOR EACH ROW
    EXECUTE FUNCTION remove_co_claimer_on_primary_claim();

-- ============================================
-- 4. RLS Policy updates for co_claimer
-- ============================================

-- Users can update co_claimer on their own bed signups
-- (The existing update policy should cover this, but let's be explicit)
DROP POLICY IF EXISTS "Users can update co_claimer on their own bed signups" ON public.bed_signups;

CREATE POLICY "Users can update co_claimer on their own bed signups"
    ON public.bed_signups
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
