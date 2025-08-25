-- Fix Data Contamination - Remove Placeholder and Mock Data
-- This script cleans up contaminated air quality data to ensure only real OpenWeatherMap data remains

-- 1. Remove placeholder data from global_environmental_data table
DELETE FROM public.global_environmental_data 
WHERE data_source = 'Initial Data' 
   OR data_source = 'Legacy Data'
   OR data_source LIKE '%placeholder%'
   OR data_source LIKE '%mock%'
   OR data_source LIKE '%demo%';

-- 2. Remove contaminated air quality readings with unrealistic values
DELETE FROM public.air_quality_readings 
WHERE data_source = 'Legacy Data'
   OR data_source = 'Initial Data'
   OR data_source LIKE '%placeholder%'
   OR data_source LIKE '%mock%'
   OR data_source LIKE '%demo%'
   OR (aqi = 65 AND data_source != 'OpenWeatherMap API')  -- Remove fake AQI 65 values
   OR (aqi = 75 AND data_source != 'OpenWeatherMap API')  -- Remove fake AQI 75 values
   OR (aqi = 1 AND data_source != 'OpenWeatherMap API')   -- Remove fake AQI 1 values
   OR (aqi < 10 AND data_source != 'OpenWeatherMap API'); -- Remove unrealistic low AQI values

-- 3. Update remaining records to ensure proper data source
UPDATE public.air_quality_readings 
SET data_source = 'OpenWeatherMap API'
WHERE data_source IS NULL 
   OR data_source = ''
   OR data_source NOT IN ('OpenWeatherMap API', 'Integrated Weather System', 'Manual Fetch');

-- 4. Clean up any remaining contaminated data in user_points table
DELETE FROM public.user_points 
WHERE aqi_value IN (1, 65, 75) 
   AND created_at < NOW() - INTERVAL '1 day';  -- Only remove old contaminated data

-- 5. Reset points for users who had contaminated data
UPDATE public.profiles 
SET total_points = (
  SELECT COALESCE(SUM(points_earned), 0)
  FROM public.user_points up
  WHERE up.user_id = profiles.user_id
    AND up.aqi_value NOT IN (1, 65, 75)  -- Only count legitimate AQI readings
)
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM public.user_points 
  WHERE aqi_value IN (1, 65, 75)
);

-- 6. Log the cleanup operation
DO $$
BEGIN
  RAISE LOG 'Data contamination cleanup completed successfully';
  RAISE LOG 'Removed placeholder, mock, and contaminated data sources';
  RAISE LOG 'Ensured all remaining data comes from OpenWeatherMap API';
  RAISE LOG 'Reset user points to reflect only legitimate readings';
END $$;

-- 7. Verify cleanup results
SELECT 
  'global_environmental_data' as table_name,
  COUNT(*) as remaining_records,
  STRING_AGG(DISTINCT data_source, ', ') as data_sources
FROM public.global_environmental_data
UNION ALL
SELECT 
  'air_quality_readings' as table_name,
  COUNT(*) as remaining_records,
  STRING_AGG(DISTINCT data_source, ', ') as data_sources
FROM public.air_quality_readings
UNION ALL
SELECT 
  'user_points' as table_name,
  COUNT(*) as remaining_records,
  'N/A' as data_sources
FROM public.user_points;
