# History Pollutant Data Fix

## Problem
History entries are only showing PM2.5 data, not other pollutants (PM10, NO₂, SO₂, CO, O₃). This is because:

1. **Existing Database Records**: The `global_environmental_data` table contains old records that only have PM2.5 (from before the OpenWeatherMap fallback was implemented)
2. **Data Flow**: When users fetch air quality data:
   - `fetchAQI` reads from `global_environmental_data`
   - If the record only has PM2.5, that's all that gets returned
   - History saves what's returned, so only PM2.5 gets saved

## Solution Implemented

### 1. Scheduled Data Collection Fix
We've already fixed the `scheduled-data-collection` function to:
- Use AQICN as primary source
- Use OpenWeatherMap as fallback for missing pollutants
- Merge both data sources (AQICN takes priority)

### 2. Enhanced Logging
Added comprehensive logging to:
- `scheduled-data-collection/index.ts`: Logs what pollutants are available from AQICN and OpenWeatherMap
- `useAirQuality.ts`: Logs pollutants received from `fetchAQI` and what gets saved to history

## Next Steps

### Immediate Action Required
1. **Wait for Next Scheduled Collection**: The scheduled collection runs every minute, so new data with all pollutants should be available soon
2. **OR Manually Trigger Collection**: You can manually trigger the scheduled collection function to get new data immediately:
   ```bash
   # Using Supabase CLI or dashboard
   # Call the scheduled-data-collection function
   ```

### Verification
After new data is collected, check:
1. **Console Logs**: Look for the new logging messages showing all pollutants
2. **Database**: Query `global_environmental_data` to verify all pollutants are populated
3. **History**: New history entries should show all pollutants

### Expected Behavior
- **New Records**: Will have all pollutants (PM2.5, PM10, NO₂, SO₂, CO, O₃) from either AQICN or OpenWeatherMap fallback
- **Old Records**: Will continue to show only PM2.5 (this is expected - they're historical data)
- **History Display**: `HistoryRow` component filters out `null` values, so only available pollutants are shown

## Testing

1. **Check Console Logs**:
   - Look for `📊 [useAirQuality] Pollutants from fetchAQI:` - should show all pollutants
   - Look for `📝 [useAirQuality] Scheduling ... AQI history insert` - should show all pollutants being saved

2. **Check Database**:
   ```sql
   SELECT pm25, pm10, no2, so2, co, o3, data_source, collection_timestamp 
   FROM global_environmental_data 
   WHERE is_active = true 
   ORDER BY collection_timestamp DESC 
   LIMIT 5;
   ```

3. **Check History**:
   - Create a new air quality reading
   - Check the history view - should show all available pollutants

## Notes

- The `toNullableNumber` function correctly converts `0` to `null` (meaning "not available")
- `HistoryRow` correctly filters out `null` values (only shows available pollutants)
- The fix ensures future data will have all pollutants, but old records will remain as-is

