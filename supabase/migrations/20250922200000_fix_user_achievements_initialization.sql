-- Alternative approach: Initialize user achievements without ON CONFLICT
-- Use a safer approach that doesn't rely on the constraint name

CREATE OR REPLACE FUNCTION public.initialize_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize user points
  INSERT INTO public.user_points (user_id, total_points)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Initialize user settings  
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Initialize user achievements using a different approach
  -- First check if achievements exist, then insert only missing ones
  INSERT INTO public.user_achievements (user_id, achievement_id, progress, max_progress, unlocked, unlocked_at, earned_at)
  SELECT 
    NEW.id, 
    a.id, 
    0 as progress,
    a.criteria_value as max_progress,
    false as unlocked,
    NULL as unlocked_at,
    NULL as earned_at
  FROM public.achievements a
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_achievements ua 
    WHERE ua.user_id = NEW.id AND ua.achievement_id = a.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
