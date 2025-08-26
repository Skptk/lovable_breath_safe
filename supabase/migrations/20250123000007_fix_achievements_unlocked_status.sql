-- Fix achievements unlocked status for new users
-- This migration corrects the issue where new users were getting all achievements unlocked by default

-- First, let's check if there are any user achievements with incorrect column values
-- The issue was in the ensure_user_initialization function using wrong column names

-- Update any user achievements that might have been created with wrong column values
-- Set all achievements to locked (unlocked = false) for users who have 0 progress
UPDATE public.user_achievements 
SET 
  unlocked = false,
  unlocked_at = null,
  updated_at = now()
WHERE 
  progress = 0 
  AND (unlocked = true OR unlocked_at IS NOT NULL);

-- Also ensure that achievements are only unlocked when progress >= max_progress
UPDATE public.user_achievements 
SET 
  unlocked = false,
  unlocked_at = null,
  updated_at = now()
WHERE 
  progress < max_progress 
  AND unlocked = true;

-- Fix the ensure_user_initialization function to use correct column names
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
  
  -- If user achievements don't exist, create them with correct column names
  IF NOT v_user_achievements_exist THEN
    INSERT INTO public.user_achievements (user_id, achievement_id, progress, max_progress, unlocked, unlocked_at, created_at, updated_at)
    SELECT p_user_id, id, 0, criteria_value, false, null, now(), now()
    FROM public.achievements
    WHERE is_active = true;
    
    RAISE NOTICE 'Created user achievements for user %', p_user_id;
  END IF;
  
  -- If user streaks don't exist, create them
  IF NOT v_user_streaks_exist THEN
    INSERT INTO public.user_streaks (user_id, streak_type, current_streak, max_streak, last_activity_date, created_at, updated_at)
    VALUES 
      (p_user_id, 'daily_reading', 0, 0, CURRENT_DATE, now(), now()),
      (p_user_id, 'good_air_quality', 0, 0, CURRENT_DATE, now(), now()),
      (p_user_id, 'weekly_activity', 0, 0, CURRENT_DATE, now(), now());
    
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

-- Create a function to reset all user achievements to locked status (for testing/debugging)
CREATE OR REPLACE FUNCTION public.reset_user_achievements_to_locked(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.user_achievements 
  SET 
    unlocked = false,
    unlocked_at = null,
    progress = 0,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RAISE NOTICE 'Reset % achievements to locked status for user %', v_count, p_user_id;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.reset_user_achievements_to_locked(UUID) TO authenticated, service_role;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.ensure_user_initialization(UUID) IS 'Fixed function to properly initialize user data with correct achievement column names';
COMMENT ON FUNCTION public.reset_user_achievements_to_locked(UUID) IS 'Utility function to reset user achievements to locked status for testing';
