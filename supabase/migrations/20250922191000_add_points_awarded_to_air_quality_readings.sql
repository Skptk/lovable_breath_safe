-- Add missing points_awarded column to air_quality_readings table
-- This column is referenced by various database functions and triggers for points calculation
ALTER TABLE public.air_quality_readings ADD COLUMN IF NOT EXISTS points_awarded INTEGER DEFAULT 10;

-- Add comment explaining the column
COMMENT ON COLUMN public.air_quality_readings.points_awarded IS 'Points awarded to user for this air quality reading (used for achievements and rewards)';
