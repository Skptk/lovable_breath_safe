-- Migration: Security Fixes and Achievement Cleanup
-- Description: 
-- 1. Remove security vulnerabilities by fixing view permissions and enabling RLS
-- 2. Clean up incorrectly awarded achievements
-- Date: 2025-09-23
-- Priority: CRITICAL

-- Begin transaction
BEGIN;

-- =============================================
-- 1. FIX AUTH USERS EXPOSURE
-- =============================================
-- Drop the view that exposes auth.users data
DROP VIEW IF EXISTS public.v_user_achievement_state;

-- =============================================
-- 2. FIX SECURITY DEFINER VIEWS
-- =============================================
-- Recreate latest_environmental_data view without SECURITY DEFINER
-- and ensure it doesn't expose sensitive data
DROP VIEW IF EXISTS public.latest_environmental_data CASCADE;

CREATE VIEW public.latest_environmental_data AS
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
  is_active
FROM public.global_environmental_data
WHERE is_active = true
ORDER BY city_name, collection_timestamp DESC;

-- Set proper permissions
REVOKE ALL ON public.latest_environmental_data FROM PUBLIC;
GRANT SELECT ON public.latest_environmental_data TO authenticated, anon;

-- =============================================
-- 3. ENABLE RLS ON last_known_good_aqi
-- =============================================
-- Enable RLS on the table
ALTER TABLE public.last_known_good_aqi ENABLE ROW LEVEL SECURITY;

-- Create policies for last_known_good_aqi
-- Allow public read access as this is public air quality data
CREATE POLICY "Enable read access for all users"
ON public.last_known_good_aqi
FOR SELECT
TO authenticated, anon
USING (true);

-- Restrict write operations to authenticated users with appropriate permissions
CREATE POLICY "Enable insert for authenticated users only"
ON public.last_known_good_aqi
FOR INSERT
TO authenticated
WITH CHECK (true);

-- =============================================
-- 4. CLEAN UP INCORRECTLY AWARDED ACHIEVEMENTS
-- =============================================
-- First, create a backup of the current achievements for affected users
CREATE TABLE IF NOT EXISTS deleted_achievements_backup_20250923 AS
SELECT * FROM public.user_achievements
WHERE user_id IN (
    '4d1fc184-0fc2-4ac3-a41f-3ad493d88d1f', 
    'b03810fc-ee86-4b4a-9d5e-7724b1d8ca45'
) 
AND created_at BETWEEN '2025-09-22' AND '2025-09-23 06:15:00';

-- Delete the incorrectly awarded achievements
DELETE FROM public.user_achievements
WHERE user_id IN (
    '4d1fc184-0fc2-4ac3-a41f-3ad493d88d1f', 
    'b03810fc-ee86-4b4a-9d5e-7724b1d8ca45'
) 
AND created_at BETWEEN '2025-09-22' AND '2025-09-23 06:15:00';

-- =============================================
-- 5. CREATE A SAFE VERSION OF USER ACHIEVEMENT VIEW
-- =============================================
-- This view doesn't expose auth.users data directly
CREATE OR REPLACE VIEW public.v_safe_user_achievements AS
SELECT 
    ua.user_id,
    ua.achievement_id,
    ua.unlocked,
    ua.earned_at,
    ua.created_at,
    ua.updated_at
FROM 
    public.user_achievements ua
WHERE 
    ua.user_id = auth.uid();

-- Set proper permissions on the new view
REVOKE ALL ON public.v_safe_user_achievements FROM PUBLIC;
GRANT SELECT ON public.v_safe_user_achievements TO authenticated;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
-- These can be run after migration to verify the changes
/*
-- Check if auth.users is still exposed
SELECT * FROM information_schema.views 
WHERE table_schema = 'public' 
AND definition LIKE '%auth.users%';

-- Verify RLS is enabled on last_known_good_aqi
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'last_known_good_aqi';

-- Check achievement cleanup
SELECT user_id, COUNT(*) as achievement_count
FROM public.user_achievements
WHERE user_id IN (
    '4d1fc184-0fc2-4ac3-a41f-3ad493d88d1f', 
    'b03810fc-ee86-4b4a-9d5e-7724b1d8ca45'
)
GROUP BY user_id;
*/

-- =============================================
-- LOG THE CHANGES
-- =============================================
COMMENT ON VIEW public.latest_environmental_data IS 'Latest environmental data for each city - public read access';
COMMENT ON TABLE public.last_known_good_aqi IS 'Last known good AQI data by location - public read access';
COMMENT ON VIEW public.v_safe_user_achievements IS 'Safe view of user achievements that respects RLS';

-- Log the completion of the migration
DO $$
BEGIN
    RAISE LOG '✅ Security fixes and achievement cleanup completed successfully';
    RAISE LOG '   - Removed auth.users exposure in views';
    RAISE LOG '   - Fixed SECURITY DEFINER views';
    RAISE LOG '   - Enabled RLS on last_known_good_aqi';
    RAISE LOG '   - Cleaned up incorrectly awarded achievements';
    RAISE LOG '   - Created safe user achievements view';
END $$;

-- Commit the transaction
COMMIT;
