/**
 * Lauren Fashion - Generate only ESSENTIAL missing assets
 * Simplified: single-layer hair (no front/back split), basic clothing
 *
 * Usage: node scripts/generate-essentials.mjs
 */

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
Very large expressive eyes, small cute body, rounded soft shapes,
pastel/vibrant colors, clean vector-like illustration with subtle shading.
The image MUST have a completely transparent background (PNG with alpha).
Single isolated element, centered, no text, no extra decorations.`;

const MISSING = [
  // Bodies (missing male versions)
  {
    file: 'assets/bodies/child-male-normal.png',
    prompt: `A cute chibi boy paper doll character, full body front view, normal slim build.
Simple round blank face (no facial features, like a mannequin template). Slightly wider shoulders than a girl.
Wearing a plain light beige tank top and shorts. Chibi proportions with big head, small body.
Light peachy skin. Paper doll base template. ${STYLE}`,
  },
  {
    file: 'assets/bodies/child-male-chubby.png',
    prompt: `A cute chibi chubby boy paper doll character, full body front view, chubby round adorable build.
Simple round blank face (no facial features, mannequin template). Round tummy, sturdy short legs.
Wearing a plain light beige tank top and shorts. Chibi proportions with big head.
Light peachy skin. Paper doll base template. ${STYLE}`,
  },
  // Clothing - missing items
  {
    file: 'assets/clothing/tops/blouse.png',
    prompt: `A cute small chibi-sized blouse with puffy short sleeves and a cute peter pan collar, flat front view.
Just the blouse garment alone, no body, no mannequin. White with small lavender details. ${STYLE}`,
  },
  {
    file: 'assets/clothing/bottoms/skirt.png',
    prompt: `A cute small chibi-sized flared A-line mini skirt, flat front view.
Just the skirt garment alone, no body. Purple/lilac color with a cute waistband. ${STYLE}`,
  },
  {
    file: 'assets/clothing/bottoms/pants.png',
    prompt: `Cute small chibi-sized jeans/pants, flat front view.
Just the pants garment alone, no body. Blue denim color with small pocket details. ${STYLE}`,
  },
  {
    file: 'assets/clothing/bottoms/shorts.png',
    prompt: `Cute small chibi-sized shorts, flat front view.
Just the shorts garment alone, no body. Pink color with a cute waistband. ${STYLE}`,
  },
  {
    file: 'assets/clothing/shoes/sneakers.png',
    prompt: `A pair of cute small chibi-sized sneakers/tennis shoes, front view, side by side.
Just the shoes, no legs, no body. White with purple accents and small laces. ${STYLE}`,
  },
  {
    file: 'assets/clothing/shoes/sandals.png',
    prompt: `A pair of cute small chibi-sized sandals, front view, side by side.
Just the sandals, no legs. Pink with small flower decorations. ${STYLE}`,
  },
  {
    file: 'assets/clothing/shoes/flats.png',
    prompt: `A pair of cute small chibi-sized ballet flats / mary jane shoes, front view, side by side.
Just the shoes, no legs. Black with cute small bows. ${STYLE}`,
  },
  {
    file: 'assets/clothing/full-body/dress-simple.png',
    prompt: `A cute small chibi-sized simple A-line dress, flat front view. Short puffy sleeves, round neckline, skirt flaring at bottom.
Just the dress garment alone, no body. Lavender/lilac color. ${STYLE}`,
  },
  {
    file: 'assets/clothing/full-body/dress-princess.png',
    prompt: `A cute small chibi-sized princess ball gown dress, flat front view. Very puffy layered skirt, fitted sparkly bodice, off-shoulder sleeves.
Just the dress garment alone, no body. Royal purple with gold sparkle details. ${STYLE}`,
  },
  {
    file: 'assets/clothing/full-body/overalls.png',
    prompt: `Cute small chibi-sized overalls/dungarees, flat front view. Straps with buttons, front bib pocket, pants legs.
Just the overalls garment alone, no body. Blue denim color. ${STYLE}`,
  },
  // Accessories - missing
  {
    file: 'assets/accessories/head/witch-hat.png',
    prompt: `A cute small witch/wizard pointy hat, front view. Slightly droopy tip, buckle band, star sparkle accent.
