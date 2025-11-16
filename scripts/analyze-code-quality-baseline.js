import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '..', 'src');

/**
 * Run ESLint and parse results
 */
function runESLint() {
  console.log('🔍 Running ESLint...');
  
  try {
    const output = execSync('npm run lint', { 
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
    });
    
    return {
      success: true,
      output,
      errors: 0,
      warnings: 0,
      violations: [],
    };
  } catch (error) {
    // ESLint exits with non-zero on errors/warnings
    const output = error.stdout || error.message;
    
    // Try to parse ESLint output
    const lines = output.split('\n');
    let errors = 0;
    let warnings = 0;
    const violations = [];

    lines.forEach(line => {
      if (line.includes('error')) {
        errors++;
        violations.push({ type: 'error', message: line.trim() });
      } else if (line.includes('warning')) {
        warnings++;
        violations.push({ type: 'warning', message: line.trim() });
      }
    });

    return {
      success: false,
      output,
      errors,
      warnings,
      violations: violations.slice(0, 50), // Limit to first 50
    };
  }
}

/**
 * Run TypeScript type check
 */
function runTypeScriptCheck() {
  console.log('🔍 Running TypeScript type check...');
  
  try {
    const output = execSync('npm run type-check', { 
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
    });
    
    return {
      success: true,
      errors: 0,
      output: 'No type errors',
    };
  } catch (error) {
    const output = error.stdout || error.message;
    const lines = output.split('\n');
    const errors = lines.filter(line => line.includes('error TS')).length;

    return {
      success: false,
      errors,
      output: output.split('\n').slice(0, 20).join('\n'), // First 20 lines
    };
  }
}

/**
 * Run npm audit
 */
function runNpmAudit() {
  console.log('🔍 Running npm audit...');
  
  try {
    const output = execSync('npm audit --json', { 
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
    });
    
    const auditData = JSON.parse(output);
    
    return {
      success: auditData.metadata.vulnerabilities.total === 0,
      vulnerabilities: {
        total: auditData.metadata.vulnerabilities.total || 0,
        critical: auditData.metadata.vulnerabilities.critical || 0,
        high: auditData.metadata.vulnerabilities.high || 0,
        moderate: auditData.metadata.vulnerabilities.moderate || 0,
        low: auditData.metadata.vulnerabilities.low || 0,
      },
      advisories: Object.keys(auditData.advisories || {}).length,
    };
  } catch (error) {
    // npm audit exits with non-zero if vulnerabilities found
    try {
      const output = error.stdout || error.message;
      const auditData = JSON.parse(output);
      
      return {
        success: false,
        vulnerabilities: {
          total: auditData.metadata?.vulnerabilities?.total || 0,
          critical: auditData.metadata?.vulnerabilities?.critical || 0,
          high: auditData.metadata?.vulnerabilities?.high || 0,
          moderate: auditData.metadata?.vulnerabilities?.moderate || 0,
          low: auditData.metadata?.vulnerabilities?.low || 0,
        },
        advisories: Object.keys(auditData.advisories || {}).length,
      };
    } catch {
      return {
        success: false,
        error: 'Failed to parse npm audit output',
      };
    }
  }
}

/**
 * Check TypeScript strict mode
 */
function checkTypeScriptStrictMode() {
  const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
  
  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    const compilerOptions = tsconfig.compilerOptions || {};
    
    const strictOptions = {
      strict: compilerOptions.strict,
      noImplicitAny: compilerOptions.noImplicitAny,
      strictNullChecks: compilerOptions.strictNullChecks,
      strictFunctionTypes: compilerOptions.strictFunctionTypes,
      strictBindCallApply: compilerOptions.strictBindCallApply,
      strictPropertyInitialization: compilerOptions.strictPropertyInitialization,
      noImplicitReturns: compilerOptions.noImplicitReturns,
      noFallthroughCasesInSwitch: compilerOptions.noFallthroughCasesInSwitch,
    };

    const enabledCount = Object.values(strictOptions).filter(Boolean).length;
    const totalCount = Object.keys(strictOptions).length;

    return {
      enabled: enabledCount === totalCount,
      enabledCount,
      totalCount,
      options: strictOptions,
      coverage: ((enabledCount / totalCount) * 100).toFixed(1),
    };
  } catch (error) {
    return {
      enabled: false,
      error: error.message,
    };
  }
}

/**
 * Analyze code duplication (simple heuristic)
 */
function analyzeCodeDuplication() {
  console.log('🔍 Analyzing code duplication...');
  
  const files = getAllSourceFiles(SRC_DIR);
  const fileContents = new Map();
  const duplicates = [];

  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      // Normalize content (remove comments, whitespace)
      const normalized = content
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\/\/.*/g, '') // Remove line comments
        .replace(/\s+/g, ' ')
        .trim();
      
      fileContents.set(file, normalized);
    } catch {
      // Ignore errors
    }
  });

  // Simple duplicate detection (exact matches)
  const contentMap = new Map();
  fileContents.forEach((content, file) => {
    if (content.length > 100) { // Only check files with substantial content
      if (contentMap.has(content)) {
        duplicates.push({
          file1: contentMap.get(content),
          file2: file,
          similarity: 100, // Exact match
        });
      } else {
        contentMap.set(content, file);
      }
    }
  });

  return {
    totalFiles: files.length,
    duplicateFiles: duplicates.length,
    duplicationPercentage: files.length > 0 ? ((duplicates.length / files.length) * 100).toFixed(2) : '0.00',
    duplicates: duplicates.slice(0, 10), // Top 10
  };
}

