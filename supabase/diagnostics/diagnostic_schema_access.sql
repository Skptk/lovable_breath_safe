-- ========================================
-- DIAGNOSTIC SCRIPT: Schema Access & Permissions
-- ========================================
-- This script collects database metadata for assistant diagnostics
-- Run this script manually if Supabase assistant tools are blocked
-- by organization-level data-sharing settings.
--
-- Usage: Execute in Supabase SQL Editor or via CLI
-- ========================================

-- ========================================
-- 1. LIST ALL TABLES IN PUBLIC SCHEMA
-- ========================================
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;

-- ========================================
-- 2. LIST ALL INSTALLED EXTENSIONS
-- ========================================
SELECT 
    extname AS extension_name,
    extversion AS version,
    nspname AS schema_name
FROM pg_extension e
LEFT JOIN pg_namespace n ON e.extnamespace = n.oid
ORDER BY extname;

-- ========================================
-- 3. LIST ALL CUSTOM TYPES
-- ========================================
SELECT 
    typname AS type_name,
    typtype AS type_type,
    typcategory AS category
FROM pg_type
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND typtype IN ('e', 'c', 'd') -- enum, composite, domain
ORDER BY typname;

-- ========================================
-- 4. LIST ALL FUNCTIONS IN PUBLIC SCHEMA
-- ========================================
SELECT 
    routine_schema,
    routine_name,
    routine_type,
    data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ========================================
-- 5. LIST ALL RLS POLICIES
-- ========================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd AS command,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- 6. CHECK RLS STATUS FOR ALL TABLES
-- ========================================
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ========================================
-- 7. LIST ALL GRANTS ON PUBLIC SCHEMA
-- ========================================
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
ORDER BY table_name, grantee, privilege_type;

-- ========================================
-- 8. CHECK SERVICE_ROLE PERMISSIONS
-- ========================================
SELECT 
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE grantee = 'service_role'
AND table_schema = 'public'
ORDER BY table_name, privilege_type;

-- ========================================
-- 9. LIST ALL TRIGGERS
-- ========================================
SELECT 
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ========================================
-- 10. LIST ALL INDEXES
-- ========================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ========================================
-- 11. CHECK FOREIGN KEY CONSTRAINTS
-- ========================================
SELECT
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- ========================================
-- 12. SUMMARY: TABLE COUNT BY SCHEMA
-- ========================================
SELECT 
    table_schema,
    COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
GROUP BY table_schema
ORDER BY table_schema;

-- ========================================
-- 13. CHECK FOR MISSING DELETE POLICIES
-- ========================================
-- This identifies tables with CASCADE deletes that might be missing DELETE policies
SELECT 
    t.table_schema,
    t.table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies p 
            WHERE p.schemaname = t.table_schema 
            AND p.tablename = t.table_name 
            AND p.cmd = 'DELETE'
        ) THEN 'HAS DELETE POLICY'
        ELSE 'MISSING DELETE POLICY'
    END AS delete_policy_status
FROM information_schema.tables t
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
AND EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
    JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_schema = 'public'
    AND tc.table_name = t.table_name
    AND tc.constraint_type = 'FOREIGN KEY'
    AND rc.delete_rule = 'CASCADE'
)
ORDER BY t.table_name;

-- ========================================
-- 14. CHECK SCHEMA USAGE PERMISSIONS
-- ========================================
SELECT 
    nspname AS schema_name,
    nspowner::regrole AS owner,
    CASE 
        WHEN has_schema_privilege('service_role', nspname, 'USAGE') THEN 'YES'
        ELSE 'NO'
    END AS service_role_has_usage,
    CASE 
        WHEN has_schema_privilege('authenticated', nspname, 'USAGE') THEN 'YES'
        ELSE 'NO'
    END AS authenticated_has_usage
FROM pg_namespace
WHERE nspname = 'public';

-- ========================================
-- END OF DIAGNOSTIC SCRIPT
-- ========================================
-- Save the output of this script and provide it to the assistant
-- for schema analysis and permission diagnosis.
-- ========================================

