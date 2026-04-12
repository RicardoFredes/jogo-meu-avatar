import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const STYLE = `cute chibi cartoon style for a children's paper doll dress-up game.
Large expressive eyes, small cute body, rounded soft shapes, pastel/vibrant colors, clean vector-like illustration.
Completely transparent background (PNG with alpha). Single isolated element, centered, no text.`;

const ITEMS = [
  { file: 'assets/clothing/bottoms/skirt-long.png',
    prompt: `A cute small chibi-sized long flowing skirt reaching below the knees, flat front view. Just the skirt garment alone, no body. Lilac/purple color with subtle wave at hem. ${STYLE}` },
  { file: 'assets/clothing/tops/longsleeve.png',
    prompt: `A cute small chibi-sized long-sleeve shirt, flat front view. Round neckline, fitted sleeves with cuffs. Just the shirt alone, no body. Soft pink color. ${STYLE}` },
  { file: 'assets/clothing/tops/tanktop.png',
    prompt: `A cute small chibi-sized sleeveless tank top, flat front view. Thin straps, scoop neckline. Just the tank top alone, no body. Light yellow color. ${STYLE}` },
  { file: 'assets/faces/eyebrows/brows-happy.png',
    prompt: `A pair of slightly raised happy eyebrows for a chibi character. Thin arched lines angled upward expressing joy. Just the two eyebrows, nothing else. Dark brown color. ${STYLE}` },
  { file: 'assets/faces/eyebrows/brows-straight.png',
    prompt: `A pair of straight horizontal eyebrows for a chibi character. Simple flat straight lines above where eyes would be. Just the two eyebrows, nothing else. Dark brown. ${STYLE}` },
  { file: 'assets/faces/mouths/mouth-small.png',
    prompt: `A tiny cute chibi neutral mouth - a small closed horizontal line with slight curve. Pink/coral. Just the mouth alone. ${STYLE}` },
  { file: 'assets/faces/mouths/mouth-tongue.png',
    prompt: `A cute chibi open smile with a small tongue sticking out playfully. Pink lips, small red tongue. Just the mouth alone. ${STYLE}` },
  { file: 'assets/faces/noses/nose-pointy.png',
    prompt: `A small cute chibi pointed nose - a tiny downward-pointing triangle shape. Light pinkish shadow color. Just the nose alone. ${STYLE}` },
  { file: 'assets/faces/noses/nose-wide.png',
    prompt: `A small cute chibi wide flat nose - a slightly wide rounded shape. Light pinkish shadow color. Just the nose alone. ${STYLE}` },
  { file: 'assets/hair/back/buns.png',
    prompt: `Back view of two space buns hairstyle for a chibi character. Two round bun shapes with short hair connecting them. No face. Pink/magenta color. ${STYLE}` },
];

async function gen(prompt) {
  try {
    const r = await openai.images.generate({ model:'gpt-image-1', prompt, n:1, size:'1024x1024', quality:'medium', background:'transparent' });
    const b64 = r.data[0].b64_json;
    return b64 ? Buffer.from(b64,'base64') : null;
  } catch(e) { console.error(`  ERROR: ${e.message}`); return null; }
}

async function main() {
  console.log(`Generating ${ITEMS.length} missing assets...\n`);
  for (let i=0; i<ITEMS.length; i++) {
    const it = ITEMS[i];
    const fp = path.join(ROOT, it.file);
    fs.mkdirSync(path.dirname(fp),{recursive:true});
    if (fs.existsSync(fp) && fs.statSync(fp).size > 1000) { console.log(`[${i+1}] SKIP: ${it.file}`); continue; }
    console.log(`[${i+1}/${ITEMS.length}] ${it.file}...`);
    const buf = await gen(it.prompt);
    if (buf) { fs.writeFileSync(fp, buf); console.log(`  SAVED (${(buf.length/1024).toFixed(0)}KB)`); }
    else console.log(`  FAILED`);
    if (i < ITEMS.length-1) { console.log('  ...15s...'); await new Promise(r=>setTimeout(r,15000)); }
  }
  console.log('\nDone!');
}
main().catch(console.error);
