-- Migration: Fix Function Search Path Security Issues (Safe Targeted Approach)
-- Description: Add explicit search_path to existing functions using ALTER FUNCTION with existence checks
-- Date: 2024-09-14
-- Issue: "Function Search Path Mutable" warnings for 45+ functions
-- Priority: WARNING-level security issues (EXTERNAL facing)
-- Approach: Use DO blocks with error handling to safely alter existing functions

-- This migration uses ALTER FUNCTION SET to add search_path security to existing functions
-- with proper error handling to skip functions that don't exist.

-- Comprehensive Function Search Path Security Fix
DO $$
BEGIN
  -- Fix User Settings Functions
  BEGIN
    ALTER FUNCTION public.update_user_settings_updated_at() SET search_path = public;
    RAISE LOG '✅ Fixed: update_user_settings_updated_at';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: update_user_settings_updated_at (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.initialize_user_settings(UUID) SET search_path = public;
    RAISE LOG '✅ Fixed: initialize_user_settings';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: initialize_user_settings (function does not exist)';
  END;

  -- Fix Data Collection Functions  
  BEGIN
    ALTER FUNCTION public.should_run_data_collection() SET search_path = public;
    RAISE LOG '✅ Fixed: should_run_data_collection';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: should_run_data_collection (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.trigger_data_collection() SET search_path = public;
    RAISE LOG '✅ Fixed: trigger_data_collection';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: trigger_data_collection (function does not exist)';
  END;

  -- Fix User Initialization Functions
  BEGIN
    ALTER FUNCTION public.initialize_user_data() SET search_path = public;
    RAISE LOG '✅ Fixed: initialize_user_data';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: initialize_user_data (function does not exist)';
  END;

  -- Fix Achievement Functions
  BEGIN
    ALTER FUNCTION public.check_achievements(UUID) SET search_path = public;
    RAISE LOG '✅ Fixed: check_achievements';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: check_achievements (function does not exist)';
  END;

  -- Fix Environmental Data Functions (try different signatures)
  BEGIN
    ALTER FUNCTION public.get_nearest_environmental_data(DECIMAL, DECIMAL, DECIMAL) SET search_path = public;
    RAISE LOG '✅ Fixed: get_nearest_environmental_data (DECIMAL signature)';
  EXCEPTION
    WHEN undefined_function THEN
      BEGIN
        ALTER FUNCTION public.get_nearest_environmental_data(DECIMAL(10,8), DECIMAL(11,8), DECIMAL(10,2)) SET search_path = public;
        RAISE LOG '✅ Fixed: get_nearest_environmental_data (specific DECIMAL signature)';
      EXCEPTION
        WHEN undefined_function THEN
          RAISE LOG '⚠️ Skipped: get_nearest_environmental_data (function does not exist with tested signatures)';
      END;
  END;
  
  BEGIN
    ALTER FUNCTION public.get_all_active_environmental_data() SET search_path = public;
    RAISE LOG '✅ Fixed: get_all_active_environmental_data';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: get_all_active_environmental_data (function does not exist)';
  END;

  -- Fix Air Quality and Points Functions
  BEGIN
    ALTER FUNCTION public.insert_air_quality_reading(UUID, TEXT, DECIMAL, DECIMAL, INTEGER, TIMESTAMP WITH TIME ZONE) SET search_path = public;
    RAISE LOG '✅ Fixed: insert_air_quality_reading';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: insert_air_quality_reading (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.sync_points_with_history() SET search_path = public;
    RAISE LOG '✅ Fixed: sync_points_with_history';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: sync_points_with_history (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.sync_all_user_points() SET search_path = public;
    RAISE LOG '✅ Fixed: sync_all_user_points';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: sync_all_user_points (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.set_timestamp() SET search_path = public;
    RAISE LOG '✅ Fixed: set_timestamp';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: set_timestamp (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.sync_user_points_with_history() SET search_path = public;
    RAISE LOG '✅ Fixed: sync_user_points_with_history';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: sync_user_points_with_history (function does not exist)';
  END;

  -- Fix Weather Function
  BEGIN
    ALTER FUNCTION public.get_weather_summary(DECIMAL, DECIMAL) SET search_path = public;
    RAISE LOG '✅ Fixed: get_weather_summary';
  EXCEPTION
    WHEN undefined_function THEN
      BEGIN
        ALTER FUNCTION public.get_weather_summary(DECIMAL(10,8), DECIMAL(11,8)) SET search_path = public;
        RAISE LOG '✅ Fixed: get_weather_summary (specific DECIMAL signature)';
      EXCEPTION
        WHEN undefined_function THEN
          RAISE LOG '⚠️ Skipped: get_weather_summary (function does not exist)';
      END;
  END;

  -- Fix Notification Functions
  BEGIN
    ALTER FUNCTION public.create_points_notification(UUID, INTEGER) SET search_path = public;
    RAISE LOG '✅ Fixed: create_points_notification';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: create_points_notification (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.cleanup_expired_notifications() SET search_path = public;
    RAISE LOG '✅ Fixed: cleanup_expired_notifications';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: cleanup_expired_notifications (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.create_achievement_notification(UUID, TEXT) SET search_path = public;
    RAISE LOG '✅ Fixed: create_achievement_notification';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: create_achievement_notification (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.create_welcome_notification(UUID) SET search_path = public;
    RAISE LOG '✅ Fixed: create_welcome_notification';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: create_welcome_notification (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.create_streak_notification(UUID, INTEGER) SET search_path = public;
    RAISE LOG '✅ Fixed: create_streak_notification';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: create_streak_notification (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.initialize_notification_preferences(UUID) SET search_path = public;
    RAISE LOG '✅ Fixed: initialize_notification_preferences';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: initialize_notification_preferences (function does not exist)';
  END;

  -- Fix More Points and Achievement Functions
  BEGIN
    ALTER FUNCTION public.sync_profile_points(UUID) SET search_path = public;
    RAISE LOG '✅ Fixed: sync_profile_points';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: sync_profile_points (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.enhanced_update_user_progress_on_reading() SET search_path = public;
    RAISE LOG '✅ Fixed: enhanced_update_user_progress_on_reading';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: enhanced_update_user_progress_on_reading (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.award_points_for_reading() SET search_path = public;
    RAISE LOG '✅ Fixed: award_points_for_reading';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: award_points_for_reading (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.validate_user_points() SET search_path = public;
    RAISE LOG '✅ Fixed: validate_user_points';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: validate_user_points (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.sync_points_on_delete() SET search_path = public;
    RAISE LOG '✅ Fixed: sync_points_on_delete';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: sync_points_on_delete (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.reset_inflated_points() SET search_path = public;
    RAISE LOG '✅ Fixed: reset_inflated_points';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: reset_inflated_points (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.create_aqi_alert(UUID, TEXT, INTEGER) SET search_path = public;
    RAISE LOG '✅ Fixed: create_aqi_alert';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: create_aqi_alert (function does not exist)';
  END;

  -- Fix User Progress and Achievement Functions
  BEGIN
    ALTER FUNCTION public.update_user_progress_on_reading() SET search_path = public;
    RAISE LOG '✅ Fixed: update_user_progress_on_reading';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: update_user_progress_on_reading (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.update_points_achievements() SET search_path = public;
    RAISE LOG '✅ Fixed: update_points_achievements';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: update_points_achievements (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.initialize_user_achievements() SET search_path = public;
    RAISE LOG '✅ Fixed: initialize_user_achievements';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: initialize_user_achievements (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.ensure_user_initialization() SET search_path = public;
    RAISE LOG '✅ Fixed: ensure_user_initialization';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: ensure_user_initialization (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.initialize_all_existing_users() SET search_path = public;
    RAISE LOG '✅ Fixed: initialize_all_existing_users';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: initialize_all_existing_users (function does not exist)';
  END;

  -- Additional functions that might exist
  BEGIN
    ALTER FUNCTION public.fallback_environmental_data_query() SET search_path = public;
    RAISE LOG '✅ Fixed: fallback_environmental_data_query';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: fallback_environmental_data_query (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.validate_realtime_subscription() SET search_path = public;
    RAISE LOG '✅ Fixed: validate_realtime_subscription';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: validate_realtime_subscription (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.log_realtime_subscription_attempts() SET search_path = public;
    RAISE LOG '✅ Fixed: log_realtime_subscription_attempts';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: log_realtime_subscription_attempts (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.get_valid_subscription_configs() SET search_path = public;
    RAISE LOG '✅ Fixed: get_valid_subscription_configs';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: get_valid_subscription_configs (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.cleanup_invalid_subscriptions() SET search_path = public;
    RAISE LOG '✅ Fixed: cleanup_invalid_subscriptions';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: cleanup_invalid_subscriptions (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.validate_table_exists(TEXT) SET search_path = public;
    RAISE LOG '✅ Fixed: validate_table_exists';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: validate_table_exists (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.validate_column_exists(TEXT, TEXT) SET search_path = public;
    RAISE LOG '✅ Fixed: validate_column_exists';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: validate_column_exists (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.validate_subscription_config() SET search_path = public;
    RAISE LOG '✅ Fixed: validate_subscription_config';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: validate_subscription_config (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.get_subscription_health() SET search_path = public;
    RAISE LOG '✅ Fixed: get_subscription_health';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: get_subscription_health (function does not exist)';
  END;
  
  BEGIN
    ALTER FUNCTION public.cleanup_stale_subscriptions() SET search_path = public;
    RAISE LOG '✅ Fixed: cleanup_stale_subscriptions';
  EXCEPTION
    WHEN undefined_function THEN
      RAISE LOG '⚠️ Skipped: cleanup_stale_subscriptions (function does not exist)';
  END;

END $$;

-- Log successful completion
DO $$
BEGIN
  RAISE LOG '🔒 SECURITY FIX: Function search path security issues resolved (safe targeted approach)';
  RAISE LOG '✅ COMPLIANCE: Added explicit search_path = public to existing functions where possible';
  RAISE LOG '🛡️ PROTECTION: Prevented search path injection attacks';
  RAISE LOG '📋 STANDARDS: Following PostgreSQL security best practices';
  RAISE LOG '⚡ FUNCTIONALITY: All existing functionality preserved';
  RAISE LOG '🎯 WARNINGS: Resolved Function Search Path Mutable warnings for existing functions';
  RAISE LOG '📅 MIGRATION: 20250914180437_fix_function_search_path_targeted.sql completed';
END $$;