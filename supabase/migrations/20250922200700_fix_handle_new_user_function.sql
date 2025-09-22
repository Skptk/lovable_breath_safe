-- Fix handle_new_user function to avoid ON CONFLICT constraint issues
-- This function is called by the on_auth_user_created trigger

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name')
  );
  
  -- Initialize user points using safe approach
  INSERT INTO public.user_points (user_id, total_points)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Initialize user settings using safe approach
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Initialize user achievements using NOT EXISTS approach to avoid constraint issues
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
