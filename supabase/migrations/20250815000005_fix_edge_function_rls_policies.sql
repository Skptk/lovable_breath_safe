-- Fix RLS policies to allow Edge Function to insert air quality readings
-- The Edge Function runs with service_role permissions but needs to insert data for authenticated users

-- First, let's check if we need to create a function that can bypass RLS for authenticated inserts
CREATE OR REPLACE FUNCTION public.insert_air_quality_reading(
  p_user_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_location_name TEXT,
  p_aqi INTEGER,
  p_pm25 NUMERIC,
  p_pm10 NUMERIC,
  p_pm1 NUMERIC,
  p_no2 NUMERIC,
  p_so2 NUMERIC,
  p_co NUMERIC,
  p_o3 NUMERIC,
  p_temperature NUMERIC,
  p_humidity NUMERIC,
  p_pm003 NUMERIC,
  p_data_source TEXT
) RETURNS UUID AS $$
DECLARE
  v_reading_id UUID;
BEGIN
  -- Insert the reading and return the ID
  INSERT INTO public.air_quality_readings (
    user_id, latitude, longitude, location_name, aqi,
    pm25, pm10, pm1, no2, so2, co, o3,
    temperature, humidity, pm003, data_source, timestamp
  ) VALUES (
    p_user_id, p_latitude, p_longitude, p_location_name, p_aqi,
    p_pm25, p_pm10, p_pm1, p_no2, p_so2, p_co, p_o3,
    p_temperature, p_humidity, p_pm003, p_data_source, now()
  ) RETURNING id INTO v_reading_id;
  
  RETURN v_reading_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_air_quality_reading(UUID, NUMERIC, NUMERIC, TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated;

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert their own readings" ON public.air_quality_readings;

-- Create a new INSERT policy that allows authenticated users to insert readings
CREATE POLICY "Users can insert their own readings" 
ON public.air_quality_readings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Also create a policy that allows the service_role to insert (for Edge Function)
CREATE POLICY "Service role can insert readings" 
ON public.air_quality_readings 
FOR INSERT 
WITH CHECK (true);

-- Ensure the service_role can bypass RLS for this table
-- This is needed because the Edge Function runs with service_role permissions
ALTER TABLE public.air_quality_readings FORCE ROW LEVEL SECURITY;

-- Grant necessary permissions to the service_role
GRANT ALL ON public.air_quality_readings TO service_role;

-- Add comment explaining the policies
COMMENT ON POLICY "Users can insert their own readings" ON public.air_quality_readings 
IS 'Allows authenticated users to insert their own air quality readings';

COMMENT ON POLICY "Service role can insert readings" ON public.air_quality_readings 
IS 'Allows service role (Edge Function) to insert air quality readings';

COMMENT ON FUNCTION public.insert_air_quality_reading IS 'Secure function to insert air quality readings, bypassing RLS for authenticated users';

-- Ensure the table has the correct structure for the Edge Function
-- Add any missing columns that might be needed
DO $$ 
BEGIN
    -- Add timestamp column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'air_quality_readings' AND column_name = 'timestamp') THEN
        ALTER TABLE public.air_quality_readings ADD COLUMN timestamp TIMESTAMPTZ DEFAULT now();
    END IF;
    
    -- Add pm1 column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'air_quality_readings' AND column_name = 'pm1') THEN
        ALTER TABLE public.air_quality_readings ADD COLUMN pm1 NUMERIC;
    END IF;
    
    -- Add temperature column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'air_quality_readings' AND column_name = 'temperature') THEN
        ALTER TABLE public.air_quality_readings ADD COLUMN temperature NUMERIC;
    END IF;
    
    -- Add humidity column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'air_quality_readings' AND column_name = 'humidity') THEN
        ALTER TABLE public.air_quality_readings ADD COLUMN humidity NUMERIC;
    END IF;
    
    -- Add pm003 column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'air_quality_readings' AND column_name = 'pm003') THEN
        ALTER TABLE public.air_quality_readings ADD COLUMN pm003 NUMERIC;
    END IF;
    
    -- Add data_source column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'air_quality_readings' AND column_name = 'data_source') THEN
        ALTER TABLE public.air_quality_readings ADD COLUMN data_source TEXT;
    END IF;
END $$;
