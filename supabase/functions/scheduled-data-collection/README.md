# Scheduled Data Collection Edge Function

This Edge Function automatically collects environmental data from OpenWeatherMap APIs every 15 minutes and stores it in the database for all users to access.

## Purpose

- **Eliminates client-side API calls**: No more 15-minute refresh loops on the client
- **Centralized data collection**: Single source of truth for environmental data
- **Reduced API rate limiting**: Efficient server-side data collection
- **Better user experience**: Instant data access when users login

## How It Works

1. **Scheduled Execution**: Runs every 15 minutes automatically
2. **Multi-city Coverage**: Collects data for 8 major Kenyan cities
3. **Comprehensive Data**: Air quality, weather, and environmental metrics
4. **Database Storage**: Stores data in `global_environmental_data` table
5. **User Access**: Users fetch stored data instead of calling APIs directly

## Cities Covered

- Nairobi, Mombasa, Kisumu, Nakuru
- Eldoret, Thika, Kakamega, Kisii

## Data Collected

- **Air Quality**: AQI, PM2.5, PM10, NO2, SO2, CO, O3
- **Weather**: Temperature, humidity, wind, pressure, visibility
- **Environmental**: Sunrise/sunset times, weather conditions

## Manual Trigger

You can manually trigger data collection for a specific city:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/scheduled-data-collection \
  -H "Content-Type: application/json" \
  -d '{"manual": true, "city": "Nairobi"}'
```

## Environment Variables Required

- `OPENWEATHERMAP_API_KEY`: Your OpenWeatherMap API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

## Database Table

The function stores data in the `global_environmental_data` table with the following structure:

- City information (name, country, coordinates)
- Environmental metrics (AQI, pollutants, weather)
- Collection metadata (timestamp, source, active status)

## Benefits

- **Performance**: No more client-side API delays
- **Reliability**: Consistent data collection regardless of user activity
- **Scalability**: Single data source for all users
- **Cost Efficiency**: Reduced API calls and better rate limit management
