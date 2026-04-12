/**
 * Updates all JSON files to reference .png assets instead of .svg
 * Run after generate-assets.mjs to switch the game to use generated PNGs
 *
 * Usage: node scripts/update-json-to-png.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Replace .svg with .png in asset paths
  content = content.replace(/("assets\/[^"]+)\.svg"/g, '$1.png"');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    const count = (content.match(/\.png"/g) || []).length;
    console.log(`  Updated: ${path.relative(ROOT, filePath)} (${count} paths)`);
  } else {
    console.log(`  No changes: ${path.relative(ROOT, filePath)}`);
  }
}

function walkJsonFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsonFiles(full);
    } else if (entry.name.endsWith('.json')) {
      updateFile(full);
    }
  }
}

console.log('Updating JSON files to reference .png assets...\n');

// Also update body-shapes.json body field
updateFile(path.join(DATA, 'body-shapes.json'));
walkJsonFiles(path.join(DATA, 'body-parts'));
walkJsonFiles(path.join(DATA, 'clothing'));
walkJsonFiles(path.join(DATA, 'accessories'));

console.log('\nDone! Reload the game to use PNG assets.');
