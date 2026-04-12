/**
 * Auto-Calibrate: analisa cada PNG, detecta bounding box do conteudo real
 * (ignorando transparencia), e recalcula size/offset nos JSONs baseado
 * nas guias proporcionais do body canvas.
 *
 * Para cada categoria, sabe onde o asset deve ficar no corpo (ex: olhos em 30%,
 * sapatos em 92%) e calcula o tamanho proporcional correto.
 *
 * Usage: node scripts/auto-calibrate.mjs [--dry-run]
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');

// Body canvas reference
const BODY_W = 300;
const BODY_H = 300;
const CENTER_X = 150;

// Guide positions (% of body height) - same as dev mode grid
const GUIDES = {
  headTop:    0.15,
  eyeLine:    0.30,
  chin:       0.40,
  shoulders:  0.50,
  waist:      0.65,
  knees:      0.80,
  feetChild:  0.92,
  feetAdult:  1.00,
};

// Where each category should be placed on the body
// targetY: center Y as % of body height
// targetH: height as % of body height
// targetW: width as % of body width
const CATEGORY_PLACEMENT = {
  'face-shapes': {
    targetY: (GUIDES.headTop + GUIDES.chin) / 2,  // centered between head top and chin
    targetH: GUIDES.chin - GUIDES.headTop,          // head top to chin
    targetW: 0.47,
  },
  'eyes': {
    targetY: GUIDES.eyeLine,
    targetH: 0.08,
    targetW: 0.35,
  },
  'eyebrows': {
    targetY: GUIDES.eyeLine - 0.05,
    targetH: 0.05,
    targetW: 0.35,
  },
  'noses': {
    targetY: (GUIDES.eyeLine + GUIDES.chin) / 2,
    targetH: 0.06,
    targetW: 0.12,
  },
  'mouths': {
    targetY: GUIDES.chin - 0.05,
    targetH: 0.06,
    targetW: 0.17,
  },
  'extras': {
    targetY: (GUIDES.headTop + GUIDES.chin) / 2,
    targetH: GUIDES.chin - GUIDES.headTop,
    targetW: 0.47,
  },
  'tops': {
    targetY: (GUIDES.shoulders + GUIDES.waist) / 2,
    targetH: GUIDES.waist - GUIDES.shoulders,
    targetW: 0.50,
  },
  'bottoms': {
    targetY: (GUIDES.waist + GUIDES.feetChild) / 2,
    targetH: GUIDES.feetChild - GUIDES.waist,
    targetW: 0.43,
  },
  'shoes': {
    targetY: GUIDES.feetChild,
    targetH: 0.08,
    targetW: 0.40,
  },
  'full-body': {
    targetY: (GUIDES.shoulders + GUIDES.feetChild) / 2,
    targetH: GUIDES.feetChild - GUIDES.shoulders,
    targetW: 0.53,
  },
  'head-acc': {
    targetY: GUIDES.headTop - 0.02,
    targetH: 0.12,
    targetW: 0.35,
  },
  'face-acc': {
    targetY: GUIDES.eyeLine,
    targetH: 0.07,
    targetW: 0.35,
  },
  'body-acc': {
    targetY: (GUIDES.shoulders + GUIDES.waist) / 2,
    targetH: GUIDES.waist - GUIDES.shoulders + 0.10,
    targetW: 0.50,
  },
};

// Hair is special - has layers
const HAIR_PLACEMENT = {
  front: {
    targetY: GUIDES.headTop + 0.02,
    targetH: (GUIDES.chin - GUIDES.headTop) * 0.75,
    targetW: 0.55,
  },
  back: {
    targetY: (GUIDES.headTop + GUIDES.shoulders) / 2,
    targetH: GUIDES.shoulders - GUIDES.headTop + 0.10,
    targetW: 0.60,
  },
};

/**
 * Get bounding box of non-transparent content in a PNG
 * Returns { contentRatio } - ratio of content area vs total image
 */
async function getContentBounds(filePath) {
  try {
    const { data, info } = await sharp(filePath)
      .raw().ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    const w = info.width;
    const h = info.height;
    let minX = w, minY = h, maxX = 0, maxY = 0;
    let hasContent = false;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = data[(y * w + x) * 4 + 3];
        if (alpha > 20) { // threshold for "visible"
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          hasContent = true;
        }
      }
    }

    if (!hasContent) return { empty: true };

    return {
      empty: false,
      imgWidth: w,
      imgHeight: h,
      contentX: minX,
      contentY: minY,
      contentW: maxX - minX + 1,
      contentH: maxY - minY + 1,
      // Aspect ratio of the actual content
      aspectRatio: (maxX - minX + 1) / (maxY - minY + 1),
    };
  } catch (e) {
    console.warn(`  Could not analyze: ${filePath}`, e.message);
    return { empty: true };
  }
}

/**
 * Calculate size and offset for an item based on placement rules
 */
