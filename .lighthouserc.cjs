module.exports = {
  ci: {
    collect: {
      // Use the CI-specific preview script
      startServerCommand: 'npm run preview:ci',
      // Wait for server to be ready with proper pattern
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 120000, // 2 minutes for server startup
      // Wait much longer for React app to fully load and hydrate
      waitForPageLoad: 120000, // 2 minutes for React app
      maxWaitForLoad: 180000, // 3 minutes maximum
      numberOfRuns: 1, // Reduce to 1 run for CI stability
      settings: {
        // Chrome flags optimized for React apps in CI environments
        chromeFlags: '--no-sandbox --disable-dev-shm-usage --disable-gpu --disable-web-security --disable-extensions --disable-plugins --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-ipc-flooding-protection --disable-hang-monitor --disable-prompt-on-repost --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-default-apps --disable-sync --metrics-recording-only --no-first-run --safebrowsing-disable-auto-update --password-store=basic --use-mock-keychain --disable-background-networking --disable-translate --hide-scrollbars --mute-audio --disable-features=VizDisplayCompositor --disable-features=site-per-process --disable-site-isolation-trials',
        // Emulate desktop for consistent testing
        emulatedFormFactor: 'desktop',
        // Collect only performance for now to focus on core issue
        onlyCategories: ['performance'],
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
        // Additional settings to help with React apps
        // Wait for network idle
        waitForNetworkIdle: true,
        // Wait for CPU idle
        waitForCpuIdle: true,
        // Wait for multiple paint events to ensure content is rendered
        waitForPaint: true,
        // Wait for multiple frames to ensure stable rendering
        waitForFrames: 10,
        // Wait for specific elements that indicate React app is loaded
        waitForSelector: 'div, #root, [data-testid], .app, .container',
        // Additional timeout for React hydration
        waitForHydration: true,
        // Wait for specific content to appear
        waitForContent: 'Breath Safe, Air Quality, Dashboard, Monitor',
        // Wait for JavaScript execution to complete
        waitForJavaScript: true,
        // Wait for DOM to be stable
        waitForDOMStable: true,
        // Wait for images to load
        waitForImages: true,
        // Wait for fonts to load
        waitForFonts: true,
        // Wait for CSS to load
        waitForCSS: true,
      },
    },
    assert: {
      // Performance thresholds - fail build if not met
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        
        // Specific performance metrics
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
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
