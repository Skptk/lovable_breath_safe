-- Migration: Fix Security Vulnerabilities
-- Description: Addresses security issues identified by Supabase security advisor
-- Date: 2025-01-23

-- Add dependency checks and error handling for safer migration
DO $$
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'global_environmental_data') THEN
    RAISE EXCEPTION 'Required table global_environmental_data does not exist. Please run previous migrations first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'data_collection_schedule') THEN
    RAISE EXCEPTION 'Required table data_collection_schedule does not exist. Please run previous migrations first.';
  END IF;
  
  RAISE LOG '✅ Dependency check passed - all required tables exist';
END $$;

-- Fix 1: Remove SECURITY DEFINER from functions that don't need elevated privileges
-- This prevents the functions from running with the creator's permissions

-- Fix get_nearest_environmental_data function
CREATE OR REPLACE FUNCTION public.get_nearest_environmental_data(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_max_distance_km DECIMAL DEFAULT 50
)
RETURNS TABLE (
  city_name TEXT,
  country TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  aqi INTEGER,
  pm25 DECIMAL,
  pm10 DECIMAL,
  no2 DECIMAL,
  so2 DECIMAL,
  co DECIMAL,
  o3 DECIMAL,
  temperature DECIMAL,
  humidity DECIMAL,
  wind_speed DECIMAL,
  wind_direction INTEGER,
  wind_gust DECIMAL,
  air_pressure DECIMAL,
  visibility DECIMAL,
  weather_condition TEXT,
  feels_like_temperature DECIMAL,
  sunrise_time TIME,
  sunset_time TIME,
  data_source TEXT,
  collection_timestamp TIMESTAMP WITH TIME ZONE,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ged.city_name,
    ged.country,
    ged.latitude,
    ged.longitude,
    ged.aqi,
    ged.pm25,
    ged.pm10,
    ged.no2,
    ged.so2,
    ged.co,
    ged.o3,
    ged.temperature,
    ged.humidity,
    ged.wind_speed,
    ged.wind_direction,
    ged.wind_gust,
    ged.air_pressure,
    ged.visibility,
    ged.weather_condition,
    ged.feels_like_temperature,
    ged.sunrise_time,
    ged.sunset_time,
    ged.data_source,
    ged.collection_timestamp,
    -- Calculate distance using Haversine formula
    (
      6371 * acos(
        cos(radians(p_latitude)) * 
        cos(radians(ged.latitude)) * 
        cos(radians(ged.longitude) - radians(p_longitude)) + 
        sin(radians(p_latitude)) * 
        sin(radians(ged.latitude))
      )
    ) as distance_km
  FROM public.global_environmental_data ged
  WHERE ged.is_active = true
    AND (
      6371 * acos(
        cos(radians(p_latitude)) * 
        cos(radians(ged.latitude)) * 
        cos(radians(ged.longitude) - radians(p_longitude)) + 
        sin(radians(p_latitude)) * 
        sin(radians(ged.latitude))
      )
    ) <= p_max_distance_km
  ORDER BY distance_km ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Fix get_all_active_environmental_data function
CREATE OR REPLACE FUNCTION public.get_all_active_environmental_data()
RETURNS TABLE (
  city_name TEXT,
  country TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  aqi INTEGER,
  pm25 DECIMAL,
  pm10 DECIMAL,
  no2 DECIMAL,
  so2 DECIMAL,
  co DECIMAL,
  o3 DECIMAL,
  temperature DECIMAL,
  humidity DECIMAL,
  wind_speed DECIMAL,
  wind_direction INTEGER,
  wind_gust DECIMAL,
  air_pressure DECIMAL,
  visibility DECIMAL,
  weather_condition TEXT,
  feels_like_temperature DECIMAL,
  sunrise_time TIME,
  sunset_time TIME,
  data_source TEXT,
  collection_timestamp TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ged.city_name,
    ged.country,
    ged.latitude,
    ged.longitude,
    ged.aqi,
    ged.pm25,
    ged.pm10,
    ged.no2,
    ged.so2,
    ged.co,
    ged.o3,
    ged.temperature,
    ged.humidity,
    ged.wind_speed,
    ged.wind_direction,
    ged.wind_gust,
    ged.air_pressure,
    ged.visibility,
    ged.weather_condition,
    ged.feels_like_temperature,
    ged.sunrise_time,
    ged.sunset_time,
    ged.data_source,
    ged.collection_timestamp
  FROM public.global_environmental_data ged
  WHERE ged.is_active = true
  ORDER BY ged.city_name;
END;
$$ LANGUAGE plpgsql;

-- Fix 2: Enable RLS on data_collection_schedule table and create proper policies
-- This ensures proper access control for the scheduling table

-- Check if RLS is already enabled to avoid errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'data_collection_schedule' 
    AND row_security = 'YES'
  ) THEN
    -- Enable RLS on the scheduling table
    ALTER TABLE public.data_collection_schedule ENABLE ROW LEVEL SECURITY;
    RAISE LOG '✅ RLS enabled on data_collection_schedule table';
  ELSE
    RAISE LOG 'ℹ️ RLS already enabled on data_collection_schedule table';
  END IF;
END $$;

-- Drop existing policies if they exist (safe to do multiple times)
DROP POLICY IF EXISTS "Users can read data collection schedule" ON public.data_collection_schedule;
DROP POLICY IF EXISTS "Users can update data collection schedule" ON public.data_collection_schedule;
DROP POLICY IF EXISTS "Service role can manage data collection schedule" ON public.data_collection_schedule;

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

-- Fix 3: Remove SECURITY DEFINER from scheduling functions
-- These functions don't need elevated privileges

-- Fix should_run_data_collection function
CREATE OR REPLACE FUNCTION public.should_run_data_collection()
RETURNS BOOLEAN
LANGUAGE plpgsql
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

-- Fix trigger_data_collection function
CREATE OR REPLACE FUNCTION public.trigger_data_collection()
RETURNS TEXT
LANGUAGE plpgsql
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

-- Grant execute permissions on the fixed functions
GRANT EXECUTE ON FUNCTION public.get_nearest_environmental_data(DECIMAL, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_active_environmental_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.should_run_data_collection() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_data_collection() TO authenticated;

-- Log the security fixes completion
DO $$
BEGIN
  RAISE LOG '🔒 Security vulnerabilities fixed successfully';
  RAISE LOG '✅ Removed SECURITY DEFINER from functions that dont need elevated privileges';
  RAISE LOG '✅ Enabled RLS on data_collection_schedule table';
  RAISE LOG '✅ Created proper RLS policies for secure access control';
  RAISE LOG '✅ Functions now run with caller permissions instead of creator permissions';
  RAISE LOG '✅ Table access now properly controlled through RLS policies';
END $$;
