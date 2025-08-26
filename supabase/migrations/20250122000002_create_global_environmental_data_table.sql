-- Create global environmental data table for server-side data collection
-- This table stores environmental data collected every 15 minutes by the Edge Function
-- Users will fetch from this table instead of calling external APIs directly

CREATE TABLE IF NOT EXISTS public.global_environmental_data (
  id TEXT PRIMARY KEY,
  city_name TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  aqi INTEGER NOT NULL,
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
  data_source TEXT NOT NULL DEFAULT 'OpenWeatherMap API',
  collection_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comments to explain the table purpose
COMMENT ON TABLE public.global_environmental_data IS 'Stores environmental data collected server-side every 15 minutes for all users to access';
COMMENT ON COLUMN public.global_environmental_data.id IS 'Unique identifier for each data record (city-timestamp format)';
COMMENT ON COLUMN public.global_environmental_data.city_name IS 'Name of the city where data was collected';
COMMENT ON COLUMN public.global_environmental_data.country IS 'Country where the city is located';
COMMENT ON COLUMN public.global_environmental_data.latitude IS 'Latitude coordinate of the city';
COMMENT ON COLUMN public.global_environmental_data.longitude IS 'Longitude coordinate of the city';
COMMENT ON COLUMN public.global_environmental_data.aqi IS 'Air Quality Index value (0-500)';
COMMENT ON COLUMN public.global_environmental_data.pm25 IS 'PM2.5 particulate matter in μg/m³';
COMMENT ON COLUMN public.global_environmental_data.pm10 IS 'PM10 particulate matter in μg/m³';
COMMENT ON COLUMN public.global_environmental_data.no2 IS 'Nitrogen dioxide in μg/m³';
COMMENT ON COLUMN public.global_environmental_data.so2 IS 'Sulfur dioxide in μg/m³';
COMMENT ON COLUMN public.global_environmental_data.co IS 'Carbon monoxide in μg/m³';
COMMENT ON COLUMN public.global_environmental_data.o3 IS 'Ozone in μg/m³';
COMMENT ON COLUMN public.global_environmental_data.temperature IS 'Temperature in Celsius';
COMMENT ON COLUMN public.global_environmental_data.humidity IS 'Relative humidity percentage';
COMMENT ON COLUMN public.global_environmental_data.wind_speed IS 'Wind speed in km/h';
COMMENT ON COLUMN public.global_environmental_data.wind_direction IS 'Wind direction in degrees (0-360)';
COMMENT ON COLUMN public.global_environmental_data.wind_gust IS 'Wind gust speed in km/h';
COMMENT ON COLUMN public.global_environmental_data.air_pressure IS 'Atmospheric pressure in hPa';
COMMENT ON COLUMN public.global_environmental_data.visibility IS 'Visibility in kilometers';
COMMENT ON COLUMN public.global_environmental_data.weather_condition IS 'General weather condition description';
COMMENT ON COLUMN public.global_environmental_data.feels_like_temperature IS 'Apparent temperature in Celsius';
COMMENT ON COLUMN public.global_environmental_data.sunrise_time IS 'Sunrise time for the day';
COMMENT ON COLUMN public.global_environmental_data.sunset_time IS 'Sunset time for the day';
COMMENT ON COLUMN public.global_environmental_data.data_source IS 'Source of the environmental data';
COMMENT ON COLUMN public.global_environmental_data.collection_timestamp IS 'When the data was collected by the server';
COMMENT ON COLUMN public.global_environmental_data.is_active IS 'Whether this is the most recent data for the city (only one record per city should be active)';
COMMENT ON COLUMN public.global_environmental_data.created_at IS 'When this record was created in the database';

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_global_environmental_data_city_active 
ON public.global_environmental_data(city_name, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_global_environmental_data_timestamp 
ON public.global_environmental_data(collection_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_global_environmental_data_location 
ON public.global_environmental_data(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_global_environmental_data_aqi 
ON public.global_environmental_data(aqi);

-- Create a unique constraint to ensure only one active record per city
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_environmental_data_city_unique 
ON public.global_environmental_data(city_name) 
WHERE is_active = true;

-- Create a view for easy access to the most recent data for each city
CREATE OR REPLACE VIEW public.latest_environmental_data AS
SELECT DISTINCT ON (city_name) *
FROM public.global_environmental_data
WHERE is_active = true
ORDER BY city_name, collection_timestamp DESC;

-- Grant permissions
GRANT SELECT ON public.global_environmental_data TO authenticated;
GRANT SELECT ON public.latest_environmental_data TO authenticated;

-- Create RLS policies for the table
ALTER TABLE public.global_environmental_data ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read environmental data
CREATE POLICY "Users can read global environmental data" 
ON public.global_environmental_data 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow service role to insert and update (for Edge Function)
CREATE POLICY "Service role can manage environmental data" 
ON public.global_environmental_data 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- Create a function to get environmental data for a specific location
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

-- Create a function to get all active environmental data
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
    ged.pm10,
    ged.pm25,
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

-- Remove placeholder data insertion to prevent data contamination
-- The table will be populated by the scheduled data collection system with real OpenWeatherMap data
-- INSERT INTO public.global_environmental_data (
--   id, city_name, country, latitude, longitude, aqi, 
--   pm25, pm10, no2, so2, co, o3, temperature, humidity,
--   wind_speed, wind_direction, data_source, collection_timestamp, is_active
-- ) VALUES 
--   ('nairobi-initial', 'Nairobi', 'Kenya', -1.2921, 36.8219, 65, 25, 45, 30, 15, 200, 45, 22, 65, 12, 180, 'Initial Data', now(), true),
--   ('mombasa-initial', 'Mombasa', 'Kenya', -4.0435, 39.6682, 55, 20, 35, 25, 10, 150, 40, 28, 75, 15, 200, 'Initial Data', now(), true),
--   ('kisumu-initial', 'Kisumu', 'Kenya', -0.1022, 34.7617, 60, 22, 40, 28, 12, 180, 42, 24, 70, 10, 190, 'Initial Data', now(), true)
-- ON CONFLICT (id) DO NOTHING;

-- Log the migration completion
DO $$
BEGIN
  RAISE LOG 'Migration 20250122000002_create_global_environmental_data_table completed successfully';
  RAISE LOG 'Created global_environmental_data table with comprehensive environmental data storage';
  RAISE LOG 'Added indexes, views, functions, and RLS policies for optimal performance and security';
  RAISE LOG 'Table ready for real data from scheduled OpenWeatherMap collection system';
END $$;
