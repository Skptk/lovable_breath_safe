# Database Schema Summary

This document summarizes the database schema based on migration files. Use this as a reference when manual diagnostics are needed.

## Tables

### Core User Tables

#### `profiles`
- **Purpose**: User profile information
- **Key Columns**: `user_id` (FK to `auth.users`), `email`, `full_name`, `total_points`
- **RLS**: Enabled
- **CASCADE**: Yes (ON DELETE CASCADE from `auth.users`)

#### `user_settings`
- **Purpose**: User preferences and settings (JSONB)
- **Key Columns**: `user_id` (FK to `profiles.user_id`), `settings` (JSONB)
- **RLS**: Enabled
- **CASCADE**: Yes (ON DELETE CASCADE from `profiles`)

### Air Quality Data

#### `air_quality_readings`
- **Purpose**: Historical air quality readings per user
- **Key Columns**: `user_id`, `latitude`, `longitude`, `aqi`, `pm25`, `pm10`, `no2`, `so2`, `co`, `o3`
- **RLS**: Enabled
- **CASCADE**: Yes (ON DELETE CASCADE from `auth.users`)

#### `global_environmental_data`
- **Purpose**: Server-collected environmental data for all users
- **Key Columns**: `id` (TEXT), `city_name`, `country`, `latitude`, `longitude`, `aqi`, `is_active`
- **RLS**: Likely enabled
- **CASCADE**: No (global data, not user-specific)

#### `last_known_good_aqi`
- **Purpose**: Cached AQI data
- **Key Columns**: (Check migration for details)
- **RLS**: Unknown
- **CASCADE**: Unknown

### Points & Rewards

#### `user_points`
- **Purpose**: Points earned per reading
- **Key Columns**: `user_id`, `points_earned`, `aqi_value`, `total_points`
- **RLS**: Enabled
- **CASCADE**: Yes (ON DELETE CASCADE from `auth.users`)
- **Note**: Recent migration added DELETE policies for service_role

#### `withdrawal_requests`
- **Purpose**: User withdrawal requests
- **Key Columns**: `user_id`, `amount`, `method`, `status`, `paypal_email`, `mpesa_phone`
- **RLS**: Enabled
- **CASCADE**: Yes (ON DELETE CASCADE from `auth.users`)

### Achievements

#### `achievements`
- **Purpose**: Achievement definitions
- **Key Columns**: `id`, `name`, `description`, `category`, `points_reward`, `criteria_type`, `criteria_value`
- **RLS**: Enabled (public read)
- **CASCADE**: No

#### `user_achievements`
- **Purpose**: User achievement progress
- **Key Columns**: `user_id`, `achievement_id`, `progress`, `max_progress`, `unlocked`
- **RLS**: Enabled
- **CASCADE**: Yes (ON DELETE CASCADE from `auth.users` and `achievements`)

#### `user_streaks`
- **Purpose**: Streak tracking
- **Key Columns**: `user_id`, `streak_type`, `current_streak`, `max_streak`, `last_activity_date`
- **RLS**: Enabled
- **CASCADE**: Yes (ON DELETE CASCADE from `auth.users`)

### Other Tables

#### `notifications`
- **Purpose**: User notification system
- **Key Columns**: (Check migration for details)
- **RLS**: Enabled
- **CASCADE**: Yes (ON DELETE CASCADE from `auth.users`)

#### `pollutant_details`
- **Purpose**: Pollutant information (reference data)
- **Key Columns**: `pollutant_code`, `name`, `description`, `health_effects`
- **RLS**: Enabled (public read)
- **CASCADE**: No

#### `affiliate_products`
- **Purpose**: Product listings
- **Key Columns**: `name`, `description`, `affiliate_url`, `is_active`
- **RLS**: Enabled (public read active products)
- **CASCADE**: No

## Custom Types

### `app_role`
- **Type**: ENUM
- **Values**: `'user'`, `'admin'`

## Key Functions

