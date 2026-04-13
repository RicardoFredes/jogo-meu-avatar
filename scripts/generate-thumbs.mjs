/**
 * Generate thumbnails from original SVG assets.
 *
 * For each item in all JSONs that has an "asset" field pointing to an SVG:
 * 1. Read the original SVG
 * 2. Detect the bounding box of visible content (non-empty paths)
 * 3. Create a cropped thumbnail SVG with viewBox focused on the content
 * 4. Add padding around the content
 * 5. Save to thumbs/ subdirectory
 * 6. Update the JSON with the thumbnail path
 *
 * Usage: node scripts/generate-thumbs.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PADDING = 10; // padding around content in viewBox units

/**
 * Extract approximate bounding box from SVG by parsing path/circle/ellipse/rect elements.
 * This is a rough parser - works for our simple SVGs.
 */
function extractBBox(svgText) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let found = false;

  // Parse d="M..." paths - extract all numbers
  const pathRegex = /d="([^"]+)"/g;
  let match;
  while ((match = pathRegex.exec(svgText)) !== null) {
    const nums = match[1].match(/-?[\d.]+/g);
    if (!nums) continue;
    for (let i = 0; i < nums.length - 1; i += 2) {
      const x = parseFloat(nums[i]);
      const y = parseFloat(nums[i + 1]);
      if (isNaN(x) || isNaN(y)) continue;
      if (x > -10 && x < 1000 && y > -100 && y < 1000) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        found = true;
      }
    }
  }

  // Parse circle cx/cy/r
  const circleRegex = /cx="([\d.]+)"[^>]*cy="([\d.]+)"[^>]*r="([\d.]+)"/g;
  while ((match = circleRegex.exec(svgText)) !== null) {
    const cx = parseFloat(match[1]), cy = parseFloat(match[2]), r = parseFloat(match[3]);
    minX = Math.min(minX, cx - r); minY = Math.min(minY, cy - r);
    maxX = Math.max(maxX, cx + r); maxY = Math.max(maxY, cy + r);
    found = true;
  }

  // Parse ellipse cx/cy/rx/ry
  const ellipseRegex = /cx="([\d.]+)"[^>]*cy="([\d.]+)"[^>]*rx="([\d.]+)"[^>]*ry="([\d.]+)"/g;
  while ((match = ellipseRegex.exec(svgText)) !== null) {
    const cx = parseFloat(match[1]), cy = parseFloat(match[2]);
    const rx = parseFloat(match[3]), ry = parseFloat(match[4]);
    minX = Math.min(minX, cx - rx); minY = Math.min(minY, cy - ry);
    maxX = Math.max(maxX, cx + rx); maxY = Math.max(maxY, cy + ry);
    found = true;
  }

  // Parse rect x/y/width/height
  const rectRegex = /x="([\d.]+)"[^>]*y="([\d.]+)"[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/g;
  while ((match = rectRegex.exec(svgText)) !== null) {
    const x = parseFloat(match[1]), y = parseFloat(match[2]);
    const w = parseFloat(match[3]), h = parseFloat(match[4]);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
    found = true;
  }

  // Parse line x1/y1/x2/y2
  const lineRegex = /x1="([\d.]+)"[^>]*y1="([\d.]+)"[^>]*x2="([\d.]+)"[^>]*y2="([\d.]+)"/g;
  while ((match = lineRegex.exec(svgText)) !== null) {
    const x1 = parseFloat(match[1]), y1 = parseFloat(match[2]);
    const x2 = parseFloat(match[3]), y2 = parseFloat(match[4]);
    minX = Math.min(minX, x1, x2); minY = Math.min(minY, y1, y2);
    maxX = Math.max(maxX, x1, x2); maxY = Math.max(maxY, y1, y2);
    found = true;
  }

  // Parse polygon points="..."
  const polyRegex = /points="([^"]+)"/g;
  while ((match = polyRegex.exec(svgText)) !== null) {
    const nums = match[1].match(/-?[\d.]+/g);
    if (!nums) continue;
    for (let i = 0; i < nums.length - 1; i += 2) {
      const x = parseFloat(nums[i]), y = parseFloat(nums[i + 1]);
      if (!isNaN(x) && !isNaN(y)) {
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        found = true;
      }
    }
  }

  if (!found) return null;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Create a thumbnail SVG: same content but cropped viewBox around the content
 */
