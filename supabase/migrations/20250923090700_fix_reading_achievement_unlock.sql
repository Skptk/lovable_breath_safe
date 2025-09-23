-- Fix immediate achievement unlock issue in update_user_progress_on_reading
-- This migration prevents achievements from being unlocked with zero progress

-- Drop and recreate the update_user_progress_on_reading function to prevent unlocking with zero progress
CREATE OR REPLACE FUNCTION public.update_user_progress_on_reading()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_aqi INTEGER;
  v_location_name TEXT;
  v_current_date DATE;
  v_yesterday DATE;
  v_last_week_start DATE;
  v_reading_count INTEGER;
  v_good_air_days INTEGER;
  v_daily_streak INTEGER;
BEGIN
  v_user_id := NEW.user_id;
  v_aqi := NEW.aqi;
  v_location_name := NEW.location_name;
  v_current_date := CURRENT_DATE;
  v_yesterday := v_current_date - INTERVAL '1 day';
  v_last_week_start := v_current_date - INTERVAL '7 days';
  
  -- Get reading count
  SELECT COUNT(*) INTO v_reading_count 
  FROM public.air_quality_readings 
  WHERE user_id = v_user_id;
  
  -- Update reading count achievements only if there are readings
  IF v_reading_count > 0 THEN
    UPDATE public.user_achievements 
    SET progress = v_reading_count
    WHERE achievement_id IN (
      SELECT id FROM public.achievements 
      WHERE criteria_type = 'count' AND category = 'reading'
    ) AND user_id = v_user_id;
  END IF;
  
  -- Update good air quality achievements if AQI is good
  IF v_aqi <= 50 THEN
    -- Get good air days count
    SELECT COUNT(*) INTO v_good_air_days
    FROM public.air_quality_readings 
    WHERE user_id = v_user_id AND aqi <= 50;
    
    IF v_good_air_days > 0 THEN
      UPDATE public.user_achievements 
      SET progress = v_good_air_days
      WHERE achievement_id IN (
        SELECT id FROM public.achievements 
        WHERE criteria_type = 'quality'
      ) AND user_id = v_user_id;
    END IF;
  END IF;
  
  -- Update daily reading streak
  UPDATE public.user_streaks 
  SET 
    current_streak = CASE 
      WHEN last_activity_date = v_yesterday THEN current_streak + 1
      WHEN last_activity_date < v_yesterday THEN 1
      ELSE current_streak
    END,
    max_streak = CASE 
      WHEN last_activity_date = v_yesterday THEN GREATEST(current_streak + 1, max_streak)
      WHEN last_activity_date < v_yesterday THEN GREATEST(1, max_streak)
      ELSE max_streak
    END,
    last_activity_date = v_current_date
  WHERE user_id = v_user_id AND streak_type = 'daily_reading';
  
  -- Get current daily streak after update
  SELECT current_streak INTO v_daily_streak
  FROM public.user_streaks 
  WHERE user_id = v_user_id AND streak_type = 'daily_reading';
  
  -- Update good air quality streak
  IF v_aqi <= 50 THEN
    UPDATE public.user_streaks 
    SET 
      current_streak = CASE 
        WHEN last_activity_date = v_yesterday THEN current_streak + 1
        WHEN last_activity_date < v_yesterday THEN 1
        ELSE current_streak
      END,
      max_streak = CASE 
        WHEN last_activity_date = v_yesterday THEN GREATEST(current_streak + 1, max_streak)
        WHEN last_activity_date < v_yesterday THEN GREATEST(1, max_streak)
        ELSE max_streak
      END,
      last_activity_date = v_current_date
    WHERE user_id = v_user_id AND streak_type = 'good_air_quality';
  ELSE
    -- Reset good air quality streak if AQI is not good
    UPDATE public.user_streaks 
    SET current_streak = 0
    WHERE user_id = v_user_id AND streak_type = 'good_air_quality';
  END IF;
  
  -- Update weekly activity streak (check if user has activity in the last 7 days)
  IF EXISTS (
    SELECT 1 FROM public.air_quality_readings 
    WHERE user_id = v_user_id 
    AND timestamp >= v_last_week_start
  ) THEN
    UPDATE public.user_streaks 
    SET 
      current_streak = CASE 
        WHEN last_activity_date >= v_last_week_start - INTERVAL '7 days' THEN current_streak + 1
        ELSE 1
      END,
      max_streak = GREATEST(
        CASE 
          WHEN last_activity_date >= v_last_week_start - INTERVAL '7 days' THEN current_streak + 1
          ELSE 1
        END, 
        max_streak
      ),
      last_activity_date = v_current_date
    WHERE user_id = v_user_id AND streak_type = 'weekly_activity';
  END IF;
  
  -- Update streak-based achievements only if there's a streak
  IF v_daily_streak > 0 THEN
    UPDATE public.user_achievements 
    SET progress = v_daily_streak
    WHERE achievement_id IN (
      SELECT id FROM public.achievements 
      WHERE criteria_type = 'streak' AND category = 'streak'
    ) AND user_id = v_user_id;
  END IF;
  
  -- Only check and unlock achievements if there's actual progress
  IF v_reading_count > 0 OR (v_aqi <= 50 AND v_good_air_days > 0) OR v_daily_streak > 0 THEN
    -- Check and unlock achievements with progress > 0
    UPDATE public.user_achievements 
    SET 
      unlocked = true,
      unlocked_at = now(),
      earned_at = now()
    WHERE 
      user_id = v_user_id 
      AND NOT unlocked 
      AND progress > 0  -- Only unlock if progress is greater than 0
      AND progress >= max_progress;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the version table for migration tracking if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') THEN
    INSERT INTO public.schema_migrations (version, description)
    VALUES ('20250923090700', 'Fixed immediate achievement unlock in update_user_progress_on_reading by requiring progress > 0')
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;
