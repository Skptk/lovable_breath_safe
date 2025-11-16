import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { analyzeBundleBaseline } from './analyze-bundle-baseline.js';
import { analyzeCodeQualityBaseline } from './analyze-code-quality-baseline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const BASELINE_FILE = path.join(REPORTS_DIR, 'baseline_metrics.json');

/**
 * Run Lighthouse audit (if available)
 */
function runLighthouseAudit() {
  console.log('🔍 Running Lighthouse audit...');
  
  try {
    // Check if @lhci/cli is available
    execSync('npx @lhci/cli@latest --version', { stdio: 'pipe' });
    
    // Try to run Lighthouse CI
    try {
      const output = execSync('npm run lhci:collect', {
        encoding: 'utf8',
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
        timeout: 120000, // 2 minutes timeout
      });
      
      // Try to read Lighthouse results
      const lhciDir = path.join(__dirname, '..', '.lighthouseci');
      if (fs.existsSync(lhciDir)) {
        const runs = fs.readdirSync(lhciDir);
        if (runs.length > 0) {
          const latestRun = runs.sort().reverse()[0];
          const runPath = path.join(lhciDir, latestRun);
          const files = fs.readdirSync(runPath);
          const jsonFile = files.find(f => f.endsWith('.json'));
          
          if (jsonFile) {
            const lighthouseData = JSON.parse(
              fs.readFileSync(path.join(runPath, jsonFile), 'utf8')
            );
            
            const audits = lighthouseData.audits || {};
            const categories = lighthouseData.categories || {};
            
            return {
              success: true,
              score: {
                performance: Math.round((categories.performance?.score || 0) * 100),
                accessibility: Math.round((categories.accessibility?.score || 0) * 100),
                bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
                seo: Math.round((categories.seo?.score || 0) * 100),
              },
              metrics: {
                fcp: audits['first-contentful-paint']?.numericValue || null,
                lcp: audits['largest-contentful-paint']?.numericValue || null,
                tti: audits['interactive']?.numericValue || null,
                cls: audits['cumulative-layout-shift']?.numericValue || null,
                fid: audits['max-potential-fid']?.numericValue || null,
              },
            };
          }
        }
      }
      
      return {
        success: true,
        note: 'Lighthouse CI ran but results not found in expected location',
        output: output.substring(0, 500), // First 500 chars
      };
    } catch (error) {
      return {
        success: false,
        error: 'Lighthouse CI failed to run',
        message: error.message,
      };
    }
  } catch {
    return {
      success: false,
      note: 'Lighthouse CI not available. Install with: npm install -D @lhci/cli',
      recommendation: 'Run Lighthouse manually in Chrome DevTools or use npm run lhci:collect after setup',
    };
  }
}

/**
 * Measure bundle size from build
 */
function measureBundleSize() {
  const distDir = path.join(__dirname, '..', 'dist');
  
  if (!fs.existsSync(distDir)) {
    return {
      success: false,
      error: 'Dist directory not found. Run npm run build first.',
    };
  }

  const jsDir = path.join(distDir, 'js');
  const chunks = [];

  if (fs.existsSync(jsDir)) {
    const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
    
    files.forEach(file => {
      const filePath = path.join(jsDir, file);
      const stats = fs.statSync(filePath);
      chunks.push({
        name: file,
        size: stats.size,
        sizeKB: (stats.size / 1024).toFixed(2),
      });
    });
  }

  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);

  return {
    success: true,
    chunks,
    totalSize,
    totalSizeKB: (totalSize / 1024).toFixed(2),
  };
}

/**
 * Accessibility baseline (manual instructions)
 */
function getAccessibilityBaseline() {
  return {
    note: 'Accessibility audit requires manual testing with browser tools',
    tools: [
      'axe DevTools browser extension',
      'Lighthouse accessibility audit',
      'WAVE browser extension',
      'Keyboard navigation testing',
    ],
    instructions: [
      '1. Install axe DevTools extension in Chrome',
      '2. Navigate to each main page of the application',
      '3. Run axe DevTools scan on each page',
      '4. Document violations by severity (critical, serious, moderate, minor)',
      '5. Run Lighthouse accessibility audit',
      '6. Test keyboard navigation (Tab, Enter, Arrow keys)',
      '7. Check for missing ARIA labels and alt text',
    ],
    recommendation: 'Run manual accessibility audit and document results in baseline_metrics.json',
  };
}

/**
 * Main function to establish all baselines
 */
