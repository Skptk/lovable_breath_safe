-- Add missing check_achievements function
-- This function will be called by the rewards page to manually check and update achievements

-- Create function to check and update user achievements
CREATE OR REPLACE FUNCTION public.check_achievements(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_total_points INTEGER;
  v_total_readings INTEGER;
  v_good_air_days INTEGER;
  v_daily_streak INTEGER;
  v_good_air_streak INTEGER;
  v_weekly_streak INTEGER;
BEGIN
  -- Get user's total points
  SELECT total_points INTO v_total_points
  FROM public.profiles
  WHERE user_id = p_user_id;
  
  IF v_total_points IS NULL THEN
    v_total_points := 0;
  END IF;
  
  -- Get total readings count
  SELECT COUNT(*) INTO v_total_readings
  FROM public.air_quality_readings
  WHERE user_id = p_user_id;
  
  -- Get good air quality days count (AQI <= 50)
  SELECT COUNT(*) INTO v_good_air_days
  FROM public.air_quality_readings
  WHERE user_id = p_user_id AND aqi <= 50;
  
  -- Get current streaks
  SELECT current_streak INTO v_daily_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id AND streak_type = 'daily_reading';
  
  SELECT current_streak INTO v_good_air_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id AND streak_type = 'good_air_quality';
  
  SELECT current_streak INTO v_weekly_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id AND streak_type = 'weekly_activity';
  
  -- Update reading count achievements
  UPDATE public.user_achievements 
  SET progress = v_total_readings
  WHERE achievement_id IN (
    SELECT id FROM public.achievements 
    WHERE criteria_type = 'count' AND category = 'reading'
  ) AND user_id = p_user_id;
  
  -- Update good air quality achievements
  UPDATE public.user_achievements 
  SET progress = v_good_air_days
  WHERE achievement_id IN (
    SELECT id FROM public.achievements 
    WHERE criteria_type = 'quality'
  ) AND user_id = p_user_id;
  
  -- Update streak-based achievements
  UPDATE public.user_achievements 
  SET progress = v_daily_streak
  WHERE achievement_id IN (
    SELECT id FROM public.achievements 
    WHERE criteria_type = 'streak' AND category = 'streak'
  ) AND user_id = p_user_id;
  
  -- Update points-based achievements
  UPDATE public.user_achievements 
  SET progress = v_total_points
  WHERE achievement_id IN (
    SELECT id FROM public.achievements 
    WHERE criteria_type = 'points'
  ) AND user_id = p_user_id;
  
  -- Check and unlock achievements
  UPDATE public.user_achievements 
  SET 
    unlocked = true,
    unlocked_at = now()
  WHERE 
    user_id = p_user_id 
    AND NOT unlocked 
    AND progress >= max_progress;
    
  -- Log the check
  RAISE NOTICE 'Checked achievements for user %: % readings, % good air days, % daily streak, % points', 
    p_user_id, v_total_readings, v_good_air_days, v_daily_streak, v_total_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_achievements(UUID) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.check_achievements(UUID) IS 'Manually check and update user achievements based on current data';
