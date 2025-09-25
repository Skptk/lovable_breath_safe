-- Migration: Setup Simple Scheduling for Environmental Data Collection
-- Description: Creates a simple scheduling table and function for data collection
-- Date: 2025-01-23

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a simple scheduling table to track when data collection should run
CREATE TABLE IF NOT EXISTS public.data_collection_schedule (
  id SERIAL PRIMARY KEY,
  last_run TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_run TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '15 minutes',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial schedule record
INSERT INTO public.data_collection_schedule (last_run, next_run, is_active)
VALUES (NOW(), NOW() + INTERVAL '15 minutes', true)
ON CONFLICT DO NOTHING;

-- Create a function to check if data collection should run
CREATE OR REPLACE FUNCTION public.should_run_data_collection()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schedule_record RECORD;
BEGIN
  -- Get the current schedule
  SELECT * INTO schedule_record 
  FROM public.data_collection_schedule 
  WHERE is_active = true 
  ORDER BY id DESC 
  LIMIT 1;
  
  -- If no schedule found, return false
  IF schedule_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if it's time to run
  IF NOW() >= schedule_record.next_run THEN
    -- Update the schedule for next run
    UPDATE public.data_collection_schedule 
    SET last_run = NOW(),
        next_run = NOW() + INTERVAL '15 minutes',
        updated_at = NOW()
    WHERE id = schedule_record.id;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create a function to manually trigger data collection
CREATE OR REPLACE FUNCTION public.trigger_data_collection()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the schedule to run immediately
  UPDATE public.data_collection_schedule 
  SET next_run = NOW(),
      updated_at = NOW()
  WHERE is_active = true;
  
  RETURN 'Data collection scheduled to run immediately';
END;
$$;

-- Create the actual cron job for environmental data collection
-- This will run every minute and call the edge function
SELECT cron.schedule(
  'environmental-data-collection',
  '* * * * *', -- Every minute
  'SELECT net.http_post(
    url := ''https://bmqdbetupttlthpadseq.supabase.co/functions/v1/scheduled-data-collection'',
    headers := ''{"Content-Type": "application/json", "Authorization": "Bearer " || current_setting(''app.settings.service_role_key'')}''::jsonb,
    body := ''{"scheduled": true}''::jsonb
  );'
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.data_collection_schedule TO authenticated;
GRANT EXECUTE ON FUNCTION public.should_run_data_collection() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_data_collection() TO authenticated;

-- Create RLS policies for the data_collection_schedule table
-- Allow authenticated users to read the schedule
CREATE POLICY "Users can read data collection schedule" 
ON public.data_collection_schedule 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to update the schedule (for manual triggers)
CREATE POLICY "Users can update data collection schedule" 
ON public.data_collection_schedule 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Allow service role to manage the schedule (for cron jobs)
CREATE POLICY "Service role can manage data collection schedule" 
ON public.data_collection_schedule 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_data_collection_schedule_active 
ON public.data_collection_schedule(is_active, next_run);

-- Log the setup completion
DO $$
BEGIN
  RAISE LOG '✅ Cron scheduling setup completed successfully';
  RAISE LOG '📅 Data collection schedule table created';
  RAISE LOG '🔄 Cron job scheduled for every minute';
  RAISE LOG '⏰ Next run scheduled for: %', NOW() + INTERVAL '1 minute';
  RAISE LOG 'ℹ️  Use trigger_data_collection() to manually trigger collection';
END $$;
