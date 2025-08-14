# 🚀 Quick Deployment Guide

## Why Deploy?

- **Email Verification**: Supabase requires a proper domain for email verification
- **Authentication Testing**: Test the full authentication flow
- **Real Environment**: Simulate production conditions

## Option 1: Netlify (Fastest - 5 minutes)

1. **Sign up** at [netlify.com](https://netlify.com)
2. **Click "New site from Git"**
3. **Connect GitHub** and select this repository
4. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Click "Deploy site"**
6. **Set environment variables** in Site settings > Environment variables:
   - `VITE_SUPABASE_URL`: `https://bmqdbetupttlthpadseq.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

## Option 2: Vercel (Also Fast - 5 minutes)

1. **Sign up** at [vercel.com](https://vercel.com)
2. **Click "New Project"**
3. **Import Git repository** and select this repo
4. **Framework preset**: Vite
5. **Click "Deploy"**
6. **Set environment variables** in Project settings

## Option 3: Manual Upload (Immediate)

1. **Build locally**:
   ```bash
   npm run build
   ```
2. **Upload `dist` folder** to any web hosting service
3. **Set environment variables** if the service supports them

## Environment Variables Required

```
VITE_SUPABASE_URL=https://bmqdbetupttlthpadseq.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## After Deployment

1. **Visit your deployed URL**
2. **Try the authentication flow**
3. **Email verification should work** (check your email)
4. **Test all features** with real authentication

## Troubleshooting

- **Build fails**: Check Node.js version (18+ required)
- **Environment variables**: Make sure they're set correctly
- **Authentication errors**: Verify Supabase credentials
- **Email not received**: Check spam folder, verify Supabase email settings

