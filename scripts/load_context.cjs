#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Breath Safe - Context Loader
 * 
 * This script reads and displays the project's app context documentation
 * to provide developers with essential project information before starting
 * any development work.
 * 
 * Usage: node scripts/load_context.cjs
 */

const CONTEXT_FILE_PATH = path.join(__dirname, '..', 'docs', 'app_context.md');

// ANSI color codes for terminal output formatting
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

function formatHeader(text) {
  const border = '='.repeat(text.length + 4);
  return `\n${colors.cyan}${border}\n  ${text.toUpperCase()}  \n${border}${colors.reset}\n`;
}

function formatSubHeader(text) {
  return `\n${colors.yellow}${colors.bright}${text}${colors.reset}\n`;
}

function formatSuccess(text) {
  return `${colors.green}✓ ${text}${colors.reset}`;
}

function formatError(text) {
  return `${colors.red}✗ ${text}${colors.reset}`;
}

function formatInfo(text) {
  return `${colors.blue}ℹ ${text}${colors.reset}`;
}

function formatWarning(text) {
  return `${colors.yellow}⚠ ${text}${colors.reset}`;
}

function displayProjectInfo() {
  console.log(formatHeader('Breath Safe - Project Context Loader'));
  
  console.log(formatInfo('Reading project context documentation...'));
  console.log(formatInfo(`Context file: ${CONTEXT_FILE_PATH}`));
  
  // Check if context file exists
  if (!fs.existsSync(CONTEXT_FILE_PATH)) {
    console.error(formatError(`Context file not found at: ${CONTEXT_FILE_PATH}`));
    console.error(formatError('Please ensure the app_context.md file exists in the docs/ directory.'));
    process.exit(1);
  }
  
  try {
    // Read the context file
    const contextContent = fs.readFileSync(CONTEXT_FILE_PATH, 'utf8');
    
    console.log(formatSuccess('Context file loaded successfully!'));
    console.log(formatInfo(`File size: ${(contextContent.length / 1024).toFixed(2)} KB`));
    console.log(formatInfo(`Lines: ${contextContent.split('\n').length}`));
    
    // Display the content with formatting
    console.log(formatSubHeader('PROJECT CONTEXT DOCUMENTATION'));
    console.log('━'.repeat(80));
    
    // Process the markdown content for better terminal display
    const formattedContent = contextContent
      .replace(/^# (.+)$/gm, `${colors.cyan}${colors.bright}$1${colors.reset}`)
      .replace(/^## (.+)$/gm, `\n${colors.yellow}${colors.bright}$1${colors.reset}`)
      .replace(/^### (.+)$/gm, `\n${colors.magenta}$1${colors.reset}`)
      .replace(/\*\*(.+?)\*\*/g, `${colors.bright}$1${colors.reset}`)
      .replace(/`(.+?)`/g, `${colors.green}$1${colors.reset}`)
      .replace(/^- (.+)$/gm, `  ${colors.blue}•${colors.reset} $1`)
      .replace(/^\d+\. (.+)$/gm, `  ${colors.blue}$&${colors.reset}`);
    
    console.log(formattedContent);
    
    // Display footer information
    console.log('\n' + '━'.repeat(80));
    console.log(formatSubHeader('NEXT STEPS'));
    console.log(formatInfo('Review the above documentation before starting development'));
    console.log(formatInfo('All coding should follow the patterns and constraints outlined above'));
    console.log(formatWarning('If you need to make changes that conflict with this context, discuss with the team first'));
    
    // Display quick reference commands
    console.log(formatSubHeader('QUICK REFERENCE COMMANDS'));
    console.log(`${colors.dim}Development:${colors.reset}     npm run dev`);
    console.log(`${colors.dim}Build:${colors.reset}           npm run build`);
    console.log(`${colors.dim}Lint:${colors.reset}            npm run lint`);
    console.log(`${colors.dim}Reload Context:${colors.reset}  node scripts/load_context.cjs`);
    
    console.log(formatHeader('Context loaded successfully'));
    
  } catch (error) {
    console.error(formatError(`Failed to read context file: ${error.message}`));
    process.exit(1);
  }
}

// Display timestamp and environment info
function displayMetadata() {
  const now = new Date().toLocaleString();
  console.log(formatInfo(`Loaded at: ${now}`));
  console.log(formatInfo(`Node.js version: ${process.version}`));
  console.log(formatInfo(`Working directory: ${process.cwd()}`));
  console.log('');
}

// Main execution
function main() {
  try {
    console.clear(); // Clear terminal for better readability
    displayMetadata();
    displayProjectInfo();
  } catch (error) {
    console.error(formatError(`Unexpected error: ${error.message}`));
    process.exit(1);
  }
}

// Handle process interruption gracefully
process.on('SIGINT', () => {
  console.log(formatWarning('\nContext loading interrupted.'));
  process.exit(0);
});

// Execute the script
if (require.main === module) {
  main();
}

module.exports = {
  loadContext: main,
  formatHeader,
  formatSubHeader,
  formatSuccess,
  formatError,
  formatInfo,
  formatWarning
};