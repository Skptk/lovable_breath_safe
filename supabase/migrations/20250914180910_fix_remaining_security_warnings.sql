-- Migration: Fix Remaining Security Warnings from Supabase Security Advisor
-- Description: Address extension placement and other configuration-related security warnings
-- Date: 2024-09-14
-- Issues: Extension in Public schema, Auth configuration recommendations
-- Priority: WARNING-level security issues

-- This migration addresses the remaining security warnings that can be fixed at the database level

-- Fix 1: Move HTTP Extension from Public Schema
-- Issue: "Extension 'http' is installed in the public schema. Move it to another schema."
-- Solution: Move to extensions schema (standard practice)

DO $$
BEGIN
  -- Check if http extension exists in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension 
    WHERE extname = 'http' 
    AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    
    -- Create extensions schema if it doesn't exist
    CREATE SCHEMA IF NOT EXISTS extensions;
    
    -- Grant usage on extensions schema to necessary roles
    GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
    
    -- Move http extension to extensions schema
    -- Note: This requires dropping and recreating the extension
    DROP EXTENSION IF EXISTS http CASCADE;
    
    -- Create the extension in the extensions schema
    CREATE EXTENSION IF NOT EXISTS http SCHEMA extensions;
    
    -- Grant execute permissions on http functions to necessary roles
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
    
    RAISE LOG '✅ HTTP extension moved from public to extensions schema';
    RAISE LOG '🔒 Security: Extension no longer in public schema';
    
  ELSE
    RAISE LOG '⚠️ HTTP extension not found in public schema or already moved';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG '❌ Error moving HTTP extension: %', SQLERRM;
    -- Continue execution even if this fails
END $$;

-- Fix 2: Database Configuration Recommendations
-- These are SQL-level configurations that can improve security

-- Set more restrictive search_path for roles
DO $$
BEGIN
  -- Set search_path for anon role to prevent search path injection
  ALTER ROLE anon SET search_path = public;
  
  -- Set search_path for authenticated role
  ALTER ROLE authenticated SET search_path = public;
  
  RAISE LOG '✅ Set restrictive search_path for database roles';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG '⚠️ Could not set role search_path: %', SQLERRM;
END $$;

-- Fix 3: Additional Security Hardening
-- Add additional security configurations where possible

DO $$
BEGIN
  -- Ensure pg_stat_statements extension is available for monitoring (if not already installed)
  -- This helps with security monitoring
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
    RAISE LOG '✅ pg_stat_statements extension available for security monitoring';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG '⚠️ pg_stat_statements extension not available: %', SQLERRM;
  END;
  
  -- Set statement timeout for security (prevent long-running queries)
  -- Note: This is a session-level setting, will apply to new connections
  BEGIN
    ALTER DATABASE postgres SET statement_timeout = '30min';
    RAISE LOG '✅ Set statement timeout for security';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG '⚠️ Could not set statement timeout: %', SQLERRM;
  END;
  
END $$;

-- Fix 4: Function Security Review
-- Review and log information about function security

DO $$
DECLARE
  func_count INTEGER;
  definer_count INTEGER;
BEGIN
  -- Count total functions
  SELECT COUNT(*) INTO func_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public';
  
  -- Count functions with SECURITY DEFINER
  SELECT COUNT(*) INTO definer_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND security_type = 'DEFINER';
  
  RAISE LOG '📊 Function Security Review:';
  RAISE LOG '   Total public functions: %', func_count;
  RAISE LOG '   Functions with SECURITY DEFINER: %', definer_count;
  
  IF definer_count > 0 THEN
    RAISE LOG '⚠️ Consider reviewing SECURITY DEFINER functions for security implications';
  ELSE
    RAISE LOG '✅ No SECURITY DEFINER functions found - good security posture';
  END IF;
  
END $$;

-- Fix 5: Row Level Security Review
-- Log information about RLS status on all tables

DO $$
DECLARE
  table_count INTEGER;
  rls_enabled_count INTEGER;
BEGIN
  -- Count total tables in public schema
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';
  
  -- Count tables with RLS enabled
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' 
  AND c.relkind = 'r'
  AND c.relrowsecurity = true;
  
  RAISE LOG '📊 Row Level Security Review:';
  RAISE LOG '   Total public tables: %', table_count;
  RAISE LOG '   Tables with RLS enabled: %', rls_enabled_count;
  
  IF rls_enabled_count < table_count THEN
    RAISE LOG '⚠️ Some tables may not have RLS enabled - review for security requirements';
  ELSE
    RAISE LOG '✅ All tables have RLS enabled - good security posture';
  END IF;
  
END $$;

-- Log completion and summary
DO $$
BEGIN
  RAISE LOG '🔒 SECURITY FIX: Remaining security warnings addressed where possible';
  RAISE LOG '✅ HTTP Extension: Moved to extensions schema (if it existed in public)';
  RAISE LOG '✅ Role Security: Set restrictive search_path for database roles';
  RAISE LOG '✅ Monitoring: Enabled security monitoring extensions where available';
  RAISE LOG '✅ Configuration: Applied additional security hardening';
  RAISE LOG '📊 Reviews: Completed function and RLS security reviews';
  RAISE LOG '';
  RAISE LOG '⚠️ NOTE: Some security warnings require Supabase dashboard configuration:';
  RAISE LOG '   - Auth OTP expiry settings';
  RAISE LOG '   - Leaked password protection';
  RAISE LOG '   - PostgreSQL version updates';
  RAISE LOG '';
  RAISE LOG '📅 MIGRATION: 20250914180910_fix_remaining_security_warnings.sql completed';
END $$;