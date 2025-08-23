module.exports = {
  ci: {
    collect: {
      // Collect from local build
      startServerCommand: 'npm run preview',
      url: ['http://localhost:4173'],
      numberOfRuns: 3,
      settings: {
        // Chrome flags for better performance
        chromeFlags: '--no-sandbox --disable-dev-shm-usage --disable-gpu',
        // Emulate mobile device for responsive testing
        emulatedFormFactor: 'desktop',
        // Collect additional metrics
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        // Skip certain audits that might fail in CI
        skipAudits: ['uses-http2', 'uses-long-cache-ttl'],
      },
    },
    assert: {
      // Performance thresholds - fail build if not met
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.90 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo': ['error', { minScore: 0.90 }],
        
        // Specific performance metrics
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        
        // Accessibility checks
        'color-contrast': 'off', // Can be flaky in CI
        'image-alt': 'off', // Can be flaky in CI
        
        // Best practices
        'uses-https': 'off', // Local development
        'external-anchors-use-rel-noopener': 'off', // External links
        
        // SEO checks
        'document-title': 'off', // Can be flaky in CI
        'meta-description': 'off', // Can be flaky in CI
      },
    },
    upload: {
      // Upload results to temporary public storage
      target: 'temporary-public-storage',
    },
    // Output directory for reports
    outputDir: './reports/lighthouse',
  },
};
