-- Fix user initialization for accounts created through password reset flow
-- This migration ensures that users who were created via password reset have proper database setup

-- Function to check and initialize missing user data
CREATE OR REPLACE FUNCTION public.ensure_user_initialization(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_profile_exists BOOLEAN;
  v_user_points_exist BOOLEAN;
  v_user_achievements_exist BOOLEAN;
  v_user_streaks_exist BOOLEAN;
  v_user_settings_exist BOOLEAN;
BEGIN
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = p_user_id) INTO v_profile_exists;
  
  -- Check if user points exist
  SELECT EXISTS(SELECT 1 FROM public.user_points WHERE user_id = p_user_id) INTO v_user_points_exist;
  
  -- Check if user achievements exist
  SELECT EXISTS(SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id) INTO v_user_achievements_exist;
  
  -- Check if user streaks exist
  SELECT EXISTS(SELECT 1 FROM public.user_streaks WHERE user_id = p_user_id) INTO v_user_streaks_exist;
  
  -- Check if user settings exist
  SELECT EXISTS(SELECT 1 FROM public.user_settings WHERE user_id = p_user_id) INTO v_user_settings_exist;
  
  -- If profile doesn't exist, create it
  IF NOT v_profile_exists THEN
    INSERT INTO public.profiles (user_id, email, full_name, created_at, updated_at)
    SELECT 
      id,
      email,
      COALESCE(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', 'User'),
      created_at,
      updated_at
    FROM auth.users 
    WHERE id = p_user_id;
    
    RAISE NOTICE 'Created missing profile for user %', p_user_id;
  END IF;
  
  -- If user points don't exist, create initial entry
  IF NOT v_user_points_exist THEN
    INSERT INTO public.user_points (user_id, points, total_earned, total_spent, created_at, updated_at)
    VALUES (p_user_id, 0, 0, 0, now(), now());
    
    RAISE NOTICE 'Created initial user points for user %', p_user_id;
  END IF;
  
  -- If user achievements don't exist, create them
  IF NOT v_user_achievements_exist THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, progress, completed, completed_at, created_at, updated_at)
    SELECT p_user_id, id, 0, false, null, now(), now()
    FROM public.achievements;
    
    RAISE NOTICE 'Created user achievements for user %', p_user_id;
  END IF;
  
  -- If user streaks don't exist, create them
  IF NOT v_user_streaks_exist THEN
    INSERT INTO public.user_streaks (user_id, streak_type, current_streak, max_streak, last_activity_date, created_at, updated_at)
    VALUES 
      (p_user_id, 'daily_reading', 0, 0, null, now(), now()),
      (p_user_id, 'weekly_goals', 0, 0, null, now(), now()),
      (p_user_id, 'monthly_challenges', 0, 0, null, now(), now());
    
    RAISE NOTICE 'Created user streaks for user %', p_user_id;
  END IF;
  
  -- If user settings don't exist, create them
  IF NOT v_user_settings_exist THEN
    INSERT INTO public.user_settings (user_id, notifications_enabled, email_notifications, push_notifications, theme_preference, language, timezone, created_at, updated_at)
    VALUES (p_user_id, true, true, false, 'system', 'en', 'UTC', now(), now());
    
    RAISE NOTICE 'Created user settings for user %', p_user_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.ensure_user_initialization(UUID) TO authenticated, service_role;

-- Function to initialize all existing users who may be missing data
CREATE OR REPLACE FUNCTION public.initialize_all_existing_users()
RETURNS INTEGER AS $$
DECLARE
  v_user RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_user IN SELECT id FROM auth.users LOOP
    BEGIN
      PERFORM public.ensure_user_initialization(v_user.id);
      v_count := v_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to initialize user %: %', v_user.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.initialize_all_existing_users() TO service_role;

-- Create a trigger to ensure user initialization on profile access
CREATE OR REPLACE FUNCTION public.ensure_user_data_on_profile_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure user has all required data before allowing access
  PERFORM public.ensure_user_initialization(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profile access
DROP TRIGGER IF EXISTS ensure_user_data_on_profile_access ON public.profiles;
CREATE TRIGGER ensure_user_data_on_profile_access
  BEFORE SELECT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_data_on_profile_access();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.ensure_user_data_on_profile_access() TO authenticated, service_role;

-- Comment on the functions
COMMENT ON FUNCTION public.ensure_user_initialization(UUID) IS 'Ensures all required user data exists for a given user ID';
COMMENT ON FUNCTION public.initialize_all_existing_users() IS 'Initializes all existing users who may be missing required data';
COMMENT ON FUNCTION public.ensure_user_data_on_profile_access() IS 'Ensures user data exists before allowing profile access';
