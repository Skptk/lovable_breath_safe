#!/usr/bin/env node

/**
 * Load Context Script for Breath Safe Project
 * 
 * This script reads the app context documentation and displays it in a readable format.
 * Use this at the start of any development session to understand the current state
 * of the project architecture, constraints, and conventions.
 * 
 * Usage: node scripts/load_context.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Print colored text to console
 */
function colorPrint(text, color = 'reset') {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

/**
 * Print a section header
 */
function printHeader(text) {
  console.log('\n' + '='.repeat(60));
  colorPrint(text.toUpperCase(), 'cyan');
  console.log('='.repeat(60));
}

/**
 * Print a subsection header
 */
function printSubHeader(text) {
  colorPrint(`\n${text}`, 'yellow');
  console.log('-'.repeat(text.length));
}

/**
 * Main function to load and display context
 */
function loadContext() {
  const contextPath = path.join(__dirname, '..', 'docs', 'app_context.md');
  
  try {
    // Check if context file exists
    if (!fs.existsSync(contextPath)) {
      colorPrint('❌ Error: app_context.md not found!', 'red');
      colorPrint(`Expected location: ${contextPath}`, 'dim');
      colorPrint('\nPlease ensure the context file exists before starting development.', 'yellow');
      process.exit(1);
    }

    // Read the context file
    const contextContent = fs.readFileSync(contextPath, 'utf8');
    
    // Print header
    printHeader('Breath Safe - App Context');
    colorPrint('📖 Loading project context for development session...', 'green');
    
    // Extract and display key sections
    const sections = contextContent.split('## ');
    
    sections.forEach((section, index) => {
      if (index === 0) return; // Skip the title
      
      const lines = section.split('\n');
      const title = lines[0];
      const content = lines.slice(1).join('\n').trim();
      
      // Display key sections with highlighting
      if (shouldDisplaySection(title)) {
        printSubHeader(title);
        
        // Special formatting for certain sections
        if (title.includes('Tech Stack')) {
          displayTechStack(content);
        } else if (title.includes('API Integrations')) {
          displayApiInfo(content);
        } else if (title.includes('Business Rules')) {
          displayBusinessRules(content);
        } else if (title.includes('Environment Variables')) {
          displayEnvironmentVars(content);
        } else {
          // Display first few lines of other sections
          const preview = content.split('\n').slice(0, 5).join('\n');
          console.log(preview);
          if (content.split('\n').length > 5) {
            colorPrint('  ... (see full documentation for more details)', 'dim');
          }
        }
      }
    });
    
    // Display footer with important reminders
    printFooter();
    
  } catch (error) {
    colorPrint('❌ Error reading context file:', 'red');
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Determine which sections to display in the summary
 */
function shouldDisplaySection(title) {
  const importantSections = [
    'Project Overview',
    'Tech Stack',
    'API Integrations',
    'Business Rules & Constraints',
    'Coding Standards',
    'Environment Variables',
    'Known Limitations & Technical Debt'
  ];
  
  return importantSections.some(section => title.includes(section));
}

/**
 * Display tech stack information
 */
function displayTechStack(content) {
  const lines = content.split('\n');
  lines.forEach(line => {
    if (line.includes('**') && line.includes('**')) {
      colorPrint(line, 'bright');
    } else if (line.trim().startsWith('-')) {
      colorPrint(line, 'green');
    } else if (line.trim()) {
      console.log(line);
    }
  });
}

/**
 * Display API integration information
 */
function displayApiInfo(content) {
  const lines = content.split('\n');
  let inCodeBlock = false;
  
  lines.forEach(line => {
    if (line.includes('```')) {
      inCodeBlock = !inCodeBlock;
      colorPrint(line, 'dim');
    } else if (inCodeBlock) {
      colorPrint(line, 'cyan');
    } else if (line.includes('OPENAQ_API_KEY')) {
      colorPrint(line, 'yellow');
    } else if (line.includes('**')) {
      colorPrint(line, 'bright');
    } else {
      console.log(line);
    }
  });
}

/**
 * Display business rules
 */
function displayBusinessRules(content) {
  const lines = content.split('\n');
  lines.forEach(line => {
    if (line.includes('**') && line.includes('**')) {
      colorPrint(line, 'magenta');
    } else if (line.trim().startsWith('-')) {
      colorPrint(line, 'white');
    } else {
      console.log(line);
    }
  });
}

/**
 * Display environment variables information
 */
function displayEnvironmentVars(content) {
  const lines = content.split('\n');
  let inCodeBlock = false;
  
  lines.forEach(line => {
    if (line.includes('```')) {
      inCodeBlock = !inCodeBlock;
      colorPrint(line, 'dim');
    } else if (inCodeBlock) {
      colorPrint(line, 'yellow');
    } else if (line.includes('OPENAQ_API_KEY')) {
      colorPrint(line, 'red');
    } else {
      console.log(line);
    }
  });
}

/**
 * Display footer with important reminders
 */
function printFooter() {
  console.log('\n' + '='.repeat(60));
  colorPrint('IMPORTANT DEVELOPMENT REMINDERS', 'red');
  console.log('='.repeat(60));
  
  colorPrint('\n✅ Pre-Development Checklist:', 'green');
  console.log('   • Environment variables configured (.env file)');
  console.log('   • Dependencies installed (npm install)');
  console.log('   • Supabase connection tested');
  console.log('   • OpenAQ API key validated');
  
  colorPrint('\n🔒 Security Reminders:', 'yellow');
  console.log('   • Never commit .env file to version control');
  console.log('   • Test with limited API calls during development');
  console.log('   • Validate user location permissions');
  
  colorPrint('\n🚀 Development Guidelines:', 'blue');
  console.log('   • Follow TypeScript strict mode');
  console.log('   • Use Zustand for global state');
  console.log('   • Implement proper error boundaries');
  console.log('   • Test on mobile devices');
  
  colorPrint('\n📖 Documentation:', 'cyan');
  console.log('   • Update app_context.md after significant changes');
  console.log('   • Document new API integrations');
  console.log('   • Update business rules if logic changes');
  
  console.log('\n' + '='.repeat(60));
  colorPrint('Context loaded successfully! Ready for development. 🎯', 'green');
  console.log('='.repeat(60) + '\n');
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  loadContext();
}

export { loadContext };