-- Add total_points column to user_points table
ALTER TABLE public.user_points ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
