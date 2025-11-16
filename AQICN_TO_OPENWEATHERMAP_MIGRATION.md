# AQICN to OpenWeatherMap Migration

## Overview
This migration removes AQICN API entirely and switches to OpenWeatherMap as the sole data source for air quality monitoring.

## Reason for Migration

### Issues with AQICN:
1. **Poor Location Coverage**: AQICN was using stations far from requested locations (e.g., Kigali, Rwanda for Nairobi requests)
2. **Incomplete Pollutant Data**: Only provided PM2.5 for Nairobi, missing all other pollutants (PM10, NO₂, SO₂, CO, O₃)
3. **Data Quality**: Significant discrepancies between AQICN and OpenWeatherMap readings

### Benefits of OpenWeatherMap:
1. **Complete Pollutant Coverage**: Provides all 6 pollutants (PM2.5, PM10, NO₂, SO₂, CO, O₃)
2. **Accurate Location Data**: Uses coordinates directly, no distant station fallback
3. **Consistent Data**: More reliable and consistent readings
4. **Additional Weather Data**: Provides comprehensive weather metrics (temperature, humidity, wind, visibility, etc.)

## Changes Made

### 1. Scheduled Data Collection (`supabase/functions/scheduled-data-collection/index.ts`)
- ❌ **Removed**: All AQICN API calls and interfaces
- ✅ **Added**: OpenWeatherMap Air Pollution API integration
- ✅ **Added**: OpenWeatherMap Weather API integration for environmental data
- ✅ **Updated**: AQI conversion from OpenWeatherMap's 1-5 scale to standard 0-500 scale
- ✅ **Updated**: Data source label to "OpenWeatherMap"

**Key Features**:
- Fetches air pollution data from OpenWeatherMap Air Pollution API
- Fetches weather data from OpenWeatherMap Weather API
- Converts OpenWeatherMap AQI (1-5) to standard AQI (0-500)
- Provides all 6 pollutants plus comprehensive weather data
- Stores data in `global_environmental_data` table

### 2. FetchAQI Function (`supabase/functions/fetchAQI/index.ts`)
- ✅ **Updated**: Comments to reflect OpenWeatherMap data source
- ✅ **Updated**: Log messages to reference OpenWeatherMap
- ✅ **Updated**: Data source labels to "OpenWeatherMap (Scheduled)"
- ✅ **No functional changes**: Still reads from `global_environmental_data` table

### 3. Frontend Hook (`src/hooks/useAirQuality.ts`)
- ✅ **Updated**: All AQICN references to OpenWeatherMap
- ✅ **Updated**: Log messages and comments
- ✅ **Updated**: Data source labels
- ✅ **No functional changes**: Still calls `fetchAQI` function

### 4. Data Source Labels
All data source labels updated:
- `"AQICN"` → `"OpenWeatherMap"`
- `"AQICN (Scheduled)"` → `"OpenWeatherMap (Scheduled)"`
- `"AQICN (Unavailable)"` → `"OpenWeatherMap (Unavailable)"`
- `"AQICN (Error)"` → `"OpenWeatherMap (Error)"`

## AQI Conversion

OpenWeatherMap uses a 1-5 scale for AQI. We convert it to the standard 0-500 scale:

| OpenWeatherMap | Standard AQI | Category |
|----------------|--------------|----------|
| 1              | 50           | Good     |
| 2              | 100          | Fair     |
| 3              | 150          | Moderate |
| 4              | 200          | Poor     |
| 5              | 300          | Very Poor |

## Pollutant Data

OpenWeatherMap provides all pollutants in µg/m³:
- **PM2.5**: Fine particulate matter
- **PM10**: Coarse particulate matter
- **NO₂**: Nitrogen dioxide
- **SO₂**: Sulfur dioxide
- **CO**: Carbon monoxide
- **O₃**: Ozone

All pollutants are rounded to 1 decimal place and stored as `null` if not available (not `0`).

## Environmental Data

OpenWeatherMap also provides:
- Temperature (°C)
- Humidity (%)
- Wind Speed (m/s)
- Wind Direction (degrees)
- Wind Gust (m/s)
- Air Pressure (hPa)
- Visibility (km)
- Weather Condition (main weather type)
- Feels Like Temperature (°C)
- Sunrise/Sunset times

## Configuration

### Required Environment Variable
Only one API key is now required:
- `OPENWEATHERMAP_API_KEY`: Your OpenWeatherMap API key

### Removed Environment Variable
- `AQICN_API_KEY`: No longer needed

## Migration Steps

1. ✅ **Code Updated**: All functions updated to use OpenWeatherMap
2. ⏳ **Environment Variables**: Update Supabase environment variables (remove AQICN_API_KEY if present)
3. ⏳ **Next Scheduled Collection**: Wait for next scheduled collection (runs every minute) or trigger manually
4. ⏳ **Verify Data**: Check that new records have all pollutants populated

## Testing

After migration, verify:
1. **Database Records**: Check `global_environmental_data` table for new records with `data_source = 'OpenWeatherMap'`
2. **Pollutant Coverage**: Verify all 6 pollutants are populated (not null)
3. **Frontend Display**: Check dashboard shows all pollutants
4. **History Entries**: New history entries should show all pollutants

## Rollback

If needed, rollback by:
1. Reverting code changes
2. Restoring AQICN_API_KEY environment variable
3. Triggering scheduled collection

## Notes

- Old records with AQICN data will remain in the database (historical data)
- New records will use OpenWeatherMap exclusively
- The `fetchAQI` function still works the same way - it just reads different data from the database
- All pollutant values are properly converted from `0` to `null` when saving to history

