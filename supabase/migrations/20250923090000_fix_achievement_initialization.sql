-- Fix achievement initialization for new users
-- This migration ensures new users start with zero achievements and achievements are only unlocked through actual user actions

-- Drop existing triggers and functions that might be causing issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS initialize_user_data_on_profile_insert ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.initialize_user_data();

-- Create a new handle_new_user function that only creates the profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create the profile, nothing else
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a new initialize_user_data function that initializes user data without unlocking achievements
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
  
  -- Initialize user achievements with progress = 0 and unlocked = false
  -- Only create entries for active achievements
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
  WHERE a.is_active = true
  AND NOT EXISTS (
    SELECT 1 
    FROM public.user_achievements ua 
    WHERE ua.user_id = NEW.user_id AND ua.achievement_id = a.id
  );
  
  -- Create welcome notification
  PERFORM public.create_welcome_notification(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the triggers with the correct order
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER initialize_user_data_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_data();

-- Update the check_achievements function to prevent unlocking achievements with zero progress
CREATE OR REPLACE FUNCTION public.check_achievements(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_total_points INTEGER;
  v_total_readings INTEGER;
  v_good_air_days INTEGER;
  v_daily_streak INTEGER;
  v_good_air_streak INTEGER;
  v_weekly_streak INTEGER;
  v_has_activity BOOLEAN;
BEGIN
  -- First, check if user has any activity
  SELECT EXISTS (
    SELECT 1 FROM public.air_quality_readings 
    WHERE user_id = p_user_id
    LIMIT 1
  ) INTO v_has_activity;
  
  -- If no activity, don't check achievements yet
  IF NOT v_has_activity THEN
    RAISE NOTICE 'No activity found for user %, skipping achievement check', p_user_id;
    RETURN;
  END IF;
  
  -- Get user's total points
  SELECT COALESCE(total_points, 0) INTO v_total_points
  FROM public.profiles
  WHERE user_id = p_user_id;
  
  -- Get total readings count
  SELECT COUNT(*) INTO v_total_readings
  FROM public.air_quality_readings
  WHERE user_id = p_user_id;
  
  -- Get good air quality days count (AQI <= 50)
  SELECT COUNT(*) INTO v_good_air_days
  FROM public.air_quality_readings
  WHERE user_id = p_user_id AND aqi <= 50;
  
  -- Get current streaks
  SELECT COALESCE(current_streak, 0) INTO v_daily_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id AND streak_type = 'daily_reading';
  
  SELECT COALESCE(current_streak, 0) INTO v_good_air_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id AND streak_type = 'good_air_quality';
  
  SELECT COALESCE(current_streak, 0) INTO v_weekly_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id AND streak_type = 'weekly_activity';
  
  -- Only update progress for achievements that require activity
  -- and only if the user has some activity
  IF v_total_readings > 0 THEN
    -- Update reading count achievements
    UPDATE public.user_achievements 
    SET progress = v_total_readings
    WHERE achievement_id IN (
      SELECT id FROM public.achievements 
      WHERE criteria_type = 'count' AND category = 'reading'
    ) 
    AND user_id = p_user_id
    AND v_total_readings > 0; -- Only update if there are readings
    
    -- Update good air quality achievements
    UPDATE public.user_achievements 
    SET progress = v_good_air_days
    WHERE achievement_id IN (
      SELECT id FROM public.achievements 
      WHERE criteria_type = 'quality'
    ) 
    AND user_id = p_user_id
    AND v_good_air_days > 0; -- Only update if there are good air days
  END IF;
  
  -- Update streak-based achievements
  IF v_daily_streak > 0 THEN
    UPDATE public.user_achievements 
    SET progress = v_daily_streak
    WHERE achievement_id IN (
      SELECT id FROM public.achievements 
      WHERE criteria_type = 'streak' AND category = 'streak'
    ) 
    AND user_id = p_user_id;
  END IF;
  
  -- Update points-based achievements
  IF v_total_points > 0 THEN
    UPDATE public.user_achievements 
    SET progress = v_total_points
    WHERE achievement_id IN (
      SELECT id FROM public.achievements 
      WHERE criteria_type = 'points'
    ) 
    AND user_id = p_user_id;
  END IF;
  
  -- Only unlock achievements if the user has some activity
  IF v_has_activity THEN
    -- Check and unlock achievements
    UPDATE public.user_achievements 
    SET 
      unlocked = true,
      unlocked_at = now(),
      earned_at = now()
    WHERE 
      user_id = p_user_id 
      AND NOT unlocked 
      AND progress > 0 -- Ensure progress is greater than 0
      AND progress >= max_progress;
      
    -- Log the check
    RAISE NOTICE 'Checked achievements for user %: % readings, % good air days, % daily streak, % points', 
      p_user_id, v_total_readings, v_good_air_days, v_daily_streak, v_total_points;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.initialize_user_data() TO authenticated, service_role;

-- Add comments for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a profile when a new user signs up';
COMMENT ON FUNCTION public.initialize_user_data() IS 'Initializes all user data after profile creation';
COMMENT ON FUNCTION public.check_achievements(UUID) IS 'Updates and checks user achievements based on their activity';

-- Update the version table for migration tracking if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') THEN
    INSERT INTO public.schema_migrations (version, description)
    VALUES ('20250923090000', 'Fixed achievement initialization to prevent immediate unlocking')
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
