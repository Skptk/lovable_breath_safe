# AQICN Migration Guide

## Overview

This guide documents the migration from OpenWeatherMap-only air quality data to a hybrid AQICN + OpenWeatherMap approach for improved accuracy and data quality.

## Why AQICN?

### Benefits of AQICN over OpenWeatherMap Air Quality API:

1. **Higher Accuracy**: AQICN aggregates data from official government monitoring stations
2. **Better Coverage**: More monitoring stations worldwide, especially in urban areas
3. **Real-time Data**: Direct connection to official air quality monitoring networks
4. **Standard AQI Values**: Provides AQI values on standard 0-500 scale
5. **Detailed Pollutant Data**: More comprehensive pollutant measurements
6. **Official Sources**: Data comes from EPA, WHO, and other official agencies

## Architecture Changes

### New Hybrid Approach:
- **AQICN API**: Primary source for air quality data (AQI, PM2.5, PM10, pollutants)
- **OpenWeatherMap API**: Secondary source for detailed weather data (wind, pressure, sunrise/sunset)

### Data Flow:
1. Scheduled data collection function calls both APIs
2. AQICN provides air quality metrics
3. OpenWeatherMap provides weather context
4. Combined data stored as "AQICN + OpenWeatherMap API" source

## Required Environment Variables

### Production (Supabase Edge Functions):
Add these to your Supabase project settings:

```bash
AQICN_API_KEY=your_aqicn_api_token_here
OPENWEATHERMAP_API_KEY=your_openweather_api_key_here
```

### Development (Local):
Add to your `.env.local` file:

```bash
VITE_AQICN_API_KEY=your_aqicn_api_token_here
VITE_OPENWEATHERMAP_API_KEY=your_openweather_api_key_here
```

## Getting API Keys

### AQICN API Key:
1. Visit: https://aqicn.org/data-platform/token/
2. Create a free account
3. Request an API token
4. Copy the token for use as `AQICN_API_KEY`

**Note**: AQICN offers free tier with reasonable limits for most applications.

### OpenWeatherMap API Key:
1. Visit: https://openweathermap.org/api
2. Sign up for free account
3. Get API key from dashboard
4. Use for `OPENWEATHERMAP_API_KEY`

## Implementation Details

### Updated Data Collection Function:

The `scheduled-data-collection` Edge Function now:

1. **Calls AQICN API** for each city:
   ```
   https://api.waqi.info/feed/geo:{lat};{lon}/?token={api_key}
   ```

2. **Calls OpenWeatherMap API** for weather data:
   ```
   https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric
   ```

3. **Combines data** into comprehensive environmental record

### Data Source Identification:
- Previous: `"OpenWeatherMap API"`
- New: `"AQICN + OpenWeatherMap API"`

### Validation Updates:
The client-side validation now accepts both:
- `"OpenWeatherMap API"` (legacy)
- `"AQICN + OpenWeatherMap API"` (new)

## Testing the Migration

### 1. Verify API Keys:
Test both APIs manually:

```bash
# Test AQICN (replace with your token)
curl "https://api.waqi.info/feed/geo:-1.2921;36.8219/?token=YOUR_TOKEN"

# Test OpenWeatherMap (replace with your key)
curl "https://api.openweathermap.org/data/2.5/weather?lat=-1.2921&lon=36.8219&appid=YOUR_KEY&units=metric"
```

### 2. Trigger Data Collection:
Run the data collection manually to test:

```javascript
// From browser console or trigger script
await supabase.functions.invoke('scheduled-data-collection', {
  body: { manual: true }
});
```

### 3. Verify Database:
Check that new records have:
- `data_source = "AQICN + OpenWeatherMap API"`
- Realistic AQI values (0-500 range)
- Complete pollutant data

## Expected Improvements

### Data Quality:
- **More Accurate AQI**: Direct from official monitoring stations
- **Better Pollutant Data**: More comprehensive measurements
- **Reduced Errors**: Fewer data anomalies and inconsistencies

### User Experience:
- **Faster Loading**: AQICN often has faster response times
- **Better Coverage**: More cities and locations available
- **Real-time Updates**: More frequent data updates

### System Performance:
- **Reduced API Calls**: AQICN provides more data per call
- **Better Caching**: More stable data for efficient caching
- **Improved Reliability**: Less prone to API failures

## Rollback Plan

If issues occur, the system will:

1. **Automatic Fallback**: Legacy OpenWeatherMap API still available
2. **Graceful Degradation**: System continues working with existing data
3. **Manual Rollback**: Can revert Edge Function to OpenWeatherMap-only

To rollback manually:
1. Remove AQICN API calls from Edge Function
2. Update data source back to "OpenWeatherMap API"
3. Remove AQICN validation from client code

## Monitoring

### Key Metrics to Watch:
- **API Response Times**: AQICN vs OpenWeatherMap performance
- **Data Accuracy**: Compare AQI values with local monitoring stations
- **Error Rates**: Monitor failed API calls and data validation
- **User Feedback**: Watch for user reports about data accuracy

### Logs to Monitor:
- `✅ [useAirQuality] Using legitimate API data with AQI: X from: AQICN + OpenWeatherMap API`
- Supabase Edge Function logs for data collection success/failure
- Database records with new data source

## Troubleshooting

### Common Issues:

1. **AQICN API Key Invalid**:
   - Verify token at https://aqicn.org/data-platform/token/
   - Check rate limits (free tier has limits)

2. **No Data for Location**:
   - AQICN might not have stations near some coordinates
   - System will gracefully fallback to OpenWeatherMap

3. **AQI Values Seem Wrong**:
   - AQICN uses standard AQI scale (0-500)
   - Verify with official monitoring stations in the area

4. **Performance Issues**:
   - Check API response times in Edge Function logs
   - Consider adjusting collection intervals if needed

## Migration Checklist

- [ ] Obtain AQICN API key
- [ ] Configure environment variables in Supabase
- [ ] Deploy updated Edge Function
- [ ] Test data collection manually
- [ ] Verify new data appears in database
- [ ] Monitor system performance
- [ ] Update documentation
- [ ] Inform users about improved accuracy

## Support

For issues with:
- **AQICN API**: Contact support at https://aqicn.org/contact/
- **OpenWeatherMap API**: Check documentation at https://openweathermap.org/api
- **Application Issues**: Check Supabase Edge Function logs and database records