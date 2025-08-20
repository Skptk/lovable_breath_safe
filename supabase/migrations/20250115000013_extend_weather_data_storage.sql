-- Extend air_quality_readings table with comprehensive weather data fields
-- This migration adds wind data, forecast summary, and additional weather metrics
-- while maintaining backward compatibility with existing data

-- Add new weather-related columns to air_quality_readings table
ALTER TABLE public.air_quality_readings 
ADD COLUMN IF NOT EXISTS wind_speed DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS wind_direction INTEGER,
ADD COLUMN IF NOT EXISTS wind_gust DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS air_pressure DECIMAL(6, 2),
ADD COLUMN IF NOT EXISTS rain_probability DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS uv_index DECIMAL(3, 1),
ADD COLUMN IF NOT EXISTS visibility DECIMAL(6, 2),
ADD COLUMN IF NOT EXISTS forecast_summary JSONB,
ADD COLUMN IF NOT EXISTS weather_condition TEXT,
ADD COLUMN IF NOT EXISTS feels_like_temperature DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS sunrise_time TIME,
ADD COLUMN IF NOT EXISTS sunset_time TIME;

-- Add comments to explain the new fields
COMMENT ON COLUMN public.air_quality_readings.wind_speed IS 'Wind speed in km/h';
COMMENT ON COLUMN public.air_quality_readings.wind_direction IS 'Wind direction in degrees (0-360)';
COMMENT ON COLUMN public.air_quality_readings.wind_gust IS 'Wind gust speed in km/h';
COMMENT ON COLUMN public.air_quality_readings.air_pressure IS 'Atmospheric pressure in hPa';
COMMENT ON COLUMN public.air_quality_readings.rain_probability IS 'Probability of rain as percentage';
COMMENT ON COLUMN public.air_quality_readings.uv_index IS 'Ultraviolet index (0-15)';
COMMENT ON COLUMN public.air_quality_readings.visibility IS 'Visibility in kilometers';
COMMENT ON COLUMN public.air_quality_readings.forecast_summary IS 'JSON summary of weather forecast data';
COMMENT ON COLUMN public.air_quality_readings.weather_condition IS 'General weather condition description';
COMMENT ON COLUMN public.air_quality_readings.feels_like_temperature IS 'Apparent temperature in Celsius';
COMMENT ON COLUMN public.air_quality_readings.sunrise_time IS 'Sunrise time for the day';
COMMENT ON COLUMN public.air_quality_readings.sunset_time IS 'Sunset time for the day';

-- Create indexes for better performance on weather data queries
CREATE INDEX IF NOT EXISTS idx_air_quality_readings_weather_timestamp 
ON public.air_quality_readings(timestamp DESC, temperature, humidity, wind_speed);

CREATE INDEX IF NOT EXISTS idx_air_quality_readings_location_weather 
ON public.air_quality_readings(latitude, longitude, timestamp DESC);

-- Create a function to get comprehensive weather summary
CREATE OR REPLACE FUNCTION public.get_weather_summary(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  date DATE,
  avg_temperature DECIMAL(5, 2),
  avg_humidity DECIMAL(5, 2),
  avg_wind_speed DECIMAL(5, 2),
  max_aqi INTEGER,
  total_readings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(r.timestamp) as date,
    AVG(r.temperature) as avg_temperature,
    AVG(r.humidity) as avg_humidity,
    AVG(r.wind_speed) as avg_wind_speed,
    MAX(r.aqi) as max_aqi,
    COUNT(*) as total_readings
  FROM public.air_quality_readings r
  WHERE r.user_id = p_user_id
    AND r.timestamp >= CURRENT_DATE - INTERVAL '1 day' * p_days
  GROUP BY DATE(r.timestamp)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_weather_summary(UUID, INTEGER) TO authenticated;

-- Create a view for easy access to comprehensive weather data
CREATE OR REPLACE VIEW public.comprehensive_weather_readings AS
SELECT 
  r.*,
  CASE 
    WHEN r.aqi <= 50 THEN 'Good'
    WHEN r.aqi <= 100 THEN 'Moderate'
    WHEN r.aqi <= 150 THEN 'Unhealthy for Sensitive Groups'
    WHEN r.aqi <= 200 THEN 'Unhealthy'
    WHEN r.aqi <= 300 THEN 'Very Unhealthy'
    ELSE 'Hazardous'
  END as aqi_category,
  CASE 
    WHEN r.temperature < 0 THEN 'Freezing'
    WHEN r.temperature < 10 THEN 'Cold'
    WHEN r.temperature < 20 THEN 'Cool'
    WHEN r.temperature < 30 THEN 'Warm'
    ELSE 'Hot'
  END as temperature_category
FROM public.air_quality_readings r;

-- Grant select permission on the view
GRANT SELECT ON public.comprehensive_weather_readings TO authenticated;

-- Add RLS policy for the view
ALTER VIEW public.comprehensive_weather_readings SET (security_invoker = true);

-- Note: Views with security_invoker = true automatically inherit RLS policies from the underlying table
-- No need to create separate policies on the view itself

-- Update the existing data_source column to be more descriptive
UPDATE public.air_quality_readings 
SET data_source = CASE 
  WHEN data_source = 'OpenAQ API' THEN 'OpenAQ + Weather APIs'
  WHEN data_source = 'Legacy Data' THEN 'Legacy Data'
  ELSE 'Integrated Weather System'
END
WHERE data_source IS NOT NULL;

-- Note: Migration logging removed as migrations_log table may not exist
-- Migration completion is tracked by Supabase automatically
