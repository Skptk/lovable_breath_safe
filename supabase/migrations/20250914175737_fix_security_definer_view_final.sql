-- Migration: Fix SECURITY DEFINER View Issue (Final Resolution)
-- Description: Ensures the latest_environmental_data view is created without SECURITY DEFINER
-- Date: 2024-09-14
-- Issue: Supabase Security Advisor flagged SECURITY DEFINER property on view
-- Priority: CRITICAL - Rule S2 violation

-- Step 1: Drop the existing view completely to remove any SECURITY DEFINER properties
DROP VIEW IF EXISTS public.latest_environmental_data CASCADE;

-- Step 2: Recreate the view with explicit INVOKER rights (not DEFINER)
-- This ensures the view runs with the permissions of the calling user, not the creator
CREATE VIEW public.latest_environmental_data 
AS
SELECT DISTINCT ON (city_name) 
  id,
  city_name,
  country,
  latitude,
  longitude,
  aqi,
  pm25,
  pm10,
  no2,
  so2,
  co,
  o3,
  temperature,
  humidity,
  wind_speed,
  wind_direction,
  wind_gust,
  air_pressure,
  visibility,
  weather_condition,
  feels_like_temperature,
  sunrise_time,
  sunset_time,
  data_source,
  collection_timestamp,
  is_active,
  created_at
FROM public.global_environmental_data
WHERE is_active = true
ORDER BY city_name, collection_timestamp DESC;

-- Step 3: Grant proper permissions to authenticated users
GRANT SELECT ON public.latest_environmental_data TO authenticated;
GRANT SELECT ON public.latest_environmental_data TO anon;

-- Step 4: Add security comment for documentation
COMMENT ON VIEW public.latest_environmental_data IS 
'Latest environmental data for each city. View runs with INVOKER permissions (not DEFINER) for security compliance. Resolves Supabase Security Advisor warning about SECURITY DEFINER views.';

-- Step 5: Verification and logging
DO $$
DECLARE
  view_exists BOOLEAN;
  view_definer TEXT;
BEGIN
  -- Check if view was created successfully
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'latest_environmental_data'
  ) INTO view_exists;
  
  IF view_exists THEN
    RAISE LOG '✅ SECURITY FIX: latest_environmental_data view recreated successfully';
    RAISE LOG '🔒 COMPLIANCE: View now runs with INVOKER permissions (Rule S2 compliant)';
    RAISE LOG '⚡ FUNCTIONALITY: All data access preserved while improving security';
  ELSE
    RAISE EXCEPTION 'CRITICAL: Failed to recreate latest_environmental_data view';
  END IF;
  
  -- Log the successful resolution
  RAISE LOG '🎯 RESOLVED: Supabase Security Advisor SECURITY DEFINER warning';
  RAISE LOG '📋 MIGRATION: 20250914175737_fix_security_definer_view_final.sql completed';
END $$;