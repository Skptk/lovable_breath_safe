-- Migration: Enhance Subscription Validation and Real-time Handling
-- Date: 2025-01-23
-- Purpose: Add subscription validation functions and improve real-time subscription handling

-- Create function to validate table existence
CREATE OR REPLACE FUNCTION validate_table_exists(table_name TEXT, schema_name TEXT DEFAULT 'public')
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if table exists in the specified schema
  RETURN EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = schema_name 
    AND table_name = validate_table_exists.table_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate column existence
CREATE OR REPLACE FUNCTION validate_column_exists(
  table_name TEXT, 
  column_name TEXT, 
  schema_name TEXT DEFAULT 'public'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if column exists in the specified table and schema
  RETURN EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = schema_name 
    AND table_name = validate_column_exists.table_name
    AND column_name = validate_column_exists.column_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate subscription configuration
CREATE OR REPLACE FUNCTION validate_subscription_config(
  channel_name TEXT,
  table_name TEXT,
  filter_condition TEXT DEFAULT NULL,
  schema_name TEXT DEFAULT 'public'
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  table_exists BOOLEAN;
  columns_exist BOOLEAN;
  filter_valid BOOLEAN := TRUE;
  column_name TEXT;
  value_part TEXT;
BEGIN
  -- Check if table exists
  table_exists := validate_table_exists(table_name, schema_name);
  
  -- Check if columns in filter exist
  IF filter_condition IS NOT NULL AND filter_condition != '' THEN
    -- Parse filter condition (simple format: column=value)
    IF filter_condition LIKE '%=%' THEN
      column_name := SPLIT_PART(filter_condition, '=', 1);
      value_part := SPLIT_PART(filter_condition, '=', 2);
      
      -- Validate column name format
      IF column_name !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN
        filter_valid := FALSE;
      ELSE
        -- Check if column exists in table
        columns_exist := validate_column_exists(table_name, column_name, schema_name);
      END IF;
    ELSE
      filter_valid := FALSE;
    END IF;
  ELSE
    columns_exist := TRUE;
  END IF;
  
  -- Build result
  result := json_build_object(
    'valid', table_exists AND columns_exist AND filter_valid,
    'table_exists', table_exists,
    'columns_exist', columns_exist,
    'filter_valid', filter_valid,
    'channel_name', channel_name,
    'table_name', table_name,
    'filter_condition', filter_condition,
    'schema_name', schema_name,
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get subscription health status
CREATE OR REPLACE FUNCTION get_subscription_health()
RETURNS TABLE (
  channel_name TEXT,
  table_name TEXT,
  filter_condition TEXT,
  subscription_count BIGINT,
  last_activity TIMESTAMPTZ,
  health_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.channel_name,
    sl.table_name,
    sl.filter_condition,
    COUNT(*)::BIGINT as subscription_count,
    MAX(sl.timestamp) as last_activity,
    CASE 
      WHEN MAX(sl.timestamp) > NOW() - INTERVAL '5 minutes' THEN 'healthy'
      WHEN MAX(sl.timestamp) > NOW() - INTERVAL '15 minutes' THEN 'warning'
      ELSE 'unhealthy'
    END as health_status
  FROM subscription_logs sl
  WHERE sl.success = true
  GROUP BY sl.channel_name, sl.table_name, sl.filter_condition
  ORDER BY last_activity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to cleanup stale subscriptions
CREATE OR REPLACE FUNCTION cleanup_stale_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER := 0;
BEGIN
  -- Remove subscription logs older than 24 hours
  DELETE FROM subscription_logs 
  WHERE timestamp < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  -- Log cleanup action
  INSERT INTO subscription_logs (
    channel_name, 
    table_name, 
    filter_condition, 
    success, 
    error_message
  ) VALUES (
    'system', 
    'subscription_logs', 
    'cleanup', 
    true, 
    'Cleaned up ' || cleaned_count || ' stale subscription logs'
  );
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION validate_table_exists(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_column_exists(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_subscription_config(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_health() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_stale_subscriptions() TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_logs_timestamp ON subscription_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_subscription_logs_channel_table ON subscription_logs(channel_name, table_name);
CREATE INDEX IF NOT EXISTS idx_subscription_logs_success ON subscription_logs(success);

-- Schedule cleanup job to run every 6 hours
SELECT cron.schedule(
  'cleanup-stale-subscriptions',
  '0 */6 * * *', -- Every 6 hours
  'SELECT cleanup_stale_subscriptions();'
);

-- Insert initial system subscription log
INSERT INTO subscription_logs (
  channel_name, 
  table_name, 
  filter_condition, 
  success, 
  error_message
) VALUES (
  'system', 
  'migration', 
  'enhance_subscription_validation', 
  true, 
  'Migration 20250123000007 applied successfully'
) ON CONFLICT DO NOTHING;
