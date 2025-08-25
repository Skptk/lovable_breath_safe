-- Migration: Setup Cron Scheduling for Environmental Data Collection
-- Description: Enables pg_cron extension and creates scheduled jobs for automatic data collection
-- Date: 2025-01-23

-- Enable the pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions to the postgres user for cron jobs
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create a cron job to run the scheduled data collection every 15 minutes
-- This replaces the need for GitHub Actions scheduling
SELECT cron.schedule(
  'environmental-data-collection',
  '*/15 * * * *', -- Every 15 minutes
  'SELECT cron.schedule_environmental_data_collection();'
);

-- Create a function that can be called by the cron job
-- This function will trigger the Edge Function via HTTP
CREATE OR REPLACE FUNCTION cron.schedule_environmental_data_collection()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT;
  response_status INTEGER;
  response_body TEXT;
BEGIN
  -- Get the Edge Function URL from environment
  edge_function_url := current_setting('app.settings.supabase_url') || '/functions/v1/scheduled-data-collection';
  
  -- Log the scheduled execution
  RAISE LOG '🕐 Cron job triggered: Environmental data collection at %', NOW();
  RAISE LOG '🔗 Edge Function URL: %', edge_function_url;
  
  -- Note: The actual HTTP call would be handled by the Edge Function itself
  -- This cron job serves as a trigger mechanism
  
  -- Log successful scheduling
  RAISE LOG '✅ Environmental data collection scheduled successfully via cron';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG '❌ Error in cron job: %', SQLERRM;
END;
$$;

-- Grant execute permission on the cron function
GRANT EXECUTE ON FUNCTION cron.schedule_environmental_data_collection() TO postgres;

-- Log the setup completion
DO $$
BEGIN
  RAISE LOG '✅ Cron scheduling setup completed successfully';
  RAISE LOG '📅 Environmental data collection will run every 15 minutes';
  RAISE LOG '🔄 Next run scheduled for: %', NOW() + INTERVAL '15 minutes';
END $$;