function createThumbnail(svgText, bbox) {
  const pad = PADDING;
  const vbX = Math.floor(bbox.minX - pad);
  const vbY = Math.floor(bbox.minY - pad);
  const vbW = Math.ceil(bbox.width + pad * 2);
  const vbH = Math.ceil(bbox.height + pad * 2);

  // Extract inner content (everything between <svg> and </svg>)
  const innerMatch = svgText.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  if (!innerMatch) return null;
  const inner = innerMatch[1];

  // Remove any <rect> that fills the whole background (width=600, height=800)
  const cleanInner = inner.replace(/<rect[^>]*width="600"[^>]*height="800"[^>]*\/>/g, '');

  return `<svg viewBox="${vbX} ${vbY} ${vbW} ${vbH}" fill="none" xmlns="http://www.w3.org/2000/svg">\n${cleanInner}\n</svg>`;
}

/**
 * Process all JSON files, generate thumbs, update JSONs
 */
function processJsonFile(jsonPath) {
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);
  const items = data.items || [];
  let changed = false;

  for (const item of items) {
    // Get asset path (single asset or hair front)
    const assetPath = item.asset || (item.assets && item.assets.front);
    if (!assetPath || !assetPath.endsWith('.svg')) continue;

    const fullAssetPath = path.join(ROOT, assetPath);
    if (!fs.existsSync(fullAssetPath)) {
      console.log(`  SKIP (missing): ${assetPath}`);
      continue;
    }

    const svgText = fs.readFileSync(fullAssetPath, 'utf8');
    const bbox = extractBBox(svgText);
    if (!bbox || bbox.width < 2 || bbox.height < 2) {
      console.log(`  SKIP (empty/tiny): ${assetPath}`);
      continue;
    }

    const thumb = createThumbnail(svgText, bbox);
    if (!thumb) {
      console.log(`  SKIP (parse fail): ${assetPath}`);
      continue;
    }

    // Determine thumb path: assets/X/Y/Z.svg -> assets/X/Y/thumbs/thumb-Z.svg
    const assetDir = path.dirname(assetPath);
    const assetName = path.basename(assetPath);
    const thumbDir = path.join(assetDir, 'thumbs');
    const thumbName = `thumb-${assetName}`;
    const thumbPath = path.join(thumbDir, thumbName);

    // Write thumbnail
    const fullThumbDir = path.join(ROOT, thumbDir);
    fs.mkdirSync(fullThumbDir, { recursive: true });
    fs.writeFileSync(path.join(ROOT, thumbPath), thumb);

    // Update item
    item.thumbnail = thumbPath;
    changed = true;
    console.log(`  ${assetPath} -> ${thumbPath} (bbox: ${Math.round(bbox.width)}x${Math.round(bbox.height)})`);
  }

  if (changed) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
  }
  return changed;
}

// ========== MAIN ==========

console.log('Generating thumbnails from SVG assets...\n');

const jsonDirs = ['data/body-parts', 'data/clothing', 'data/accessories'];
let totalThumbs = 0;

for (const dir of jsonDirs) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) continue;
  for (const file of fs.readdirSync(fullDir).filter(f => f.endsWith('.json'))) {
    const jsonPath = path.join(fullDir, file);
    console.log(`Processing ${dir}/${file}:`);
    if (processJsonFile(jsonPath)) {
      totalThumbs++;
    } else {
      console.log('  (no changes)');
    }
  }
}

// Also handle hair which has assets.front/back structure
const hairFiles = ['data/body-parts/hair-back.json', 'data/body-parts/hair-front.json'];
for (const hf of hairFiles) {
  const fullPath = path.join(ROOT, hf);
  if (!fs.existsSync(fullPath)) continue;
  console.log(`Processing ${hf}:`);
  if (processJsonFile(fullPath)) totalThumbs++;
}

console.log(`\nDone! ${totalThumbs} JSON files updated with thumbnails.`);
