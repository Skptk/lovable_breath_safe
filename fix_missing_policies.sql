-- Fix missing policies and functions for user_settings table
-- This script only adds what's missing, won't recreate existing items

-- Check if policies exist and create missing ones
DO $$
BEGIN
    -- Check and create SELECT policy if missing
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_settings' 
        AND policyname = 'Users can view their own settings'
    ) THEN
        CREATE POLICY "Users can view their own settings" ON public.user_settings
        FOR SELECT USING (auth.uid() = user_id);
        RAISE NOTICE 'Created SELECT policy';
    ELSE
        RAISE NOTICE 'SELECT policy already exists';
    END IF;

    -- Check and create INSERT policy if missing
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_settings' 
        AND policyname = 'Users can insert their own settings'
    ) THEN
        CREATE POLICY "Users can insert their own settings" ON public.user_settings
        FOR INSERT WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE 'Created INSERT policy';
    ELSE
        RAISE NOTICE 'INSERT policy already exists';
    END IF;

    -- Check and create UPDATE policy if missing
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_settings' 
        AND policyname = 'Users can update their own settings'
    ) THEN
        CREATE POLICY "Users can update their own settings" ON public.user_settings
        FOR UPDATE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created UPDATE policy';
    ELSE
        RAISE NOTICE 'UPDATE policy already exists';
    END IF;

    -- Check and create DELETE policy if missing
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_settings' 
        AND policyname = 'Users can delete their own settings'
    ) THEN
        CREATE POLICY "Users can delete their own settings" ON public.user_settings
        FOR DELETE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created DELETE policy';
    ELSE
        RAISE NOTICE 'DELETE policy already exists';
    END IF;
END $$;

-- Create missing functions if they don't exist
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

-- Create trigger function if missing
CREATE OR REPLACE FUNCTION public.update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_user_settings_updated_at'
    ) THEN
        CREATE TRIGGER update_user_settings_updated_at
        BEFORE UPDATE ON public.user_settings
        FOR EACH ROW
        EXECUTE FUNCTION public.update_user_settings_updated_at();
        RAISE NOTICE 'Created trigger';
    ELSE
        RAISE NOTICE 'Trigger already exists';
    END IF;
END $$;

-- Create index if missing
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Grant permissions if not already granted
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;

-- Initialize settings for existing users who don't have them
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT user_id FROM public.profiles WHERE user_id NOT IN (SELECT user_id FROM public.user_settings)
  LOOP
    PERFORM public.initialize_user_settings(user_record.user_id);
  END LOOP;
  
  RAISE NOTICE 'Initialized settings for existing users';
END $$;

