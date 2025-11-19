# Supabase Email Configuration Guide

## Overview

This guide explains how to configure Supabase email services for user signup and email verification. By default, Supabase provides a basic email service with rate limits, but for production use, you should configure a custom SMTP provider.

## Problem: Email Verification Not Working

If users are not receiving verification emails during signup, the most common causes are:

1. **SMTP Not Configured**: Supabase's default email service has low rate limits and may not send emails reliably
2. **Email Confirmation Disabled**: Email confirmation may be disabled in Supabase Auth settings
3. **SMTP Configuration Errors**: Incorrect SMTP settings prevent email delivery
4. **Email Provider Blocking**: The recipient's email server may block emails from Supabase's default sender

## Solution: Configure Custom SMTP

### Step 1: Choose an SMTP Provider

Recommended SMTP providers for Supabase:

- **SendGrid** (Recommended) - Free tier: 100 emails/day
- **Mailgun** - Free tier: 5,000 emails/month
- **Postmark** - Paid, high deliverability
- **AWS SES** - Pay-as-you-go
- **Gmail/Google Workspace** - Free for personal use, paid for business

### Step 2: Configure SMTP in Supabase Dashboard

1. **Go to Supabase Dashboard**
   - Navigate to: `https://supabase.com/dashboard`
   - Select your project

2. **Open Authentication Settings**
   - Go to **Settings** → **Authentication**
   - Scroll to **SMTP Settings** section

3. **Enable Custom SMTP**
   - Toggle **Enable Custom SMTP**
   - Enter your SMTP provider details:

#### Example: SendGrid Configuration
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587 (or 465 for SSL)
SMTP User: apikey
SMTP Password: [Your SendGrid API Key]
Sender Email: noreply@yourdomain.com
Sender Name: Your App Name
```

#### Example: Mailgun Configuration
```
SMTP Host: smtp.mailgun.org
SMTP Port: 587
SMTP User: postmaster@yourdomain.mailgun.org
SMTP Password: [Your Mailgun SMTP Password]
Sender Email: noreply@yourdomain.com
Sender Name: Your App Name
```

#### Example: Gmail Configuration
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-email@gmail.com
SMTP Password: [Gmail App Password]
Sender Email: your-email@gmail.com
Sender Name: Your App Name
```

### Step 3: Configure Site URL

1. In **Authentication** settings, find **Site URL**
2. Set to your application's base URL:
   - Local: `http://localhost:5173`
   - Production: `https://yourdomain.com`

### Step 4: Verify Email Confirmation is Enabled

1. In **Authentication** settings, find **Email Auth**
2. Ensure **Enable email confirmations** is toggled ON
3. This ensures users must verify their email before signing in

### Step 5: Customize Email Templates (Optional)

1. In **Authentication** settings, find **Email Templates**
2. Customize templates for:
   - **Confirm signup** - Sent when user signs up
   - **Magic Link** - Sent for passwordless login
   - **Change Email Address** - Sent when email is changed
   - **Reset Password** - Sent for password reset

3. Use template variables:
   - `{{ .ConfirmationURL }}` - Email confirmation link
   - `{{ .Email }}` - User's email address
   - `{{ .Token }}` - Verification token

### Step 6: Test Email Configuration

1. **Use the Supabase Dashboard**
   - Go to **Authentication** → **Users**
   - Try creating a test user
   - Check if verification email is received

2. **Check Auth Logs**
   - Go to **Logs** → **Auth Logs**
   - Look for email delivery errors
   - Common errors:
     - `SMTP connection failed` - Check SMTP credentials
     - `Authentication failed` - Check SMTP username/password
     - `Rate limit exceeded` - Upgrade SMTP plan or wait

## Application Code Improvements

The application code has been updated to detect when emails are not being sent:

### Detection Logic

The signup flow now checks:
1. **Email confirmation required**: `!data.session` (no session means confirmation required)
2. **Email sent**: `!!data.user?.confirmation_sent_at` (timestamp indicates email was sent)

### Warning Messages

If email confirmation is required but no email was sent, users will see:
- **Warning toast**: "Email verification may not have been sent. Please check your Supabase email/SMTP configuration."

This helps identify configuration issues early.

## Troubleshooting

### Issue: Users Still Not Receiving Emails

1. **Check Supabase Logs**
   - Go to **Logs** → **Auth Logs**
   - Look for SMTP errors or delivery failures

2. **Verify SMTP Credentials**
   - Double-check SMTP host, port, username, and password
   - Ensure sender email matches SMTP provider's requirements

3. **Check Spam Folder**
   - Ask users to check spam/junk folders
   - Emails may be filtered by recipient's email provider

4. **Verify Domain Configuration**
   - If using custom domain, ensure DNS records are correct
   - Check SPF, DKIM, and DMARC records

5. **Test SMTP Connection**
   - Use tools like `telnet` or SMTP testers
   - Verify SMTP server is accessible

### Issue: Rate Limits Exceeded

- **Upgrade SMTP Plan**: Increase rate limits with your provider
- **Implement Queue**: Queue email sends and rate limit client-side
- **Use Multiple Providers**: Distribute load across providers

### Issue: Email Confirmation Disabled

If email confirmation is disabled:
- Users can sign in immediately after signup
- No verification email is sent
- Application will detect this and show appropriate message

## Best Practices

1. **Use Custom SMTP for Production**
   - Never rely on Supabase's default email service in production
   - Always configure a custom SMTP provider

2. **Use Dedicated Domain**
   - Use a dedicated domain for email sending (e.g., `noreply@yourdomain.com`)
   - Improves deliverability and brand recognition

3. **Monitor Email Delivery**
   - Check Supabase Auth logs regularly
   - Monitor bounce rates with your SMTP provider
   - Set up alerts for delivery failures

4. **Test Before Production**
   - Test email delivery in staging environment
   - Verify all email templates work correctly
   - Test with multiple email providers (Gmail, Outlook, etc.)

5. **Handle Edge Cases**
   - Provide "Resend Email" functionality
   - Show clear error messages when emails fail
   - Allow users to contact support if issues persist

## Additional Resources

- [Supabase Email Troubleshooting](https://supabase.com/docs/guides/auth/auth-email)
- [Supabase SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [SendGrid Setup Guide](https://docs.sendgrid.com/for-developers/sending-email/getting-started-smtp)
- [Mailgun Setup Guide](https://documentation.mailgun.com/en/latest/quickstart-sending.html)

## Quick Checklist

- [ ] Custom SMTP provider selected and configured
- [ ] SMTP credentials added to Supabase dashboard
- [ ] Site URL configured correctly
- [ ] Email confirmation enabled
- [ ] Email templates customized (optional)
- [ ] Test email sent and received
- [ ] Auth logs checked for errors
- [ ] Production domain configured (if applicable)

---

**Last Updated**: 2025-01-23
**Related Files**: 
- `src/contexts/AuthContext.tsx` - Signup function with email detection
- `src/pages/Auth.tsx` - Auth page with improved email handling
- `src/pages/Onboarding.tsx` - Onboarding flow with email verification

