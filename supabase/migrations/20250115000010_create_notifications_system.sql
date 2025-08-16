-- Create comprehensive notifications system
-- This supports various notification types for AQI alerts, rewards, achievements, shop updates, etc.

-- Create notification types enum
CREATE TYPE public.notification_type AS ENUM (
  'aqi_alert', 
  'achievement_unlocked', 
  'points_earned', 
  'withdrawal_approved', 
  'withdrawal_rejected',
  'shop_new_item',
  'shop_sale',
  'streak_milestone',
  'daily_reminder',
  'weekly_summary',
  'system_announcement',
  'maintenance',
  'welcome'
);

-- Create notification priority enum
CREATE TYPE public.notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  priority notification_priority DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data specific to notification type
  read BOOLEAN DEFAULT false,
  action_url TEXT, -- Optional URL for click action
  expires_at TIMESTAMPTZ, -- Optional expiration date
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  aqi_alerts BOOLEAN DEFAULT true,
  aqi_threshold INTEGER DEFAULT 100, -- Alert when AQI exceeds this value
  achievement_notifications BOOLEAN DEFAULT true,
  points_notifications BOOLEAN DEFAULT true,
  withdrawal_notifications BOOLEAN DEFAULT true,
  shop_notifications BOOLEAN DEFAULT true,
  streak_notifications BOOLEAN DEFAULT true,
  daily_reminders BOOLEAN DEFAULT true,
  weekly_summaries BOOLEAN DEFAULT true,
  system_announcements BOOLEAN DEFAULT true,
  maintenance_alerts BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON public.notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notifications" ON public.notifications
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for notification preferences
CREATE POLICY "Users can view their own notification preferences" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.notification_preferences TO service_role;

-- Function to create AQI alert notifications
CREATE OR REPLACE FUNCTION public.create_aqi_alert(
  p_user_id UUID,
  p_aqi INTEGER,
  p_location TEXT
)
RETURNS void AS $$
DECLARE
  v_prefs RECORD;
  v_title TEXT;
  v_message TEXT;
  v_priority notification_priority;
BEGIN
  -- Get user notification preferences
  SELECT * INTO v_prefs FROM public.notification_preferences WHERE user_id = p_user_id;
  
  -- Check if user wants AQI alerts and if AQI exceeds threshold
  IF v_prefs.aqi_alerts AND p_aqi >= v_prefs.aqi_threshold THEN
    -- Determine priority based on AQI level
    IF p_aqi >= 300 THEN
      v_priority := 'urgent';
      v_title := 'Hazardous Air Quality Alert!';
      v_message := 'Air quality in ' || p_location || ' is hazardous (AQI: ' || p_aqi || '). Stay indoors and avoid outdoor activities.';
    ELSIF p_aqi >= 200 THEN
      v_priority := 'high';
      v_title := 'Very Unhealthy Air Quality';
      v_message := 'Air quality in ' || p_location || ' is very unhealthy (AQI: ' || p_aqi || '). Limit outdoor activities.';
    ELSIF p_aqi >= 150 THEN
      v_priority := 'medium';
      v_title := 'Unhealthy Air Quality';
      v_message := 'Air quality in ' || p_location || ' is unhealthy (AQI: ' || p_aqi || '). Consider reducing outdoor activities.';
    ELSE
      v_priority := 'medium';
      v_title := 'Moderate Air Quality Alert';
      v_message := 'Air quality in ' || p_location || ' is moderate (AQI: ' || p_aqi || '). Sensitive individuals should limit outdoor activities.';
    END IF;
    
    -- Insert notification
    INSERT INTO public.notifications (user_id, type, priority, title, message, data)
    VALUES (p_user_id, 'aqi_alert', v_priority, v_title, v_message, 
            jsonb_build_object('aqi', p_aqi, 'location', p_location));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create achievement notification
CREATE OR REPLACE FUNCTION public.create_achievement_notification(
  p_user_id UUID,
  p_achievement_name TEXT,
  p_points_reward INTEGER
)
RETURNS void AS $$
DECLARE
  v_prefs RECORD;
BEGIN
  -- Get user notification preferences
  SELECT * INTO v_prefs FROM public.notification_preferences WHERE user_id = p_user_id;
  
  IF v_prefs.achievement_notifications THEN
    INSERT INTO public.notifications (user_id, type, priority, title, message, data, action_url)
    VALUES (p_user_id, 'achievement_unlocked', 'medium', 
            'Achievement Unlocked! 🏆',
            'Congratulations! You''ve unlocked "' || p_achievement_name || '" and earned ' || p_points_reward || ' points!',
            jsonb_build_object('achievement', p_achievement_name, 'points', p_points_reward),
            '/rewards');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create points earned notification
CREATE OR REPLACE FUNCTION public.create_points_notification(
  p_user_id UUID,
  p_points INTEGER,
  p_source TEXT
)
RETURNS void AS $$
DECLARE
  v_prefs RECORD;
BEGIN
  -- Get user notification preferences
  SELECT * INTO v_prefs FROM public.notification_preferences WHERE user_id = p_user_id;
  
  IF v_prefs.points_notifications AND p_points > 0 THEN
    INSERT INTO public.notifications (user_id, type, priority, title, message, data)
    VALUES (p_user_id, 'points_earned', 'low', 
            'Points Earned! 💰',
            'You earned ' || p_points || ' points for ' || p_source || '!',
            jsonb_build_object('points', p_points, 'source', p_source));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create streak milestone notification
