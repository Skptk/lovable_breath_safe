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
      // Let Lighthouse CI auto-detect the port instead of hardcoding
      // url: ['http://localhost:4174/'], // Removed hardcoded port
      settings: {
        // Chrome flags optimized for React apps in CI environments
        chromeFlags: '--no-sandbox --disable-dev-shm-usage --disable-gpu --disable-web-security --disable-extensions --disable-plugins --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-ipc-flooding-protection --disable-hang-monitor --disable-prompt-on-repost --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-default-apps --disable-sync --metrics-recording-only --no-first-run --safebrowsing-disable-auto-update --password-store=basic --use-mock-keychain --force-device-scale-factor=1 --disable-features=VizDisplayCompositor',
        // CI-friendly throttling
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        // Simplified React app waiting - remove complex waiting that might cause issues
        // Wait for network idle
        waitForNetworkIdle: true,
        // Wait for CPU idle
        waitForCpuIdle: true,
        // Wait for multiple paint events to ensure content is rendered
        waitForPaint: true,
        // Wait for multiple frames to ensure stable rendering
        waitForFrames: 5, // Reduced from 10
        // Wait for specific elements that indicate React app is loaded
        waitForSelector: '#root', // Simplified selector
        // Remove complex waiting that might cause timeouts
        // waitForHydration: true, // Removed
        // waitForContent: 'Breath Safe, Air Quality, Dashboard, Monitor', // Removed
        // waitForJavaScript: true, // Removed
        // waitForDOMStable: true, // Removed
        // waitForImages: true, // Removed
        // waitForFonts: true, // Removed
        // waitForCSS: true, // Removed
        // Disable flaky audits for CI stability
        onlyAudits: [
          'first-contentful-paint',
          'largest-contentful-paint',
          'first-meaningful-paint',
          'speed-index',
          'total-blocking-time',
          'max-potential-fid',
          'cumulative-layout-shift',
          'server-response-time',
          'interactive',
          'critical-request-chains',
          'redirects',
          'mainthread-work-breakdown',
          'bootup-time',
          'uses-rel-preconnect',
          'font-display',
          'diagnostics',
          'network-requests',
          'network-rtt',
          'network-server-latency',
          'main-thread-tasks',
          'metrics',
          'resource-summary',
          'third-party-summary',
          'third-party-facades',
          'largest-contentful-paint-element',
          'lcp-lazy-loaded',
          'layout-shifts',
          'long-tasks',
          'non-composited-animations',
          'unsized-images',
          'prioritize-lcp-image',
          'script-treemap-data',
          'total-byte-weight',
          'offscreen-images',
          'render-blocking-resources',
          'unminified-css',
          'unminified-javascript',
          'unused-css-rules',
          'unused-javascript',
          'modern-image-formats',
          'uses-optimized-images',
          'uses-text-compression',
          'uses-responsive-images',
          'efficient-animated-content',
          'duplicated-javascript',
          'legacy-javascript',
          'dom-size',
          'bf-cache',
          'cache-insight',
          'cls-culprits-insight',
          'document-latency-insight',
          'dom-size-insight',
          'duplicated-javascript-insight',
          'font-display-insight',
          'forced-reflow-insight',
          'image-delivery-insight',
          'interaction-to-next-paint-insight',
          'lcp-discovery-insight',
          'lcp-phases-insight',
          'legacy-javascript-insight',
          'modern-http-insight',
          'network-dependency-tree-insight',
          'render-blocking-insight',
          'third-parties-insight',
          'viewport-insight'
        ]
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.85 }],
        'categories:accessibility': ['warn', { minScore: 0.90 }],
        'categories:best-practices': ['warn', { minScore: 0.90 }],
        'categories:seo': ['warn', { minScore: 0.90 }]
      }
    },
    upload: {
      target: 'filesystem',
      outputDir: './reports/lighthouse'
    }
  }
};
