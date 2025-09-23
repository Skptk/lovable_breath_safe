-- Fix check_achievements function to prevent unlocking with zero progress
-- This migration ensures that achievements are only unlocked when there's actual progress

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
    AND user_id = p_user_id;
    
    -- Update good air quality achievements
    IF v_good_air_days > 0 THEN
      UPDATE public.user_achievements 
      SET progress = v_good_air_days
      WHERE achievement_id IN (
        SELECT id FROM public.achievements 
        WHERE criteria_type = 'quality'
      ) 
      AND user_id = p_user_id;
    END IF;
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
    -- Check and unlock achievements with progress > 0
    UPDATE public.user_achievements 
    SET 
      unlocked = true,
      unlocked_at = now(),
      earned_at = now()
    WHERE 
      user_id = p_user_id 
      AND NOT unlocked 
      AND progress > 0  -- Only unlock if progress is greater than 0
      AND progress >= max_progress;
      
    -- Log the check
    RAISE NOTICE 'Checked achievements for user %: % readings, % good air days, % daily streak, % points', 
      p_user_id, v_total_readings, v_good_air_days, v_daily_streak, v_total_points;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the version table for migration tracking if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') THEN
    INSERT INTO public.schema_migrations (version, description)
    VALUES ('20250923090800', 'Fixed check_achievements to prevent unlocking with zero progress')
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
