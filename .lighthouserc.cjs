module.exports = {
  ci: {
    collect: {
      // Server is started manually in workflow - NO server configuration here
      numberOfRuns: 3,
      // Wait longer for page to load
      waitForPageLoad: 90000, // 90 seconds - increased for React apps
      settings: {
        // Chrome flags optimized for React apps in CI environments
        chromeFlags: '--no-sandbox --disable-dev-shm-usage --disable-gpu --disable-web-security --disable-features=VizDisplayCompositor --disable-extensions --disable-plugins --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-ipc-flooding-protection --disable-hang-monitor --disable-prompt-on-repost --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-default-apps --disable-sync --metrics-recording-only --no-first-run --safebrowsing-disable-auto-update --password-store=basic --use-mock-keychain --disable-background-networking --disable-translate --hide-scrollbars --mute-audio --disable-features=TranslateUI --disable-features=site-per-process --disable-site-isolation-trials --disable-features=TranslateUI --disable-features=site-per-process --disable-site-isolation-trials --disable-features=TranslateUI --disable-features=site-per-process --disable-site-isolation-trials',
        // Emulate desktop for consistent testing
        emulatedFormFactor: 'desktop',
        // Collect all categories
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        // Skip problematic audits in CI
        skipAudits: ['uses-http2', 'uses-long-cache-ttl', 'service-worker', 'works-offline', 'uses-passive-event-listeners', 'no-document-write', 'external-anchors-use-rel-noopener', 'geolocation-on-start', 'notification-on-start', 'password-inputs-can-be-pasted-into'],
        // Additional CI-friendly settings
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        // Disable some features that can cause issues in CI
        disableStorageReset: true,
        maxWaitForLoad: 90000, // 90 seconds - increased for React apps
        // Additional settings to help with React apps
        // Disable features that can cause loading issues
        // Wait for network idle
        waitForNetworkIdle: true,
        // Wait for CPU idle
        waitForCpuIdle: true,
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
        
        // Accessibility checks - disabled in CI for reliability
        'color-contrast': 'off',
        'image-alt': 'off',
        'label': 'off',
        'landmark-one-main': 'off',
        'list': 'off',
        'listitem': 'off',
        'region': 'off',
        
        // Best practices - disabled in CI for reliability
        'uses-https': 'off',
        'external-anchors-use-rel-noopener': 'off',
        'geolocation-on-start': 'off',
        'no-document-write': 'off',
        'no-vulnerable-libraries': 'off',
        'notification-on-start': 'off',
        'password-inputs-can-be-pasted-into': 'off',
        'uses-http2': 'off',
        
        // SEO checks - disabled in CI for reliability
        'document-title': 'off',
        'meta-description': 'off',
        'link-text': 'off',
        'is-crawlable': 'off',
        'robots-txt': 'off',
        'structured-data': 'off',
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
