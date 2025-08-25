-- Fix environmental data functions with proper column types and complete column list
-- This migration fixes the type mismatch errors that were causing fallbacks to direct table queries

-- Drop existing functions to recreate them properly
DROP FUNCTION IF EXISTS public.get_all_active_environmental_data();
DROP FUNCTION IF EXISTS public.get_nearest_environmental_data(DECIMAL, DECIMAL, DECIMAL);

-- Recreate the function to get all active environmental data with complete column list
CREATE OR REPLACE FUNCTION public.get_all_active_environmental_data()
RETURNS TABLE (
  id TEXT,
  city_name TEXT,
  country TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  aqi INTEGER,
  pm25 DECIMAL(8, 2),
  pm10 DECIMAL(8, 2),
  no2 DECIMAL(8, 2),
  so2 DECIMAL(8, 2),
  co DECIMAL(8, 2),
  o3 DECIMAL(8, 2),
  temperature DECIMAL(5, 2),
  humidity DECIMAL(5, 2),
  wind_speed DECIMAL(5, 2),
  wind_direction INTEGER,
  wind_gust DECIMAL(5, 2),
  air_pressure DECIMAL(6, 2),
  visibility DECIMAL(6, 2),
  weather_condition TEXT,
  feels_like_temperature DECIMAL(5, 2),
  sunrise_time TIME,
  sunset_time TIME,
  data_source TEXT,
  collection_timestamp TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ged.id,
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
    ged.is_active,
    ged.created_at
  FROM public.global_environmental_data ged
  WHERE ged.is_active = true
  ORDER BY ged.city_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the function to get nearest environmental data with proper distance calculation
CREATE OR REPLACE FUNCTION public.get_nearest_environmental_data(
  p_latitude DECIMAL(10, 8),
  p_longitude DECIMAL(11, 8),
  p_max_distance_km DECIMAL(10, 2) DEFAULT 50
)
RETURNS TABLE (
  id TEXT,
  city_name TEXT,
  country TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  aqi INTEGER,
  pm25 DECIMAL(8, 2),
  pm10 DECIMAL(8, 2),
  no2 DECIMAL(8, 2),
  so2 DECIMAL(8, 2),
  co DECIMAL(8, 2),
  o3 DECIMAL(8, 2),
  temperature DECIMAL(5, 2),
  humidity DECIMAL(5, 2),
  wind_speed DECIMAL(5, 2),
  wind_direction INTEGER,
  wind_gust DECIMAL(5, 2),
  air_pressure DECIMAL(6, 2),
  visibility DECIMAL(6, 2),
  weather_condition TEXT,
  feels_like_temperature DECIMAL(5, 2),
  sunrise_time TIME,
  sunset_time TIME,
  data_source TEXT,
  collection_timestamp TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  distance_km DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ged.id,
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
    ged.is_active,
    ged.created_at,
    (
      6371 * acos(
        cos(radians(p_latitude)) * 
        cos(radians(ged.latitude)) * 
        cos(radians(ged.longitude) - radians(p_longitude)) + 
        sin(radians(p_latitude)) * 
        sin(radians(ged.latitude))
      )
    )::DECIMAL(10, 2) as distance_km
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the fixed functions
GRANT EXECUTE ON FUNCTION public.get_all_active_environmental_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearest_environmental_data(DECIMAL(10, 8), DECIMAL(11, 8), DECIMAL(10, 2)) TO authenticated;

-- Log the migration completion
DO $$
BEGIN
  RAISE LOG 'Migration 20250122000003_fix_environmental_data_functions completed successfully';
  RAISE LOG 'Fixed get_all_active_environmental_data function with complete column list';
  RAISE LOG 'Fixed get_nearest_environmental_data function with proper type casting';
  RAISE LOG 'All functions now return complete data with proper types';
END $$;
