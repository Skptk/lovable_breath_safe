-- Migration: Fix Cron HTTP Extension and Job Configuration
-- Description: Properly configures the HTTP extension and cron job for data collection
-- Date: 2025-01-23

-- Enable the http extension for making HTTP requests from cron jobs
CREATE EXTENSION IF NOT EXISTS http;

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop the existing cron job if it exists to avoid conflicts
SELECT cron.unschedule('environmental-data-collection') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'environmental-data-collection'
);

-- Create the actual cron job for environmental data collection
-- This will run every 15 minutes and call the edge function
SELECT cron.schedule(
  'environmental-data-collection',
  '*/15 * * * *', -- Every 15 minutes
  'SELECT http_post(
    ''https://bmqdbetupttlthpadseq.supabase.co/functions/v1/scheduled-data-collection'',
    ''{"scheduled": true}''::jsonb,
    ''application/json''
  );'
);

-- Log the setup completion
DO $$
BEGIN
  RAISE LOG '✅ HTTP extension enabled for cron jobs';
  RAISE LOG '✅ Cron job "environmental-data-collection" scheduled successfully';
  RAISE LOG '🔄 Job will run every 15 minutes';
  RAISE LOG '⏰ Next run scheduled for: %', NOW() + INTERVAL '15 minutes';
  RAISE LOG '🌐 HTTP requests enabled for external API calls';
END $$;
