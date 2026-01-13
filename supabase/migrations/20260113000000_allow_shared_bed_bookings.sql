-- ============================================
-- Allow Shared Bed Bookings Migration
-- ============================================
-- Changes:
-- 1. Remove unique constraint on bed_id per signup window (allow multiple people per bed)
-- 2. Keep unique constraint on user_id per window (one bed claim per user per window)
-- This allows couples/groups to share beds while tracking who's in each bed

-- ============================================
-- 1. Remove the unique constraint on bed_id
-- ============================================
-- Drop the existing unique constraint that prevents multiple claims on same bed
ALTER TABLE public.bed_signups
DROP CONSTRAINT IF EXISTS bed_signups_signup_window_id_bed_id_key;

-- ============================================
-- 2. Add index for performance (replacing unique constraint's implicit index)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bed_signups_window_bed
ON public.bed_signups(signup_window_id, bed_id);
