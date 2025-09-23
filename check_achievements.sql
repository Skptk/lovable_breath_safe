-- Check if the achievement_cleanup_log table exists
SELECT 
    'achievement_cleanup_log' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables 
                     WHERE table_name = 'achievement_cleanup_log') 
         THEN 'EXISTS' 
         ELSE 'DOES NOT EXIST' 
    END as status;

-- Check the affected users' achievements
SELECT 
    u.email,
    u.id as user_id,
    COUNT(ua.achievement_id) as total_achievements,
    COUNT(ua.achievement_id) FILTER (WHERE ua.unlocked = true) as unlocked_count,
    COUNT(ua.achievement_id) FILTER (WHERE ua.unlocked = false) as locked_count
FROM 
    auth.users u
LEFT JOIN 
    public.user_achievements ua ON u.id = ua.user_id
WHERE 
    u.id IN ('4d1fc184-0fc2-4ac3-a41f-3ad493d88d1f', 'b03810fc-ee86-4b4a-9d5e-7724b1d8ca45')
GROUP BY 
    u.id, u.email;

-- Check recent migrations
SELECT version, description, installed_on 
FROM public.schema_migrations 
ORDER BY version DESC 
LIMIT 10;

-- Check if the cleanup function exists
SELECT 
    routine_name,
    routine_type
FROM 
    information_schema.routines 
WHERE 
    routine_name LIKE '%cleanup%' 
    OR routine_name LIKE '%achievement%';

-- Check if the view exists
SELECT 
    table_name,
    table_type
FROM 
    information_schema.views 
WHERE 
    table_name LIKE '%achievement%' 
    OR table_name LIKE '%cleanup%';
