#!/usr/bin/env node

/**
 * Test script to verify React app builds and serves properly
 * This helps debug NO_FCP issues in CI environments
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing React app build and preview...');

try {
  // Check if dist directory exists
  if (!fs.existsSync(path.join(process.cwd(), 'dist'))) {
    console.log('📦 Building project...');
    execSync('npm run build', { stdio: 'inherit' });
  }

  // Check if index.html exists
  const indexPath = path.join(process.cwd(), 'dist', 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error('index.html not found in dist directory');
  }

  // Check if main JS files exist
  const distDir = path.join(process.cwd(), 'dist');
  const jsFiles = fs.readdirSync(distDir).filter(file => file.endsWith('.js'));
  
  if (jsFiles.length === 0) {
    throw new Error('No JavaScript files found in dist directory');
  }

  console.log('✅ Build verification passed');
  console.log(`📁 Dist directory: ${distDir}`);
  console.log(`📄 Index file: ${indexPath}`);
  console.log(`🔧 JS files: ${jsFiles.length} found`);

  // Test preview server
  console.log('🚀 Testing preview server...');
  
  // Start preview server in background
  const previewProcess = execSync('npm run preview:ci', { 
    stdio: 'pipe',
    encoding: 'utf8'
  });

  console.log('✅ Preview server test completed');
  console.log('📊 Server output:', previewProcess);

} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}
