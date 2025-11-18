-- Fix DELETE permissions for user deletion cascade
-- This migration resolves the "permission denied for table user_points" error
-- when deleting users in Supabase, which occurs due to missing DELETE policies
-- Also adds preventive DELETE policies for other tables with CASCADE deletes

-- ========================================
-- 1. FIX user_points DELETE PERMISSIONS
-- ========================================

-- Add DELETE policy for users to delete their own points
DROP POLICY IF EXISTS "Users can delete their own points" ON public.user_points;
CREATE POLICY "Users can delete their own points" 
ON public.user_points 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add DELETE policy for service role to delete points during user deletion
-- This is necessary for CASCADE deletes when a user is deleted
-- During CASCADE deletes, auth context may not be set, so we use a more permissive check
-- Only service_role has access to this table, so USING (true) is safe
DROP POLICY IF EXISTS "Service role can delete user points" ON public.user_points;
DROP POLICY IF EXISTS "Service role can manage user points" ON public.user_points;
CREATE POLICY "Service role can manage user points" 
ON public.user_points 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Grant ALL permissions to service_role (consistent with other migrations)
GRANT ALL ON public.user_points TO service_role;

-- Also ensure authenticated users have DELETE permission for their own records
GRANT DELETE ON public.user_points TO authenticated;

-- ========================================
-- 2. FIX air_quality_readings DELETE PERMISSIONS (preventive)
-- ========================================

-- Add DELETE policy for service role (users already have one)
-- Using FOR ALL to handle CASCADE delete context
DROP POLICY IF EXISTS "Service role can delete readings" ON public.air_quality_readings;
DROP POLICY IF EXISTS "Service role can manage readings" ON public.air_quality_readings;
CREATE POLICY "Service role can manage readings" 
ON public.air_quality_readings 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Grant ALL permissions to service_role for air_quality_readings
GRANT ALL ON public.air_quality_readings TO service_role;

-- ========================================
-- 3. FIX profiles DELETE PERMISSIONS (preventive)
-- ========================================

-- Add DELETE policy for service role to delete profiles during user deletion
-- Using FOR ALL to handle CASCADE delete context
DROP POLICY IF EXISTS "Service role can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
CREATE POLICY "Service role can manage profiles" 
ON public.profiles 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Grant ALL permissions to service_role (consistent with other migrations)
GRANT ALL ON public.profiles TO service_role;

-- ========================================
-- 4. FIX user_streaks DELETE PERMISSIONS (preventive)
-- ========================================

-- Add DELETE policy for service role to delete streaks during user deletion
-- Using FOR ALL to handle CASCADE delete context
DROP POLICY IF EXISTS "Service role can delete user streaks" ON public.user_streaks;
DROP POLICY IF EXISTS "Service role can manage user streaks" ON public.user_streaks;
CREATE POLICY "Service role can manage user streaks" 
ON public.user_streaks 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Grant ALL permissions to service_role (consistent with other migrations)
GRANT ALL ON public.user_streaks TO service_role;

-- ========================================
-- 5. FIX user_settings DELETE PERMISSIONS (preventive)
-- ========================================

-- Add DELETE policy for service role to delete settings during user deletion
-- Note: user_settings cascades from profiles, but we add this for completeness
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
    DROP POLICY IF EXISTS "Service role can delete user settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Service role can manage user settings" ON public.user_settings;
    EXECUTE 'CREATE POLICY "Service role can manage user settings" 
             ON public.user_settings 
             FOR ALL 
             TO service_role
             USING (true)
             WITH CHECK (true)';
    
    GRANT ALL ON public.user_settings TO service_role;
  END IF;
END $$;

-- ========================================
-- 6. FIX withdrawal_requests DELETE PERMISSIONS (preventive)
-- ========================================

-- Check if withdrawal_requests table exists and add DELETE policy if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawal_requests') THEN
    DROP POLICY IF EXISTS "Service role can delete withdrawal requests" ON public.withdrawal_requests;
    DROP POLICY IF EXISTS "Service role can manage withdrawal requests" ON public.withdrawal_requests;
    EXECUTE 'CREATE POLICY "Service role can manage withdrawal requests" 
             ON public.withdrawal_requests 
             FOR ALL 
             TO service_role
             USING (true)
             WITH CHECK (true)';
    
    GRANT ALL ON public.withdrawal_requests TO service_role;
  END IF;
END $$;

-- ========================================
-- 7. VERIFY PERMISSIONS AND POLICIES
-- ========================================

-- Verify that GRANT permissions are correctly applied
DO $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  -- Check if service_role has DELETE permission on user_points
  SELECT has_table_privilege('service_role', 'public.user_points', 'DELETE') INTO v_has_permission;
  
  IF NOT v_has_permission THEN
    RAISE WARNING 'Service role does not have DELETE permission on user_points - attempting to grant again';
    GRANT ALL ON public.user_points TO service_role;
  END IF;
  
  RAISE LOG 'Verified service_role permissions on user_points';
END $$;

-- Ensure service_role has usage on the public schema
GRANT USAGE ON SCHEMA public TO service_role;

-- Log migration completion
DO $$
BEGIN
  RAISE LOG 'Migration 20251118100000_fix_user_points_delete_permissions completed successfully';
  RAISE LOG 'DELETE policies added for user_points and other tables with CASCADE deletes';
  RAISE LOG 'Service role can now delete related records during user deletion';
  RAISE LOG 'If deletion still fails, check: 1) All policies are applied, 2) GRANT statements executed, 3) No conflicting triggers';
END $$;

