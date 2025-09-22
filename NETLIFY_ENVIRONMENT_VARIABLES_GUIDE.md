# 🚨 CRITICAL: Netlify Environment Variables Setup Guide

## Problem Identified
The diagnostic script revealed that `VITE_SUPABASE_URL` is still present in the built JavaScript file, which means **environment variables are not being replaced during the build process on Netlify**. This causes the Supabase client initialization to fail, resulting in a blank page.

## Root Cause
The Supabase client validation in `src/integrations/supabase/client.ts` throws an error when environment variables are missing, causing the entire React app to crash before it can render anything.

## ✅ Solution Steps

### Step 1: Set Environment Variables in Netlify Dashboard

1. **Go to your Netlify dashboard**
2. **Select your site**
3. **Go to Site settings → Environment variables**
4. **Add these variables:**

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_OPENWEATHERMAP_API_KEY=your_openweathermap_api_key_here
```

**Important Notes:**
- Replace `your-project-id` with your actual Supabase project ID
- Replace `your_supabase_anon_key_here` with your actual Supabase anonymous key
- Replace `your_openweathermap_api_key_here` with your actual OpenWeatherMap API key
- Do NOT include quotes around the values
- Make sure there are no extra spaces

### Step 2: Trigger New Deployment

After setting the environment variables:

1. **Go to Site overview**
2. **Click "Trigger deploy"**
3. **Select "Deploy site"**
4. **Wait for deployment to complete**

### Step 3: Verify Fix

After deployment:

1. **Visit your Netlify URL**
2. **Open browser DevTools (F12)**
3. **Check Console tab for errors**
4. **Check Network tab to ensure assets load correctly**

## Expected Results After Fix

### ✅ Success Indicators:
- No more "Missing Supabase environment variables" errors
- App loads and shows the landing page
- Console shows: `✅ [Config] Environment detected: { isNetlify: true, isDevelopment: false }`
- Supabase connection diagnostics show successful connection

### ❌ If Still Blank:
- Check that environment variable names match exactly (case-sensitive)
- Verify values are correct (no extra spaces, quotes, or characters)
- Check Netlify build logs for any errors
- Ensure you triggered a new deployment after setting variables

## Alternative: Enhanced Error Handling (If Variables Still Missing)

If you continue to have issues, I can implement enhanced error handling that provides a fallback UI instead of crashing the app. This would show a user-friendly error message instead of a blank page.

## Getting Your Supabase Credentials

If you don't have your Supabase credentials:

1. **Go to [Supabase Dashboard](https://supabase.com/dashboard)**
2. **Select your project**
3. **Go to Settings → API**
4. **Copy:**
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

## Getting OpenWeatherMap API Key

If you don't have an OpenWeatherMap API key:

1. **Go to [OpenWeatherMap API](https://openweathermap.org/api)**
2. **Sign up for a free account**
3. **Get your API key from the dashboard**
4. **Add it as `VITE_OPENWEATHERMAP_API_KEY`**

---

## 🚨 CRITICAL ACTION REQUIRED

**You must set these environment variables in Netlify for the app to work. Without them, the app will always show a blank page because the Supabase client cannot initialize.**

The diagnostic confirmed this is the exact issue causing your blank page problem.
