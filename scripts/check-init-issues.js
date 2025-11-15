#!/usr/bin/env node

/**
 * This script helps identify potential initialization issues in the codebase.
 * It checks for common patterns that might lead to "Cannot access X before initialization" errors.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const checkStaged = args.includes('--staged');
const isCI = process.env.CI === 'true' || args.includes('--ci');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const IGNORE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.next',
  '**/*.d.ts',
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/__tests__',
  '**/__mocks__',
];

// Patterns to detect potential initialization issues
const PATTERNS = [
  {
    name: 'VARIABLE_USED_BEFORE_DECLARATION',
    pattern: /const\s+(\w+)\s*=\s*[^;]+\b(\1)\b/g,
    message: 'Variable used before declaration',
  },
  {
    name: 'HOOK_CALLED_CONDITIONALLY',
    pattern: /(if|for|while|switch|try|catch)\s*\([^)]*\)\s*\{[^}]*\b(use[A-Z][a-zA-Z]*)\s*\(/gs,
    message: 'React hook called conditionally',
  },
  {
    name: 'HOOK_AFTER_EARLY_RETURN',
    pattern: /\b(return|throw)\s+[^;]+;[\s\S]*?\b(use[A-Z][a-zA-Z]*)\s*\(/g,
    message: 'Hook called after early return',
  },
  {
    name: 'ASYNC_USE_EFFECT',
    pattern: /useEffect\s*\(\s*async\s*\(/g,
    message: 'Async function passed to useEffect',
  },
  {
    name: 'MISSING_DEPENDENCIES',
    pattern: /use(Effect|Callback|Memo)\s*\(\s*[^,)]+\s*,\s*\[\s*\]\s*\)/g,
    message: 'Missing dependencies in useEffect/useCallback/useMemo',
  },
];

// Helper function to normalize path for pattern matching (cross-platform)
function normalizePathForPattern(filePath) {
  return filePath.replace(/\\/g, '/');
}

// Helper function to check if a path matches an ignore pattern
function matchesIgnorePattern(filePath, patterns) {
  const normalizedPath = normalizePathForPattern(filePath);
  
  return patterns.some(pattern => {
    // Convert glob pattern to regex (simple glob matching)
    // Handle ** (matches any number of directories)
    let regexPattern = pattern
      .replace(/\*\*/g, '__GLOBSTAR__')  // Temporarily replace **
      .replace(/\./g, '\\.')             // Escape dots
      .replace(/\*/g, '[^/]*')           // Replace * with non-slash chars
      .replace(/\?/g, '[^/]')            // Replace ? with single char
      .replace(/__GLOBSTAR__/g, '.*?');  // Replace ** with non-greedy .*
    
    // Anchor to start of path
    if (!pattern.startsWith('**')) {
      regexPattern = '^' + regexPattern;
    }
    
    const regex = new RegExp(regexPattern);
    return regex.test(normalizedPath);
  });
}

// Get all TypeScript and JavaScript files in the src directory
function getSourceFiles(dir, fileList = []) {
  try {
    if (!fs.existsSync(dir)) {
      console.error(`❌ Source directory does not exist: ${dir}`);
      return fileList;
    }
    
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(entry => {
      const filePath = path.join(dir, entry.name);
      
      try {
        if (entry.isDirectory()) {
          // Skip ignored directories
          if (matchesIgnorePattern(filePath, IGNORE_PATTERNS)) {
            return;
          }
          getSourceFiles(filePath, fileList);
        } else if (entry.isFile() && entry.name.match(/\.(js|jsx|ts|tsx)$/)) {
          // Skip ignored files
          if (!matchesIgnorePattern(filePath, IGNORE_PATTERNS)) {
            fileList.push(filePath);
          }
        }
      } catch (err) {
        console.error(`Error reading ${filePath}:`, err.message);
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
  
  return fileList;
}

// Get list of staged files from git
function getStagedFiles() {
  try {
    const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACMRTUXB')
      .toString()
      .split('\n')
      .filter(Boolean)
      .filter(file => 
        (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) &&
        !IGNORE_PATTERNS.some(pattern => {
          const regex = new RegExp(pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\//g, '\\/')
          );
          return regex.test(file);
        })
      );
    
    return stagedFiles;
  } catch (error) {
    console.error('Error getting staged files:', error.message);
    return [];
  }
}

// Check a file for potential initialization issues
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  
  PATTERNS.forEach(({ name, pattern, message }) => {
    let match;
    const regex = new RegExp(pattern);
    
    while ((match = regex.exec(content)) !== null) {
      const matchedText = match[0];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const lineContent = lines[lineNumber - 1]?.trim() || '';
      
      // Skip false positives
      if (shouldSkipMatch(name, matchedText, lineContent)) {
        continue;
      }
      
      issues.push({
        file: path.relative(process.cwd(), filePath),
        line: lineNumber,
        column: match.index - content.lastIndexOf('\n', match.index),
        message: `${message}: ${matchedText}`,
        type: name,
      });
    }
  });
  
  return issues;
}

// Skip false positive matches
function shouldSkipMatch(type, matchedText, lineContent) {
  // Skip comments
  if (lineContent.trim().startsWith('//') || lineContent.trim().startsWith('*')) {
    return true;
  }
  
  // Skip specific patterns
  const skipPatterns = [
    /\/\*.*\*\//, // Block comments
    /import\s+.*\s+from\s+['"].*['"]/, // Import statements
    /export\s+default\s+function/, // Export default function
    /interface\s+\w+\s*\{/, // Interface declarations
    /type\s+\w+\s*=/, // Type aliases
  ];
  
  if (skipPatterns.some(pattern => pattern.test(lineContent))) {
    return true;
  }
  
  // Type-specific skip conditions
  if (type === 'MISSING_DEPENDENCIES') {
    // Allow empty dependency arrays for effects that should only run once
    if (lineContent.includes('useEffect(() => {') && lineContent.includes('}, [])')) {
      return true;
    }
  }
  
  return false;
}

// Main function
async function main() {
  console.log('🔍 Scanning for potential initialization issues...');
  console.log(`Current directory: ${process.cwd()}`);
  console.log(`Source directory: ${SRC_DIR}`);
  
  // Check if source directory exists
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`❌ Source directory does not exist: ${SRC_DIR}`);
    process.exit(1);
  }
  
  // Enable debug logging
  const debug = process.env.DEBUG === 'true' || process.env.CI === 'true';
  
  // Always log in debug mode
  console.log('\n=== Debug Information ===');
  console.log('Debug mode:', debug ? 'enabled' : 'disabled');
  console.log('Node version:', process.version);
  console.log('Platform:', process.platform);
  console.log('Architecture:', process.arch);
  console.log('Environment variables:');
  console.log('- DEBUG:', process.env.DEBUG);
  console.log('- CI:', process.env.CI);
  console.log('=======================\n');
  
  let files = [];
  
  if (checkStaged) {
    console.log('🔍 Checking only staged files...');
    files = getStagedFiles();
    
    if (files.length === 0) {
      console.log('✅ No staged files to check');
      process.exit(0);
    }
    
    console.log(`📂 Found ${files.length} staged files to analyze`);
  } else {
    // Get all source files
    files = getSourceFiles(SRC_DIR);
    console.log(`📂 Found ${files.length} files to analyze`);
    
    if (files.length === 0) {
      console.log('No files found to analyze. Check if the source directory is correct.');
      process.exit(0);
    }
  }
  
  // Check each file for issues
  const allIssues = [];
  let processedFiles = 0;
  
  for (const file of files) {
    const filePath = path.resolve(process.cwd(), file);
    
    if (debug && processedFiles % 50 === 0) {
      console.log(`\nProcessing file ${processedFiles + 1} of ${files.length}...`);
      console.log(`Current file: ${filePath}`);
    }
    
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const issues = checkFile(filePath);
        
        if (issues.length > 0 && debug) {
          console.log(`\nFound ${issues.length} issues in ${filePath}:`);
          issues.forEach((issue, idx) => {
            console.log(`  ${idx + 1}. Line ${issue.line}: ${issue.message}`);
          });
        }
        
        allIssues.push(...issues);
      } catch (error) {
        console.error(`\n❌ Error processing file ${filePath}:`, error.message);
        if (debug) {
          console.error(error.stack);
        }
      }
    } else if (debug) {
      console.log(`\n⚠️  File not found: ${filePath}`);
    }
    
    processedFiles++;
  }
  
  // Report issues
  if (allIssues.length > 0) {
    console.log('\n⚠️  Found potential initialization issues:');
    
    // Group issues by file
    const issuesByFile = {};
    allIssues.forEach(issue => {
      const relativePath = path.relative(process.cwd(), issue.file);
      if (!issuesByFile[relativePath]) {
        issuesByFile[relativePath] = [];
      }
      issuesByFile[relativePath].push({
        ...issue,
        file: relativePath
      });
    });
    
    // Print issues by file
    Object.entries(issuesByFile).forEach(([file, issues]) => {
      console.log(`\n📄 ${file}`);
      
      // Sort issues by line number
      issues.sort((a, b) => a.line - b.line);
      
      // Print file content with issues highlighted
      try {
        const fileContent = fs.readFileSync(file, 'utf8').split('\n');
        const linesWithIssues = new Set(issues.map(issue => issue.line));
        
        // Show context around each issue
        const contextLines = 2;
        const linesToShow = new Set();
        
        issues.forEach(issue => {
          const startLine = Math.max(1, issue.line - contextLines);
          const endLine = Math.min(fileContent.length, issue.line + contextLines);
          
          for (let i = startLine; i <= endLine; i++) {
            linesToShow.add(i);
          }
        });
        
        // Print file content with context and highlight issues
        let lastLine = 0;
        Array.from(linesToShow)
          .sort((a, b) => a - b)
          .forEach(lineNum => {
            // Add ellipsis if there's a gap
            if (lastLine > 0 && lineNum > lastLine + 1) {
              console.log('   ...');
            }
            
            const lineContent = fileContent[lineNum - 1] || '';
            const linePrefix = lineNum.toString().padStart(4, ' ');
            
            if (linesWithIssues.has(lineNum)) {
              // Find all issues on this line
              const lineIssues = issues.filter(issue => issue.line === lineNum);
              
              // Print the line with error indicator
              console.log(` ${linePrefix} | ${lineContent}`);
              
              // Print error indicators
              const indicatorLine = ' '.repeat(6) + '|';
              const indicators = Array(lineContent.length + 1).fill(' ');
              
              lineIssues.forEach(issue => {
                const start = Math.max(0, issue.column - 1);
                const end = Math.min(indicators.length - 1, start + Math.max(1, issue.message.length));
                
                for (let i = start; i < end; i++) {
                  indicators[i] = '^';
                }
                
                // Print the error message
                console.log(`     | ${' '.repeat(start)}${issue.message} (${issue.type})`);
              });
              
              console.log(indicatorLine + indicators.join(''));
            } else {
              // Print context line
              console.log(` ${linePrefix} | ${lineContent}`);
            }
            
            lastLine = lineNum;
          });
      } catch (error) {
        // If we can't read the file, just show the issues
        issues.forEach(issue => {
          console.log(`  ${issue.line}:${issue.column} - ${issue.message} (${issue.type})`);
        });
      }
    });
    
    console.log(`\n🔍 Found ${allIssues.length} potential issues in ${Object.keys(issuesByFile).length} files`);
    
    if (isCI) {
      // In CI, output in a format that can be parsed by GitHub Actions
      console.log('\n::group::GitHub Actions Annotations');
      allIssues.forEach(issue => {
        console.log(`::error file=${issue.file},line=${issue.line},col=${issue.column}::${issue.message} (${issue.type})`);
      });
      console.log('::endgroup::');
    }
    
    process.exit(1);
  } else {
    console.log('✅ No potential initialization issues found!');
    process.exit(0);
  }
}

// Main script execution with comprehensive error handling
async function run() {
  try {
    console.log('🚀 Starting initialization check...');
    console.log('==============================');
    
    // Log environment information
    console.log('\n=== Environment ===');
    console.log(`Node.js: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Architecture: ${process.arch}`);
    console.log('Environment variables:');
    console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`- DEBUG: ${process.env.DEBUG || 'not set'}`);
    console.log(`- CI: ${process.env.CI || 'not set'}`);
    
    // Run the main function
    const startTime = Date.now();
    await main();
    const endTime = Date.now();
    
    console.log('\n✅ Initialization check completed successfully!');
    console.log(`⏱️  Total execution time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    
  } catch (error) {
    console.error('\n❌ Error during initialization check:');
    console.error(error);
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Run the script if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  run().catch(error => {
    console.error('Unhandled error in main execution:', error);
    process.exit(1);
  });
}

// Export for testing purposes
export { 
  checkFile, 
  getSourceFiles, 
  getStagedFiles, 
  run as default 
};
