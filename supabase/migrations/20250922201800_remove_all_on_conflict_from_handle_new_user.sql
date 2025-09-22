-- Complete fix: Remove ALL ON CONFLICT clauses from handle_new_user function
-- Use only NOT EXISTS approach to avoid any constraint issues

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
  
  -- Initialize user points using NOT EXISTS (avoid all constraint issues)
  INSERT INTO public.user_points (user_id, points_earned, aqi_value, location_name)
  SELECT NEW.id, 0, 0, 'Initial'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_points WHERE user_id = NEW.id
  );
  
  -- Initialize user settings using NOT EXISTS (avoid all constraint issues)
  INSERT INTO public.user_settings (user_id)
  SELECT NEW.id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_settings WHERE user_id = NEW.id
  );
  
  -- Initialize user achievements using NOT EXISTS
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
