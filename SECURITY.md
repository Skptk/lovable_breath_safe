# 🔒 Security Guidelines

## Environment Variables

This project uses environment variables to store sensitive configuration. **Never commit API keys or secrets to version control.**

### Required Environment Variables

Create a `.env.local` file in the root directory with:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENWEATHERMAP_API_KEY=your_openweathermap_api_key
```

### How to Get API Keys

1. **Supabase Keys**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to Settings > API
   - Copy the Project URL and anon/public key

2. **OpenWeatherMap API Key** (Optional):
   - Sign up at [OpenWeatherMap](https://openweathermap.org/api)
   - Generate an API key
   - This is used for reverse geocoding (converting coordinates to city names)

## Security Measures Implemented

### ✅ Fixed Security Issues

1. **Removed hardcoded API keys** from:
   - README.md
   - src/integrations/supabase/client.ts
   - src/components/MapView.tsx
   - netlify.toml
   - vercel.json
   - deploy.md

2. **Enhanced .gitignore** to prevent secrets from being committed:
   - Added all .env file patterns
   - Added common secret file extensions

3. **Added proper error handling** for missing environment variables

4. **Created env.example** template for safe onboarding

### 🛡️ Security Best Practices

1. **Environment Variables**: All sensitive data is now stored in environment variables
2. **No Fallback Values**: Removed hardcoded fallback API keys
3. **Proper Error Messages**: Clear errors when environment variables are missing
4. **Git Protection**: Enhanced .gitignore to prevent future secret leaks

### 📋 Deployment Security Checklist

When deploying to any platform:

- [ ] Set environment variables in the platform's dashboard (not in config files)
- [ ] Verify no secrets are in the repository
- [ ] Test that the application fails gracefully without environment variables
- [ ] Monitor for any exposed secrets in logs or error messages

### 🚨 Security Incident Response

If a secret is accidentally exposed:

1. **Immediately rotate** the compromised API key
2. **Remove the secret** from all git history (if committed)
3. **Update deployment environments** with new keys
4. **Review access logs** for any unauthorized usage

### 📞 Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **Do not** create a public issue
2. Contact the maintainers directly
3. Provide detailed information about the vulnerability

## Environment-Specific Configuration

### Development
- Use `.env.local` for local development
- Never commit `.env.local` to version control

### Production
- Set environment variables in your deployment platform:
  - **Netlify**: Site settings > Environment variables
  - **Vercel**: Project settings > Environment Variables
  - **GitHub Pages**: Repository settings > Secrets and variables

### Testing
- Use separate API keys for testing environments
- Consider using mock services for automated tests

## Additional Security Resources

- [OWASP Environment Variables Security](https://owasp.org/www-community/vulnerabilities/Environment_Variables)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/auth-helpers/nextjs#security)
- [Vite Environment Variables Guide](https://vitejs.dev/guide/env-and-mode.html)
