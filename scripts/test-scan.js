#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

console.log('🔍 Starting test scan...');
console.log(`Current directory: ${process.cwd()}`);
console.log(`Source directory: ${SRC_DIR}`);

if (!fs.existsSync(SRC_DIR)) {
  console.error(`❌ Source directory does not exist: ${SRC_DIR}`);
  process.exit(1);
}

const files = findFiles(SRC_DIR);
console.log(`📂 Found ${files.length} files to analyze`);

if (files.length > 0) {
  console.log('\nFirst few files found:');
  files.slice(0, 5).forEach(file => {
    // Convert to relative path for better readability
    const relativePath = path.relative(process.cwd(), file);
    console.log(`- ${relativePath}`);
  });
  if (files.length > 5) {
    console.log(`- ...and ${files.length - 5} more`);
  }
} else {
  console.log('No files found to analyze.');
}
