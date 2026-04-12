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
Very large head, small cute body, rounded soft shapes, clean vector-like illustration with soft shading.
Completely transparent background (PNG with alpha).
IMPORTANT: The character must be drawn entirely in GRAYSCALE / WHITE tones only.
No color at all - only white, light gray, and subtle gray shading for depth.
This is a template that will be color-tinted later.
The character must show the COMPLETE body from head to toes - feet must be fully visible.
Centered, front view, no text, no decorations.`;

const BODIES = [
  {
    file: 'assets/bodies/child-female-normal.png',
    prompt: `A cute chibi wooden art mannequin doll, FULL BODY from round head to small round feet, front view.
Normal slim proportions. Big round head, small simple body like a wooden artist's mannequin figure.
Very simplified - no clothing details, no gender features, just a smooth rounded figure like a toy mannequin.
Simple dot eyes and tiny smile on the round head. Short arms at sides, short legs, round feet fully visible.
Fits entirely within the frame. GRAYSCALE ONLY - white/light gray with soft shading. ${STYLE}`,
  },
  {
    file: 'assets/bodies/child-female-chubby.png',
    prompt: `A cute chibi CHUBBY wooden art mannequin doll, FULL BODY from round head to feet, front view.
Chubby round proportions - round tummy, thick limbs. Big round head, like a chubby toy mannequin.
No clothing, no gender features, smooth rounded figure. Dot eyes, tiny smile.
Pudgy arms, thick short legs, round feet fully visible. Fits entirely in frame.
GRAYSCALE ONLY - white/light gray with soft shading. ${STYLE}`,
  },
  {
    file: 'assets/bodies/child-male-normal.png',
    prompt: `A cute chibi wooden art mannequin doll, FULL BODY from round head to feet, front view.
Normal slim proportions with slightly wider shoulders. Like a wooden artist's mannequin toy.
No clothing, no gender features, smooth figure. Dot eyes, tiny smile on round head.
Short arms, short legs, feet fully visible at bottom. Fits entirely in frame.
GRAYSCALE ONLY - white/light gray with soft shading. ${STYLE}`,
  },
  {
    file: 'assets/bodies/child-male-chubby.png',
    prompt: `A cute chibi CHUBBY wooden art mannequin doll, FULL BODY from round head to feet, front view.
Chubby build with wider shoulders and round tummy. Like a chubby toy mannequin figure.
No clothing, no gender features, smooth rounded figure. Dot eyes, tiny smile.
Sturdy legs, feet fully visible. Fits entirely in frame.
GRAYSCALE ONLY - white/light gray with soft shading. ${STYLE}`,
  },
];

async function gen(prompt) {
  try {
    const r = await openai.images.generate({
      model: 'gpt-image-1', prompt, n: 1, size: '1024x1024',
      quality: 'medium', background: 'transparent',
    });
    const b64 = r.data[0].b64_json;
    return b64 ? Buffer.from(b64, 'base64') : null;
  } catch (e) {
    console.error(`  ERROR: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('Generating grayscale body templates...\n');

  for (let i = 0; i < BODIES.length; i++) {
    const item = BODIES[i];
    const fp = path.join(ROOT, item.file);

    // Delete existing to force regeneration
    if (fs.existsSync(fp)) fs.unlinkSync(fp);

    console.log(`[${i + 1}/${BODIES.length}] ${item.file}...`);
    const buf = await gen(item.prompt);
    if (buf) {
      fs.writeFileSync(fp, buf);
      console.log(`  SAVED (${(buf.length / 1024).toFixed(0)} KB)`);
    } else {
      console.log(`  FAILED`);
    }

    if (i < BODIES.length - 1) {
      console.log('  ...15s...');
      await new Promise(r => setTimeout(r, 15000));
    }
  }
  console.log('\nDone!');
}

main().catch(console.error);
