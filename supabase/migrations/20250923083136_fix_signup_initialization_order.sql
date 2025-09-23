-- Fix signup initialization order to respect foreign key constraints
-- This migration ensures proper initialization order: auth.users -> profiles -> user_settings/user_points

-- Drop existing triggers and functions to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS initialize_user_data_on_profile_insert ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.initialize_user_data();

-- Create a function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- First, create the profile record
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to handle post-profile initialization
CREATE OR REPLACE FUNCTION public.initialize_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize user points with all required columns
  INSERT INTO public.user_points (
    user_id, 
    points_earned, 
    aqi_value, 
    location_name
  )
  SELECT 
    NEW.user_id, 
    0 as points_earned, 
    0 as aqi_value, 
    'Initial' as location_name
  WHERE NOT EXISTS (
    SELECT 1 
    FROM public.user_points 
    WHERE user_id = NEW.user_id
  );
  
  -- Initialize user settings (now that profile exists)
  INSERT INTO public.user_settings (user_id)
  SELECT NEW.user_id
  WHERE NOT EXISTS (
    SELECT 1 
    FROM public.user_settings 
    WHERE user_id = NEW.user_id
  );
  
  -- Initialize user achievements
  INSERT INTO public.user_achievements (
    user_id, 
    achievement_id, 
    progress, 
    max_progress, 
    unlocked, 
    unlocked_at, 
    earned_at
  )
  SELECT 
    NEW.user_id, 
    a.id, 
    0 as progress, 
    a.criteria_value as max_progress,
    false as unlocked,
    NULL as unlocked_at,
    NULL as earned_at
  FROM public.achievements a
  WHERE NOT EXISTS (
    SELECT 1 
    FROM public.user_achievements ua 
    WHERE ua.user_id = NEW.user_id AND ua.achievement_id = a.id
  );
  
  -- Create welcome notification
  PERFORM public.create_welcome_notification(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to handle new user creation (creates profile)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Create trigger to handle post-profile initialization
CREATE TRIGGER initialize_user_data_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_data();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.initialize_user_data() TO authenticated, service_role;

-- Add comments for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a profile when a new user signs up';
COMMENT ON FUNCTION public.initialize_user_data() IS 'Initializes all user data after profile creation';

-- Update the version table for migration tracking if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') THEN
    INSERT INTO public.schema_migrations (version, description)
    VALUES ('20250923083136', 'Fixed signup initialization order to respect foreign key constraints')
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
