# Scheduled Data Collection Setup Guide

## Overview

This document explains the complete setup for automated environmental data collection in the Breath Safe application. The system uses **Supabase cron scheduling** as the primary method, with GitHub Actions as a manual trigger option.

## Architecture

### Primary Scheduler: Supabase Cron Jobs
- **Frequency**: Every 15 minutes
- **Method**: PostgreSQL cron extension (`pg_cron`)
- **Reliability**: Built into Supabase infrastructure
- **Security**: No external credentials required

### Backup Trigger: GitHub Actions
- **Purpose**: Manual triggering for testing and emergency data collection
- **Frequency**: On-demand only
- **Inputs**: City-specific collection, force collection
- **Security**: No sensitive credentials exposed

## Setup Instructions

### 1. Enable pg_cron Extension

Run the migration file to set up cron scheduling:

```sql
-- This is handled by the migration file:
-- supabase/migrations/20250123000001_setup_cron_scheduling.sql

-- The migration will:
-- 1. Enable pg_cron extension
-- 2. Create scheduled job for every 15 minutes
-- 3. Set up necessary permissions
```

### 2. Configure Supabase Environment Variables

Ensure these environment variables are set in your Supabase project:

```bash
# Required for the Edge Function
OPENWEATHERMAP_API_KEY=your_openweathermap_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Deploy the Edge Function

The Edge Function will automatically run every 15 minutes via cron scheduling:

```bash
# Deploy to Supabase
supabase functions deploy scheduled-data-collection
```

### 4. Verify Cron Job Setup

Check if the cron job is running:

```sql
-- View all scheduled cron jobs
SELECT * FROM cron.job;

-- View cron job runs
SELECT * FROM cron.job_run_details;

-- Check the specific environmental data collection job
SELECT * FROM cron.job WHERE jobname = 'environmental-data-collection';
```

## How It Works

### Automatic Scheduling (Every 15 Minutes)
1. **Cron Job Triggers**: PostgreSQL cron runs every 15 minutes
2. **Function Execution**: Calls the scheduled data collection function
3. **Data Collection**: Collects environmental data for all 8 Kenyan cities
4. **Database Storage**: Stores data in `global_environmental_data` table
5. **User Access**: Users access stored data instead of calling APIs directly

### Manual Triggering (GitHub Actions)
1. **Manual Execution**: Trigger via GitHub Actions workflow
2. **City-Specific**: Option to collect data for a specific city
3. **Emergency Use**: Force immediate data collection when needed
4. **Testing**: Verify the system is working correctly

## Benefits of This Approach

### Security
- ✅ **No exposed credentials** in GitHub Actions
- ✅ **Supabase-managed** environment variables
- ✅ **Internal scheduling** within Supabase infrastructure

### Reliability
- ✅ **Built-in scheduling** via PostgreSQL cron
- ✅ **No external dependencies** for basic operation
- ✅ **Automatic retry** and error handling

### Flexibility
- ✅ **Manual triggers** when needed
- ✅ **City-specific collection** for testing
- ✅ **Emergency data collection** capabilities

## Monitoring and Troubleshooting

### Check Cron Job Status
```sql
-- View recent cron job executions
SELECT 
  jobid,
  job_pid,
  database,
  username,
  command,
  return_message,
  start_time,
  end_time,
  total_runtime
FROM cron.job_run_details 
WHERE jobid = (
  SELECT jobid FROM cron.job 
  WHERE jobname = 'environmental-data-collection'
)
ORDER BY start_time DESC
LIMIT 10;
```

### Check Data Collection Status
```sql
-- View recent environmental data
SELECT 
  city_name,
  collection_timestamp,
  aqi,
  temperature,
  is_active
FROM global_environmental_data 
WHERE is_active = true
ORDER BY collection_timestamp DESC
LIMIT 20;
```

### Common Issues and Solutions

#### Issue: Cron job not running
**Solution**: Check if pg_cron extension is enabled
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

#### Issue: Edge Function not responding
**Solution**: Check Supabase function logs and environment variables

#### Issue: Data not being collected
**Solution**: Verify OpenWeatherMap API key and rate limits

## Testing

### Test Cron Job Manually
```sql
-- Manually trigger the cron function
SELECT cron.schedule_environmental_data_collection();
```

### Test Edge Function Directly
```bash
# Test the function endpoint
curl -X POST https://your-project.supabase.co/functions/v1/scheduled-data-collection \
  -H "Content-Type: application/json" \
  -d '{"manual": true, "city": "Nairobi"}'
```

### Test GitHub Actions Workflow
1. Go to GitHub Actions tab
2. Select "Manual Environmental Data Collection Trigger"
3. Click "Run workflow"
4. Optionally specify a city
5. Monitor execution logs

## Maintenance

### Regular Checks
- **Weekly**: Verify cron job is running
- **Monthly**: Check data collection logs
- **Quarterly**: Review API rate limits and quotas

### Updates
- **Edge Function**: Deploy updates via Supabase CLI
- **Cron Jobs**: Modify via SQL migrations
- **GitHub Actions**: Update workflow files as needed

## Security Considerations

### Environment Variables
- ✅ **Never commit** API keys to version control
- ✅ **Use Supabase** environment variable management
- ✅ **Rotate keys** regularly

### Access Control
- ✅ **Service role key** for database operations
- ✅ **RLS policies** for user data access
- ✅ **Function-level** authentication

### Monitoring
- ✅ **Log all operations** for audit trail
- ✅ **Monitor API usage** and rate limits
- ✅ **Alert on failures** or unusual patterns

---

## Summary

This setup provides a robust, secure, and reliable system for automated environmental data collection:

1. **Primary**: Supabase cron scheduling (every 15 minutes)
2. **Backup**: GitHub Actions manual triggers
3. **Security**: No exposed credentials
4. **Reliability**: Built-in infrastructure
5. **Monitoring**: Comprehensive logging and status checks

The system automatically collects environmental data for all users while maintaining security and providing manual override capabilities when needed.
