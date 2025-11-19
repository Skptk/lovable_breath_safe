-- Migration to optimize database performance with missing indexes
-- Created: 2025-11-20

-- 1. Ensure Foreign Keys are Indexed (Postgres does not do this automatically)

-- Index for air_quality_readings.user_id
-- Note: There is a composite index (user_id, timestamp), but a single index is often faster for simple joins
CREATE INDEX IF NOT EXISTS idx_air_quality_readings_user_id_standalone 
ON public.air_quality_readings(user_id);

-- Index for user_points.user_id (if not already fully covered by efficient composite)
CREATE INDEX IF NOT EXISTS idx_user_points_user_id_standalone 
ON public.user_points(user_id);

-- Index for notifications.user_id
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_standalone 
ON public.notifications(user_id);

-- Index for user_settings.user_id
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id_standalone 
ON public.user_settings(user_id);

-- Index for user_achievements.user_id
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id_standalone 
ON public.user_achievements(user_id);

-- 2. Optimize Lookups on Common Columns

-- Index for air_quality_readings.created_at (often used for cleanup or recent checks)
CREATE INDEX IF NOT EXISTS idx_air_quality_readings_created_at 
ON public.air_quality_readings(created_at DESC);

-- Index for notifications.read (boolean) - useful for "unread count"
CREATE INDEX IF NOT EXISTS idx_notifications_read_status 
ON public.notifications(read) 
WHERE read = false; -- Partial index is smaller and faster for "count unread"

-- 3. Vacuum Analyze (to be run manually or via cron, included here for reference)
-- ANALYZE public.air_quality_readings;
-- ANALYZE public.user_points;
-- ANALYZE public.notifications;

