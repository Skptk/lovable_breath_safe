#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  // Temporarily disabled due to too many false positives
  // {
  //   name: 'VARIABLE_USED_BEFORE_DECLARATION',
  //   pattern: /\b(\w+)\b[^=]*?(?:const|let|var)\s+\1\b/g,
  //   message: 'Variable used before declaration',
  //   severity: 'error',
  // },
  {
    name: 'HOOK_CALLED_CONDITIONALLY',
    pattern: /(if|for|while|switch|try|catch)\s*\([^)]*\)\s*\{[^}]*\b(use[A-Z][a-zA-Z]*)\s*\(/gs,
    message: 'React hook called conditionally',
    severity: 'error',
  },
  {
    name: 'HOOK_AFTER_EARLY_RETURN',
    pattern: /(return|throw)\s+[^;]+;[\s\S]*?\b(use[A-Z][a-zA-Z]*)\s*\(/g,
    message: 'Hook called after early return',
    severity: 'error',
  },
  {
    name: 'ASYNC_USE_EFFECT',
    pattern: /useEffect\s*\(\s*async\s*\(/g,
    message: 'Async function passed to useEffect',
    severity: 'error',
  },
  {
    name: 'MISSING_DEPENDENCIES',
    pattern: /use(Effect|Callback|Memo)\s*\(\s*[^,)]+\s*,\s*\[\s*\]\s*\)/g,
    message: 'Missing dependencies in useEffect/useCallback/useMemo',
    severity: 'warning',
  },
  {
    name: 'POTENTIAL_RACE_CONDITION',
    pattern: /(setState\([^)]*\)|dispatch\([^)]*\))[^;]+(setState\([^)]*\)|dispatch\([^)]*\))/gs,
    message: 'Potential race condition with multiple state updates',
    severity: 'warning',
  },
  {
    name: 'UNNECESSARY_EFFECT',
    pattern: /useEffect\s*\(\s*[^,{]+\s*,\s*\[\s*\]\s*\)/g,
    message: 'Effect with empty dependency array that might not need to be an effect',
    severity: 'warning',
  },
];

// Simple file finder function
function findFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          // Skip ignored directories
          const shouldSkip = IGNORE_PATTERNS.some(pattern => {
            const regex = new RegExp(
              pattern
                .replace(/\*\*/g, '.*')
                .replace(/\*/g, '[^/]*')
                .replace(/\//g, '\\\\')
            );
            return regex.test(filePath);
          });
          
          if (!shouldSkip) {
            findFiles(filePath, fileList);
          }
        } else if (file.match(/\.(js|jsx|ts|tsx)$/)) {
          fileList.push(filePath);
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

// Check a file for potential initialization issues
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    // Skip files that are not part of the source code
    if (filePath.includes('node_modules') || filePath.includes('dist') || filePath.includes('build')) {
      return [];
    }
    
    // Only check TypeScript and JavaScript files
    if (!filePath.match(/\.(js|jsx|ts|tsx)$/)) {
      return [];
    }
    
    PATTERNS.forEach(({ name, pattern, message }) => {
      let regex;
      try {
        regex = new RegExp(pattern);
      } catch (e) {
        console.error(`Invalid regex pattern for ${name}:`, pattern);
        return;
      }
      
      let match;
      let lastIndex = 0;
      
      try {
        while ((match = regex.exec(content)) !== null) {
          // Avoid infinite loops with zero-length matches
          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
          
          // Skip false positives
          if (shouldSkipMatch(name, content, match)) continue;
          
          // Calculate line and column numbers
          const lines = content.substring(0, match.index).split('\n');
          const line = lines.length;
          const column = lines[lines.length - 1].length;
          
          // Get the full line of code for context
          const lineContent = content.split('\n')[line - 1] || '';
          
          // Get the pattern details
          const patternInfo = PATTERNS.find(p => p.name === name);
          
          // Prepare the issue details
          const issue = {
            file: filePath,
            line,
            column,
            message: `${message}: ${match[0].substring(0, 100).replace(/\s+/g, ' ').trim()}`,
            type: name,
            severity: patternInfo?.severity || 'warning',
            codeSnippet: lineContent.trim(),
            matchText: match[0].substring(0, 200).replace(/\s+/g, ' ').trim()
          };
          
          // Log the issue for debugging
          console.log('\n=== ISSUE DETECTED ===');
          console.log(`File: ${issue.file}`);
          console.log(`Line: ${issue.line}, Column: ${issue.column}`);
          console.log(`Type: ${issue.type} (${issue.severity})`);
          console.log(`Message: ${issue.message}`);
          console.log(`Code: ${issue.codeSnippet}`);
          console.log(`Match: ${issue.matchText}`);
          
          issues.push(issue);
        }
      } catch (e) {
        console.error(`Error processing pattern ${name} in ${filePath}:`, e.message);
        console.error('Pattern:', pattern);
        if (match) {
          console.error('Match:', match[0]);
        }
      }
    });
    
    return issues;
  } catch (error) {
    console.error(`Error checking file ${filePath}:`, error.message);
    return [];
  }
}

