# Environment Setup Guide - AQICN Migration

## 🚨 Critical Setup Required

Based on the console logs, your AQICN migration needs proper environment configuration. Follow these steps:

## 1. Get AQICN API Key

### Free AQICN API Key:
1. Visit: https://aqicn.org/data-platform/token/
2. Click "Request API Token"
3. Fill out the form:
   - Name: Your name
   - Email: Your email address
   - Organization: Your company/personal project
   - Website: Your app URL (e.g., https://yourapp.netlify.app)
   - Purpose: "Air quality monitoring for mobile app"
4. Submit and wait for approval (usually immediate)
5. Copy your API token

## 2. Configure Supabase Environment Variables

### Add to Supabase Project:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add these variables:

```bash
AQICN_API_KEY=your_actual_aqicn_token_here
OPENWEATHERMAP_API_KEY=your_existing_openweather_key
```

## 3. Configure Netlify Environment Variables

### Add to Netlify Deployment:
1. Go to your Netlify dashboard
2. Select your site
3. Navigate to **Site settings** → **Environment variables**
4. Add these variables:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENWEATHERMAP_API_KEY=your_openweather_key
```

## 4. Test AQICN Integration

### Option 1: Using the Test Script
```bash
# Set environment variable and run test
export AQICN_API_KEY=your_actual_token
node scripts/test-aqicn-api.js
```

### Option 2: Manual API Test
```bash
# Test AQICN API directly (replace YOUR_TOKEN)
curl "https://api.waqi.info/feed/geo:-1.2921;36.8219/?token=YOUR_TOKEN"
```

Expected response:
```json
{
  "status": "ok",
  "data": {
    "aqi": 45,
    "city": {
      "name": "Nairobi"
    },
    "iaqi": {
      "pm25": {"v": 12},
      "pm10": {"v": 18}
    }
  }
}
```

## 5. Trigger Data Collection

After configuring the API key, trigger data collection:

### Manual Trigger via Supabase:
1. Go to **Edge Functions** in your Supabase dashboard
2. Find `scheduled-data-collection` function
3. Test with this payload:
```json
{
  "manual": true
}
```

## 6. Verify Integration

### Check Console Logs:
After setup, you should see:
```
✅ [useAirQuality] Using legitimate API data with AQI: 45 from: AQICN + OpenWeatherMap API
```

Instead of:
```
⚠️ [GlobalData] No environmental data found for any cities
🔄 [useAirQuality] Falling back to legacy API
```

### Check Database:
Verify in Supabase that new records show:
- `data_source = "AQICN + OpenWeatherMap API"`
- Realistic AQI values
- Recent timestamps

## 7. Common Issues & Solutions

### Issue 1: "No environmental data found"
**Cause**: AQICN API key not configured
**Solution**: Add AQICN_API_KEY to Supabase environment variables

### Issue 2: CSS/Stylesheet errors
**Cause**: Content Security Policy restrictions
**Solution**: Deploy updated netlify.toml (already done)

### Issue 3: WebSocket error 1011
**Cause**: Supabase realtime connection issues
**Solution**: Usually resolves automatically, check Supabase status

### Issue 4: API rate limits
**Cause**: Too many requests to AQICN
**Solution**: AQICN free tier has generous limits, check your usage

## 8. Expected Benefits After Setup

### Data Quality Improvements:
- **More Accurate AQI**: Direct from official monitoring stations
- **Better Coverage**: More locations available
- **Real-time Data**: Updates from government agencies
- **Consistent Values**: No more conversion artifacts

### Performance Improvements:
- **Faster Loading**: AQICN often faster than OpenWeatherMap
- **Better Caching**: More stable data for caching
- **Reduced Errors**: More reliable API responses

## 9. Rollback Instructions

If issues persist, you can temporarily rollback:

### Remove AQICN Integration:
1. Remove `AQICN_API_KEY` from Supabase environment
2. System will automatically fall back to OpenWeatherMap
3. No code changes needed - system designed for graceful fallback

## 10. Support Contacts

### AQICN API Issues:
- Website: https://aqicn.org/contact/
- Documentation: https://aqicn.org/json-api/doc/

### Supabase Issues:
- Dashboard: https://supabase.com/dashboard
- Documentation: https://supabase.com/docs

### Netlify Issues:
- Dashboard: https://app.netlify.com/
- Documentation: https://docs.netlify.com/

---

**Next Step**: Get your AQICN API key and add it to Supabase environment variables. The improved data quality will be immediately visible once configured!