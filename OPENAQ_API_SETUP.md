# OpenAQ API Configuration Guide

## 🔑 **OpenAQ API Key Required for Air Quality Monitoring**

Your Breath Safe application requires an OpenAQ API key to provide real-time air quality data. Without this key, the application will show error messages instead of fallback data.

## 📋 **Setup Instructions**

### 1. Get Your OpenAQ API Key
- Visit: [https://docs.openaq.org/docs/getting-started](https://docs.openaq.org/docs/getting-started)
- Sign up for a free account
- Generate your API key

### 2. Configure in Supabase Dashboard
1. **Go to**: Your Supabase project dashboard
2. **Navigate to**: Settings → Environment variables
3. **Add Variable**:
   - **Key**: `OPENAQ_API_KEY`
   - **Value**: `your_api_key_here`
4. **Save** the environment variable

### 3. Redeploy Edge Functions
After adding the environment variable, you must redeploy your Edge Functions:
```bash
supabase functions deploy get-air-quality
```

## 🚨 **What Happens Without the API Key**

- ❌ **No air quality data** will be displayed
- ❌ **Error messages** will appear in the console
- ❌ **Fallback data removed** - no more hardcoded AQI values
- ❌ **Air quality monitoring disabled**

## ✅ **What Happens With the API Key**

- ✅ **Real-time air quality data** from global monitoring stations
- ✅ **Accurate AQI calculations** based on actual measurements
- ✅ **Pollutant data** (PM2.5, PM10, NO2, SO2, CO, O3)
- ✅ **Location-based data** for your specific area
- ✅ **Automatic data refresh** every 15 minutes

## 🔍 **Verification**

After configuration, check the browser console for:
- ✅ **"Starting OpenAQ API calls with key: [key]..."**
- ✅ **"v3 measurements endpoint successful"**
- ✅ **Real AQI values** instead of error messages

## 📞 **Support**

If you encounter issues:
1. Check the browser console for detailed error messages
2. Verify the API key is correctly set in Supabase
3. Ensure Edge Functions are redeployed
4. Check OpenAQ API status at [https://api.openaq.org/](https://api.openaq.org/)

---

**Note**: The OpenAQ API is free for basic usage and provides access to air quality data from thousands of monitoring stations worldwide.
