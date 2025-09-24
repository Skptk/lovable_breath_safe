import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '..', 'dist');
const JS_DIR = path.join(DIST_DIR, 'js');

const PATTERNS = [
  { label: 'const declarations', regex: /const\s+([a-zA-Z_$][\w$]*)\s*=/g },
  { label: 'let declarations', regex: /let\s+([a-zA-Z_$][\w$]*)\s*=/g },
  { label: 'function declarations', regex: /function\s+([a-zA-Z_$][\w$]*)/g },
  { label: 'export statements', regex: /export\s*{[^}]*}/g },
  { label: 'import statements', regex: /import[^;]+from\s+['"][^'"]+['"]/g },
  { label: 'TDZ suspects', regex: /Cannot access [^ ]+ before initialization/g }
];

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error('Failed to read file:', filePath, error.message);
    return null;
  }
}

function analyzeFile(filePath) {
  const content = readFileSafe(filePath);
  if (!content) return;

  console.log(`\n📄 File: ${path.basename(filePath)}`);

  PATTERNS.forEach(({ label, regex }) => {
    const matches = Array.from(content.matchAll(regex));
    if (matches.length === 0) {
      return;
    }

    console.log(`  • ${label}: ${matches.length} matches`);
    matches.slice(0, 5).forEach((match, index) => {
      const start = Math.max(0, match.index - 60);
      const end = Math.min(content.length, match.index + 120);
      const snippet = content.slice(start, end).replace(/\s+/g, ' ').trim();
      console.log(`    ${index + 1}. …${snippet}`);
    });
  });
}

function analyzeBuildFiles() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('Dist directory not found. Run `npm run build` before analyzing.');
    return;
  }

  const jsDirExists = fs.existsSync(JS_DIR);
  const targets = jsDirExists ? fs.readdirSync(JS_DIR).map((name) => path.join(JS_DIR, name)) : [];

  if (!jsDirExists || targets.length === 0) {
    console.warn('No JS files found inside dist/js. Scanning entire dist directory instead.');
    const allFiles = fs.readdirSync(DIST_DIR, { withFileTypes: true });
    targets.push(
      ...allFiles
        .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
        .map((entry) => path.join(DIST_DIR, entry.name))
    );
  }

  if (targets.length === 0) {
    console.warn('No JavaScript files found to analyze.');
    return;
  }

  console.log('🔍 Analyzing built JavaScript files for TDZ patterns...');
  targets.forEach(analyzeFile);
}

analyzeBuildFiles();
