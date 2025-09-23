-- Cleanup and reset incorrectly awarded achievements
-- This migration will:
-- 1. Identify users with incorrectly awarded achievements
-- 2. Remove those achievements
-- 3. Re-evaluate achievements based on actual user activity

BEGIN;

-- Create a temporary table to track cleanup operations
CREATE TEMP TABLE IF NOT EXISTS achievement_cleanup_log (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    action TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to safely remove achievements and log the action
CREATE OR REPLACE FUNCTION safe_remove_achievements()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    achievement_count INTEGER;
    users_processed INTEGER := 0;
    achievements_removed INTEGER := 0;
    achievements_reevaluated INTEGER := 0;
    cleanup_start_time TIMESTAMPTZ := NOW();
    bug_start_time TIMESTAMPTZ := '2025-08-15 00:00:00+00'::timestamptz; -- When the bug was introduced
    bug_end_time TIMESTAMPTZ := '2025-09-23 09:08:00+00'::timestamptz; -- When the bug was fixed
BEGIN
    RAISE NOTICE 'Starting achievement cleanup at %', cleanup_start_time;
    
    -- First, log all users who will be processed
    INSERT INTO achievement_cleanup_log (user_id, action, details)
    SELECT DISTINCT user_id, 'user_identified_for_cleanup', 
           jsonb_build_object('achievement_count', COUNT(*), 
                             'first_achievement', MIN(earned_at), 
                             'last_achievement', MAX(earned_at))
    FROM public.user_achievements
    WHERE earned_at BETWEEN bug_start_time AND bug_end_time
    GROUP BY user_id;
    
    -- Process each user who received achievements during the bug period
    FOR user_record IN 
        SELECT DISTINCT user_id 
        FROM public.user_achievements 
        WHERE earned_at BETWEEN bug_start_time AND bug_end_time
        AND user_id IN (
            '4d1fc184-0fc2-4ac3-a41f-3ad493d88d1f',  -- nairobistonks@gmail.com
            'b03810fc-ee86-4b4a-9d5e-7724b1d8ca45'   -- rawhonchogg@gmail.com
        )
    LOOP
        users_processed := users_processed + 1;
        
        -- Log user's current state before cleanup
        SELECT COUNT(*) INTO achievement_count 
        FROM public.user_achievements 
        WHERE user_id = user_record.user_id;
        
        -- Log the before state
        INSERT INTO achievement_cleanup_log (user_id, action, details)
        VALUES (user_record.user_id, 'before_cleanup', 
               jsonb_build_object('total_achievements', achievement_count));
        
        -- Remove all achievements for this user that were awarded during the bug period
        WITH deleted AS (
            DELETE FROM public.user_achievements
            WHERE user_id = user_record.user_id
            AND earned_at BETWEEN bug_start_time AND bug_end_time
            RETURNING achievement_id
        )
        SELECT COUNT(*) INTO achievement_count FROM deleted;
        
        achievements_removed := achievements_removed + achievement_count;
        
        -- Log the removal
        INSERT INTO achievement_cleanup_log (user_id, action, details)
        VALUES (user_record.user_id, 'achievements_removed', 
               jsonb_build_object('count', achievement_count));
        
        -- Check if user has any activity that might have earned achievements
        IF EXISTS (
            SELECT 1 FROM public.air_quality_readings 
            WHERE user_id = user_record.user_id
            LIMIT 1
        ) THEN
            -- User has activity, re-evaluate achievements
            PERFORM public.check_achievements(user_record.user_id);
            achievements_reevaluated := achievements_reevaluated + 1;
            
            -- Log the re-evaluation
            SELECT COUNT(*) INTO achievement_count 
            FROM public.user_achievements 
            WHERE user_id = user_record.user_id AND unlocked = true;
            
            INSERT INTO achievement_cleanup_log (user_id, action, details)
            VALUES (user_record.user_id, 'achievements_reevaluated', 
                   jsonb_build_object('new_achievement_count', achievement_count));
        END IF;
        
        -- Log the after state
        SELECT COUNT(*) INTO achievement_count 
        FROM public.user_achievements 
        WHERE user_id = user_record.user_id;
        
        INSERT INTO achievement_cleanup_log (user_id, action, details)
        VALUES (user_record.user_id, 'after_cleanup', 
               jsonb_build_object('total_achievements', achievement_count));
    END LOOP;
    
    -- Log summary
    INSERT INTO achievement_cleanup_log (action, details)
    VALUES ('cleanup_complete', 
           jsonb_build_object(
               'users_processed', users_processed,
               'achievements_removed', achievements_removed,
               'achievements_reevaluated', achievements_reevaluated,
               'execution_time_seconds', EXTRACT(EPOCH FROM (NOW() - cleanup_start_time))
           ));
    
    RAISE NOTICE 'Achievement cleanup completed. Processed % users, removed % achievements, re-evaluated % users.',
                 users_processed, achievements_removed, achievements_reevaluated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the cleanup function
SELECT safe_remove_achievements();

-- Clean up: Drop the temporary function but keep the log table for reference
DROP FUNCTION IF EXISTS safe_remove_achievements();

-- Create a view to check the cleanup results
CREATE OR REPLACE VIEW v_achievement_cleanup_summary AS
WITH user_summary AS (
    SELECT 
        user_id,
        COUNT(CASE WHEN action = 'before_cleanup' THEN 1 END) as before_count,
        COUNT(CASE WHEN action = 'after_cleanup' THEN 1 END) as after_count,
        MAX(created_at) as last_updated
    FROM achievement_cleanup_log
    WHERE user_id IS NOT NULL
    GROUP BY user_id
)
SELECT 
    u.email,
    s.user_id,
    s.before_count,
    s.after_count,
    s.before_count - COALESCE(s.after_count, 0) as achievements_removed,
    s.last_updated
FROM user_summary s
JOIN auth.users u ON s.user_id = u.id
ORDER BY achievements_removed DESC;

-- Add a comment to the schema_migrations table
COMMENT ON VIEW v_achievement_cleanup_summary IS 'Shows summary of achievement cleanup operations, including before/after counts and users affected';

-- Update the version table for migration tracking if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') THEN
    INSERT INTO public.schema_migrations (version, description)
    VALUES ('20250923110000', 'Cleanup of incorrectly awarded achievements')
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;

COMMIT;

-- Grant read access to authenticated users
GRANT SELECT ON achievement_cleanup_log TO authenticated;
GRANT SELECT ON v_achievement_cleanup_summary TO authenticated;

-- Notify that the cleanup is complete
DO $$
BEGIN
    RAISE NOTICE 'Achievement cleanup migration completed successfully.';
    RAISE NOTICE 'View the cleanup results with: SELECT * FROM v_achievement_cleanup_summary;';
    RAISE NOTICE 'For detailed logs: SELECT * FROM achievement_cleanup_log ORDER BY created_at;';
END $$;