### User Management
- `handle_new_user()` - Creates profile on user signup
- `initialize_user_data()` - Initializes user data (achievements, settings, notifications)
- `initialize_user_settings()` - Creates default user settings
- `initialize_user_achievements()` - Creates achievement progress records
- `initialize_notification_preferences()` - Sets up notification preferences

### Points & Achievements
- `update_user_progress_on_reading()` - Updates achievements when reading added
- `update_points_achievements()` - Updates points-based achievements
- `check_achievements()` - Checks and unlocks achievements

### Data Collection
- `insert_air_quality_reading()` - Secure function to insert readings (if exists)
- Weather series functions (check migrations)

## Edge Functions

### `scheduled-data-collection`
- **Purpose**: Automated environmental data collection every minute
- **Location**: `supabase/functions/scheduled-data-collection/index.ts`
- **APIs Used**: OpenWeatherMap Air Pollution & Weather APIs
- **Data Stored**: `global_environmental_data` table

### `get-air-quality`
- **Purpose**: Get air quality data for user location
- **Location**: `supabase/functions/get-air-quality/index.ts`
- **APIs Used**: OpenWeatherMap
- **Features**: Caching, user authentication, points tracking

### `enhanced-aqicn`
- **Purpose**: Enhanced AQI data collection
- **Location**: `supabase/functions/enhanced-aqicn/index.ts`

### `fetchAQI`
- **Purpose**: AQI fetching utility
- **Location**: `supabase/functions/fetchAQI/index.ts`

### `reset-inflated-points`
- **Purpose**: Reset inflated points
- **Location**: `supabase/functions/reset-inflated-points/index.ts`

### `validate-points-award`
- **Purpose**: Validate points awards
- **Location**: `supabase/functions/validate-points-award/index.ts`

## Extensions (Expected)

Based on migrations, these extensions should be installed:

- `pg_cron` - For scheduled jobs (cron scheduling)
- `pg_net` - For HTTP requests from PostgreSQL
- `uuid-ossp` - For UUID generation (if not using `gen_random_uuid()`)
- `pg_trgm` - For text similarity (if used)

## RLS Policies Summary

### Service Role Policies
Recent migration (`20251118100000_fix_user_points_delete_permissions.sql`) added:
- `user_points`: Service role can manage (ALL operations)
- `air_quality_readings`: Service role can manage
- `profiles`: Service role can manage
- `user_streaks`: Service role can manage
- `user_settings`: Service role can manage (if table exists)
- `withdrawal_requests`: Service role can manage (if table exists)

### User Policies
- Most tables: Users can view/insert/update their own records
- `achievements`: Public read
- `pollutant_details`: Public read
- `affiliate_products`: Public read (active only)

## Critical CASCADE Delete Tables

These tables have `ON DELETE CASCADE` from `auth.users`:
1. `profiles`
2. `air_quality_readings`
3. `user_points`
4. `user_achievements`
5. `user_streaks`
6. `withdrawal_requests`
7. `notifications`
8. `user_settings` (cascades from `profiles`)

**All of these require DELETE policies for service_role to allow CASCADE deletes.**

## Known Issues & Fixes

### Fixed in Migration `20251118100000_fix_user_points_delete_permissions.sql`
- ✅ Added DELETE policies for `user_points`
- ✅ Added DELETE policies for `air_quality_readings`
- ✅ Added DELETE policies for `profiles`
- ✅ Added DELETE policies for `user_streaks`
- ✅ Added DELETE policies for `user_settings` (conditional)
- ✅ Added DELETE policies for `withdrawal_requests` (conditional)
- ✅ Granted ALL permissions to service_role on affected tables
- ✅ Ensured service_role has USAGE on public schema

## Diagnostic Queries

Use these queries to verify schema access:

```sql
-- Count tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- List all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';

-- Check service_role permissions
SELECT table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE grantee = 'service_role' 
AND table_schema = 'public';
```

