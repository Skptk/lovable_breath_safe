#!/usr/bin/env node

/**
 * Blank Page Diagnostic Script
 * 
 * This script helps diagnose issues causing blank pages on Netlify deployment
 * Run this script to check common causes of blank page issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Breath Safe - Blank Page Diagnostic Tool');
console.log('==========================================');

console.log('🖥️ Running in Node.js environment');

// Check build output
console.log('📁 Checking build output...');

const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  console.log('✅ Dist folder exists');
  
  const indexHtmlPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    console.log('✅ index.html exists');
    const indexContent = fs.readFileSync(indexHtmlPath, 'utf8');
    if (indexContent.includes('<div id="root">')) {
      console.log('✅ Root div found in HTML');
    } else {
      console.error('❌ Root div not found in HTML');
    }
    
    // Check if the HTML has the script tag
    if (indexContent.includes('<script type="module"')) {
      console.log('✅ Module script tag found');
    } else {
      console.error('❌ Module script tag not found');
    }
    
    // Extract script src
    const scriptMatch = indexContent.match(/src="([^"]*\.js)"/);
    if (scriptMatch) {
      const scriptPath = path.join(distPath, scriptMatch[1]);
      if (fs.existsSync(scriptPath)) {
        console.log('✅ Main script file exists:', scriptMatch[1]);
        const scriptSize = fs.statSync(scriptPath).size;
        console.log('📊 Script file size:', scriptSize, 'bytes');
      } else {
        console.error('❌ Main script file not found:', scriptMatch[1]);
      }
    }
    
  } else {
    console.error('❌ index.html not found');
  }
  
  const jsPath = path.join(distPath, 'js');
  if (fs.existsSync(jsPath)) {
    console.log('✅ JS folder exists');
    const jsFiles = fs.readdirSync(jsPath).filter(f => f.endsWith('.js'));
    console.log('📦 JS files found:', jsFiles.length);
    jsFiles.forEach(file => {
      const filePath = path.join(jsPath, file);
      const size = fs.statSync(filePath).size;
      console.log(`  - ${file}: ${size} bytes`);
    });
  } else {
    console.error('❌ JS folder not found');
  }
  
  const assetsPath = path.join(distPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    console.log('✅ Assets folder exists');
    const assetFiles = fs.readdirSync(assetsPath);
    console.log('🎨 Asset files found:', assetFiles.length);
    assetFiles.forEach(file => {
      const filePath = path.join(assetsPath, file);
      const size = fs.statSync(filePath).size;
      console.log(`  - ${file}: ${size} bytes`);
    });
  } else {
    console.error('❌ Assets folder not found');
  }
  
} else {
  console.error('❌ Dist folder not found - run npm run build first');
}

// Check for common issues
console.log('\n🔍 Checking for common issues...');

// Check if there are any obvious errors in the main script
const mainScriptPath = path.join(distPath, 'js', 'index-7A-hU2FL.js');
if (fs.existsSync(mainScriptPath)) {
  const scriptContent = fs.readFileSync(mainScriptPath, 'utf8');
  
  // Check for common error patterns
  if (scriptContent.includes('VITE_SUPABASE_URL')) {
    console.log('⚠️ Script contains VITE_SUPABASE_URL - environment variables may not be replaced');
  }
  
  if (scriptContent.includes('undefined')) {
    console.log('⚠️ Script contains undefined values - check environment variable replacement');
  }
  
  // Check if the script starts with proper module syntax
  if (scriptContent.startsWith('import ') || scriptContent.includes('"use strict"')) {
    console.log('✅ Script has proper module syntax');
  } else {
    console.error('❌ Script may have syntax issues');
  }
}

console.log('\n📋 Recommendations:');
console.log('1. Check Netlify environment variables in Site Settings > Environment Variables');
console.log('2. Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
console.log('3. Check browser console for JavaScript errors');
console.log('4. Verify all assets are loading correctly in Network tab');

console.log('==========================================');
console.log('🏁 Diagnostic complete');