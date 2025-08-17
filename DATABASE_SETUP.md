# Database Setup Guide

## ⚠️ Security First

**NEVER commit sensitive information like passwords, API keys, or database credentials to version control.**

## Environment Variables Setup

1. **Copy the template:**
   ```bash
   cp env.template .env.local
   ```

2. **Edit `.env.local` with your actual values:**
   - Replace `your_supabase_project_url_here` with your actual Supabase URL
   - Replace `your_supabase_anon_key_here` with your actual Supabase anon key
   - Replace `your_database_password_here` with your actual database password
   - Replace `your_openweathermap_api_key_here` with your actual OpenWeatherMap API key

3. **Verify `.env.local` is in `.gitignore`** (it should be already)

## Database Migration

The migration file `supabase/migrations/20250115000012_create_user_settings_table.sql` creates the missing `user_settings` table.

### Running the Migration

**Option 1: Supabase CLI (Recommended)**
```bash
supabase db push
```

**Option 2: Supabase Dashboard**
- Go to your Supabase project dashboard
- Navigate to SQL Editor
- Copy and paste the migration SQL
- Run the query

**Option 3: Direct Database Connection**
- Use your database client of choice
- Connect using the credentials from your `.env.local` file
- Run the migration SQL

## What This Migration Creates

- `user_settings` table with proper RLS policies
- Functions for initializing default user settings
- Triggers for automatic timestamp updates
- Default settings for new users

## Verification

After running the migration:
1. Check Supabase dashboard for the new `user_settings` table
2. Test the theme toggle in the sidebar
3. Verify theme preferences persist after page refresh
4. Check that ProfileView loads without errors

## Security Checklist

- [ ] `.env.local` is created with your actual values
- [ ] `.env.local` is NOT committed to git
- [ ] Database password is kept secure
- [ ] API keys are not shared publicly
- [ ] Migration runs successfully
- [ ] App functions properly with new database structure

## Need Help?

If you encounter issues:
1. Check the Supabase dashboard logs
2. Verify your environment variables are correct
3. Ensure the migration SQL runs without errors
4. Check that RLS policies are properly applied
