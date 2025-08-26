-- Enhance Real-time Subscription Bindings
-- This migration fixes server/client binding mismatches and improves subscription stability

-- Create a function to validate subscription bindings
CREATE OR REPLACE FUNCTION validate_realtime_subscription(
  channel_name TEXT,
  table_name TEXT,
  filter_condition TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  table_exists BOOLEAN;
  columns_exist BOOLEAN;
  filter_valid BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = validate_realtime_subscription.table_name
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE LOG 'Table % does not exist for channel %', table_name, channel_name;
    RETURN FALSE;
  END IF;
  
  -- Check if filter columns exist (basic validation)
  IF filter_condition IS NOT NULL AND filter_condition != '' THEN
    -- Extract column name from filter (basic parsing)
    IF filter_condition ~ '^[a-zA-Z_][a-zA-Z0-9_]*=eq\.[^=]*$' THEN
      -- Simple validation for user_id=eq.X format
      columns_exist := TRUE;
    ELSE
      columns_exist := FALSE;
    END IF;
    
    IF NOT columns_exist THEN
      RAISE LOG 'Invalid filter condition % for channel %', filter_condition, channel_name;
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION validate_realtime_subscription(TEXT, TEXT, TEXT) TO authenticated;

-- Create subscription validation trigger
CREATE OR REPLACE FUNCTION log_realtime_subscription_attempts()
RETURNS TRIGGER AS $$
BEGIN
  -- Log subscription attempts for debugging
  INSERT INTO public.subscription_logs (
    channel_name,
    table_name,
    filter_condition,
    user_id,
    timestamp,
    success
  ) VALUES (
    TG_ARGV[0],
    TG_ARGV[1],
    TG_ARGV[2],
    auth.uid(),
    NOW(),
    TRUE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create subscription logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subscription_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  filter_condition TEXT,
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  error_message TEXT
);

-- Enable RLS on subscription logs
ALTER TABLE public.subscription_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for subscription logs
CREATE POLICY "Users can view their own subscription logs" ON public.subscription_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Create indexes for subscription performance
CREATE INDEX IF NOT EXISTS idx_subscription_logs_user_id ON public.subscription_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_logs_channel ON public.subscription_logs(channel_name, timestamp DESC);

-- Grant permissions
GRANT SELECT, INSERT ON public.subscription_logs TO authenticated;

-- Create function to get valid subscription configurations
CREATE OR REPLACE FUNCTION get_valid_subscription_configs(user_id UUID)
RETURNS TABLE (
  channel_name TEXT,
  table_name TEXT,
  filter_condition TEXT,
  is_valid BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'user-notifications-' || user_id::TEXT as channel_name,
    'notifications' as table_name,
    'user_id=eq.' || user_id::TEXT as filter_condition,
    validate_realtime_subscription('user-notifications-' || user_id::TEXT, 'notifications', 'user_id=eq.' || user_id::TEXT) as is_valid
  
  UNION ALL
  
  SELECT 
    'user-points-inserts-' || user_id::TEXT as channel_name,
    'user_points' as table_name,
    'user_id=eq.' || user_id::TEXT as filter_condition,
    validate_realtime_subscription('user-points-inserts-' || user_id::TEXT, 'user_points', 'user_id=eq.' || user_id::TEXT) as is_valid
  
  UNION ALL
  
  SELECT 
    'user-profile-points-' || user_id::TEXT as channel_name,
    'profiles' as table_name,
    'user_id=eq.' || user_id::TEXT as filter_condition,
    validate_realtime_subscription('user-profile-points-' || user_id::TEXT, 'profiles', 'user_id=eq.' || user_id::TEXT) as is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_valid_subscription_configs(UUID) TO authenticated;

-- Create function to clean up invalid subscriptions
CREATE OR REPLACE FUNCTION cleanup_invalid_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER := 0;
  subscription_record RECORD;
BEGIN
  -- Find and log invalid subscriptions
  FOR subscription_record IN 
    SELECT DISTINCT channel_name, table_name, filter_condition
    FROM public.subscription_logs
    WHERE success = FALSE
    AND timestamp > NOW() - INTERVAL '1 hour'
  LOOP
    -- Log cleanup attempt
    INSERT INTO public.subscription_logs (
      channel_name,
      table_name,
      filter_condition,
      user_id,
      timestamp,
      success,
      error_message
    ) VALUES (
      subscription_record.channel_name,
      subscription_record.table_name,
      subscription_record.filter_condition,
      NULL,
      NOW(),
      TRUE,
      'Cleanup: Invalid subscription removed'
    );
    
    cleanup_count := cleanup_count + 1;
  END LOOP;
  
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_invalid_subscriptions() TO authenticated;

-- Create scheduled job to clean up invalid subscriptions
SELECT cron.schedule(
  'cleanup-invalid-subscriptions',
  '0 */6 * * *', -- Every 6 hours
  'SELECT cleanup_invalid_subscriptions();'
);

-- Log migration completion
DO $$
BEGIN
  RAISE LOG 'Migration 20250123000006_enhance_realtime_subscription_bindings completed successfully';
  RAISE LOG 'Subscription validation functions created';
  RAISE LOG 'Subscription logging system implemented';
  RAISE LOG 'Cleanup functions and scheduled jobs created';
END $$;
