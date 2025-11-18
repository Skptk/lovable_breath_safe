# Schema Access Restoration Guide

## Problem
Supabase assistant diagnostic tools (`list_tables`, `list_extensions`, `list_edge_functions`) are blocked by organization-level data-sharing settings. The error message indicates:
> "You don't have permission to use this tool. This is an organization-wide setting requiring you to opt-in."

## Solution Steps

### Step 1: Enable Organization Data-Sharing Settings

1. **Sign in to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Sign in with an organization admin account

2. **Navigate to Organization Settings**
   - Click on your organization name (top left)
   - Select **"Organization Settings"** from the dropdown
   - Or go directly to: `https://supabase.com/dashboard/org/[your-org-id]/settings`

3. **Enable AI Assistant Data Sharing**
   - Look for **"Data sharing / AI assistant settings"** or **"Bedrock opt-in"**
   - Enable the **minimal Bedrock opt-in** required for assistant diagnostics
   - This allows the assistant to:
     - List tables and schemas
     - List installed extensions
     - List Edge Functions
     - Perform diagnostic queries

4. **Save Settings**
   - Click **"Save"** or **"Update"**
   - Changes may take a few minutes to propagate

### Step 2: Verify Assistant Access

After enabling the setting, try using the assistant tools again:
- `list_tables(schema='public')`
- `list_extensions()`
- `list_edge_functions()`

If these still fail, proceed to Step 3.

### Step 3: Manual Diagnostic Collection (Alternative)

If organization-level changes are not possible, collect diagnostic information manually:

#### A. Run Diagnostic SQL Script

1. **Open Supabase SQL Editor**
   - Navigate to: `https://supabase.com/dashboard/project/[project-id]/sql`
   - Or use Supabase CLI: `supabase db execute --file supabase/diagnostics/diagnostic_schema_access.sql`

2. **Execute the Diagnostic Script**
   - Copy the contents of `supabase/diagnostics/diagnostic_schema_access.sql`
   - Paste into SQL Editor
   - Click **"Run"**
   - Save the output as a text file or JSON

3. **Collect Extension Information**
   ```sql
   SELECT * FROM pg_extension;
   ```

4. **Collect Table Information**
   ```sql
   SELECT table_schema, table_name 
   FROM information_schema.tables 
   WHERE table_schema NOT IN ('pg_catalog','information_schema');
   ```

#### B. List Edge Functions

1. **Via Dashboard**
   - Navigate to: `https://supabase.com/dashboard/project/[project-id]/functions`
   - Manually list all Edge Functions

2. **Via CLI**
   ```bash
   supabase functions list
   ```

3. **Collect Function Code**
   - For each Edge Function, copy the code from:
     - Dashboard: Click on function name → View code
     - CLI: `supabase functions inspect [function-name]`
   - Or provide the file paths: `supabase/functions/*/index.ts`

#### C. Provide Collected Data

Attach the following to the assistant:
- Output from diagnostic SQL script
- List of extensions (from `pg_extension`)
- List of Edge Functions with their code
- Any error messages or logs

### Step 4: Post-Diagnostics Remediation

Once the assistant has access to schema metadata (either via tools or manual input), it will:

1. **Analyze Schema Structure**
   - Identify all tables, relationships, and constraints
   - Check RLS policies and permissions
   - Verify service_role access

2. **Detect Permission Issues**
   - Missing DELETE policies for CASCADE deletes
   - Missing GRANT statements
   - RLS misconfigurations
   - Schema access issues

3. **Propose SQL Fixes**
   - Generate migration files for permission fixes
   - Create missing policies
   - Grant necessary permissions
   - **Note**: Destructive SQL (DROP/DELETE) will require explicit confirmation

4. **Validate Changes**
   - Review proposed changes
   - Test in development environment
   - Apply to production with approval

## Expected Database Schema (Based on Migrations)

Based on the migration files, your database should include:

### Core Tables
- `profiles` - User profile information
- `air_quality_readings` - Historical air quality data
- `user_points` - Points tracking and history
- `pollutant_details` - Pollutant information
- `affiliate_products` - Product listings

### Extended Tables
- `achievements` - Achievement definitions
- `user_achievements` - User achievement progress
- `user_streaks` - Streak tracking
- `notifications` - Notification system
- `user_settings` - User preferences
- `global_environmental_data` - Server-collected environmental data
- `withdrawal_requests` - Withdrawal request tracking
- `last_known_good_aqi` - Cached AQI data

### Edge Functions
- `scheduled-data-collection` - Automated data collection
- `get-air-quality` - Air quality API endpoint
- `enhanced-aqicn` - Enhanced AQI data
- `fetchAQI` - AQI fetching utility
- `reset-inflated-points` - Points reset utility
- `validate-points-award` - Points validation

### Extensions (Expected)
- `pg_cron` - Scheduled job execution
- `pg_net` - HTTP requests from PostgreSQL
- `uuid-ossp` - UUID generation
- `pg_trgm` - Text similarity (if used)

## Troubleshooting

### If Organization Settings Cannot Be Changed

1. **Contact Organization Owner**
   - Request access to organization settings
   - Or ask owner to enable Bedrock opt-in

2. **Use Manual Diagnostics**
   - Follow Step 3 above
   - Provide collected data to assistant

3. **Use Supabase CLI**
   - Direct database access via CLI
   - Run diagnostic queries locally

### If Assistant Tools Still Fail After Enabling Settings

1. **Wait for Propagation**
   - Settings changes can take 5-10 minutes
   - Try again after waiting

2. **Check Project-Level Settings**
   - Some settings may be project-specific
   - Check project settings in addition to org settings

3. **Verify Account Permissions**
   - Ensure your account has admin access
   - Check role assignments

## Next Steps

After restoring assistant access:

1. **Run Full Diagnostics**
   - Let assistant analyze complete schema
   - Identify all permission issues

2. **Review Proposed Fixes**
   - Assistant will provide SQL migration files
   - Review before applying

3. **Apply Fixes**
   - Test in development first
   - Apply to production with approval

4. **Verify Resolution**
   - Confirm all permission issues resolved
   - Test user deletion and CASCADE operations

## Support

If issues persist:
- Check Supabase documentation: https://supabase.com/docs
- Review organization settings documentation
- Contact Supabase support with project ID: `bmqdbetupttlthpadseq`

