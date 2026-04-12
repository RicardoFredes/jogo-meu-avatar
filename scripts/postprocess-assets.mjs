/**
 * Post-process generated assets:
 * - Hair: remove skin-tone pixels (leave only hair)
 * - All: clean dark border glow artifacts
 *
 * Usage: node scripts/postprocess-assets.mjs
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Skin tone range (R, G, B) to remove from hair assets
function isSkinTone(r, g, b) {
  // Detect peach/beige skin tones
  return r > 180 && g > 140 && b > 110 &&
         r > g && g > b &&
         (r - b) > 30 &&
         r < 260 && g < 230;
}

// Dark border glow detection
function isDarkGlow(r, g, b, a) {
  // Semi-transparent dark pixels at edges
  return a > 0 && a < 200 && r < 80 && g < 80 && b < 80;
}

async function processHairAsset(filePath) {
  const name = path.relative(ROOT, filePath);
  console.log(`  Processing hair: ${name}`);

  const image = sharp(filePath);
  const { width, height, channels } = await image.metadata();
  const { data } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });

  let removed = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a === 0) continue;

    if (isSkinTone(r, g, b)) {
      data[i + 3] = 0; // Make transparent
      removed++;
    }
  }

  const outPath = filePath; // overwrite
  await sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outPath + '.tmp');

  fs.renameSync(outPath + '.tmp', outPath);
  console.log(`    Removed ${removed} skin-tone pixels`);
}

async function cleanDarkGlow(filePath) {
  const name = path.relative(ROOT, filePath);

  const image = sharp(filePath);
  const { width, height } = await image.metadata();
  const { data } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });

  let removed = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];

    if (isDarkGlow(r, g, b, a)) {
      data[i + 3] = 0;
      removed++;
    }
  }

  if (removed > 0) {
    await sharp(data, { raw: { width, height, channels: 4 } })
      .png()
      .toFile(filePath + '.tmp');
    fs.renameSync(filePath + '.tmp', filePath);
    console.log(`  Cleaned glow: ${name} (${removed} pixels)`);
  }
}

async function main() {
  console.log('Post-processing assets...\n');

  // 1. Process hair - remove skin tones
  console.log('=== HAIR (removing skin-tone pixels) ===');
  const hairDirs = ['assets/hair/front', 'assets/hair/back'];
  for (const dir of hairDirs) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.png'));
    for (const file of files) {
      await processHairAsset(path.join(fullDir, file));
    }
  }

  // 2. Clean dark glow from ALL PNGs
  console.log('\n=== ALL ASSETS (cleaning dark glow) ===');
  const allPngs = findAllPngs(path.join(ROOT, 'assets'));
  for (const file of allPngs) {
    await cleanDarkGlow(file);
  }

  console.log('\nDone!');
}

function findAllPngs(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findAllPngs(full));
    } else if (entry.name.endsWith('.png') && fs.statSync(full).size > 1000) {
      results.push(full);
    }
  }
  return results;
}

main().catch(console.error);
