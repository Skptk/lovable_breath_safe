-- Diagnostic query to check user deletion permissions
-- Run this in Supabase SQL Editor to verify all permissions are correct

-- 1. Check if service_role has DELETE permission on user_points
SELECT 
  'user_points DELETE permission' AS check_name,
  has_table_privilege('service_role', 'public.user_points', 'DELETE') AS has_permission;

-- 2. Check all policies on user_points
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_points'
ORDER BY policyname;

-- 3. Check table ownership
SELECT 
  'user_points table owner' AS check_name,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_points';

-- 4. Check if service_role has schema usage
SELECT 
  'service_role schema usage' AS check_name,
  has_schema_privilege('service_role', 'public', 'USAGE') AS has_permission;

-- 5. Check all GRANTs on user_points
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
  AND table_name = 'user_points'
  AND grantee = 'service_role';

-- 6. Test if we can see the policy is active
SELECT 
  'Policy check' AS check_name,
  COUNT(*) AS policy_count
FROM pg_policies 
WHERE tablename = 'user_points' 
  AND policyname = 'Service role can manage user points'
  AND 'service_role' = ANY(roles);

