-- Check current achievement state for affected users

-- Create a view to see the current state of user achievements
CREATE OR REPLACE VIEW v_user_achievement_state AS
SELECT 
    u.email,
    u.id as user_id,
    COUNT(ua.achievement_id) as total_achievements,
    COUNT(ua.achievement_id) FILTER (WHERE ua.unlocked = true) as unlocked_count,
    COUNT(ua.achievement_id) FILTER (WHERE ua.unlocked = false) as locked_count,
    MAX(ua.earned_at) as last_achievement_earned
FROM 
    auth.users u
LEFT JOIN 
    public.user_achievements ua ON u.id = ua.user_id
WHERE 
    u.id IN ('4d1fc184-0fc2-4ac3-a41f-3ad493d88d1f', 'b03810fc-ee86-4b4a-9d5e-7724b1d8ca45')
    OR ua.earned_at > '2025-09-20'  -- Recent achievements
GROUP BY 
    u.id, u.email;

-- Grant permissions
GRANT SELECT ON v_user_achievement_state TO authenticated;
