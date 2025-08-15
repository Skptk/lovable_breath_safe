-- Create comprehensive achievements and challenges system
-- This replaces all placeholder data with real user activity tracking

-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('reading', 'streak', 'quality', 'milestone', 'special')),
  points_reward INTEGER NOT NULL DEFAULT 0,
  criteria_type TEXT NOT NULL CHECK (criteria_type IN ('count', 'streak', 'quality', 'points', 'custom')),
  criteria_value INTEGER NOT NULL,
  criteria_unit TEXT, -- e.g., 'days', 'readings', 'points', 'consecutive'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user achievements table to track progress
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  max_progress INTEGER NOT NULL,
  unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Create user streaks table
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('daily_reading', 'good_air_quality', 'weekly_activity')),
  current_streak INTEGER NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, streak_type)
);

-- Insert default achievements based on real user activity
INSERT INTO public.achievements (name, description, icon, category, points_reward, criteria_type, criteria_value, criteria_unit) VALUES
-- Reading-based achievements
('First Steps', 'Complete your first air quality reading', '🎯', 'reading', 50, 'count', 1, 'readings'),
('Air Quality Enthusiast', 'Complete 10 air quality readings', '⭐', 'reading', 100, 'count', 10, 'readings'),
('Dedicated Monitor', 'Complete 50 air quality readings', '📊', 'reading', 250, 'count', 50, 'readings'),
('Air Quality Expert', 'Complete 100 air quality readings', '👨‍🔬', 'reading', 500, 'count', 100, 'readings'),
('Master Observer', 'Complete 500 air quality readings', '🏆', 'reading', 1000, 'count', 500, 'readings'),

-- Streak-based achievements
('Daily Check-in', 'Check air quality for 3 consecutive days', '🔥', 'streak', 100, 'streak', 3, 'consecutive_days'),
('Weekly Warrior', 'Check air quality for 7 consecutive days', '⚡', 'streak', 200, 'streak', 7, 'consecutive_days'),
('Monthly Master', 'Check air quality for 30 consecutive days', '👑', 'streak', 500, 'streak', 30, 'consecutive_days'),
('Streak Champion', 'Check air quality for 100 consecutive days', '💎', 'streak', 1000, 'streak', 100, 'consecutive_days'),

-- Quality-based achievements
('Good Air Guardian', 'Record 10 days with good air quality (AQI ≤ 50)', '🌱', 'quality', 150, 'quality', 10, 'good_air_days'),
('Clean Air Advocate', 'Record 50 days with good air quality (AQI ≤ 50)', '🌿', 'quality', 300, 'quality', 50, 'good_air_days'),
('Air Quality Champion', 'Record 100 days with good air quality (AQI ≤ 50)', '🌳', 'quality', 500, 'quality', 100, 'good_air_days'),

-- Milestone achievements
('Point Collector', 'Earn 1,000 total points', '💰', 'milestone', 100, 'points', 1000, 'points'),
('Point Millionaire', 'Earn 10,000 total points', '💎', 'milestone', 500, 'points', 10000, 'points'),
('Point Master', 'Earn 50,000 total points', '🏆', 'milestone', 1000, 'points', 50000, 'points'),

-- Special achievements
('Early Bird', 'Check air quality before 8 AM', '🌅', 'special', 75, 'custom', 1, 'early_morning'),
('Night Owl', 'Check air quality after 10 PM', '🦉', 'special', 75, 'custom', 1, 'late_night'),
('Weekend Warrior', 'Check air quality on 5 consecutive weekends', '📅', 'special', 200, 'streak', 5, 'weekend_days'),
('Location Explorer', 'Check air quality in 5 different locations', '🗺️', 'special', 150, 'count', 5, 'locations');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON public.user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_type ON public.user_streaks(streak_type);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements (read-only for all authenticated users)
CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements" ON public.user_achievements
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user achievements" ON public.user_achievements
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for user_streaks
CREATE POLICY "Users can view their own streaks" ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks" ON public.user_streaks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user streaks" ON public.user_streaks
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public.achievements TO authenticated;
GRANT ALL ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_streaks TO authenticated;
GRANT ALL ON public.achievements TO service_role;
GRANT ALL ON public.user_achievements TO service_role;
GRANT ALL ON public.user_streaks TO service_role;