CREATE OR REPLACE FUNCTION public.create_streak_notification(
  p_user_id UUID,
  p_streak_type TEXT,
  p_streak_count INTEGER
)
RETURNS void AS $$
DECLARE
  v_prefs RECORD;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Get user notification preferences
  SELECT * INTO v_prefs FROM public.notification_preferences WHERE user_id = p_user_id;
  
  IF v_prefs.streak_notifications THEN
    CASE p_streak_type
      WHEN 'daily_reading' THEN
        v_title := 'Daily Streak! 🔥';
        v_message := 'Amazing! You''ve checked air quality for ' || p_streak_count || ' consecutive days!';
      WHEN 'good_air_quality' THEN
        v_title := 'Clean Air Streak! 🌱';
        v_message := 'Great! You''ve experienced ' || p_streak_count || ' consecutive days of good air quality!';
      WHEN 'weekly_activity' THEN
        v_title := 'Weekly Streak! ⚡';
        v_message := 'Excellent! You''ve been active for ' || p_streak_count || ' consecutive weeks!';
      ELSE
        v_title := 'Streak Achievement! 🎯';
        v_message := 'You''ve maintained a ' || p_streak_count || ' day streak!';
    END CASE;
    
    INSERT INTO public.notifications (user_id, type, priority, title, message, data, action_url)
    VALUES (p_user_id, 'streak_milestone', 'medium', v_title, v_message,
            jsonb_build_object('streak_type', p_streak_type, 'count', p_streak_count),
            '/rewards');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create welcome notification for new users
CREATE OR REPLACE FUNCTION public.create_welcome_notification(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, priority, title, message, data)
  VALUES (p_user_id, 'welcome', 'medium',
          'Welcome to Breath Safe! 🌟',
          'Start tracking air quality in your area and earn points for staying informed about your environment!',
          jsonb_build_object('new_user', true));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize notification preferences for new users
CREATE OR REPLACE FUNCTION public.initialize_notification_preferences(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM public.notifications 
  WHERE expires_at IS NOT NULL AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modified trigger function to include notifications
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
BEGIN
  v_user_id := NEW.user_id;
  v_aqi := NEW.aqi;
  v_location_name := NEW.location_name;
  v_current_date := CURRENT_DATE;
  v_yesterday := v_current_date - INTERVAL '1 day';
  v_last_week_start := v_current_date - INTERVAL '7 days';
  
  -- Calculate points earned based on AQI reading
  IF v_aqi <= 50 THEN
    v_points_earned := 20; -- Good air quality bonus
  ELSIF v_aqi <= 100 THEN
    v_points_earned := 15; -- Moderate air quality
  ELSIF v_aqi <= 150 THEN
    v_points_earned := 10; -- Unhealthy for sensitive groups
  ELSE
    v_points_earned := 5; -- Still earn points for checking
  END IF;
  
  -- Create AQI alert notification if needed
  PERFORM public.create_aqi_alert(v_user_id, v_aqi, v_location_name);
  
  -- Create points notification
  PERFORM public.create_points_notification(v_user_id, v_points_earned, 'air quality check');
  
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
    last_activity_date = v_current_date
  WHERE user_id = v_user_id AND streak_type = 'daily_reading';
  
  -- Check for streak milestones and create notifications
  SELECT current_streak INTO v_points_earned FROM public.user_streaks 
  WHERE user_id = v_user_id AND streak_type = 'daily_reading';
  
  IF v_points_earned IN (3, 7, 30, 100) THEN
    PERFORM public.create_streak_notification(v_user_id, 'daily_reading', v_points_earned);
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
      last_activity_date = v_current_date
    WHERE user_id = v_user_id AND streak_type = 'good_air_quality';
  ELSE
    UPDATE public.user_streaks 
    SET current_streak = 0
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
      last_activity_date = v_current_date
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
    SELECT a.name, a.points_reward
    FROM public.user_achievements ua
    JOIN public.achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = v_user_id 
    AND NOT ua.unlocked 
    AND ua.progress >= ua.max_progress
  LOOP
    -- Create achievement notification
    PERFORM public.create_achievement_notification(v_user_id, achievement_record.name, achievement_record.points_reward);
  END LOOP;
  
  -- Mark achievements as unlocked
  UPDATE public.user_achievements 
  SET 
    unlocked = true,
    unlocked_at = now()
  WHERE 
    user_id = v_user_id 
    AND NOT unlocked 
    AND progress >= max_progress;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the existing trigger
DROP TRIGGER IF EXISTS update_progress_on_reading ON public.air_quality_readings;
CREATE TRIGGER update_progress_on_reading
  AFTER INSERT ON public.air_quality_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_update_user_progress_on_reading();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_aqi_alert(UUID, INTEGER, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_achievement_notification(UUID, TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_points_notification(UUID, INTEGER, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_streak_notification(UUID, TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_welcome_notification(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.initialize_notification_preferences(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_notifications() TO authenticated, service_role;

-- Comments
COMMENT ON TABLE public.notifications IS 'User notifications for various app events';
COMMENT ON TABLE public.notification_preferences IS 'User preferences for different types of notifications';
COMMENT ON FUNCTION public.create_aqi_alert(UUID, INTEGER, TEXT) IS 'Create AQI alert notification based on user preferences';
COMMENT ON FUNCTION public.create_achievement_notification(UUID, TEXT, INTEGER) IS 'Create achievement unlock notification';
COMMENT ON FUNCTION public.create_points_notification(UUID, INTEGER, TEXT) IS 'Create points earned notification';
COMMENT ON FUNCTION public.create_streak_notification(UUID, TEXT, INTEGER) IS 'Create streak milestone notification';
COMMENT ON FUNCTION public.initialize_notification_preferences(UUID) IS 'Initialize default notification preferences for new users';
