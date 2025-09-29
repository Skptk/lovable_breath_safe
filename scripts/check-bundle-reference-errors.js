import { promises as fs } from 'fs';
import path from 'path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const ERROR_PATTERNS = [
  /ReferenceError/i,
  /Cannot access '\w+' before initialization/,
  /is not defined/i
];

const SAFE_REFERENCE_PATTERNS = [
  /ReferenceError\("this hasn't been initialised - super\(\) hasn't been called"\)/g
];

async function collectJsFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectJsFiles(resolved);
      }
      if (entry.isFile() && /\.(js|mjs|cjs|ts|tsx)$/.test(entry.name)) {
        return [resolved];
      }
      return [];
    })
  );
  return files.flat();
}

async function scanFile(file) {
  let contents = await fs.readFile(file, 'utf8');

  SAFE_REFERENCE_PATTERNS.forEach((safePattern) => {
    contents = contents.replace(safePattern, '');
  });
  const matches = ERROR_PATTERNS
    .filter((pattern) => pattern.test(contents))
    .map((pattern) => pattern.toString());

  return { file, matches };
}

async function main() {
  try {
    await fs.access(DIST_DIR);
  } catch {
    console.warn('[check-bundle-reference-errors] dist/ directory not found; skipping scan.');
    process.exit(0);
  }

  const files = await collectJsFiles(DIST_DIR);
  if (files.length === 0) {
    console.log('[check-bundle-reference-errors] No bundle files detected; skipping.');
    return;
  }

  const results = await Promise.all(files.map(scanFile));
  const failures = results.filter(({ matches }) => matches.length > 0);

  if (failures.length > 0) {
    console.error('\n🚨  ReferenceError patterns detected in production bundle:');
    failures.forEach(({ file, matches }) => {
      console.error(` - ${file}`);
      matches.forEach((match) => console.error(`   • pattern: ${match}`));
    });
    console.error('\nFailing build to prevent deploying broken bundle.');
    process.exit(1);
  }

  console.log('[check-bundle-reference-errors] ✅ No ReferenceError patterns detected in bundle.');
}

main().catch((error) => {
  console.error('[check-bundle-reference-errors] Unexpected failure:', error);
  process.exit(1);
});