function calculatePlacement(placement, contentBounds) {
  // Target dimensions in body coords
  let targetW = Math.round(BODY_W * placement.targetW);
  let targetH = Math.round(BODY_H * placement.targetH);

  // Preserve aspect ratio of the actual content
  if (!contentBounds.empty && contentBounds.aspectRatio) {
    const ar = contentBounds.aspectRatio;
    // Fit within target bounds preserving aspect ratio
    if (targetW / targetH > ar) {
      // Target is wider than content: shrink width
      targetW = Math.round(targetH * ar);
    } else {
      // Target is taller than content: shrink height
      targetH = Math.round(targetW / ar);
    }
  }

  // Center position
  const centerY = Math.round(BODY_H * placement.targetY);

  return {
    size: { width: targetW, height: targetH },
    offset: { x: 0, y: 0 },  // offset from anchor center
  };
}

/**
 * Process a category JSON file
 */
async function processCategory(jsonPath) {
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);
  const catId = data.category;
  const placement = CATEGORY_PLACEMENT[catId];

  if (!placement) {
    console.log(`  SKIP: ${catId} (no placement rules)`);
    return;
  }

  console.log(`\n  === ${catId} (${data.items.length} items) ===`);

  let changed = false;
  for (const item of data.items) {
    const assetPath = path.join(ROOT, item.asset);
    if (!fs.existsSync(assetPath) || fs.statSync(assetPath).size < 100) {
      console.log(`    ${item.id}: SKIP (empty/missing)`);
      continue;
    }

    const bounds = await getContentBounds(assetPath);
    const result = calculatePlacement(placement, bounds);

    const oldSize = JSON.stringify(item.size);
    const newSize = JSON.stringify(result.size);

    item.size = result.size;
    item.offset = result.offset;
    changed = true;

    console.log(`    ${item.id}: ${oldSize} -> ${newSize} (AR: ${bounds.empty ? 'N/A' : bounds.aspectRatio.toFixed(2)})`);
  }

  if (changed && !DRY_RUN) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
    console.log(`  SAVED: ${path.relative(ROOT, jsonPath)}`);
  }
}

/**
 * Process hair JSON (special: layers)
 */
async function processHair(jsonPath) {
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);

  console.log(`\n  === hair (${data.items.length} items) ===`);

  let changed = false;
  for (const item of data.items) {
    if (!item.layers) continue;

    for (const layer of item.layers) {
      const assetKey = layer.asset; // "front" or "back"
      const assetUrl = item.assets[assetKey];
      if (!assetUrl) continue;

      const assetPath = path.join(ROOT, assetUrl);
      if (!fs.existsSync(assetPath) || fs.statSync(assetPath).size < 100) {
        console.log(`    ${item.id}/${assetKey}: SKIP (empty/missing)`);
        continue;
      }

      const placement = HAIR_PLACEMENT[assetKey];
      if (!placement) continue;

      const bounds = await getContentBounds(assetPath);
      const result = calculatePlacement(placement, bounds);

      const oldSize = JSON.stringify(layer.size);
      layer.size = result.size;
      layer.offset = result.offset;
      layer.anchor = 'head';
      changed = true;

      console.log(`    ${item.id}/${assetKey}: ${oldSize} -> ${JSON.stringify(result.size)} (AR: ${bounds.empty ? 'N/A' : bounds.aspectRatio.toFixed(2)})`);
    }
  }

  if (changed && !DRY_RUN) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
    console.log(`  SAVED: ${path.relative(ROOT, jsonPath)}`);
  }
}

// ========== MAIN ==========

async function main() {
  console.log('Auto-Calibrate: analyzing PNGs and recalculating sizes...');
  console.log(`Body canvas: ${BODY_W}x${BODY_H}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'WRITE'}\n`);

  // Process body-parts (except hair)
  const bpDir = path.join(ROOT, 'data/body-parts');
  for (const file of fs.readdirSync(bpDir).filter(f => f.endsWith('.json'))) {
    if (file === 'hair.json') {
      await processHair(path.join(bpDir, file));
    } else if (file !== 'facial-hair.json') {
      await processCategory(path.join(bpDir, file));
    }
  }

  // Process clothing
  const clothDir = path.join(ROOT, 'data/clothing');
  for (const file of fs.readdirSync(clothDir).filter(f => f.endsWith('.json'))) {
    await processCategory(path.join(clothDir, file));
  }

  // Process accessories
  const accDir = path.join(ROOT, 'data/accessories');
  for (const file of fs.readdirSync(accDir).filter(f => f.endsWith('.json'))) {
    await processCategory(path.join(accDir, file));
  }

  console.log('\n========== DONE ==========');
  if (DRY_RUN) console.log('(Dry run - no files written. Remove --dry-run to apply.)');
  else console.log('All JSONs updated! Reload dev mode to see results.');
}

main().catch(console.error);
