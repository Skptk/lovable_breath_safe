-- Add missing points_required column to achievements table
-- This column is referenced by database functions for achievement checking
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS points_required INTEGER DEFAULT 0;

-- Update existing achievements to set points_required based on criteria_value for points-based achievements
UPDATE public.achievements 
SET points_required = criteria_value 
WHERE criteria_type = 'points' AND points_required = 0;

-- Add comment explaining the column
COMMENT ON COLUMN public.achievements.points_required IS 'Points required to unlock this achievement (used for points-based achievements)';