/**
 * Find unused exports (simple heuristic)
 */
function findUnusedExports() {
  console.log('🔍 Finding unused exports...');
  
  const files = getAllSourceFiles(SRC_DIR);
  const exports = new Map();
  const imports = new Set();

  // Collect all exports
  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const exportMatches = content.matchAll(/export\s+(?:const|function|class|interface|type|enum|default)\s+(\w+)/g);
      
      for (const match of exportMatches) {
        const exportName = match[1];
        if (!exports.has(exportName)) {
          exports.set(exportName, []);
        }
        exports.get(exportName).push(file);
      }
    } catch {
      // Ignore errors
    }
  });

  // Collect all imports
  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const importMatches = content.matchAll(/import\s+.*?\s+from\s+['"](.+?)['"]/g);
      
      for (const match of importMatches) {
        const importPath = match[1];
        imports.add(importPath);
      }
    } catch {
      // Ignore errors
    }
  });

  // This is a simplified check - full analysis would require AST parsing
  return {
    totalExports: exports.size,
    totalImports: imports.size,
    note: 'Full unused export analysis requires AST parsing (use tools like ts-prune)',
  };
}

/**
 * Get all source files
 */
function getAllSourceFiles(dir, arrayOfFiles = []) {
  if (!fs.existsSync(dir)) {
    return arrayOfFiles;
  }

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllSourceFiles(filePath, arrayOfFiles);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

/**
 * Count files and lines
 */
function countCodeMetrics() {
  const files = getAllSourceFiles(SRC_DIR);
  let totalLines = 0;
  let totalFiles = 0;
  const largeFiles = [];

  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n').length;
      totalLines += lines;
      totalFiles++;

      if (lines > 300) {
        largeFiles.push({
          file: path.relative(SRC_DIR, file),
          lines,
        });
      }
    } catch {
      // Ignore errors
    }
  });

  largeFiles.sort((a, b) => b.lines - a.lines);

  return {
    totalFiles,
    totalLines,
    averageLinesPerFile: totalFiles > 0 ? (totalLines / totalFiles).toFixed(1) : '0',
    largeFiles: largeFiles.slice(0, 10), // Top 10
  };
}

/**
 * Main analysis function
 */
function analyzeCodeQualityBaseline() {
  console.log('📊 Analyzing code quality baseline...\n');

  const eslintResults = runESLint();
  const typescriptResults = runTypeScriptCheck();
  const npmAuditResults = runNpmAudit();
  const strictModeResults = checkTypeScriptStrictMode();
  const duplicationResults = analyzeCodeDuplication();
  const unusedExportsResults = findUnusedExports();
  const codeMetrics = countCodeMetrics();

  const results = {
    timestamp: new Date().toISOString(),
    eslint: eslintResults,
    typescript: typescriptResults,
    security: npmAuditResults,
    strictMode: strictModeResults,
    duplication: duplicationResults,
    unusedExports: unusedExportsResults,
    codeMetrics,
    summary: {
      eslintErrors: eslintResults.errors,
      eslintWarnings: eslintResults.warnings,
      typescriptErrors: typescriptResults.errors,
      securityVulnerabilities: npmAuditResults.vulnerabilities?.total || 0,
      strictModeEnabled: strictModeResults.enabled,
      strictModeCoverage: strictModeResults.coverage + '%',
      codeDuplication: duplicationResults.duplicationPercentage + '%',
      totalFiles: codeMetrics.totalFiles,
      totalLines: codeMetrics.totalLines,
    },
  };

  return results;
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
  (process.argv[1] && import.meta.url.replace(/\\/g, '/').endsWith(process.argv[1].replace(/\\/g, '/')));
if (isMainModule) {
  const results = analyzeCodeQualityBaseline();
  
  console.log('\n✅ Code quality baseline analysis complete!\n');
  console.log('Summary:');
  console.log(`  ESLint errors: ${results.summary.eslintErrors}`);
  console.log(`  ESLint warnings: ${results.summary.eslintWarnings}`);
  console.log(`  TypeScript errors: ${results.summary.typescriptErrors}`);
  console.log(`  Security vulnerabilities: ${results.summary.securityVulnerabilities}`);
  console.log(`  Strict mode: ${results.summary.strictModeEnabled ? 'Enabled' : 'Disabled'} (${results.summary.strictModeCoverage})`);
  console.log(`  Code duplication: ${results.summary.codeDuplication}`);
  console.log(`  Total files: ${results.summary.totalFiles}`);
  console.log(`  Total lines: ${results.summary.totalLines}`);
  
  // Save to file
  const outputPath = path.join(__dirname, '..', 'reports', 'code-quality-baseline.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Full report saved to: ${outputPath}`);
}

export { analyzeCodeQualityBaseline };

