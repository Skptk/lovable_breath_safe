-- Migration: Store cron secrets in private.http_secrets and rebuild environmental-data-collection job
-- Description: Creates a private secrets table, helper function, and reschedules the cron job to fetch the Bearer token from the table instead of pg_net auth helpers.
-- Date: 2025-09-26

CREATE SCHEMA IF NOT EXISTS private;

-- Ensure only privileged roles can access the private schema by default
REVOKE ALL ON SCHEMA private FROM public;
GRANT USAGE ON SCHEMA private TO postgres;
GRANT USAGE ON SCHEMA private TO service_role;

-- Store HTTP secrets without hard-coding values inside migrations
CREATE TABLE IF NOT EXISTS private.http_secrets (
  secret_name text PRIMARY KEY,
  secret_value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE private.http_secrets IS 'Holds out-of-band HTTP secrets. Populate via manual INSERT, keep access restricted to service_role.';

-- Helper to fetch a secret at runtime. Raises helpful error if missing.
CREATE OR REPLACE FUNCTION private.get_http_secret(p_secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT secret_value INTO v_secret
  FROM private.http_secrets
  WHERE secret_name = p_secret_name;

  IF v_secret IS NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = format('Secret %s not found in private.http_secrets. Please insert it manually.', p_secret_name),
      HINT = 'Run: INSERT INTO private.http_secrets (secret_name, secret_value) VALUES (''environmental-data-collector'', ''<SERVICE_ROLE_KEY>'') ON CONFLICT (secret_name) DO UPDATE SET secret_value = EXCLUDED.secret_value;';
  END IF;

  RETURN v_secret;
END;
$$;

COMMENT ON FUNCTION private.get_http_secret(text) IS 'Returns a secret from private.http_secrets. Raises exception with instructions if not present.';

-- Unschedule any existing job definition
SELECT cron.unschedule('environmental-data-collection')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'environmental-data-collection'
);

-- Schedule the per-minute job pulling Authorization header from private.get_http_secret
SELECT cron.schedule(
  'environmental-data-collection',
  '* * * * *',
  format(
    $$SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', concat('Bearer ', private.get_http_secret('environmental-data-collector'))
      ),
      body := %L::jsonb
    );$$,
    'https://bmqdbetupttlthpadseq.supabase.co/functions/v1/scheduled-data-collection',
    '{"scheduled": true}'
  )
);

DO $$
BEGIN
  RAISE LOG '✅ Cron job rescheduled using private.get_http_secret(''environmental-data-collector'').';
  RAISE LOG '⚠️ Populate secret with: INSERT INTO private.http_secrets(secret_name, secret_value) VALUES (''environmental-data-collector'', ''<SERVICE_ROLE_KEY>'') ON CONFLICT (secret_name) DO UPDATE SET secret_value = EXCLUDED.secret_value;';
END $$;
