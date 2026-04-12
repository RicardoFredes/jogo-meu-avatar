/**
 * Fix JSON sizes for PNG assets.
 * PNGs from OpenAI are square (1024x1024) but need proportional sizes
 * relative to the body canvas (180x320).
 *
 * Sets reasonable default sizes for each category so items
 * display at correct proportions. Fine-tune in dev mode.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Default sizes per category (width x height in body coords)
const CATEGORY_SIZES = {
  'face-shapes': { width: 100, height: 100 },
  'eyes':        { width: 70, height: 35 },
  'eyebrows':    { width: 70, height: 18 },
  'noses':       { width: 25, height: 20 },
  'mouths':      { width: 35, height: 20 },
  'extras':      { width: 100, height: 100 },
  'tops':        { width: 110, height: 75 },
  'bottoms':     { width: 90, height: 70 },
  'shoes':       { width: 80, height: 35 },
  'full-body':   { width: 110, height: 150 },
  'head-acc':    { width: 70, height: 50 },
  'face-acc':    { width: 70, height: 28 },
  'body-acc':    { width: 100, height: 120 },
};

function updateCategoryJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const catId = data.category;
  const defaultSize = CATEGORY_SIZES[catId];

  if (!defaultSize) {
    console.log(`  Skip (no default size): ${catId}`);
    return;
  }

  let changed = false;
  for (const item of data.items) {
    // Set size to category default if not already set or if it looks like old SVG values
    item.size = { ...defaultSize };
    if (!item.offset) item.offset = { x: 0, y: 0 };
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`  Updated: ${path.relative(ROOT, filePath)} -> ${defaultSize.width}x${defaultSize.height}`);
  }
}

console.log('Fixing JSON sizes for PNG assets...\n');

const dirs = ['data/body-parts', 'data/clothing', 'data/accessories'];
for (const dir of dirs) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) continue;
  for (const file of fs.readdirSync(fullDir)) {
    if (!file.endsWith('.json')) continue;
    updateCategoryJson(path.join(fullDir, file));
  }
}

console.log('\nDone! Use dev mode to fine-tune positions.');
