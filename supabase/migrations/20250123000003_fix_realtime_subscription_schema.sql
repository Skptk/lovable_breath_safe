-- Fix real-time subscription schema issues
-- This migration ensures all real-time subscriptions reference correct tables and columns

-- Verify and fix user_points table structure
DO $$
BEGIN
  -- Check if user_points table exists and has correct structure
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points') THEN
    RAISE EXCEPTION 'user_points table does not exist';
  END IF;
  
  -- Check if required columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_points' AND column_name = 'user_id') THEN
    RAISE EXCEPTION 'user_points table missing user_id column';
  END IF;
  
  RAISE LOG 'user_points table structure verified successfully';
END $$;

-- Verify and fix notifications table structure
DO $$
BEGIN
  -- Check if notifications table exists and has correct structure
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    RAISE EXCEPTION 'notifications table does not exist';
  END IF;
  
  -- Check if required columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
    RAISE EXCEPTION 'notifications table missing user_id column';
  END IF;
  
  RAISE LOG 'notifications table structure verified successfully';
END $$;

-- Verify and fix profiles table structure
DO $$
BEGIN
  -- Check if profiles table exists and has correct structure
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    RAISE EXCEPTION 'profiles table does not exist';
  END IF;
  
  -- Check if required columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id') THEN
    RAISE EXCEPTION 'profiles table missing user_id column';
  END IF;
  
  RAISE LOG 'profiles table structure verified successfully';
END $$;

-- Ensure proper RLS policies for real-time subscriptions
-- Update user_points RLS policy to ensure proper access for real-time subscriptions
DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
CREATE POLICY "Users can view their own points" ON public.user_points
  FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own points" ON public.user_points;
CREATE POLICY "Users can insert their own points" ON public.user_points
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Update notifications RLS policy to ensure proper access for real-time subscriptions
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Update profiles RLS policy to ensure proper access for real-time subscriptions
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Ensure proper indexes for real-time subscription performance
CREATE INDEX IF NOT EXISTS idx_user_points_user_id_realtime ON public.user_points(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_realtime ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_realtime ON public.profiles(user_id, updated_at DESC);

-- Grant proper permissions for real-time subscriptions
GRANT SELECT, INSERT ON public.user_points TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- Log migration completion
DO $$
BEGIN
  RAISE LOG 'Migration 20250123000003_fix_realtime_subscription_schema completed successfully';
  RAISE LOG 'Real-time subscription schema issues resolved';
  RAISE LOG 'RLS policies updated for proper access control';
  RAISE LOG 'Performance indexes created for real-time subscriptions';
END $$;
