-- Add DELETE policy for air_quality_readings table
CREATE POLICY "Users can delete their own readings" 
ON public.air_quality_readings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Ensure the timestamp field is properly set for new readings
ALTER TABLE public.air_quality_readings 
ALTER COLUMN timestamp SET DEFAULT now();

-- Add a trigger to ensure timestamp is always set
CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.timestamp = COALESCE(NEW.timestamp, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp setting
DROP TRIGGER IF EXISTS set_air_quality_readings_timestamp ON public.air_quality_readings;
CREATE TRIGGER set_air_quality_readings_timestamp
  BEFORE INSERT ON public.air_quality_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timestamp();

-- Add comment explaining the new policy
COMMENT ON POLICY "Users can delete their own readings" ON public.air_quality_readings 
IS 'Allows users to delete their own air quality readings';
