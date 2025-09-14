# AQICN-Only Migration Implementation

## Migration Overview

This migration removes OpenWeatherMap and AccuWeather integrations completely and uses AQICN as the sole provider for air quality data.

## Changes Implemented

### 1. ✅ New AQICN-Only Edge Function
**File**: `supabase/functions/fetchAQI/index.ts`

- **Purpose**: Secure server-side AQICN API calls
- **Endpoint**: `/functions/v1/fetchAQI`
- **Security**: API key stored in Supabase environment variables
- **Error Handling**: Graceful errors with user-friendly messages
- **Response Format**:
  ```json
  {
    "aqi": 101,
    "city": "Nairobi",
    "pollutants": {
      "pm25": 25.5,
      "pm10": 32.1,
      "no2": 15.2,
      "so2": 8.1,
      "co": 0.8,
      "o3": 45.3
    },
    "environmental": {
      "temperature": 22.5,
      "humidity": 65.2,
      "pressure": 1013.2
    },
    "timestamp": "2025-09-14T19:30:00.000Z",
    "dataSource": "AQICN"
  }
  ```

### 2. ✅ Updated Scheduled Data Collection
**File**: `supabase/functions/scheduled-data-collection/index.ts`

**Changes Made**:
- ❌ Removed OpenWeatherMap API integration
- ❌ Removed OpenWeatherMap weather data collection
- ✅ AQICN-only data collection for all 8 cities
- ✅ Updated data source to "AQICN"
- ✅ Environmental data limited to what AQICN provides

**Function Signature Updated**:
```typescript
// Before: 
collectCityData(city, aqicnApiKey, openWeatherApiKey, supabase)

// After:
collectCityData(city, aqicnApiKey, supabase)
```

### 3. ⏳ Frontend Hook Updates (In Progress)
**File**: `src/hooks/useAirQuality.ts`

**Required Changes**:
- Replace legacy OpenWeatherMap API calls with AQICN fetchAQI calls
- Update data source validation to accept "AQICN" 
- Remove OpenWeatherMap-specific data transformations
- Handle error states gracefully (show user-friendly message instead of fallback)

**Error Handling**:
```typescript
// Instead of fallback data:
if (aqicnError) {
  return {
    error: true,
    message: "⚠️ Live air quality data unavailable, please check back later."
  }
}
```

## Data Source Transition

### Before (Hybrid):
- **Primary**: AQICN (air quality) + OpenWeatherMap (weather)
- **Data Source**: "AQICN + OpenWeatherMap API"
- **Fallback**: OpenWeatherMap-only via `get-air-quality` function

### After (AQICN-Only):
- **Primary**: AQICN only
- **Data Source**: "AQICN"
- **Fallback**: User-friendly error message (no data fallback)

## Environmental Variables Required

### Supabase Environment Variables:
```bash
AQICN_API_KEY=your_aqicn_token_here
# Remove: OPENWEATHERMAP_API_KEY (no longer needed)
```

## Testing Protocol

### 1. Edge Function Test:
```bash
# Test the new fetchAQI function
curl -X POST https://your-project.supabase.co/functions/v1/fetchAQI \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_anon_key" \
  -d '{"lat": -1.2921, "lon": 36.8219}'
```

**Expected Response**:
```json
{
  "aqi": 101,
  "city": "Nairobi",
  "pollutants": {...},
  "environmental": {...},
  "dataSource": "AQICN"
}
```

### 2. Scheduled Collection Test:
```bash
# Test scheduled data collection
curl -X POST https://your-project.supabase.co/functions/v1/scheduled-data-collection \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_anon_key" \
  -d '{"manual": true}'
```

### 3. Frontend Validation:
**Console Logs Should Show**:
```
✅ [DataSourceValidator] dataSource: 'AQICN' - Location: Nairobi, AQI: 101
```

**NOT**:
```
🔄 [useAirQuality] Falling back to legacy API
```

## Benefits of AQICN-Only Approach

1. **Higher Accuracy**: Direct from official monitoring stations
2. **Simplified Architecture**: Single data source, no hybrid complexity
3. **Better Error Handling**: Clear user communication when data unavailable
4. **Reduced API Costs**: No OpenWeatherMap API usage
5. **Consistent Data**: All air quality data from same authoritative source

## Legacy Code Removal

### Files to Remove/Update:
- ❌ Remove `supabase/functions/get-air-quality` (OpenWeatherMap legacy)
- ❌ Remove OpenWeatherMap references in frontend validation
- ❌ Remove AccuWeather references (if any exist)
- ✅ Keep AQICN integration and fetchAQI function

## Error States

### AQICN API Unavailable:
```json
{
  "error": true,
  "message": "⚠️ Live air quality data unavailable, please check back later."
}
```

### No Fallback Data:
- **Previous**: Fallback to OpenWeatherMap or cached data
- **New**: Show user-friendly message, no data pollution

## Deployment Steps

1. ✅ **Deploy New Functions**: AQICN-only Edge Functions deployed
2. ⏳ **Update Frontend**: Complete useAirQuality hook migration
3. ⏳ **Test Integration**: Verify AQICN-only data flow
4. ⏳ **Remove Legacy**: Delete OpenWeatherMap Edge Functions
5. ⏳ **Update Documentation**: Reflect AQICN-only architecture

## Current Status

- ✅ **AQICN fetchAQI Function**: Ready for use
- ✅ **Scheduled Collection**: Updated to AQICN-only
- ⏳ **Frontend Hook**: TypeScript errors need resolution
- ⏳ **Integration Testing**: Pending frontend completion
- ✅ **Documentation**: Migration guide complete

## Next Steps

1. **Complete Frontend Migration**: Fix TypeScript errors in useAirQuality hook
2. **Deploy and Test**: Verify AQICN-only data flow on live deployment  
3. **Remove Legacy Code**: Delete OpenWeatherMap Edge Functions
4. **Monitor Performance**: Ensure AQICN reliability meets requirements

The migration to AQICN-only provides cleaner architecture, better data accuracy, and eliminates hybrid complexity while maintaining graceful error handling.