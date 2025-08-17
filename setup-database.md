# Database Setup Guide

## Environment Variables

You need to create a `.env.local` file in your root directory with the following content:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://bmqdbetupttlthpadseq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcWRiZXR1cHR0bHRocGFkc2VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNjQzNDcsImV4cCI6MjA3MDc0MDM0N30.wCHsFY73VDM93uJAWRLd4-XA_fTB7efJC7rXzsjhn8c

# Supabase Database Password (for migrations and direct database access)
SUPABASE_DB_PASSWORD=JcIubIXaTqtRbfsw

# OpenWeatherMap API Key (Optional - for geocoding)
VITE_OPENWEATHERMAP_API_KEY=your_openweathermap_api_key_here
```

## Database Migration

I've created a new migration file: `supabase/migrations/20250115000012_create_user_settings_table.sql`

This migration creates the missing `user_settings` table that stores:
- User theme preferences
- Language settings
- Notification preferences
- Privacy settings
- Location preferences

## Running the Migration

To apply this migration to your Supabase database:

1. **Using Supabase CLI:**
   ```bash
   supabase db push
   ```

2. **Using Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of the migration file
   - Run the SQL

3. **Using psql (if you have direct database access):**
   ```bash
   psql "postgresql://postgres:JcIubIXaTqtRbfsw@db.bmqdbetupttlthpadseq.supabase.co:5432/postgres"
   ```
   Then run the migration SQL.

## What This Fixes

- ✅ **Theme persistence**: User theme preferences are now stored in the database
- ✅ **Settings synchronization**: All user settings are properly persisted
- ✅ **ProfileView functionality**: The component now works with the database instead of localStorage
- ✅ **Dark mode**: Theme changes are properly saved and restored across sessions

## Verification

After running the migration, you can verify it worked by:

1. Checking the Supabase dashboard for the new `user_settings` table
2. Testing the theme toggle in the sidebar
3. Checking that theme preferences persist after page refresh
4. Verifying that ProfileView loads without errors

## Next Steps

Once the migration is applied:
1. The app will automatically create default settings for new users
2. Existing users will get default settings when they next visit their profile
3. All theme changes will be properly saved and restored
