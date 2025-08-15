-- Create a function to sync user points with their air quality reading history
CREATE OR REPLACE FUNCTION public.sync_user_points_with_history()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a DELETE operation and no more readings exist for the user
  IF TG_OP = 'DELETE' THEN
    -- Check if user has any remaining readings
    IF NOT EXISTS (
      SELECT 1 FROM public.air_quality_readings 
      WHERE user_id = OLD.user_id
    ) THEN
      -- Reset user points to 0 since they have no history
      UPDATE public.profiles 
      SET total_points = 0 
      WHERE user_id = OLD.user_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync points when readings are deleted
DROP TRIGGER IF EXISTS sync_points_on_reading_delete ON public.air_quality_readings;
CREATE TRIGGER sync_points_on_reading_delete
  AFTER DELETE ON public.air_quality_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_points_with_history();

-- Add comment explaining the trigger
COMMENT ON FUNCTION public.sync_user_points_with_history() 
IS 'Automatically syncs user points with their air quality reading history';
