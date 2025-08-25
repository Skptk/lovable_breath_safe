-- Migration: Setup Simple Scheduling for Environmental Data Collection
-- Description: Creates a simple scheduling table and function for data collection
-- Date: 2025-01-23

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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.data_collection_schedule TO authenticated;
GRANT EXECUTE ON FUNCTION public.should_run_data_collection() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_data_collection() TO authenticated;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_data_collection_schedule_active 
ON public.data_collection_schedule(is_active, next_run);

-- Log the setup completion
DO $$
BEGIN
  RAISE LOG '✅ Simple scheduling setup completed successfully';
  RAISE LOG '📅 Data collection schedule table created';
  RAISE LOG '🔄 Next run scheduled for: %', NOW() + INTERVAL '15 minutes';
  RAISE LOG 'ℹ️  Use trigger_data_collection() to manually trigger collection';
END $$;
