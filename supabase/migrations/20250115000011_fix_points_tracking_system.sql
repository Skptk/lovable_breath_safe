-- Fix points tracking system to ensure proper synchronization between user_points and profiles
-- This migration ensures that when air quality readings are added, points are properly tracked

-- First, let's create a better function to handle points earning from air quality readings
CREATE OR REPLACE FUNCTION public.award_points_for_reading()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_aqi INTEGER;
  v_location_name TEXT;
  v_points_earned INTEGER;
  v_current_total INTEGER;
BEGIN
  v_user_id := NEW.user_id;
  v_aqi := NEW.aqi;
  v_location_name := NEW.location_name;
  
  -- Calculate points based on AQI reading
  IF v_aqi <= 50 THEN
    v_points_earned := 20; -- Good air quality bonus
  ELSIF v_aqi <= 100 THEN
    v_points_earned := 15; -- Moderate air quality
  ELSIF v_aqi <= 150 THEN
    v_points_earned := 10; -- Unhealthy for sensitive groups
  ELSE
    v_points_earned := 5; -- Still earn points for checking
  END IF;
  
  -- Insert into user_points table
  INSERT INTO public.user_points (user_id, points_earned, aqi_value, location_name, timestamp)
  VALUES (v_user_id, v_points_earned, v_aqi, v_location_name, NEW.timestamp);
  
  -- Get current total points from profile
  SELECT total_points INTO v_current_total 
  FROM public.profiles 
  WHERE user_id = v_user_id;
  
  -- Update profile with new total
  UPDATE public.profiles 
  SET total_points = COALESCE(v_current_total, 0) + v_points_earned,
      updated_at = now()
  WHERE user_id = v_user_id;
  
  -- Log the points award for debugging
  RAISE LOG 'Awarded % points to user % for AQI reading %', v_points_earned, v_user_id, v_aqi;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a separate trigger just for points awarding
DROP TRIGGER IF EXISTS award_points_for_reading ON public.air_quality_readings;
CREATE TRIGGER award_points_for_reading
  AFTER INSERT ON public.air_quality_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_for_reading();

