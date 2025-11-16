import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '..', 'dist');
const JS_DIR = path.join(DIST_DIR, 'js');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Get gzipped size
 */
function getGzippedSize(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return gzipSync(content, { level: 6 }).length;
  } catch (error) {
    return 0;
  }
}

/**
 * Analyze bundle files
 */
function analyzeBundleFiles() {
  const results = {
    totalSize: 0,
    totalGzipped: 0,
    chunks: [],
    assets: [],
    topDependencies: [],
    codeSplitting: {
      hasRouteSplitting: false,
      chunkCount: 0,
      largestChunk: { name: '', size: 0, gzipped: 0 },
    },
  };

  // Analyze JS chunks
  if (fs.existsSync(JS_DIR)) {
    const jsFiles = fs.readdirSync(JS_DIR)
      .filter(file => file.endsWith('.js'))
      .map(file => ({
        name: file,
        path: path.join(JS_DIR, file),
      }));

    jsFiles.forEach(({ name, path: filePath }) => {
      const size = getFileSize(filePath);
      const gzipped = getGzippedSize(filePath);
      
      results.totalSize += size;
      results.totalGzipped += gzipped;
      results.chunks.push({
        name,
        size,
        gzipped,
        sizeKB: (size / 1024).toFixed(2),
        gzippedKB: (gzipped / 1024).toFixed(2),
      });

      if (gzipped > results.codeSplitting.largestChunk.gzipped) {
        results.codeSplitting.largestChunk = {
          name,
          size,
          gzipped,
          sizeKB: (size / 1024).toFixed(2),
          gzippedKB: (gzipped / 1024).toFixed(2),
        };
      }
    });

    results.codeSplitting.chunkCount = jsFiles.length;
    results.codeSplitting.hasRouteSplitting = jsFiles.length > 1;
  }

  // Analyze assets
  if (fs.existsSync(ASSETS_DIR)) {
    const assetFiles = fs.readdirSync(ASSETS_DIR, { recursive: true })
      .filter(file => typeof file === 'string')
      .map(file => ({
        name: file,
        path: path.join(ASSETS_DIR, file),
      }));

    assetFiles.forEach(({ name, path: filePath }) => {
      const size = getFileSize(filePath);
      results.totalSize += size;
      results.assets.push({
        name,
        size,
        sizeKB: (size / 1024).toFixed(2),
        type: path.extname(name).slice(1),
      });
    });
  }

  // Sort chunks by size
  results.chunks.sort((a, b) => b.gzipped - a.gzipped);
  results.assets.sort((a, b) => b.size - a.size);

  // Calculate totals
  results.totalSizeKB = (results.totalSize / 1024).toFixed(2);
  results.totalGzippedKB = (results.totalGzipped / 1024).toFixed(2);
  results.compressionRatio = ((1 - results.totalGzipped / results.totalSize) * 100).toFixed(2);

  return results;
}

/**
 * Analyze package.json dependencies
 */
function analyzeDependencies() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Try to get actual sizes from node_modules (approximate)
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  const topDependencies = [];

  Object.keys(dependencies).forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep);
    if (fs.existsSync(depPath)) {
      let size = 0;
      try {
        const stats = fs.statSync(depPath);
        if (stats.isDirectory()) {
          // Approximate size by counting files
          const files = getAllFiles(depPath);
          size = files.reduce((total, file) => {
            try {
              return total + fs.statSync(file).size;
            } catch {
              return total;
            }
          }, 0);
        }
      } catch {
        // Ignore errors
      }

      if (size > 0) {
        topDependencies.push({
          name: dep,
          version: dependencies[dep],
          size,
          sizeKB: (size / 1024).toFixed(2),
        });
      }
    }
  });

  topDependencies.sort((a, b) => b.size - a.size);

  return {
    totalDependencies: Object.keys(dependencies).length,
    productionDependencies: Object.keys(packageJson.dependencies || {}).length,
    devDependencies: Object.keys(packageJson.devDependencies || {}).length,
    topDependencies: topDependencies.slice(0, 20),
  };
}

/**
 * Get all files recursively
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

/**
 * Check for duplicate dependencies
 */
function checkDuplicateDependencies() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Check for potential duplicates (same package in both)
  const duplicates = [];
  Object.keys(packageJson.dependencies || {}).forEach(dep => {
    if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
      duplicates.push({
        name: dep,
        inDependencies: packageJson.dependencies[dep],
        inDevDependencies: packageJson.devDependencies[dep],
      });
    }
  });

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates,
  };
}

/**
 * Main analysis function
 */
function analyzeBundleBaseline() {
  console.log('📦 Analyzing bundle baseline...\n');

  if (!fs.existsSync(DIST_DIR)) {
    console.log('⚠️  Dist directory not found. Building first...');
    try {
      execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      return null;
    }
  }

  const bundleAnalysis = analyzeBundleFiles();
  const dependencyAnalysis = analyzeDependencies();
  const duplicateCheck = checkDuplicateDependencies();

  const results = {
    timestamp: new Date().toISOString(),
    bundle: {
      totalSize: bundleAnalysis.totalSize,
      totalSizeKB: bundleAnalysis.totalSizeKB,
      totalGzipped: bundleAnalysis.totalGzipped,
      totalGzippedKB: bundleAnalysis.totalGzippedKB,
      compressionRatio: bundleAnalysis.compressionRatio,
      chunks: bundleAnalysis.chunks,
      assets: bundleAnalysis.assets.slice(0, 10), // Top 10 assets
      codeSplitting: bundleAnalysis.codeSplitting,
    },
    dependencies: dependencyAnalysis,
    duplicates: duplicateCheck,
    summary: {
      initialBundleSize: bundleAnalysis.totalGzippedKB + ' KB (gzipped)',
      chunkCount: bundleAnalysis.codeSplitting.chunkCount,
      largestChunk: bundleAnalysis.codeSplitting.largestChunk.name + ' (' + bundleAnalysis.codeSplitting.largestChunk.gzippedKB + ' KB gzipped)',
      hasRouteSplitting: bundleAnalysis.codeSplitting.hasRouteSplitting,
      totalDependencies: dependencyAnalysis.totalDependencies,
      hasDuplicateDependencies: duplicateCheck.hasDuplicates,
    },
  };

  return results;
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
  (process.argv[1] && import.meta.url.replace(/\\/g, '/').endsWith(process.argv[1].replace(/\\/g, '/')));
if (isMainModule) {
  const results = analyzeBundleBaseline();
  if (results) {
    console.log('\n✅ Bundle baseline analysis complete!\n');
    console.log('Summary:');
    console.log(`  Total bundle size: ${results.bundle.totalGzippedKB} KB (gzipped)`);
    console.log(`  Chunk count: ${results.bundle.codeSplitting.chunkCount}`);
    console.log(`  Largest chunk: ${results.summary.largestChunk}`);
    console.log(`  Route splitting: ${results.summary.hasRouteSplitting ? 'Yes' : 'No'}`);
    console.log(`  Total dependencies: ${results.dependencies.totalDependencies}`);
    console.log(`  Duplicate dependencies: ${results.duplicates.hasDuplicates ? 'Yes' : 'No'}`);
    
    // Save to file
    const outputPath = path.join(__dirname, '..', 'reports', 'bundle-baseline.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Full report saved to: ${outputPath}`);
  }
}

export { analyzeBundleBaseline };

