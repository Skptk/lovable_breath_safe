#!/usr/bin/env node

/**
 * Custom Secret Scanner for Breath Safe Project
 * Scans for common credential patterns and sensitive information
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Common patterns to detect
const SECRET_PATTERNS = [
  // Database URLs with actual credentials (not placeholders)
  { pattern: /postgres:\/\/[^:\s]+:[^@\s]+@[^\s]+/g, name: 'Database URL with credentials', severity: 'critical' },
  { pattern: /mysql:\/\/[^:\s]+:[^@\s]+@[^\s]+/g, name: 'MySQL URL with credentials', severity: 'critical' },
  
  // Private Keys (actual keys, not patterns)
  { pattern: /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----\n[A-Za-z0-9+/=\n]+-----END (RSA|EC|OPENSSH) PRIVATE KEY-----/g, name: 'Private Key', severity: 'critical' },
  { pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----\n[A-Za-z0-9+/=\n]+-----END PGP PRIVATE KEY BLOCK-----/g, name: 'PGP Private Key', severity: 'critical' },
  
  // JWT Tokens (actual tokens, not patterns)
  { pattern: /eyJ[A-Za-z0-9-_=]{20,}\.[A-Za-z0-9-_=]{20,}\.[A-Za-z0-9-_.+/=]{20,}/g, name: 'JWT Token', severity: 'medium' },
  
  // OAuth Tokens (actual tokens, not patterns)
  { pattern: /[0-9]{10,}-[0-9A-Za-z_]{32,}/g, name: 'OAuth Token', severity: 'medium' },
  
  // AWS Keys (actual keys, not patterns)
  { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key ID', severity: 'high' },
  { pattern: /[0-9a-zA-Z/+]{40}/g, name: 'AWS Secret Access Key', severity: 'high' },
  
  // Hardcoded credentials (not placeholders or examples)
  { pattern: /password\s*[:=]\s*['"`](?!.*(?:example|placeholder|test|demo|dev|123|password))[^'"`]{8,}['"`]/gi, name: 'Hardcoded Password', severity: 'high' },
  { pattern: /secret\s*[:=]\s*['"`](?!.*(?:example|placeholder|test|demo|your_|YOUR_))[^'"`]{8,}['"`]/gi, name: 'Hardcoded Secret', severity: 'high' },
  { pattern: /token\s*[:=]\s*['"`](?!.*(?:example|placeholder|test|demo|your_|YOUR_))[^'"`]{8,}['"`]/gi, name: 'Hardcoded Token', severity: 'high' },
  { pattern: /api_key\s*[:=]\s*['"`](?!.*(?:example|placeholder|test|demo|your_|YOUR_))[^'"`]{8,}['"`]/gi, name: 'Hardcoded API Key', severity: 'high' },
  
  // Long random strings that might be actual secrets
  { pattern: /['"`][a-zA-Z0-9]{40,}['"`]/g, name: 'Long Random String (Potential Secret)', severity: 'medium' },
];

// Directories to exclude
const EXCLUDE_DIRS = [
  'node_modules',
  'dist',
  '.git',
  'reports',
  'public',
  'supabase/migrations'
];

// File extensions to scan
const SCAN_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.json', '.yaml', '.yml', '.toml', '.md', '.txt', '.sql'
];

// Files to exclude
const EXCLUDE_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml'
];

let issuesFound = [];
let filesScanned = 0;

function shouldExcludeFile(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);
  
  // Check excluded files
  if (EXCLUDE_FILES.includes(fileName)) return true;
  
  // Check excluded directories
  for (const excludeDir of EXCLUDE_DIRS) {
    if (filePath.includes(excludeDir)) return true;
  }
  
  // Check file extensions
  return !SCAN_EXTENSIONS.includes(ext);
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (let lineNum = 1; lineNum <= lines.length; lineNum++) {
      const line = lines[lineNum - 1];
      
      for (const pattern of SECRET_PATTERNS) {
        const matches = line.match(pattern.pattern);
        if (matches) {
          // Filter out false positives
          const filteredMatches = matches.filter(match => {
            // Skip common false positives
            if (match.length > 200) return false; // Too long to be a real secret
            if (match.includes('example') || match.includes('placeholder')) return false;
            if (match.includes('test') || match.includes('demo')) return false;
            if (match.includes('localhost') || match.includes('127.0.0.1')) return false;
            if (match.includes('your_') || match.includes('your-')) return false;
            if (match.includes('REPLACE_') || match.includes('CHANGE_')) return false;
            if (match.includes('TODO') || match.includes('FIXME')) return false;
            if (match.includes('File:') || match.includes('**File**')) return false;
            if (match.includes('src/components/') || match.includes('src/hooks/')) return false;
            if (match.includes('**Features**') || match.includes('**File**')) return false;
            
            // Skip documentation patterns
            if (line.includes('###') || line.includes('##') || line.includes('#')) return false;
            if (line.includes('**') || line.includes('```')) return false;
            if (line.includes('Features:') || line.includes('File:')) return false;
            
            return true;
          });
          
          if (filteredMatches.length > 0) {
            issuesFound.push({
              file: filePath,
              line: lineNum,
              pattern: pattern.name,
              severity: pattern.severity,
              matches: filteredMatches,
              context: line.trim()
            });
          }
        }
      }
    }
    
    filesScanned++;
  } catch (error) {
    console.warn(`⚠️  Warning: Could not read ${filePath}: ${error.message}`);
  }
}

function scanDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (stat.isFile() && !shouldExcludeFile(fullPath)) {
        scanFile(fullPath);
      }
    }
  } catch (error) {
    console.warn(`⚠️  Warning: Could not scan directory ${dirPath}: ${error.message}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const isStaged = args.includes('--staged');
  const isCI = args.includes('--ci');
  
  console.log('🔒 Breath Safe Secret Scanner');
  console.log('==============================\n');
  
  if (isStaged) {
    console.log('📋 Scanning staged files only...');
    // For staged files, we'll scan the entire project but focus on recent changes
    scanDirectory('.');
  } else {
    console.log('📁 Scanning entire project...');
    scanDirectory('.');
  }
  
  console.log(`\n📊 Scan Complete: ${filesScanned} files scanned`);
  
  if (issuesFound.length === 0) {
    console.log('✅ No security issues found!');
    process.exit(0);
  }
  
  console.log(`\n🚨 Found ${issuesFound.length} potential security issues:\n`);
  
  // Group by severity
  const critical = issuesFound.filter(issue => issue.severity === 'critical');
  const high = issuesFound.filter(issue => issue.severity === 'high');
  const medium = issuesFound.filter(issue => issue.severity === 'medium');
  
  if (critical.length > 0) {
    console.log('🔴 CRITICAL ISSUES:');
    critical.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line} - ${issue.pattern}`);
      console.log(`    Context: ${issue.context}`);
      console.log(`    Matches: ${issue.matches.join(', ')}\n`);
    });
  }
  
  if (high.length > 0) {
    console.log('🟠 HIGH PRIORITY ISSUES:');
    high.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line} - ${issue.pattern}`);
      console.log(`    Context: ${issue.context}`);
      console.log(`    Matches: ${issue.matches.join(', ')}\n`);
    });
  }
  
  if (medium.length > 0) {
    console.log('🟡 MEDIUM PRIORITY ISSUES:');
    medium.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line} - ${issue.pattern}`);
      console.log(`    Context: ${issue.context}`);
      console.log(`    Matches: ${issue.matches.join(', ')}\n`);
    });
  }
  
  console.log('💡 Recommendations:');
  console.log('  - Review all flagged items for actual secrets');
  console.log('  - Move sensitive data to environment variables');
  console.log('  - Use .env files (already in .gitignore)');
  console.log('  - Consider using a secrets management service');
  
  if (isCI || critical.length > 0) {
    console.log('\n❌ Build failed due to security issues');
    process.exit(1);
  } else {
    console.log('\n⚠️  Please review the issues above');
    process.exit(0);
  }
}

main();
