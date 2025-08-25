-- Create database functions for global environmental data system
-- This migration adds the functions needed by useGlobalEnvironmentalData hook

-- Function to get all active environmental data for all cities
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
  sunrise_time TEXT,
  sunset_time TEXT,
  data_source TEXT,
  collection_timestamp TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN
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
    ged.is_active
  FROM public.global_environmental_data ged
  WHERE ged.is_active = true
  ORDER BY ged.collection_timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get nearest environmental data for given coordinates
CREATE OR REPLACE FUNCTION public.get_nearest_environmental_data(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_max_distance_km DECIMAL DEFAULT 50
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
  sunrise_time TEXT,
  sunset_time TEXT,
  data_source TEXT,
  collection_timestamp TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN,
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
    -- Calculate distance using Haversine formula
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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_active_environmental_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearest_environmental_data(DECIMAL, DECIMAL, DECIMAL) TO authenticated;

-- Add comments explaining the functions
COMMENT ON FUNCTION public.get_all_active_environmental_data() 
IS 'Returns all active environmental data for all cities, ordered by most recent collection';

COMMENT ON FUNCTION public.get_nearest_environmental_data(DECIMAL, DECIMAL, DECIMAL) 
IS 'Returns the nearest environmental data within specified distance, using Haversine formula for accurate distance calculation';
