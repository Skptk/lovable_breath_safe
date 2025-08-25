-- Fix notifications table RLS policies to allow real-time access
-- This resolves WebSocket error 1011 (server endpoint going away)

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can manage all notifications" ON public.notifications;

-- Create new policies that allow real-time access
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notifications" ON public.notifications
  FOR ALL USING (auth.role() = 'service_role');

-- Enable real-time for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Grant real-time permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;

-- Ensure proper permissions for real-time subscriptions
GRANT EXECUTE ON FUNCTION public.create_aqi_alert(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_achievement_notification(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_points_notification(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_streak_notification(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_welcome_notification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_notification_preferences(UUID) TO authenticated;

-- Add comment explaining the fix
COMMENT ON TABLE public.notifications IS 'User notifications for various app events - Fixed RLS policies for real-time access';