-- Function to sync profile points with user_points table
CREATE OR REPLACE FUNCTION public.sync_profile_points(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_calculated_total INTEGER;
BEGIN
  -- Calculate total from user_points
  SELECT COALESCE(SUM(points_earned), 0) INTO v_calculated_total
  FROM public.user_points
  WHERE user_id = p_user_id;
  
  -- Update profile
  UPDATE public.profiles
  SET total_points = v_calculated_total,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  RAISE LOG 'Synced profile points for user %: % total points', p_user_id, v_calculated_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize user data when they sign up
CREATE OR REPLACE FUNCTION public.initialize_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize notification preferences
  PERFORM public.initialize_notification_preferences(NEW.user_id);
  
  -- Initialize achievements
  PERFORM public.initialize_user_achievements(NEW.user_id);
  
  -- Create welcome notification
  PERFORM public.create_welcome_notification(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to initialize user data when profile is created
DROP TRIGGER IF EXISTS initialize_user_data_on_profile_insert ON public.profiles;
CREATE TRIGGER initialize_user_data_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_data();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.award_points_for_reading() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_profile_points(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.initialize_user_data() TO authenticated, service_role;

-- Update the enhanced progress function to work better with the new points system
CREATE OR REPLACE FUNCTION public.enhanced_update_user_progress_on_reading()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_aqi INTEGER;
  v_location_name TEXT;
  v_current_date DATE;
  v_yesterday DATE;
  v_last_week_start DATE;
  v_points_earned INTEGER;
  achievement_record RECORD;
  v_streak_count INTEGER;
BEGIN
  v_user_id := NEW.user_id;
  v_aqi := NEW.aqi;
  v_location_name := NEW.location_name;
  v_current_date := CURRENT_DATE;
  v_yesterday := v_current_date - INTERVAL '1 day';
  v_last_week_start := v_current_date - INTERVAL '7 days';
  
  -- Create AQI alert notification if needed
  PERFORM public.create_aqi_alert(v_user_id, v_aqi, v_location_name);
  
  -- Get the points that were just awarded
  SELECT points_earned INTO v_points_earned
  FROM public.user_points
  WHERE user_id = v_user_id 
  AND timestamp = NEW.timestamp
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Create points notification
  IF v_points_earned > 0 THEN
    PERFORM public.create_points_notification(v_user_id, v_points_earned, 'air quality check');
  END IF;
  
  -- Update reading count achievements
  UPDATE public.user_achievements 
  SET progress = (
    SELECT COUNT(*) FROM public.air_quality_readings 
    WHERE user_id = v_user_id
  )
  WHERE achievement_id IN (
    SELECT id FROM public.achievements 
    WHERE criteria_type = 'count' AND category = 'reading'
  ) AND user_id = v_user_id;
  
  -- Update good air quality achievements
  IF v_aqi <= 50 THEN
    UPDATE public.user_achievements 
    SET progress = (
      SELECT COUNT(*) FROM public.air_quality_readings 
      WHERE user_id = v_user_id AND aqi <= 50
    )
    WHERE achievement_id IN (
      SELECT id FROM public.achievements 
      WHERE criteria_type = 'quality'
    ) AND user_id = v_user_id;
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
    last_activity_date = v_current_date,
    updated_at = now()
  WHERE user_id = v_user_id AND streak_type = 'daily_reading';
  
  -- Check for streak milestones and create notifications
  SELECT current_streak INTO v_streak_count FROM public.user_streaks 
  WHERE user_id = v_user_id AND streak_type = 'daily_reading';
  
  IF v_streak_count IN (3, 7, 30, 100) THEN
    PERFORM public.create_streak_notification(v_user_id, 'daily_reading', v_streak_count);
  END IF;
  
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
      last_activity_date = v_current_date,
      updated_at = now()
    WHERE user_id = v_user_id AND streak_type = 'good_air_quality';
  ELSE
    UPDATE public.user_streaks 
    SET current_streak = 0, updated_at = now()
    WHERE user_id = v_user_id AND streak_type = 'good_air_quality';
  END IF;
  
  -- Update weekly activity streak
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
      last_activity_date = v_current_date,
      updated_at = now()
    WHERE user_id = v_user_id AND streak_type = 'weekly_activity';
  END IF;
  
  -- Update streak-based achievements
  UPDATE public.user_achievements 
  SET progress = (
    SELECT current_streak FROM public.user_streaks 
    WHERE user_id = v_user_id AND streak_type = 'daily_reading'
  )
  WHERE achievement_id IN (
    SELECT id FROM public.achievements 
    WHERE criteria_type = 'streak' AND category = 'streak'
  ) AND user_id = v_user_id;
  
  -- Check and unlock achievements, create notifications
  FOR achievement_record IN 
    SELECT a.name, a.points_reward, ua.id as ua_id
    FROM public.user_achievements ua
    JOIN public.achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = v_user_id 
    AND NOT ua.unlocked 
    AND ua.progress >= ua.max_progress
  LOOP
    -- Create achievement notification
    PERFORM public.create_achievement_notification(v_user_id, achievement_record.name, achievement_record.points_reward);
    
    -- Award achievement points
    INSERT INTO public.user_points (user_id, points_earned, aqi_value, location_name, timestamp)
    VALUES (v_user_id, achievement_record.points_reward, 0, 'Achievement: ' || achievement_record.name, now());
    
    -- Update profile points
    UPDATE public.profiles 
    SET total_points = total_points + achievement_record.points_reward,
        updated_at = now()
    WHERE user_id = v_user_id;
  END LOOP;
  
  -- Mark achievements as unlocked
  UPDATE public.user_achievements 
  SET 
    unlocked = true,
    unlocked_at = now(),
    updated_at = now()
  WHERE 
    user_id = v_user_id 
    AND NOT unlocked 
    AND progress >= max_progress;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger to use the enhanced function
DROP TRIGGER IF EXISTS update_progress_on_reading ON public.air_quality_readings;
CREATE TRIGGER update_progress_on_reading
  AFTER INSERT ON public.air_quality_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_update_user_progress_on_reading();

-- Comments
COMMENT ON FUNCTION public.award_points_for_reading() IS 'Award points for air quality readings and update profile total';
COMMENT ON FUNCTION public.sync_profile_points(UUID) IS 'Sync profile total_points with user_points table sum';
COMMENT ON FUNCTION public.initialize_user_data() IS 'Initialize all user data when profile is created';
