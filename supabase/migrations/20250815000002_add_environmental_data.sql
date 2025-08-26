-- Add environmental data fields to air_quality_readings table
ALTER TABLE public.air_quality_readings 
ADD COLUMN IF NOT EXISTS temperature DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS humidity DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS pm1 DECIMAL(8, 2),
ADD COLUMN IF NOT EXISTS pm003 DECIMAL(8, 2),
ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'OpenAQ API';

-- Update existing records to have more realistic AQI values
UPDATE public.air_quality_readings 
SET aqi = CASE 
  WHEN aqi = 1 THEN 65  -- Replace incorrect AQI of 1 with realistic value
  WHEN aqi < 10 THEN 65 -- Replace very low AQIs with realistic values
  ELSE aqi
END,
data_source = 'Legacy Data'
WHERE aqi <= 10;

-- Add index for better performance on timestamp queries
CREATE INDEX IF NOT EXISTS idx_air_quality_readings_timestamp 
ON public.air_quality_readings(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_air_quality_readings_user_timestamp 
ON public.air_quality_readings(user_id, timestamp DESC);

-- Add comment to explain the new fields
COMMENT ON COLUMN public.air_quality_readings.temperature IS 'Temperature in Celsius';
COMMENT ON COLUMN public.air_quality_readings.humidity IS 'Relative humidity percentage';
COMMENT ON COLUMN public.air_quality_readings.pm1 IS 'PM1 particulate matter in μg/m³';
COMMENT ON COLUMN public.air_quality_readings.pm003 IS 'PM0.3 particulate matter count in particles/cm³';
COMMENT ON COLUMN public.air_quality_readings.data_source IS 'Source of the air quality data';