Just the hat alone, nothing else. Purple with gold buckle. ${STYLE}`,
  },
  {
    file: 'assets/accessories/head/cap.png',
    prompt: `A cute small baseball cap, front view with brim facing forward. Simple round cap shape.
Just the cap alone, nothing else. Pink with a small star emblem. ${STYLE}`,
  },
  {
    file: 'assets/accessories/face/glasses-round.png',
    prompt: `Cute small round glasses, front view. Two perfectly round lenses with thin frame and nose bridge.
Just the glasses alone, nothing else. Dark brown/tortoise frame color. ${STYLE}`,
  },
  {
    file: 'assets/accessories/face/mask-hero.png',
    prompt: `A cute small superhero eye mask, front view. Covers the eye area with two eye holes, pointed edges on sides.
Just the mask alone, nothing else. Red color. ${STYLE}`,
  },
  {
    file: 'assets/accessories/body/cape.png',
    prompt: `A cute small superhero flowing cape, viewed from behind. Cape shape attached at top (neck area), flowing down and outward.
Just the cape alone, no body. Bright red color. ${STYLE}`,
  },
  {
    file: 'assets/accessories/body/wings-fairy.png',
    prompt: `Cute fairy/butterfly wings, viewed from behind. Two pairs of delicate translucent wings with sparkle details.
Just the wings alone, no body. Purple/pink iridescent semi-transparent. ${STYLE}`,
  },
  {
    file: 'assets/accessories/body/backpack.png',
    prompt: `A cute small school backpack, front/slight angle view. Rounded shape with a front pocket and straps.
Just the backpack alone, no body. Purple with a small star keychain. ${STYLE}`,
  },
  {
    file: 'assets/accessories/body/necklace.png',
    prompt: `A cute small necklace with beads and a heart pendant, laid flat in a U curve shape.
Just the necklace alone. Gold chain with colorful beads and pink heart pendant. ${STYLE}`,
  },
  // Hair - missing back layers + spiky back + buns back + bald
  {
    file: 'assets/hair/back/spiky.png',
    prompt: `Back view of spiky anime-style hair for a chibi character. Short spiky blue hair at the back of the head, just the hair shape.
No face, no head visible, just the hair spikes. Blue fantasy color. ${STYLE}`,
  },
  {
    file: 'assets/hair/back/buns.png',
    prompt: `Back view of two space buns hairstyle for a chibi character. Two round bun shapes and short hair connecting them at back of head.
No face, just the back hair portion. Pink/magenta color. ${STYLE}`,
  },
];

async function generateImage(prompt) {
  try {
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'medium',
      background: 'transparent',
    });
    const b64 = response.data[0].b64_json;
    if (b64) return Buffer.from(b64, 'base64');
    const url = response.data[0].url;
    if (url) { const r = await fetch(url); return Buffer.from(await r.arrayBuffer()); }
    throw new Error('No image data');
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('Lauren Fashion - Generating ESSENTIAL missing assets\n');

  let generated = 0, skipped = 0, failed = 0;

  for (let i = 0; i < MISSING.length; i++) {
    const item = MISSING[i];
    const filePath = path.join(ROOT, item.file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
      console.log(`[${i + 1}/${MISSING.length}] SKIP: ${item.file}`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${MISSING.length}] Generating: ${item.file}...`);
    const buf = await generateImage(item.prompt);
    if (buf) {
      fs.writeFileSync(filePath, buf);
      console.log(`[${i + 1}/${MISSING.length}] SAVED: ${item.file} (${(buf.length / 1024).toFixed(0)} KB)`);
      generated++;
    } else {
      console.log(`[${i + 1}/${MISSING.length}] FAILED: ${item.file}`);
      failed++;
    }

    if (i < MISSING.length - 1) {
      console.log('  ... waiting 15s ...');
      await new Promise(r => setTimeout(r, 15000));
    }
  }

  console.log(`\nDone! Generated: ${generated}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch(console.error);
