-- Create user_settings table to store user preferences and settings
-- This table will store theme preferences, language settings, and other user configurations

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure one settings record per user
  UNIQUE(user_id)
);

-- Add RLS policies for user_settings table
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own settings
CREATE POLICY "Users can view their own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own settings
CREATE POLICY "Users can insert their own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own settings
CREATE POLICY "Users can update their own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own settings
CREATE POLICY "Users can delete their own settings" ON public.user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_settings_updated_at();

-- Function to initialize default user settings
CREATE OR REPLACE FUNCTION public.initialize_user_settings(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, settings)
  VALUES (
    p_user_id,
    '{
      "notifications": {
        "email": true,
        "push": true,
        "airQualityAlerts": true,
        "weeklyReports": false
      },
      "privacy": {
        "shareData": false,
        "publicProfile": false,
        "locationHistory": true
      },
      "preferences": {
        "theme": "system",
        "language": "en",
        "units": "metric",
        "dataRetention": "90days",
        "aqiThreshold": "moderate",
        "alertFrequency": "immediate",
        "reportDay": "monday",
        "reportTime": "morning"
      },
      "location": {
        "autoLocation": true,
        "locationAccuracy": "high",
        "locationHistory": true
      }
    }'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE LOG 'Initialized user settings for user %', p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the initialize_user_data function to also initialize settings
CREATE OR REPLACE FUNCTION public.initialize_user_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize notification preferences
  PERFORM public.initialize_notification_preferences(NEW.user_id);
  
  -- Initialize achievements
  PERFORM public.initialize_user_achievements(NEW.user_id);
  
  -- Initialize user settings
  PERFORM public.initialize_user_settings(NEW.user_id);
  
  -- Create welcome notification
  PERFORM public.create_welcome_notification(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT USAGE ON SEQUENCE public.user_settings_id_seq TO authenticated;

-- Insert default settings for existing users (if any)
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT user_id FROM public.profiles WHERE user_id NOT IN (SELECT user_id FROM public.user_settings)
  LOOP
    PERFORM public.initialize_user_settings(user_record.user_id);
  END LOOP;
END $$;
