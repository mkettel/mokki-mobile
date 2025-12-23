-- Add is_archived column to house_members table
-- This is per-user archiving (stored on the membership, not the house itself)
ALTER TABLE public.house_members
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_house_members_is_archived
ON public.house_members(user_id, is_archived);
