# Lighthouse CI Integration

This document provides comprehensive guidance on using Lighthouse CI for automated performance, accessibility, SEO, and best practices auditing in the Breath Safe project.

## 🚀 Overview

Lighthouse CI automatically runs performance audits on your application to ensure it meets quality standards before deployment. It integrates seamlessly with your CI/CD pipeline and provides detailed reports for optimization.

## 📊 Performance Thresholds

The project enforces strict performance standards that must be met for successful builds:

| Category | Threshold | Status |
|----------|-----------|---------|
| **Performance** | ≥ 85 | 🟡 Warning if < 85, ❌ Error if < 80 |
| **Accessibility** | ≥ 90 | ❌ Error if < 90 |
| **Best Practices** | ≥ 90 | ❌ Error if < 90 |
| **SEO** | ≥ 90 | ❌ Error if < 90 |

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- Chrome/Chromium browser
- Build access to your application

### Installation
```bash
# Install Lighthouse CI globally
npm install -g @lhci/cli

# Or use project dependency
npm install --save-dev @lhci/cli
```

### Configuration
The `.lighthouserc.js` file configures:
- Collection settings and URLs
- Performance thresholds
- Output directories
- CI-specific optimizations

## 📋 Usage Commands

### Full Pipeline
```bash
# Run complete Lighthouse CI pipeline
npm run lhci
```

### Individual Steps
```bash
# Step 1: Collect metrics
npm run lhci:collect

# Step 2: Assert thresholds
npm run lhci:assert

# Step 3: Upload results
npm run lhci:upload
```

### Manual Scanning
```bash
# Scan specific URL
npx lhci collect --url="https://your-app.netlify.app"

# Custom configuration
npx lhci collect --config=./custom-lighthouse.config.js
```

## 🔧 Configuration Details

### Collection Settings
```javascript
collect: {
  startServerCommand: 'npm run preview',  // Start local server
  url: ['http://localhost:4173'],         // URLs to audit
  numberOfRuns: 3,                        // Number of test runs
  settings: {
    chromeFlags: '--no-sandbox --disable-dev-shm-usage',
    emulatedFormFactor: 'desktop',        // Device emulation
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
  }
}
```

### Assertion Rules
```javascript
assert: {
  assertions: {
    // Category thresholds
    'categories:performance': ['error', { minScore: 0.85 }],
    'categories:accessibility': ['error', { minScore: 0.90 }],
    
    // Specific metrics
    'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
    'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
    'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }]
  }
}
```

## 📈 Understanding Metrics

### Core Web Vitals
- **LCP (Largest Contentful Paint)**: ≤ 2.5s (Good), ≤ 4.0s (Needs Improvement)
- **FID (First Input Delay)**: ≤ 100ms (Good), ≤ 300ms (Needs Improvement)  
- **CLS (Cumulative Layout Shift)**: ≤ 0.1 (Good), ≤ 0.25 (Needs Improvement)

### Performance Metrics
- **First Contentful Paint**: Time to first visual content
- **Speed Index**: How quickly content is visually displayed
- **Total Blocking Time**: Total time when main thread was blocked

### Accessibility Score
- **Color Contrast**: Text readability
- **Image Alt Text**: Screen reader support
- **Keyboard Navigation**: Tab order and focus management
- **ARIA Labels**: Proper semantic markup

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check specific assertion failures
npm run lhci:assert -- --verbose

# View detailed reports
open reports/lighthouse/*.html
```

#### Performance Issues
1. **Large Bundle Size**: Implement code splitting
2. **Slow Images**: Optimize and compress images
3. **Render Blocking**: Defer non-critical CSS/JS
4. **Server Response**: Optimize API endpoints

#### Accessibility Issues
1. **Color Contrast**: Use sufficient color contrast ratios
2. **Missing Alt Text**: Add descriptive alt attributes
3. **Keyboard Navigation**: Ensure tab order is logical
4. **ARIA Implementation**: Use proper ARIA attributes

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm run lhci

# Custom Chrome flags
npx lhci collect --chrome-flags="--disable-gpu --no-sandbox"
```

## 🔄 CI/CD Integration

### GitHub Actions
The workflow automatically:
1. Builds your application
2. Starts preview server
3. Runs Lighthouse audits
4. Fails build if thresholds not met
5. Uploads reports as artifacts

### Netlify Integration
For Netlify builds:
- Lighthouse CI runs after successful build
- Performance thresholds must be met
- Reports stored in `/reports/lighthouse/`
- Build fails if standards not achieved

### Local Development
```bash
# Pre-commit check
npm run lhci:collect && npm run lhci:assert

# Development server audit
npm run dev &
npx lhci collect --url="http://localhost:5173"
```

## 📊 Report Analysis

### HTML Reports
```bash
# Open latest report
open reports/lighthouse/*.html

# View specific metrics
open reports/lighthouse/lhr-*.html
```

### JSON Reports
```bash
# Parse JSON results
cat reports/lighthouse/lhr-*.json | jq '.categories.performance.score'
```

### Performance Insights
- **Opportunities**: Quick wins for improvement
- **Diagnostics**: Detailed performance analysis
- **Passed Audits**: What's working well
- **Failed Audits**: What needs fixing

## 🎯 Optimization Strategies

### Performance
1. **Code Splitting**: Lazy load components
2. **Image Optimization**: WebP format, proper sizing
3. **Bundle Analysis**: Use `npm run analyze`
4. **Caching**: Implement proper cache headers

### Accessibility
1. **Semantic HTML**: Use proper tags and structure
2. **ARIA Labels**: Enhance screen reader support
3. **Keyboard Navigation**: Ensure logical tab order
4. **Color Contrast**: Meet WCAG guidelines

### SEO
1. **Meta Tags**: Proper title and description
2. **Structured Data**: JSON-LD implementation
3. **Performance**: Core Web Vitals optimization
4. **Mobile First**: Responsive design

## 📚 Resources

- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Web.dev Performance Guide](https://web.dev/performance/)
- [Web.dev Accessibility Guide](https://web.dev/accessibility/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)

## 🆘 Support

### Getting Help
1. **Check Logs**: Review CI/CD pipeline logs
2. **Local Testing**: Run `npm run lhci` locally
3. **Report Analysis**: Examine HTML reports for details
4. **Documentation**: Refer to Lighthouse CI docs

### Common Commands
```bash
# Health check
npx lhci doctor

# Version info
npx lhci --version

# Help
npx lhci --help
```

### Performance Monitoring
- Monitor metrics over time
- Set up alerts for threshold violations
- Track improvements after optimizations
- Use Lighthouse CI as part of quality gates

---

**Remember**: Lighthouse CI is a quality gate that ensures your application maintains high standards. Regular monitoring and optimization will help maintain excellent performance scores.
