# Deployment Guide

This document outlines the deployment process and important notes for the Lovable Breath Safe application.

## Build Configuration

The application uses Vite with the following custom build settings:

```javascript
// vite.config.ts
esbuild: {
  keepNames: true,           // Preserve original variable names
  minifyIdentifiers: false,  // Prevent identifier mangling
  minifySyntax: true,        // Still minify syntax
  minifyWhitespace: true,    // Still minify whitespace
  legalComments: 'none',     // Remove comments
  target: 'es2020',          // Target modern JavaScript
}
```

## Deployment Process

### Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)
- Git
- Netlify CLI (optional)

### Local Build & Test

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

4. Preview production build locally:
   ```bash
   npm run preview
   ```

### Deploy to Netlify

The application is configured for automatic deployment via Netlify. Pushing to the `main` branch will trigger a new deployment.

#### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to Netlify:
   ```bash
   # If you have Netlify CLI installed
   netlify deploy --prod
   ```

## Troubleshooting

### Build Errors

1. **ReferenceError: Cannot access 'l' before initialization**
   - This occurs when ESBuild minifies variable names in a way that affects hoisting
   - Solution: Ensure `keepNames: true` and `minifyIdentifiers: false` in Vite config

2. **TypeScript Errors**
   - Run type checking:
     ```bash
     npm run type-check
     ```
   - Fix any type errors before deploying

### Environment Variables

Ensure all required environment variables are set in Netlify:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_OPENWEATHER_API_KEY`
- `VITE_WEATHER_API_KEY`

## Rollback

If a deployment fails or introduces issues:

1. Revert to a previous commit:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. Or rollback in Netlify:
   - Go to Site settings > Deploys
   - Select a previous successful deploy
   - Click "Deploy to production"

## Monitoring

- Check Netlify Deploys for build logs
- Monitor application logs in Netlify Functions
- Set up error tracking (e.g., Sentry) for runtime errors
