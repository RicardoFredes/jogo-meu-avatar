/**
 * Generate thumbnails using sharp - pixel-perfect approach.
 *
 * 1. Read SVG, neutralize colors
 * 2. Render to PNG at high res
 * 3. Use sharp.trim() to auto-crop transparent pixels
 * 4. Resize to 120x120 with contain
 * 5. Save as PNG
 *
 * Usage: node scripts/generate-thumbs.mjs
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const THUMB_SIZE = 128;

function neutralizeSvg(svgText) {
  return svgText
    .replace(/#FF00FF/gi, '#A0A0A0')
    .replace(/#ff00ff/gi, '#A0A0A0')
    .replace(/#CC00CC/gi, '#333333')
    .replace(/#cc00cc/gi, '#333333')
    .replace(/fill="#FFFFFF"/gi, 'fill="#CCCCCC"')
    .replace(/fill="white"/gi, 'fill="#CCCCCC"')
    .replace(/stroke="#FFFFFF"/gi, 'stroke="#444444"')
    .replace(/stroke="white"/gi, 'stroke="#444444"')
    .replace(/stroke="#C0C0C0"/gi, 'stroke="#444444"')
    .replace(/stroke="#E0E0E0"/gi, 'stroke="#555555"')
    .replace(/stroke="#E8E8E8"/gi, 'stroke="#555555"')
    // Remove white background rects (600x800)
    .replace(/<rect[^>]*?(?:width="600"[^>]*?height="800"|height="800"[^>]*?width="600")[^>]*?fill="white"[^>]*?\/>/gi, '')
    .replace(/<rect[^>]*?fill="white"[^>]*?(?:width="600"[^>]*?height="800"|height="800"[^>]*?width="600")[^>]*?\/>/gi, '');
}

async function generateThumb(svgPath, outPath) {
  const svgText = fs.readFileSync(svgPath, 'utf8');
  const neutral = neutralizeSvg(svgText);
  const svgBuf = Buffer.from(neutral);

  try {
    // Render SVG to PNG at decent resolution
    const rendered = await sharp(svgBuf, { density: 150 })
      .png()
      .toBuffer();

    // Trim transparent pixels (auto-crop)
    const trimmed = await sharp(rendered)
      .trim({ threshold: 10 })
      .toBuffer();

    // Check if there's actual content
    const meta = await sharp(trimmed).metadata();
    if (!meta.width || !meta.height || meta.width < 3 || meta.height < 3) return false;

    // Resize to thumbnail with padding
    await sharp(trimmed)
      .resize(THUMB_SIZE, THUMB_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outPath);

    return true;
  } catch (e) {
    // trim() fails on fully transparent images
    if (e.message.includes('trim') || e.message.includes('extract')) return false;
    throw e;
  }
}

async function processJsonFile(jsonPath) {
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);
  const items = data.items || [];
  let changed = false;

  for (const item of items) {
    const assetPath = item.asset || (item.assets && item.assets.front);
    if (!assetPath || !assetPath.endsWith('.svg')) continue;

    const fullAsset = path.join(ROOT, assetPath);
    if (!fs.existsSync(fullAsset)) {
      console.log(`  SKIP (missing): ${assetPath}`);
      continue;
    }

    const assetDir = path.dirname(assetPath);
    const assetName = path.basename(assetPath, '.svg');
    const thumbDir = path.join(assetDir, 'thumbs');
    const thumbPath = path.join(thumbDir, `${assetName}-thumb.png`);

    fs.mkdirSync(path.join(ROOT, thumbDir), { recursive: true });

    try {
      const ok = await generateThumb(fullAsset, path.join(ROOT, thumbPath));
      if (ok) {
        item.thumbnail = thumbPath;
        changed = true;
        const size = fs.statSync(path.join(ROOT, thumbPath)).size;
        console.log(`  OK: ${assetPath} → ${thumbPath} (${(size/1024).toFixed(1)}KB)`);
      } else {
        console.log(`  SKIP (empty): ${assetPath}`);
      }
    } catch (e) {
      console.log(`  ERR: ${assetPath} - ${e.message}`);
    }
  }

  if (changed) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
  }
  return changed;
}

async function main() {
  console.log('Generating pixel-perfect thumbnails (128x128 PNG)...\n');

  const jsonFiles = [];
  for (const dir of ['data/body-parts', 'data/clothing', 'data/accessories']) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    for (const f of fs.readdirSync(fullDir).filter(f => f.endsWith('.json'))) {
      jsonFiles.push(path.join(fullDir, f));
    }
  }

  let total = 0;
  for (const jf of jsonFiles) {
    console.log(path.relative(ROOT, jf) + ':');
    const changed = await processJsonFile(jf);
    if (changed) total++;
    else console.log('  (no changes)');
  }

  console.log(`\nDone! ${total} files updated.`);
}

main().catch(console.error);
