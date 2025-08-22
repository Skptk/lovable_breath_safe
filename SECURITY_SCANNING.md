# Security Scanning & Monitoring

This document outlines the security measures implemented in the Breath Safe project, including automated secret scanning, pre-commit hooks, and CI/CD security checks.

## 🔒 Secret Scanning with GitGuardian

### Overview
GitGuardian CLI automatically scans your codebase for:
- API keys and tokens
- Database credentials
- Private keys and certificates
- Environment variables with sensitive values
- Hardcoded passwords and secrets

### Installation & Setup

#### 1. Install GitGuardian CLI
```bash
npm install -g @gitguardian/ggshield
```

#### 2. Authenticate (Optional)
```bash
ggshield auth login
```

#### 3. Configure Environment Variables
```bash
# For CI/CD (GitHub Actions)
export GG_TOKEN="your_gitguardian_token"

# For local development
echo "GG_TOKEN=your_gitguardian_token" >> .env.local
```

### Usage

#### Manual Scanning
```bash
# Scan entire repository
npm run secret-scan

# Scan specific files
ggshield scan src/components/

# Scan staged files only
ggshield scan pre-commit
```

#### Pre-commit Hook
The project includes a pre-commit hook that automatically runs:
- Secret scanning with GitGuardian
- ESLint code quality checks

This prevents commits with secrets from being pushed to the repository.

### Configuration
The `.gitguardian.yaml` file configures:
- File patterns to scan
- Excluded directories
- Output format and verbosity
- API settings

## 🚀 Lighthouse CI Integration

### Overview
Lighthouse CI automatically audits your application for:
- Performance metrics
- Accessibility compliance
- SEO optimization
- Best practices adherence

### Usage

#### Local Auditing
```bash
# Run full Lighthouse CI pipeline
npm run lhci

# Individual steps
npm run lhci:collect    # Collect metrics
npm run lhci:assert     # Check thresholds
npm run lhci:upload     # Upload results
```

#### Performance Thresholds
The project enforces strict performance standards:
- **Performance**: ≥ 85
- **Accessibility**: ≥ 90
- **Best Practices**: ≥ 90
- **SEO**: ≥ 90

Builds will fail if these thresholds are not met.

### Configuration
The `.lighthouserc.js` file configures:
- Collection settings
- Performance thresholds
- Output directories
- CI-specific optimizations

## 🔧 CI/CD Integration

### GitHub Actions Workflow
The `.github/workflows/security-and-performance.yml` workflow:

1. **Security Scan**: Runs GitGuardian on every push/PR
2. **Lighthouse Audit**: Performs performance testing
3. **Deploy**: Only deploys if all checks pass

### Netlify Integration
For Netlify deployments, the workflow:
- Builds the project
- Runs security scans
- Performs Lighthouse audits
- Deploys only if all checks pass

### Required Secrets
Configure these secrets in your GitHub repository:

```bash
# GitGuardian API token
GG_TOKEN=your_gitguardian_token

# Lighthouse CI GitHub App token
LHCI_GITHUB_APP_TOKEN=your_lhci_token

# Netlify deployment
NETLIFY_AUTH_TOKEN=your_netlify_token
NETLIFY_SITE_ID=your_site_id
```

## 📋 Security Checklist

### Before Committing
- [ ] Run `npm run security:check`
- [ ] Ensure no secrets in code
- [ ] Pass all linting checks
- [ ] Verify environment variables are properly configured

### Before Deploying
- [ ] All security scans pass
- [ ] Lighthouse thresholds met
- [ ] No hardcoded credentials
- [ ] Environment variables properly set in deployment platform

### Regular Maintenance
- [ ] Update GitGuardian CLI monthly
- [ ] Review security scan results
- [ ] Monitor performance metrics
- [ ] Update dependencies for security patches

## 🚨 Remediation Steps

### If Secrets Are Detected

1. **Immediate Action**
   ```bash
   # Remove the secret from git history
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch path/to/file' \
     --prune-empty --tag-name-filter cat -- --all
   ```

2. **Rotate Credentials**
   - Change the exposed API key/token
   - Update environment variables
   - Notify relevant services

3. **Prevent Future Exposure**
   - Review `.gitignore` settings
   - Use environment variables consistently
   - Run pre-commit hooks

### If Performance Thresholds Fail

1. **Analyze Report**
   ```bash
   # View detailed Lighthouse report
   open reports/lighthouse/*.html
   ```

2. **Identify Issues**
   - Large bundle sizes
   - Slow loading times
   - Accessibility violations
   - SEO problems

3. **Implement Fixes**
   - Optimize images and assets
   - Implement code splitting
   - Fix accessibility issues
   - Optimize meta tags

## 📚 Additional Resources

- [GitGuardian Documentation](https://docs.gitguardian.com/)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides)
- [Netlify Security Headers](https://docs.netlify.com/headers-and-ssl/)

## 🆘 Support

If you encounter issues with:
- **Secret Scanning**: Check GitGuardian configuration and API tokens
- **Lighthouse CI**: Verify build process and performance thresholds
- **CI/CD Pipeline**: Check GitHub Actions logs and secrets configuration
- **Security Headers**: Review Netlify configuration and CSP policies

For immediate security concerns, contact the development team or review the security logs in your CI/CD pipeline.
