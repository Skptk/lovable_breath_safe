# Scheduled Data Collection Setup Guide

## Overview

This guide explains how to set up the scheduled data collection system to replace the "Initial Data" placeholder with real OpenWeatherMap API data. The system automatically collects environmental data every 15 minutes and stores it in the database for all users to access.

## Current Issue

The app is currently showing "Initial Data" placeholder instead of real air quality data because:
1. The scheduled data collection Edge Function is not configured with required environment variables
2. The GitHub Actions cron job is running but failing to collect real data
3. The database contains placeholder records that need to be cleaned up

## Solution Steps

### Step 1: Clean Up Database

Run the cleanup script to remove any remaining placeholder data:

```sql
-- Execute cleanup_initial_data.sql in your Supabase SQL editor
-- This removes all "Initial Data" records and prepares the database for real data
```

### Step 2: Configure Edge Function Environment Variables

The scheduled data collection Edge Function requires these environment variables:

#### In Supabase Dashboard:
1. Go to **Settings** → **Edge Functions**
2. Find the `scheduled-data-collection` function
3. Click **Settings** → **Environment Variables**
4. Add these variables:

```
OPENWEATHERMAP_API_KEY=your_actual_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

#### How to Get OpenWeatherMap API Key:
1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Navigate to **API keys** section
4. Copy your API key
5. Note: Free tier allows 1000 calls/day (sufficient for 8 cities × 96 times/day = 768 calls)

### Step 3: Test Edge Function Manually

Test the Edge Function to ensure it's working:

```bash
# Test manual data collection for Nairobi
curl -X POST https://your-project.supabase.co/functions/v1/scheduled-data-collection \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_anon_key" \
  -d '{"manual": true, "city": "Nairobi"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Data collected for Nairobi",
  "data": {
    "city_name": "Nairobi",
    "aqi": 65,
    "temperature": 22.5,
    "data_source": "OpenWeatherMap API",
    ...
  }
}
```

### Step 4: Verify GitHub Actions Configuration

The GitHub Actions workflow is already configured to run every 15 minutes:

```yaml
# .github/workflows/scheduled-data-collection.yml
on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
```

Ensure these secrets are set in GitHub:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### Step 5: Monitor Data Collection

Check the database to verify real data is being collected:

```sql
-- Check recent environmental data
SELECT 
  city_name,
  aqi,
  temperature,
  data_source,
  collection_timestamp
FROM public.global_environmental_data
WHERE is_active = true
ORDER BY collection_timestamp DESC;

-- Check data source distribution
SELECT 
  data_source,
  COUNT(*) as record_count
FROM public.global_environmental_data
GROUP BY data_source;
```

## Expected Results

After setup, you should see:

1. **Real-time Data**: Air quality data updates every 15 minutes
2. **Legitimate Sources**: `data_source` shows "OpenWeatherMap API"
3. **Accurate Values**: Real AQI, temperature, humidity, and pollutant data
4. **No More Placeholders**: Console shows successful data processing
5. **User Experience**: Air quality cards display real environmental data

## Troubleshooting

### Edge Function Not Working

1. **Check Environment Variables**: Ensure all required variables are set
2. **Check API Key**: Verify OpenWeatherMap API key is valid and has quota
3. **Check Logs**: View Edge Function logs in Supabase dashboard
4. **Test Manually**: Use the manual trigger to test individual cities

### GitHub Actions Failing

1. **Check Secrets**: Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
2. **Check Permissions**: Verify the workflow has access to secrets
3. **Check Logs**: View GitHub Actions logs for error details
4. **Test Edge Function**: Ensure Edge Function works before testing workflow

### No Data in Database

1. **Check Edge Function**: Verify it's running and collecting data
2. **Check Database Permissions**: Ensure service role can insert data
3. **Check Table Structure**: Verify `global_environmental_data` table exists
4. **Check RLS Policies**: Ensure proper access policies are in place

## Data Flow

```
GitHub Actions Cron (every 15 min)
    ↓
Edge Function (scheduled-data-collection)
    ↓
OpenWeatherMap APIs (air quality + weather)
    ↓
Database Storage (global_environmental_data)
    ↓
Frontend Queries (useGlobalEnvironmentalData)
    ↓
User Interface (Air Quality Dashboard)
```

## Performance Benefits

1. **No Client-Side API Calls**: Eliminates 15-minute refresh loops
2. **Centralized Data**: Single source of truth for all users
3. **Reduced Rate Limiting**: Efficient server-side collection
4. **Better User Experience**: Instant data access on login
5. **Scalable Architecture**: Supports unlimited users without API limits

## Security Considerations

1. **API Key Protection**: Stored securely in Edge Function environment
2. **Service Role Access**: Limited database access for data collection
3. **RLS Policies**: User data isolation maintained
4. **Input Validation**: All API responses validated before storage

## Next Steps

After successful setup:

1. **Monitor Performance**: Check data collection success rate
2. **Expand Coverage**: Add more cities or data sources
3. **Optimize Schedule**: Adjust collection frequency if needed
4. **User Feedback**: Gather feedback on data accuracy and freshness

## Support

If you encounter issues:

1. Check Edge Function logs in Supabase dashboard
2. Verify GitHub Actions workflow execution
3. Test Edge Function manually with curl
4. Check database for data insertion errors
5. Review environment variable configuration

---

*This setup guide ensures the Breath Safe app transitions from placeholder data to real-time environmental monitoring with professional-grade data collection.*