async function establishBaselines() {
  console.log('🚀 Establishing Baseline Metrics\n');
  console.log('This will measure:');
  console.log('  1. Bundle size and dependencies');
  console.log('  2. Code quality (ESLint, TypeScript, security)');
  console.log('  3. Performance metrics (Lighthouse)');
  console.log('  4. Accessibility baseline (instructions)\n');

  const baselines = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    project: 'Breath Safe',
    initialization: {
      step: 0,
      name: 'Establish Baselines',
      status: 'in_progress',
    },
  };

  // 1. Bundle Baseline
  console.log('='.repeat(60));
  console.log('1️⃣  BUNDLE BASELINE');
  console.log('='.repeat(60));
  try {
    const bundleBaseline = analyzeBundleBaseline();
    baselines.bundle = bundleBaseline;
    console.log('✅ Bundle baseline captured\n');
  } catch (error) {
    console.error('❌ Bundle baseline failed:', error.message);
    baselines.bundle = { error: error.message };
  }

  // 2. Code Quality Baseline
  console.log('='.repeat(60));
  console.log('2️⃣  CODE QUALITY BASELINE');
  console.log('='.repeat(60));
  try {
    const codeQualityBaseline = analyzeCodeQualityBaseline();
    baselines.codeQuality = codeQualityBaseline;
    console.log('✅ Code quality baseline captured\n');
  } catch (error) {
    console.error('❌ Code quality baseline failed:', error.message);
    baselines.codeQuality = { error: error.message };
  }

  // 3. Performance Baseline
  console.log('='.repeat(60));
  console.log('3️⃣  PERFORMANCE BASELINE');
  console.log('='.repeat(60));
  try {
    const lighthouseResults = runLighthouseAudit();
    baselines.performance = {
      lighthouse: lighthouseResults,
      bundleSize: measureBundleSize(),
      note: 'For detailed Core Web Vitals, run Lighthouse manually or set up Lighthouse CI',
    };
    console.log('✅ Performance baseline captured\n');
  } catch (error) {
    console.error('❌ Performance baseline failed:', error.message);
    baselines.performance = { error: error.message };
  }

  // 4. Accessibility Baseline
  console.log('='.repeat(60));
  console.log('4️⃣  ACCESSIBILITY BASELINE');
  console.log('='.repeat(60));
  baselines.accessibility = getAccessibilityBaseline();
  console.log('ℹ️  Accessibility requires manual testing');
  console.log('   See baseline_metrics.json for instructions\n');

  // Mark as complete
  baselines.initialization.status = 'complete';

  // Save results
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(baselines, null, 2));

  console.log('='.repeat(60));
  console.log('✅ BASELINE ESTABLISHMENT COMPLETE');
  console.log('='.repeat(60));
  console.log(`\n📄 Baseline metrics saved to: ${BASELINE_FILE}\n`);

  // Print summary
  console.log('📊 SUMMARY:');
  if (baselines.bundle?.summary) {
    console.log(`\n  Bundle:`);
    console.log(`    Total size: ${baselines.bundle.summary.initialBundleSize}`);
    console.log(`    Chunks: ${baselines.bundle.summary.chunkCount}`);
    console.log(`    Route splitting: ${baselines.bundle.summary.hasRouteSplitting ? 'Yes' : 'No'}`);
  }
  
  if (baselines.codeQuality?.summary) {
    console.log(`\n  Code Quality:`);
    console.log(`    ESLint errors: ${baselines.codeQuality.summary.eslintErrors}`);
    console.log(`    ESLint warnings: ${baselines.codeQuality.summary.eslintWarnings}`);
    console.log(`    TypeScript errors: ${baselines.codeQuality.summary.typescriptErrors}`);
    console.log(`    Security vulnerabilities: ${baselines.codeQuality.summary.securityVulnerabilities}`);
    console.log(`    Strict mode: ${baselines.codeQuality.summary.strictModeCoverage}`);
    console.log(`    Code duplication: ${baselines.codeQuality.summary.codeDuplication}`);
  }

  if (baselines.performance?.lighthouse?.success) {
    console.log(`\n  Performance:`);
    if (baselines.performance.lighthouse.score) {
      console.log(`    Lighthouse score: ${baselines.performance.lighthouse.score.performance}/100`);
    }
    if (baselines.performance.lighthouse.metrics) {
      const m = baselines.performance.lighthouse.metrics;
      if (m.lcp) console.log(`    LCP: ${(m.lcp / 1000).toFixed(2)}s`);
      if (m.fcp) console.log(`    FCP: ${(m.fcp / 1000).toFixed(2)}s`);
      if (m.cls) console.log(`    CLS: ${m.cls.toFixed(3)}`);
    }
  }

  console.log(`\n  Accessibility:`);
  console.log(`    Status: Manual testing required`);
  console.log(`    See baseline_metrics.json for instructions\n`);

  return baselines;
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
  (process.argv[1] && import.meta.url.replace(/\\/g, '/').endsWith(process.argv[1].replace(/\\/g, '/')));
if (isMainModule) {
  establishBaselines().catch(error => {
    console.error('❌ Failed to establish baselines:', error);
    process.exit(1);
  });
}

export { establishBaselines };

