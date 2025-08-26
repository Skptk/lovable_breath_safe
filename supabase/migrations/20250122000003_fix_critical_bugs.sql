-- Fix Critical Bugs: Delete History, Points Inflation, and Data Tracking
-- This migration resolves the three major issues identified in the system

-- ========================================
-- 1. FIX DELETE FUNCTIONALITY
-- ========================================

-- First, remove conflicting triggers that interfere with delete operations
DROP TRIGGER IF EXISTS auto_sync_points ON public.air_quality_readings;
DROP TRIGGER IF EXISTS sync_points_on_reading_delete ON public.air_quality_readings;

-- Remove the problematic function that was causing points inflation
DROP FUNCTION IF EXISTS public.sync_points_with_history();

-- Ensure the DELETE policy is properly configured
DROP POLICY IF EXISTS "Users can delete their own readings" ON public.air_quality_readings;
CREATE POLICY "Users can delete their own readings" 
ON public.air_quality_readings 
FOR DELETE 
USING (auth.uid() = user_id);

-- ========================================
-- 2. FIX POINTS INFLATION
-- ========================================

-- Remove the problematic auto-sync function that was awarding 50 points per reading
DROP FUNCTION IF EXISTS public.auto_sync_points_with_history();

-- Fix the main points awarding function to use proper point values
CREATE OR REPLACE FUNCTION public.award_points_for_reading()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_aqi INTEGER;
  v_location_name TEXT;
  v_points_earned INTEGER;
  v_current_total INTEGER;
BEGIN
  v_user_id := NEW.user_id;
  v_aqi := NEW.aqi;
  v_location_name := NEW.location_name;
  
  -- Calculate points based on AQI reading (REASONABLE VALUES)
  IF v_aqi <= 50 THEN
    v_points_earned := 20; -- Good air quality bonus
  ELSIF v_aqi <= 100 THEN
    v_points_earned := 15; -- Moderate air quality
  ELSIF v_aqi <= 150 THEN
    v_points_earned := 10; -- Unhealthy for sensitive groups
  ELSE
    v_points_earned := 5; -- Still earn points for checking
  END IF;
  
  -- Insert into user_points table
  INSERT INTO public.user_points (user_id, points_earned, aqi_value, location_name, timestamp)
  VALUES (v_user_id, v_points_earned, v_aqi, v_location_name, NEW.timestamp);
  
  -- Get current total points from profile
  SELECT total_points INTO v_current_total 
  FROM public.profiles 
  WHERE user_id = v_user_id;
  
  -- Update profile with new total
  UPDATE public.profiles 
  SET total_points = COALESCE(v_current_total, 0) + v_points_earned,
      updated_at = now()
  WHERE user_id = v_user_id;
  
  -- Log the points award for debugging
  RAISE LOG 'Awarded % points to user % for AQI reading %', v_points_earned, v_user_id, v_aqi;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for points awarding (ONLY on INSERT)
DROP TRIGGER IF EXISTS award_points_for_reading ON public.air_quality_readings;
CREATE TRIGGER award_points_for_reading
  AFTER INSERT ON public.air_quality_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_for_reading();

-- ========================================
-- 3. FIX DATA TRACKING AND POINTS SYNC
-- ========================================

-- Create a proper function to sync points when readings are deleted
CREATE OR REPLACE FUNCTION public.sync_points_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_points_to_remove INTEGER;
  v_current_total INTEGER;
BEGIN
  v_user_id := OLD.user_id;
  
  -- Calculate points that need to be removed based on the deleted reading
  IF OLD.aqi <= 50 THEN
    v_points_to_remove := 20;
  ELSIF OLD.aqi <= 100 THEN
    v_points_to_remove := 15;
  ELSIF OLD.aqi <= 150 THEN
    v_points_to_remove := 10;
  ELSE
    v_points_to_remove := 5;
  END IF;
  
  -- Get current total points from profile
  SELECT total_points INTO v_current_total 
  FROM public.profiles 
  WHERE user_id = v_user_id;
  
  -- Update profile by removing the points for this reading
  UPDATE public.profiles 
  SET total_points = GREATEST(0, COALESCE(v_current_total, 0) - v_points_to_remove),
      updated_at = now()
  WHERE user_id = v_user_id;
  
  -- Also remove the corresponding points record from user_points
  DELETE FROM public.user_points 
  WHERE user_id = v_user_id 
    AND aqi_value = OLD.aqi 
    AND location_name = OLD.location_name
    AND timestamp = OLD.timestamp
    AND created_at >= OLD.created_at - INTERVAL '1 minute'
    AND created_at <= OLD.created_at + INTERVAL '1 minute';
  
  -- Log the points removal for debugging
  RAISE LOG 'Removed % points from user % for deleted AQI reading %', v_points_to_remove, v_user_id, OLD.aqi;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for points sync on DELETE
