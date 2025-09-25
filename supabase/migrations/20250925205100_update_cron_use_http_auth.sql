-- Migration: Reschedule cron job using pg_net auth configuration
-- Description: Unschedules the current job (Vault-based) and recreates it expecting `net.http_add_auth` to be configured manually
-- Date: 2025-09-25

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing cron job configuration
SELECT cron.unschedule('environmental-data-collection')
WHERE EXISTS (
  SELECT 1
  FROM cron.job
  WHERE jobname = 'environmental-data-collection'
);

-- Recreate cron job using pg_net auth registry
SELECT cron.schedule(
  'environmental-data-collection',
  '* * * * *',
  format(
    $$SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := %L::jsonb,
      auth := 'environmental-data-collector'
    );$$,
    'https://bmqdbetupttlthpadseq.supabase.co/functions/v1/scheduled-data-collection',
    '{"scheduled": true}'
  )
);

DO $$
BEGIN
  RAISE LOG '✅ Cron job rescheduled using pg_net auth entry "environmental-data-collector".';
  RAISE LOG '⚠️ Ensure you have executed: SELECT net.http_add_auth(''environmental-data-collector'', ''bearer'', jsonb_build_object(''token'', ''<SERVICE_ROLE_KEY>''));';
END $$;
