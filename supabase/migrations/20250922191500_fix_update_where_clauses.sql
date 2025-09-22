-- Fix UPDATE statements that are missing WHERE clauses in points synchronization functions
-- This fixes the "UPDATE requires a WHERE clause" error when inserting air_quality_readings

-- Fix sync_points_with_history function
CREATE OR REPLACE FUNCTION public.sync_points_with_history()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the user_id from the trigger operation
  IF TG_OP = 'INSERT' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  END IF;

  -- Update only the specific user's points
  UPDATE public.user_points
  SET total_points = (
    SELECT COALESCE(SUM(points_awarded), 0)
    FROM public.air_quality_readings
    WHERE user_id = v_user_id
  )
  WHERE user_id = v_user_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix sync_all_user_points function
CREATE OR REPLACE FUNCTION public.sync_all_user_points()
RETURNS VOID AS $$
BEGIN
  -- Update each user's points individually
  UPDATE public.user_points
  SET total_points = (
    SELECT COALESCE(SUM(points_awarded), 0)
    FROM public.air_quality_readings
    WHERE air_quality_readings.user_id = user_points.user_id
  )
  WHERE EXISTS (
    SELECT 1 FROM public.air_quality_readings 
    WHERE air_quality_readings.user_id = user_points.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix update_user_points_on_reading_change function
CREATE OR REPLACE FUNCTION public.update_user_points_on_reading_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the user_id from the trigger operation
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);

  -- Update only the specific user's points
  UPDATE public.user_points
  SET total_points = (
    SELECT COALESCE(SUM(points_awarded), 0)
    FROM public.air_quality_readings
    WHERE user_id = v_user_id
  )
  WHERE user_id = v_user_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix sync_profile_points function
CREATE OR REPLACE FUNCTION public.sync_profile_points(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update only the specified user's points
  UPDATE public.user_points
  SET total_points = (
    SELECT COALESCE(SUM(points_awarded), 0)
    FROM public.air_quality_readings
    WHERE user_id = p_user_id
  )
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix sync_points_on_reading_delete function
CREATE OR REPLACE FUNCTION public.sync_points_on_reading_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Update only the deleted reading's user's points
  UPDATE public.user_points
  SET total_points = (
    SELECT COALESCE(SUM(points_awarded), 0)
    FROM public.air_quality_readings
    WHERE user_id = OLD.user_id
  )
  WHERE user_id = OLD.user_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix reset_inflated_points function
CREATE OR REPLACE FUNCTION public.reset_inflated_points()
RETURNS VOID AS $$
BEGIN
  -- Update each user's points individually
  UPDATE public.user_points
  SET total_points = (
    SELECT COALESCE(SUM(points_awarded), 0)
    FROM public.air_quality_readings
    WHERE air_quality_readings.user_id = user_points.user_id
  )
  WHERE EXISTS (
    SELECT 1 FROM public.air_quality_readings 
    WHERE air_quality_readings.user_id = user_points.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
