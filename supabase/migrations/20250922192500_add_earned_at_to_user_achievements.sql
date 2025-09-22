-- Add missing earned_at column to user_achievements table
-- This column is referenced by various database functions for achievement tracking
ALTER TABLE public.user_achievements ADD COLUMN IF NOT EXISTS earned_at TIMESTAMPTZ;

-- Add comment explaining the column
COMMENT ON COLUMN public.user_achievements.earned_at IS 'Timestamp when the achievement was earned by the user';
