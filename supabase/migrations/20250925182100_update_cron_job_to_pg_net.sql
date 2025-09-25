-- Migration: Recreate environmental data cron job using pg_net
-- Description: Unschedule legacy http_post job and schedule per-minute job via net.http_post
-- Date: 2025-09-25

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove legacy job that still references http_post
SELECT cron.unschedule('environmental-data-collection')
WHERE EXISTS (
  SELECT 1
  FROM cron.job
  WHERE jobname = 'environmental-data-collection'
);

-- Schedule per-minute job using pg_net's net.http_post helper
SELECT cron.schedule(
  'environmental-data-collection',
  '* * * * *',
  format(
    $$SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting(''app.settings.service_role_key'')
      ),
      body := %L::jsonb
    );$$,
    'https://bmqdbetupttlthpadseq.supabase.co/functions/v1/scheduled-data-collection',
    '{"scheduled": true}'
  )
);

DO $$
BEGIN
  RAISE LOG '✅ pg_net extension ensured for cron job HTTP requests';
  RAISE LOG '🔄 Cron job "environmental-data-collection" rescheduled to use net.http_post every minute';
  RAISE LOG '🌐 Target URL: https://bmqdbetupttlthpadseq.supabase.co/functions/v1/scheduled-data-collection';
END $$;
