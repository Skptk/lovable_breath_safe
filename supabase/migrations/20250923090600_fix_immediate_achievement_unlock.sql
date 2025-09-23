-- Fix immediate achievement unlock issue
-- This migration prevents achievements from being unlocked when progress is 0

-- Drop and recreate the update_points_achievements function to prevent unlocking with zero progress
CREATE OR REPLACE FUNCTION public.update_points_achievements()
RETURNS TRIGGER AS $$
BEGIN
  -- Update points-based achievements when profile points change
  UPDATE public.user_achievements 
  SET progress = NEW.total_points
  WHERE achievement_id IN (
    SELECT id FROM public.achievements 
    WHERE criteria_type = 'points'
  ) AND user_id = NEW.user_id;
  
  -- Only unlock achievements if points are greater than 0
  UPDATE public.user_achievements 
  SET 
    unlocked = true,
    unlocked_at = now(),
    earned_at = now()
  WHERE 
    user_id = NEW.user_id 
    AND NOT unlocked 
    AND progress > 0  -- Only unlock if progress is greater than 0
    AND progress >= max_progress;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the version table for migration tracking if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') THEN
    INSERT INTO public.schema_migrations (version, description)
    VALUES ('20250923090600', 'Fixed immediate achievement unlock issue by requiring progress > 0')
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
