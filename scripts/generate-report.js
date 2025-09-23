import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const REPORT_DIR = path.join(process.cwd(), 'reports');
const REPORT_FILE = path.join(REPORT_DIR, 'initialization-issues.html');

// Ensure reports directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Function to generate HTML report
function generateHTMLReport(issues) {
  const now = new Date().toISOString();
  const totalIssues = issues.length;
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  
  // Group issues by file
  const issuesByFile = {};
  issues.forEach(issue => {
    if (!issuesByFile[issue.file]) {
      issuesByFile[issue.file] = [];
    }
    issuesByFile[issue.file].push(issue);
  });
  
  // Generate file sections
  const fileSections = Object.entries(issuesByFile).map(([file, fileIssues]) => {
    // Sort by severity and then by line number
    fileIssues.sort((a, b) => {
      if (a.severity === b.severity) {
        return a.line - b.line;
      }
      return a.severity === 'error' ? -1 : 1;
    });
    
    const issueItems = fileIssues.map(issue => `
      <div class="issue ${issue.severity}">
        <div class="issue-header">
          <span class="line">Line ${issue.line}:${issue.column}</span>
          <span class="type">${issue.type}</span>
          <span class="severity ${issue.severity}">${issue.severity}</span>
        </div>
        <div class="message">${escapeHtml(issue.message)}</div>
        <div class="code-snippet">
          <pre>${escapeHtml(issue.codeSnippet)}</pre>
        </div>
      </div>
    `).join('');
    
    return `
      <div class="file">
        <h3>${escapeHtml(path.relative(process.cwd(), file))}</h3>
        <div class="issues">${issueItems}</div>
      </div>
    `;
  }).join('');
  
  // Generate summary
  const summary = `
    <div class="summary">
      <h2>Initialization Issues Report</h2>
      <div class="stats">
        <div class="stat total">
          <span class="count">${totalIssues}</span>
          <span class="label">Total Issues</span>
        </div>
        <div class="stat errors">
          <span class="count">${errorCount}</span>
          <span class="label">Errors</span>
        </div>
        <div class="stat warnings">
          <span class="count">${warningCount}</span>
          <span class="label">Warnings</span>
        </div>
      </div>
      <div class="timestamp">Generated on: ${now}</div>
    </div>
  `;
  
  // Generate the full HTML
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Initialization Issues Report</title>
      <style>
        :root {
          --error: #ff5252;
          --warning: #ffc107;
          --success: #4caf50;
          --bg: #f5f5f5;
          --card-bg: #fff;
          --text: #333;
          --border: #e0e0e0;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
        }
        
        body {
          background-color: var(--bg);
          color: var(--text);
          line-height: 1.6;
          padding: 20px;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .summary {
          background: var(--card-bg);
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .stats {
          display: flex;
          gap: 20px;
          margin: 20px 0;
        }
        
        .stat {
          flex: 1;
          text-align: center;
          padding: 15px;
          border-radius: 6px;
          background: #f9f9f9;
        }
        
        .count {
          display: block;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .errors .count { color: var(--error); }
        .warnings .count { color: var(--warning); }
        .total .count { color: var(--success); }
        
        .file {
          background: var(--card-bg);
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .file h3 {
          margin-bottom: 10px;
          color: #2196f3;
          font-size: 16px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
        }
        
        .issue {
          margin: 15px 0;
          padding: 12px;
          border-left: 4px solid #ddd;
          background: #fafafa;
        }
        
        .issue.error { border-left-color: var(--error); }
        .issue.warning { border-left-color: var(--warning); }
        
        .issue-header {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .line {
          font-family: monospace;
          color: #666;
          font-size: 14px;
        }
        
        .type {
          background: #e0e0e0;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          font-family: monospace;
        }
        
        .severity {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          color: white;
        }
        
        .severity.error { background: var(--error); }
        .severity.warning { background: var(--warning); color: #333; }
        
        .message {
          margin: 8px 0;
          font-weight: 500;
        }
        
        .code-snippet {
          background: #f0f0f0;
          padding: 8px 12px;
          border-radius: 4px;
          overflow-x: auto;
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          margin-top: 8px;
        }
        
        .timestamp {
          text-align: right;
          font-size: 12px;
          color: #777;
          margin-top: 10px;
        }
        
        @media (max-width: 768px) {
          .stats {
            flex-direction: column;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${summary}
        <div class="files">
          ${fileSections}
        </div>
      </div>
    </body>
    </html>
  `;
  
  return html;
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Main function
async function main() {
  try {
    console.log('Generating initialization issues report...');
    
    // Path to the JSON report generated by simple-check.js
    const jsonReportPath = path.join(process.cwd(), 'reports', 'initialization-issues.json');
    
    if (!fs.existsSync(jsonReportPath)) {
      console.error(`❌ JSON report not found at: ${jsonReportPath}`);
      console.log('\nPlease run `node scripts/simple-check.js` first to generate the report data.');
      process.exit(1);
    }
    
    console.log(`📊 Loading report data from: ${jsonReportPath}`);
    
    // Read and parse the JSON report
    const reportData = JSON.parse(fs.readFileSync(jsonReportPath, 'utf8'));
    
    if (!reportData.issues || !Array.isArray(reportData.issues)) {
      throw new Error('Invalid report format: issues array not found');
    }
    
    console.log(`📝 Found ${reportData.issues.length} issues in the report`);
    
    // Generate the HTML report
    const html = generateHTMLReport(reportData.issues);
    
    // Write the report to a file
    fs.writeFileSync(REPORT_FILE, html);
    
    console.log(`\n✅ Report generated successfully: ${REPORT_FILE}`);
    console.log('Open the report in your browser to view the details.');
    
    console.log('\nTo view the report, open the following file in your browser:');
    console.log(`file://${REPORT_FILE.replace(/\\/g, '/')}`);
    
  } catch (error) {
    console.error('❌ Error generating report:', error);
    process.exit(1);
  }
}

// Run the script
main();