CREATE TRIGGER sync_points_on_delete
  AFTER DELETE ON public.air_quality_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_points_on_delete();

-- ========================================
-- 4. ADD POINTS VALIDATION AND CAPS
-- ========================================

-- Create a function to validate and cap user points
CREATE OR REPLACE FUNCTION public.validate_user_points()
RETURNS TRIGGER AS $$
DECLARE
  v_max_reasonable_points INTEGER := 10000; -- Cap at 10,000 points
BEGIN
  -- Cap points at reasonable maximum
  IF NEW.total_points > v_max_reasonable_points THEN
    NEW.total_points := v_max_reasonable_points;
    RAISE LOG 'Capped user % points at maximum reasonable value %', NEW.user_id, v_max_reasonable_points;
  END IF;
  
  -- Ensure points are never negative
  IF NEW.total_points < 0 THEN
    NEW.total_points := 0;
    RAISE LOG 'Reset negative points for user % to 0', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to validate points before update
DROP TRIGGER IF EXISTS validate_points ON public.profiles;
CREATE TRIGGER validate_points
  BEFORE UPDATE OF total_points ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_points();

-- ========================================
-- 5. CLEAN UP EXISTING INFLATED POINTS
-- ========================================

-- Function to reset inflated points for all users
CREATE OR REPLACE FUNCTION public.reset_inflated_points()
RETURNS void AS $$
DECLARE
  v_user_record RECORD;
  v_calculated_points INTEGER;
BEGIN
  -- Loop through all users and recalculate their points based on actual readings
  FOR v_user_record IN 
    SELECT DISTINCT user_id FROM public.air_quality_readings
  LOOP
    -- Calculate points based on actual readings (not inflated)
    SELECT COALESCE(SUM(
      CASE 
        WHEN aqi <= 50 THEN 20
        WHEN aqi <= 100 THEN 15
        WHEN aqi <= 150 THEN 10
        ELSE 5
      END
    ), 0) INTO v_calculated_points
    FROM public.air_quality_readings
    WHERE user_id = v_user_record.user_id;
    
    -- Update profile with correct points
    UPDATE public.profiles
    SET total_points = v_calculated_points,
        updated_at = now()
    WHERE user_id = v_user_record.user_id;
    
    RAISE LOG 'Reset points for user %: % points based on % readings', 
      v_user_record.user_id, v_calculated_points, 
      (SELECT COUNT(*) FROM public.air_quality_readings WHERE user_id = v_user_record.user_id);
  END LOOP;
  
  RAISE LOG 'Completed reset of inflated points for all users';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. GRANT PERMISSIONS
-- ========================================

-- Grant execute permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.award_points_for_reading() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_points_on_delete() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_user_points() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_inflated_points() TO service_role;

-- ========================================
-- 7. ADD COMMENTS AND DOCUMENTATION
-- ========================================

COMMENT ON FUNCTION public.award_points_for_reading() 
IS 'Awards reasonable points (5-20) based on AQI reading quality';

COMMENT ON FUNCTION public.sync_points_on_delete() 
IS 'Removes points when air quality readings are deleted';

COMMENT ON FUNCTION public.validate_user_points() 
IS 'Validates and caps user points at reasonable maximum (10,000)';

COMMENT ON FUNCTION public.reset_inflated_points() 
IS 'Resets all user points to reasonable values based on actual readings';

COMMENT ON TRIGGER award_points_for_reading ON public.air_quality_readings 
IS 'Awards points when new readings are added';

COMMENT ON TRIGGER sync_points_on_delete ON public.air_quality_readings 
IS 'Syncs points when readings are deleted';

COMMENT ON TRIGGER validate_points ON public.profiles 
IS 'Validates and caps points before profile update';

-- ========================================
-- 8. VERIFICATION QUERIES
-- ========================================

-- Add a comment with verification queries for testing
COMMENT ON SCHEMA public IS '

VERIFICATION QUERIES:

-- Check current points distribution
SELECT 
  total_points,
  COUNT(*) as user_count
FROM public.profiles 
GROUP BY total_points 
ORDER BY total_points DESC;

-- Check for users with extremely high points
SELECT 
  user_id, 
  total_points,
  (SELECT COUNT(*) FROM public.air_quality_readings WHERE user_id = p.user_id) as readings_count
FROM public.profiles p 
WHERE total_points > 10000
ORDER BY total_points DESC;

-- Verify points calculation
SELECT 
  p.user_id,
  p.total_points as profile_points,
  COALESCE(SUM(up.points_earned), 0) as calculated_points,
  COUNT(ar.id) as readings_count
FROM public.profiles p
LEFT JOIN public.user_points up ON p.user_id = up.user_id
LEFT JOIN public.air_quality_readings ar ON p.user_id = ar.user_id
GROUP BY p.user_id, p.total_points
HAVING p.total_points != COALESCE(SUM(up.points_earned), 0)
ORDER BY p.total_points DESC;

';