-- Create function to initialize user achievements
CREATE OR REPLACE FUNCTION public.initialize_user_achievements(p_user_id UUID)
RETURNS void AS $$
DECLARE
  achievement_record RECORD;
BEGIN
  -- Create achievement progress records for all active achievements
  FOR achievement_record IN 
    SELECT id, criteria_value FROM public.achievements WHERE is_active = true
  LOOP
    INSERT INTO public.user_achievements (user_id, achievement_id, progress, max_progress)
    VALUES (p_user_id, achievement_record.id, 0, achievement_record.criteria_value)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END LOOP;
  
  -- Initialize user streaks
  INSERT INTO public.user_streaks (user_id, streak_type, current_streak, max_streak, last_activity_date)
  VALUES 
    (p_user_id, 'daily_reading', 0, 0, CURRENT_DATE),
    (p_user_id, 'good_air_quality', 0, 0, CURRENT_DATE),
    (p_user_id, 'weekly_activity', 0, 0, CURRENT_DATE)
  ON CONFLICT (user_id, streak_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.initialize_user_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_user_achievements(UUID) TO service_role;

-- Create function to update user progress when readings are added
CREATE OR REPLACE FUNCTION public.update_user_progress_on_reading()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_aqi INTEGER;
  v_location_name TEXT;
  v_current_date DATE;
  v_yesterday DATE;
  v_last_week_start DATE;
BEGIN
  v_user_id := NEW.user_id;
  v_aqi := NEW.aqi;
  v_location_name := NEW.location_name;
  v_current_date := CURRENT_DATE;
  v_yesterday := v_current_date - INTERVAL '1 day';
  v_last_week_start := v_current_date - INTERVAL '7 days';
  
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
  
  -- Check and unlock achievements
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

-- Create trigger to update progress when readings are added
DROP TRIGGER IF EXISTS update_progress_on_reading ON public.air_quality_readings;
CREATE TRIGGER update_progress_on_reading
  AFTER INSERT ON public.air_quality_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_progress_on_reading();

-- Create function to update points-based achievements
CREATE OR REPLACE FUNCTION public.update_points_achievements()
RETURNS TRIGGER AS $$
BEGIN
  -- Update points-based achievements when profile points change
  UPDATE public.user_achievements 
  SET progress = NEW.total_points
  WHERE achievement_id IN (
    SELECT id FROM public.achievements 
    WHERE criteria_type = 'points'
  ) AND user_id = NEW.user_id;
  
  -- Check and unlock points achievements
  UPDATE public.user_achievements 
  SET 
    unlocked = true,
    unlocked_at = now()
  WHERE 
    user_id = NEW.user_id 
    AND NOT unlocked 
    AND progress >= max_progress;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update points achievements
DROP TRIGGER IF EXISTS update_points_achievements ON public.profiles;
CREATE TRIGGER update_points_achievements
  AFTER UPDATE OF total_points ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_points_achievements();

-- Add comments
COMMENT ON TABLE public.achievements IS 'Available achievements that users can unlock';
COMMENT ON TABLE public.user_achievements IS 'User progress and unlocked achievements';
COMMENT ON TABLE public.user_streaks IS 'User streak tracking for various activities';
COMMENT ON FUNCTION public.initialize_user_achievements(UUID) IS 'Initialize achievement progress for new users';
COMMENT ON FUNCTION public.update_user_progress_on_reading() IS 'Update user progress when new readings are added';
COMMENT ON FUNCTION public.update_points_achievements() IS 'Update points-based achievements when user points change';