// Skip false positive matches
function shouldSkipMatch(type, content, match) {
  if (!match || !match[0]) return true;
  
  const matchText = match[0];
  const lineStart = content.lastIndexOf('\n', match.index) + 1;
  const lineEnd = content.indexOf('\n', match.index);
  let lineContent = content.substring(lineStart, lineEnd === -1 ? undefined : lineEnd);
  
  // Skip empty matches or very short lines
  if (!lineContent.trim() || lineContent.trim().length < 3) {
    return true;
  }
  
  // Skip comments and strings
  if (/(\/\/|\/\*|\*\/|['"`])/.test(lineContent)) {
    return true;
  }
  
  // Skip test files and mocks
  const filePath = match.input || '';
  if (filePath.includes('.test.') || 
      filePath.includes('__tests__') || 
      filePath.includes('__mocks__') ||
      filePath.includes('.stories.') ||
      filePath.includes('.spec.') ||
      filePath.includes('node_modules') ||
      filePath.includes('dist') ||
      filePath.includes('build')) {
    return true;
  }
  
  // Type-specific skip conditions
  switch (type) {
    case 'MISSING_DEPENDENCIES':
      // Allow empty dependency arrays for effects that should only run once
      if (lineContent.includes('useEffect(() => {') && lineContent.includes('}, [])')) {
        return true;
      }
      // Skip if it's a custom hook
      if (lineContent.includes('use') && lineContent.includes('function')) {
        return true;
      }
      break;
      
    case 'VARIABLE_USED_BEFORE_DECLARATION':
      // Skip common false positives
      const skipPatterns = [
        'performance.',
        'Date.now',
        'process.env',
        'window.',
        'document.',
        'navigator.',
        'localStorage.',
        'sessionStorage.',
        'import ', 
        'export ',
        'interface ',
        'type ',
        'declare ',
        'as any',
        'as HTMLElement',
        'as HTMLDivElement',
        'as HTMLButtonElement',
        'as HTMLInputElement',
        'as unknown as',
        'as ',
        'typeof ',
        'keyof ',
        'infer ',
        '?.', // Optional chaining
        '??', // Nullish coalescing
        'React.',
        'console.',
        'JSON.',
        'Math.',
        'Object.',
        'Array.',
        'String.',
        'Number.',
        'Boolean.'
      ];
      
      if (skipPatterns.some(pattern => lineContent.includes(pattern))) {
        return true;
      }
      
      // Skip if it's a variable declaration with immediate usage (same line)
      if (lineContent.includes('const ') || lineContent.includes('let ') || lineContent.includes('var ')) {
        const declarationMatch = lineContent.match(/(const|let|var)\s+(\w+)\s*=/);
        if (declarationMatch && lineContent.includes(declarationMatch[2])) {
          // Check if the variable is used after its declaration on the same line
          const declarationIndex = lineContent.indexOf(declarationMatch[0]);
          const usageIndex = lineContent.lastIndexOf(declarationMatch[2]);
          if (usageIndex > declarationIndex + declarationMatch[0].length) {
            return true; // Variable is used after declaration on same line
          }
        }
      }
      
      // Skip if it's a property access (e.g., connection.messageQueue)
      if (matchText.includes('.')) {
        return true;
      }
      
      // Skip if the variable is declared in the same function scope
      const beforeVariableMatch = content.substring(0, match.index);
      const functionStart = Math.max(
        beforeVariableMatch.lastIndexOf('function'),
        beforeVariableMatch.lastIndexOf('=>'),
        beforeVariableMatch.lastIndexOf('const '),
        beforeVariableMatch.lastIndexOf('let '),
        beforeVariableMatch.lastIndexOf('var ')
      );
      
      if (functionStart !== -1) {
        const functionBody = content.substring(functionStart, match.index);
        const variableName = match[1];
        
        // Check if the variable is declared in this function
        const declarationRegex = new RegExp(`\\b(const|let|var)\\s+${variableName}\\b`);
        if (declarationRegex.test(functionBody)) {
          return true;
        }
      }
      
      // Skip if it's a TypeScript type assertion
      if (lineContent.includes(':')) {
        const beforeColon = lineContent.split(':')[0].trim();
        if (beforeColon.includes(' ')) {
          const lastWord = beforeColon.split(/\s+/).pop() || '';
          if (lastWord && lastWord[0] === lastWord[0].toUpperCase()) {
            return true; // Probably a type name
          }
        }
      }
      
      // Skip destructuring assignments
      if (lineContent.includes('{') && lineContent.includes('}') && lineContent.includes('=')) {
        return true;
      }
      
      break;
      
    case 'UNNECESSARY_EFFECT':
      // Allow empty dependency arrays for effects that should only run once
      if (lineContent.includes('useEffect(() => {') && lineContent.includes('}, [])')) {
        return true;
      }
      // Skip if it's a custom hook
      if (lineContent.includes('use') && lineContent.includes('function')) {
        return true;
      }
      break;
      
    case 'POTENTIAL_RACE_CONDITION':
      // Skip if it's a common pattern like reducer updates
      if (lineContent.includes('reducer') || 
          lineContent.includes('case') || 
          lineContent.includes('default:') ||
          lineContent.includes('switch') ||
          lineContent.includes('break;')) {
        return true;
      }
      break;
      
    case 'HOOK_AFTER_EARLY_RETURN':
      // Skip if the hook is in a different function
      const beforeMatch = content.substring(0, match.index);
      const lastFunctionStart = Math.max(
        beforeMatch.lastIndexOf('function'),
        beforeMatch.lastIndexOf('const '),
        beforeMatch.lastIndexOf('let '),
        beforeMatch.lastIndexOf('var '),
        beforeMatch.lastIndexOf('export const '),
        beforeMatch.lastIndexOf('export function'),
        beforeMatch.lastIndexOf('export default ')
      );
      
      if (lastFunctionStart === -1) {
        return false;
      }
      
      const functionBody = content.substring(lastFunctionStart, match.index);
      
      // Skip if this is a custom hook (name starts with 'use')
      const functionNameMatch = functionBody.match(/(?:function|const|let|var|export\s+const|export\s+function|export\s+default\s+function)\s+([a-zA-Z0-9_$]+)/);
      if (functionNameMatch && functionNameMatch[1] && functionNameMatch[1].startsWith('use')) {
        return true;
      }
      
      // Count non-early returns (returns that are the last statement in a function)
      const returnStatements = functionBody.match(/\breturn\b[^;]+;/g) || [];
      const earlyReturns = returnStatements.filter(stmt => !stmt.includes('return {'));
      
      // Skip if there are no early returns
      if (earlyReturns.length === 0) {
        return true;
      }
      
      // Check if there are hooks after the last early return
      const lastReturnIndex = functionBody.lastIndexOf('return');
      const hookCallsAfterReturn = functionBody.substring(lastReturnIndex).match(/\buse[A-Z][a-zA-Z]*\s*\(/g);
      
      // If there are hooks after the last return, it's a potential issue
      if (hookCallsAfterReturn && hookCallsAfterReturn.length > 0) {
        return false;
      }
      
      return true;
  }
  
  // Skip very short matches that are likely false positives
  if (matchText && matchText.trim().length < 5) {
    return true;
  }
  
  return false;
}

// Save issues to a JSON file
function saveIssuesToFile(issues) {
  try {
    const reportDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportPath = path.join(reportDir, 'initialization-issues.json');
    const reportData = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      stats: {
        total: issues.length,
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length
      },
      issues: issues.map(issue => ({
        ...issue,
        // Convert absolute paths to relative for better portability
        file: path.relative(process.cwd(), issue.file)
      }))
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    return reportPath;
  } catch (error) {
    console.error('Error saving issues to file:', error);
    return null;
  }
}

// Main function
async function main() {
  console.log('🔍 Starting initialization check...');
  console.log('==================================');
  
  // Log environment info
  console.log('\n=== Environment ===');
  console.log(`Node.js: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);
  console.log('==============================\n');
  
  // Check if source directory exists
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`❌ Source directory does not exist: ${SRC_DIR}`);
    process.exit(1);
  }
  
  console.log(`📂 Scanning directory: ${SRC_DIR}`);
  
  // Find all source files
  const files = findFiles(SRC_DIR);
  console.log(`✅ Found ${files.length} files to analyze\n`);
  
  if (files.length === 0) {
    console.log('No files found to analyze.');
    return;
  }
  
  // Check each file for issues
  console.log('Checking for potential initialization issues...\n');
  const allIssues = [];
  
  for (const file of files) {
    const issues = checkFile(file);
    if (issues.length > 0) {
      allIssues.push(...issues);
    }
  }
  
  // Report issues
  if (allIssues.length > 0) {
    // Group issues by type for summary
    const issuesByType = {};
    allIssues.forEach(issue => {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = 0;
      }
      issuesByType[issue.type]++;
    });
    
    // Print summary by type
    console.log('\n📊 Summary of Issues by Type:');
    console.log('========================');
    Object.entries(issuesByType).forEach(([type, count]) => {
      console.log(`- ${type}: ${count} issue${count > 1 ? 's' : ''}`);
    });
    
    // Group issues by file
    const issuesByFile = {};
    allIssues.forEach(issue => {
      const relativePath = path.relative(process.cwd(), issue.file);
      if (!issuesByFile[relativePath]) {
        issuesByFile[relativePath] = [];
      }
      issuesByFile[relativePath].push(issue);
    });
    
    // Print detailed issues by file
    console.log('\n🔍 Detailed Issues by File:');
    console.log('========================');
    
    Object.entries(issuesByFile).forEach(([file, issues]) => {
      console.log(`\n📄 ${file}`);
      
      // Sort issues by line number
      issues.sort((a, b) => a.line - b.line);
      
      // Print each issue with context
      issues.forEach((issue, idx) => {
        console.log(`\n  ${idx + 1}. [${issue.type}] Line ${issue.line}: ${issue.message}`);
        
        try {
          // Show the problematic line with some context
          const fileContent = fs.readFileSync(issue.file, 'utf8').split('\n');
          const startLine = Math.max(0, issue.line - 2);
          const endLine = Math.min(fileContent.length - 1, issue.line + 1);
          
          for (let i = startLine; i <= endLine; i++) {
            const lineNum = i + 1; // Convert to 1-based line numbers
            const linePrefix = lineNum === issue.line ? '❌' : '  ';
            console.log(`  ${linePrefix} ${lineNum.toString().padStart(4)} | ${fileContent[i].trim()}`);
          }
        } catch (err) {
          console.error('  Could not read file for context:', err.message);
        }
      });
    });
    
    // Save issues to a file
    const reportPath = saveIssuesToFile(allIssues);
    
    // Print summary
    console.log('\n📊 Summary:');
    console.log('========================');
    console.log(`Total issues found: ${allIssues.length}`);
    console.log(`Files with issues: ${Object.keys(issuesByFile).length}`);
    
    if (reportPath) {
      console.log(`\n📝 Report saved to: ${reportPath}`);
      console.log('💡 Run `node scripts/generate-report.js` to generate an HTML report');
    }
    
    console.log('\n💡 Recommendation: Review the issues above, focusing on:');
    console.log('1. Variables used before declaration');
    console.log('2. Hooks called conditionally');
    console.log('3. Missing dependencies in useEffect/useCallback/useMemo');
    
    process.exit(1);
  } else {
    console.log('✅ No potential initialization issues found!');
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Error in simple-check.js:');
  console.error(error);
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
});
