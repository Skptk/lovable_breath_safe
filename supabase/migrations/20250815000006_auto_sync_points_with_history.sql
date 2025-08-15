-- Auto-sync user points with their actual air quality reading history
-- This ensures points are always accurate and consistent across all components

-- Create a function to automatically sync points with history
CREATE OR REPLACE FUNCTION public.sync_points_with_history()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_readings_count INTEGER;
  v_new_points INTEGER;
BEGIN
  -- Determine the user_id based on the operation
  IF TG_OP = 'INSERT' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  END IF;

  -- Count the user's air quality readings
  SELECT COUNT(*) INTO v_readings_count
  FROM public.air_quality_readings
  WHERE user_id = v_user_id;

  -- Calculate points based on readings (50 points per good AQI reading)
  -- For now, we'll use a simple calculation: 50 points per reading
  -- In the future, this could be more sophisticated based on AQI values
  v_new_points := v_readings_count * 50;

  -- Update the user's profile with the new points total
  UPDATE public.profiles
  SET total_points = v_new_points
  WHERE user_id = v_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync points when readings change
DROP TRIGGER IF EXISTS auto_sync_points ON public.air_quality_readings;
CREATE TRIGGER auto_sync_points
  AFTER INSERT OR DELETE ON public.air_quality_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_points_with_history();

-- Add comment explaining the trigger
COMMENT ON FUNCTION public.sync_points_with_history() 
IS 'Automatically syncs user points with their air quality reading history count';

COMMENT ON TRIGGER auto_sync_points ON public.air_quality_readings 
IS 'Automatically updates user points when air quality readings are added or removed';

-- Also create a function to manually sync all users' points (useful for data migration)
CREATE OR REPLACE FUNCTION public.sync_all_user_points()
RETURNS void AS $$
DECLARE
  v_user_record RECORD;
BEGIN
  FOR v_user_record IN 
    SELECT DISTINCT user_id FROM public.air_quality_readings
  LOOP
    -- Call the sync function for each user
    PERFORM public.sync_points_with_history();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION public.sync_all_user_points() TO service_role;

-- Add comment for the manual sync function
COMMENT ON FUNCTION public.sync_all_user_points() 
IS 'Manually syncs all users points with their current history count (useful for data migration)';
