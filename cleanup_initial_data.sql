-- Cleanup Initial Data and Prepare Database for Real Air Quality Data
-- This script removes any remaining placeholder data and ensures the database is ready for real API data

-- 1. Remove any remaining "Initial Data" records from global_environmental_data
DELETE FROM public.global_environmental_data 
WHERE data_source = 'Initial Data' 
   OR data_source LIKE '%initial%' 
   OR data_source LIKE '%placeholder%'
   OR data_source LIKE '%mock%'
   OR data_source LIKE '%test%'
   OR data_source LIKE '%demo%'
   OR data_source LIKE '%fake%';

-- 2. Remove any remaining "Initial Data" records from air_quality_readings
DELETE FROM public.air_quality_readings 
WHERE data_source = 'Initial Data' 
   OR data_source LIKE '%initial%' 
   OR data_source LIKE '%placeholder%'
   OR data_source LIKE '%mock%'
   OR data_source LIKE '%test%'
   OR data_source LIKE '%demo%'
   OR data_source LIKE '%fake%';

-- 3. Verify the cleanup
SELECT 
  'global_environmental_data' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN data_source = 'OpenWeatherMap API' THEN 1 END) as openweathermap_records,
  COUNT(CASE WHEN data_source != 'OpenWeatherMap API' THEN 1 END) as other_records
FROM public.global_environmental_data
UNION ALL
SELECT 
  'air_quality_readings' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN data_source = 'OpenWeatherMap API' THEN 1 END) as openweathermap_records,
  COUNT(CASE WHEN data_source != 'OpenWeatherMap API' THEN 1 END) as other_records
FROM public.air_quality_readings;

-- 4. Show current data sources in global_environmental_data
SELECT 
  data_source,
  COUNT(*) as record_count,
  MAX(collection_timestamp) as latest_collection
FROM public.global_environmental_data
GROUP BY data_source
ORDER BY record_count DESC;

-- 5. Show current data sources in air_quality_readings
SELECT 
  data_source,
  COUNT(*) as record_count,
  MAX(timestamp) as latest_reading
FROM public.air_quality_readings
GROUP BY data_source
ORDER BY record_count DESC;

-- 6. Check if there are any active environmental data records
SELECT 
  city_name,
  country,
  aqi,
  data_source,
  collection_timestamp,
  is_active
FROM public.global_environmental_data
WHERE is_active = true
ORDER BY collection_timestamp DESC;

-- 7. Log the cleanup completion
DO $$
BEGIN
  RAISE LOG 'Cleanup of Initial Data completed successfully';
  RAISE LOG 'Database is now ready for real OpenWeatherMap API data';
  RAISE LOG 'Next step: Ensure scheduled data collection Edge Function is configured with OPENWEATHERMAP_API_KEY';
END $$;
