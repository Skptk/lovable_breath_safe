# Security Migration Application Guide

## ⚠️ Critical Security Migration Failed

The security migration `20250123000002_fix_security_vulnerabilities.sql` failed to push to Supabase. This migration addresses critical security vulnerabilities identified by the Supabase security advisor.

## 🔒 Security Issues Being Fixed

### 1. **SECURITY DEFINER Removal**
- **Problem**: Functions were running with elevated privileges (creator permissions)
- **Risk**: Potential privilege escalation and security breaches
- **Fix**: Remove SECURITY DEFINER, functions now run with caller permissions

### 2. **RLS Policy Enforcement**
- **Problem**: `data_collection_schedule` table was public without proper access control
- **Risk**: Unauthorized access to scheduling data
- **Fix**: Enable Row Level Security with proper policies

### 3. **Function Permission Hardening**
- **Problem**: Functions had excessive permissions
- **Risk**: Potential abuse of database functions
- **Fix**: Proper permission grants and access control

## 🚀 How to Apply the Migration

### Option 1: Supabase Dashboard (Recommended)

1. **Access Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project: `bmqdbetupttlthpadseq`

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Create a new query

3. **Run the Migration**
   - Copy the entire content of `supabase/migrations/20250123000002_fix_security_vulnerabilities.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

4. **Verify Success**
   - Check for any error messages
   - Look for success logs in the output

### Option 2: Supabase CLI (If Available)

1. **Link to Remote Project**
   ```bash
   npx supabase link --project-ref bmqdbetupttlthpadseq
   ```

2. **Apply Migration**
   ```bash
   npx supabase db push
   ```

### Option 3: Direct Database Connection

1. **Get Connection Details**
   - From Supabase Dashboard → Settings → Database
   - Use the connection string or individual credentials

2. **Connect with Database Client**
   - Use pgAdmin, DBeaver, or command line
   - Connect to your Supabase database

3. **Run Migration**
   - Execute the SQL migration file

## 🔍 Pre-Migration Checklist

### Verify Required Tables Exist
```sql
-- Check if global_environmental_data table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'global_environmental_data'
);

-- Check if data_collection_schedule table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'data_collection_schedule'
);
```

### Check Current Function Status
```sql
-- Check if functions exist and their security settings
SELECT 
  routine_name,
  security_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'get_nearest_environmental_data',
  'get_all_active_environmental_data',
  'should_run_data_collection',
  'trigger_data_collection'
);
```

### Verify RLS Status
```sql
-- Check RLS status on data_collection_schedule
SELECT 
  table_name,
  row_security
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'data_collection_schedule';
```

## ✅ Post-Migration Verification

### 1. **Function Security Check**
```sql
-- Verify functions no longer have SECURITY DEFINER
SELECT 
  routine_name,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'get_nearest_environmental_data',
  'get_all_active_environmental_data',
  'should_run_data_collection',
  'trigger_data_collection'
);
```

### 2. **RLS Policy Verification**
```sql
-- Check RLS policies on data_collection_schedule
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
WHERE tablename = 'data_collection_schedule';
```

### 3. **Function Permission Check**
```sql
-- Verify function permissions
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%environmental_data%';
```

## 🚨 Troubleshooting Common Issues

### Issue 1: "Table does not exist"
**Solution**: Run previous migrations first
```sql
-- Check migration status
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
```

### Issue 2: "Permission denied"
**Solution**: Ensure you have admin access to the database
- Check your Supabase user role
- Verify you're using the correct connection credentials

### Issue 3: "Function already exists"
**Solution**: This is normal - the migration uses `CREATE OR REPLACE`
- Check the output for any actual errors
- Verify the function was updated correctly

### Issue 4: "RLS already enabled"
**Solution**: This is normal - the migration checks and handles existing RLS
- Check the output for any actual errors
- Verify RLS policies were created correctly

## 📋 Migration Dependencies

### Required Tables
- `public.global_environmental_data` - Environmental data storage
- `public.data_collection_schedule` - Data collection scheduling

### Required Functions
- `public.get_nearest_environmental_data()` - Location-based data retrieval
- `public.get_all_active_environmental_data()` - All active data retrieval
- `public.should_run_data_collection()` - Schedule checking
- `public.trigger_data_collection()` - Manual trigger

### Required Permissions
- Database admin access or service role
- Ability to create/modify functions
- Ability to modify table security settings

## 🔐 Security Impact Assessment

### Before Migration
- Functions run with elevated privileges
- Scheduling table accessible to all users
- Potential privilege escalation risks

### After Migration
- Functions run with caller permissions only
- Scheduling table protected by RLS policies
- Proper access control enforced
- Security vulnerabilities eliminated

## 📞 Need Help?

If you encounter issues:

1. **Check Supabase Dashboard Logs**
   - Go to Logs → Database
   - Look for error messages during migration

2. **Verify Environment Variables**
   - Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
   - Check Netlify environment variables

3. **Test Functionality**
   - Verify the app still works after migration
   - Check that environmental data functions work correctly

4. **Rollback if Needed**
   - The migration is designed to be safe and idempotent
   - Can be run multiple times without issues

## 🎯 Expected Results

After successful migration:
- ✅ All security vulnerabilities fixed
- ✅ Functions run with proper permissions
- ✅ RLS policies enforce access control
- ✅ App functionality maintained
- ✅ Security compliance achieved

---

**⚠️ IMPORTANT**: This migration addresses critical security issues. Please apply it as soon as possible to secure your production database.
