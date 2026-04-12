/**
 * Lauren Fashion - Asset Generator via OpenAI Image API
 *
 * Generates all game assets in the style of the reference image:
 * Cute chibi characters, purple/lilac theme, big eyes, cartoon style
 *
 * Usage: node scripts/generate-assets.mjs [category]
 * Categories: bodies, faces, eyes, hair, clothing, accessories, all
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

// Base style prompt - matches the reference image
const STYLE = `cute chibi cartoon style for a children's dress-up game, similar to "dress up dolls" mobile games.
The art style has: very large expressive eyes, small cute body, rounded soft shapes,
pastel/vibrant colors, clean vector-like illustration, no outlines just smooth fills with subtle shading.
Similar to the art in children's apps like "Princess Dress Up" or "Toca Boca".
The image MUST have a completely transparent background (PNG with alpha).
Single isolated element, centered, no text, no decorations around it.`;

// All assets to generate
const ASSET_BATCHES = {
  bodies: [
    {
      file: 'assets/bodies/child-female-normal.png',
      prompt: `A cute chibi girl paper doll character, full body standing pose, front view. Normal slim build.
She has a simple round blank face (no features drawn yet - like a template/mannequin doll face).
She wears a plain light beige/skin-toned leotard. Small cute chibi proportions with big head.
Light peachy skin. This is a BASE TEMPLATE for a dress-up paper doll game. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/bodies/child-female-chubby.png',
      prompt: `A cute chibi chubby girl paper doll character, full body standing pose, front view. Chubby/round adorable build.
She has a simple round blank face (no features - mannequin template). Round tummy, pudgy arms and legs.
She wears a plain light beige/skin-toned leotard. Chibi proportions with big head.
Light peachy skin. BASE TEMPLATE for paper doll game. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/bodies/child-male-normal.png',
      prompt: `A cute chibi boy paper doll character, full body standing pose, front view. Normal slim build.
He has a simple round blank face (no features - mannequin template). Slightly wider shoulders.
He wears a plain light beige/skin-toned shorts and tank top. Chibi proportions with big head.
Light peachy skin. BASE TEMPLATE for paper doll game. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/bodies/child-male-chubby.png',
      prompt: `A cute chibi chubby boy paper doll character, full body standing pose, front view. Chubby adorable build.
He has a simple round blank face (no features - mannequin template). Round tummy, sturdy legs.
He wears a plain light beige/skin-toned shorts and tank top. Chibi proportions with big head.
Light peachy skin. BASE TEMPLATE for paper doll game. ${STYLE}`,
      size: '1024x1024',
    },
  ],

  faces: [
    {
      file: 'assets/faces/shapes/face-round.png',
      prompt: `A cute chibi round face shape, just the face oval/circle with ears. No eyes, no mouth, no nose, no hair - just the blank face shape with skin color (light peach).
Round circular face with small cute ears on the sides. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/faces/shapes/face-oval.png',
      prompt: `A cute chibi oval face shape, just the face oval with ears. No eyes, no mouth, no nose, no hair - just the blank face shape with skin color (light peach).
Slightly elongated oval face with small cute ears. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/faces/shapes/face-square.png',
      prompt: `A cute chibi rounded-square face shape, just the face shape with ears. No eyes, no mouth, no nose, no hair - just the blank face shape with skin color (light peach).
Soft rounded square face with small cute ears. ${STYLE}`,
      size: '1024x1024',
    },
  ],

  eyes: [
    {
      file: 'assets/faces/eyes/eyes-round.png',
      prompt: `A pair of cute chibi cartoon eyes, big round sparkling eyes with large dark pupils, white highlights/sparkle dots, colored iris (brown).
Just the two eyes side by side, no face. Very expressive and cute, anime-influenced. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/faces/eyes/eyes-oval.png',
      prompt: `A pair of cute chibi cartoon eyes, slightly oval/almond shaped, big and expressive with large dark pupils, white sparkle highlights, colored iris (blue).
Just the two eyes side by side, no face. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/faces/eyes/eyes-big.png',
      prompt: `A pair of extra large cute anime-style chibi eyes, very big and round with double white sparkle highlights, large colored iris (green), thick cute eyelashes.
Just the two eyes, no face. Maximum cuteness. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/faces/eyes/eyes-happy.png',
      prompt: `A pair of happy closed chibi eyes - curved upward arcs like ^_^ happy expression. Cute thick curved lines with small eyelashes at the sides.
Just the two closed happy eyes, no face. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/faces/eyes/eyes-wink.png',
      prompt: `A pair of chibi eyes where one eye (left) is open, big and round with sparkle, and the other eye (right) is closed in a cute wink with a small curved line and eyelash.
Just the two eyes, no face. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/faces/eyebrows/brows-thin.png',
      prompt: `A pair of thin arched eyebrows for a cute chibi character. Dark brown, thin curved lines, slightly arched. Just the two eyebrows, nothing else. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/faces/eyebrows/brows-thick.png',
      prompt: `A pair of thick bold eyebrows for a cute chibi character. Dark brown, bold curved strokes. Just the two eyebrows, nothing else. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/faces/noses/nose-small.png',
      prompt: `A tiny cute chibi nose - just a small subtle curved line or tiny dot, very minimal. Pinkish skin-shadow color. Just the nose, nothing else. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/faces/noses/nose-button.png',
      prompt: `A small cute button nose for a chibi character - a small round circle shape. Pinkish shadow color. Just the nose, nothing else. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/faces/mouths/mouth-smile.png',
      prompt: `A cute chibi smile mouth - a small upward curved line forming a happy smile. Pink/coral colored. Just the mouth, nothing else. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/faces/mouths/mouth-open.png',
      prompt: `A cute chibi open happy mouth - small open mouth showing a happy expression with a tiny visible tongue. Pink lips. Just the mouth, nothing else. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/faces/mouths/mouth-cat.png',
      prompt: `A cute chibi cat mouth - a small "w" or "3" shaped mouth like a cat, very kawaii. Pink colored. Just the mouth, nothing else. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/faces/extras/extra-blush.png',
      prompt: `Two soft pink/rosy circle blush marks for a chibi character's cheeks. Soft semi-transparent pink circles side by side. Just the blush marks, nothing else. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/faces/extras/extra-freckles.png',
      prompt: `Small scattered freckle dots for a chibi character's cheeks. Light brown tiny dots scattered in two groups (left cheek and right cheek). Just the freckles, nothing else. ${STYLE}`,
      size: '1024x1024',
    },
  ],

  hair: [
    {
      file: 'assets/hair/front/long-straight.png',
      prompt: `Front view of long straight hair bangs/fringe for a chibi character. Straight-cut bangs across the forehead with side pieces framing the face. Dark brown color.
Just the front portion of hair (bangs and sides), NO back hair, no face. Should look like it goes ON TOP of a round head. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/hair/back/long-straight.png',
      prompt: `Back portion of long straight hair for a chibi character. Long flowing straight hair falling behind, from top of head down to waist level. Dark brown color.
Just the back portion of hair, no face, no front bangs. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/hair/front/long-curly.png',
      prompt: `Front view of long curly/wavy hair bangs for a chibi character. Wavy curly bangs across forehead with curly side pieces. Rich brown color with volume.
Just the front portion (bangs), no face. Similar to the curly-haired character in children's dress-up games. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/hair/back/long-curly.png',
      prompt: `Back portion of long curly/wavy hair for a chibi character. Big voluminous curly hair flowing behind, from top of head down past shoulders. Rich brown with bouncy curls.
Just the back hair, no face. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/hair/front/short-bob.png',
      prompt: `Front view of a short bob haircut bangs for a chibi character. Side-swept bangs with short hair at chin level framing the face. Auburn/red-brown color.
Just the front hair portion, no face. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/hair/back/short-bob.png',
      prompt: `Back portion of a short bob haircut for a chibi character. Short rounded hair ending at neck/chin level. Auburn/red-brown color.
Just the back hair, no face. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/hair/front/pigtails.png',
      prompt: `Front view of pigtails hairstyle bangs for a chibi character. Center-parted bangs with two pigtails visible on the sides, tied with small ribbons. Blonde/golden color.
Just the front hair, no face. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/hair/back/pigtails.png',
      prompt: `Back view of pigtails for a chibi character. Two long pigtails hanging down from each side of the head, tied with small ribbons/bows. Blonde/golden color.
Just the back hair, no face. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/hair/front/ponytail.png',
      prompt: `Front view of a high ponytail hairstyle bangs for a chibi character. Hair smoothly pulled back with small wispy fringe/baby hairs at forehead. Black color.
Just the front hair, no face. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/hair/back/ponytail.png',
      prompt: `Back view of a high ponytail for a chibi character. Single ponytail flowing down from the top of the head. Black color with a cute hair tie.
Just the back hair, no face. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/hair/front/buns.png',
      prompt: `Front view of space buns hairstyle for a chibi character. Two round buns on top of the head with small bangs/fringe below them. Pink/magenta fantasy color.
Just the front hair with buns, no face. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/hair/back/buns.png',
      prompt: `Back view of space buns for a chibi character. Two round buns on top of head with short hair at the back. Pink/magenta fantasy color.
Just the back hair with buns, no face. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/hair/front/spiky.png',
      prompt: `Front view of spiky fun hair for a chibi character. Multiple spiky points sticking up and outward from the head, wild and fun. Blue fantasy color.
Just the front spiky hair, no face. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/hair/back/spiky.png',
      prompt: `Back view of spiky hair for a chibi character. Spiky points at the back of the head. Blue fantasy color.
Just the back hair, no face. ${STYLE}`,
      size: '1024x1024',
    },
  ],

  clothing: [
    {
      file: 'assets/clothing/tops/tshirt.png',
      prompt: `A cute chibi-sized purple t-shirt, flat laid out, front view. Short sleeves, round neckline, simple design. Sized for a small chibi character body.
Just the t-shirt, no body, no person. Purple/lilac color. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/clothing/tops/hoodie.png',
      prompt: `A cute chibi-sized hoodie sweatshirt, flat front view. Hood visible, long sleeves, kangaroo pocket. Sized for a chibi character.
Just the hoodie, no body. Pink color. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/clothing/tops/blouse.png',
      prompt: `A cute chibi-sized blouse with small puffy sleeves and a cute collar, flat front view. Sized for a chibi character.
Just the blouse, no body. White with small purple details. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/clothing/bottoms/skirt.png',
      prompt: `A cute chibi-sized flared A-line skirt, flat front view. Short and flowy with a waistband. Sized for a chibi character.
Just the skirt, no body. Purple/lilac color. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/clothing/bottoms/pants.png',
      prompt: `Cute chibi-sized jeans/pants, flat front view. Small cute proportions with a waistband. Sized for a chibi character.
Just the pants, no body. Blue denim color. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/clothing/bottoms/shorts.png',
      prompt: `Cute chibi-sized shorts, flat front view. Short and cute with a waistband. Sized for a chibi character.
Just the shorts, no body. Pink color. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/clothing/shoes/sneakers.png',
      prompt: `A pair of cute chibi-sized sneakers/tennis shoes, front view. Small, round, and adorable with laces.
Just the pair of shoes side by side, no legs. White with purple accents. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/clothing/shoes/boots.png',
      prompt: `A pair of cute chibi-sized ankle boots, front view. Small and round with cute buckle details.
Just the pair of boots side by side, no legs. Pink/magenta color. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/clothing/full-body/dress-simple.png',
      prompt: `A cute chibi-sized simple A-line dress, flat front view. Short sleeves, round neckline, skirt flaring out at bottom. Sized for a chibi character.
Just the dress, no body. Lilac/lavender color. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/clothing/full-body/dress-princess.png',
      prompt: `A cute chibi-sized princess dress, flat front view. Puffy sleeves, fitted bodice, very wide poofy layered skirt with sparkles. Sized for a chibi character.
Just the dress, no body. Purple and gold royal colors. ${STYLE}`,
      size: '1024x1024',
    },
  ],

  accessories: [
    {
      file: 'assets/accessories/head/crown.png',
      prompt: `A cute small golden crown for a chibi character. Rounded points, jewel details in pink and blue. Shiny and sparkly.
Just the crown, nothing else. Gold color with gems. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/accessories/head/bow.png',
      prompt: `A cute big hair bow/ribbon for a chibi character. Big fluffy bow shape with trailing ribbons.
Just the bow, nothing else. Pink/hot pink color. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/accessories/head/tiara.png',
      prompt: `A cute small princess tiara for a chibi character. Delicate arch with small heart-shaped gems. Silver/gold with pink gems.
Just the tiara, nothing else. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/accessories/head/witch-hat.png',
      prompt: `A cute witch/wizard hat for a chibi character. Pointy hat with slightly droopy tip, buckle band detail, sparkle star accent.
Just the hat, nothing else. Purple color with gold buckle. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/accessories/face/glasses-round.png',
      prompt: `Cute small round glasses for a chibi character. Round lenses with thin frames. Front view.
Just the glasses, nothing else. Black/dark frames. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/accessories/face/glasses-star.png',
      prompt: `Cute star-shaped fun glasses/sunglasses for a chibi character. Star-shaped lenses, fun and playful.
Just the glasses, nothing else. Pink/purple frames. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/accessories/body/cape.png',
      prompt: `A cute superhero cape for a chibi character, viewed from behind. Flowing cape shape attached at the neck/shoulders, fluttering slightly.
Just the cape, no body. Red color. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/accessories/body/wings-fairy.png',
      prompt: `Cute fairy/butterfly wings for a chibi character, viewed from behind. Two pairs of translucent sparkly wings, semi-transparent with iridescent colors.
Just the wings, no body. Purple/pink iridescent. ${STYLE}`,
      size: '1024x1024',
    },
    {
      file: 'assets/accessories/body/backpack.png',
      prompt: `A cute small backpack/school bag for a chibi character. Rounded shape with straps, small pocket, and a cute charm/keychain. Front or slight angle view.
Just the backpack, no body. Purple color with star charm. ${STYLE}`,
      size: '1024x1024',
    },
  ],
};

// ========== GENERATION ==========

async function generateImage(prompt, size = '1024x1024') {
  try {
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size,
      quality: 'medium',
      background: 'transparent',
    });

    // gpt-image-1 returns base64
    const b64 = response.data[0].b64_json;
    if (b64) return Buffer.from(b64, 'base64');

    // Fallback: URL based
    const url = response.data[0].url;
    if (url) {
      const resp = await fetch(url);
      return Buffer.from(await resp.arrayBuffer());
    }

    throw new Error('No image data returned');
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    return null;
  }
}

async function generateBatch(batchName, items) {
  console.log(`\n========== ${batchName.toUpperCase()} (${items.length} items) ==========\n`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const filePath = path.join(ROOT, item.file);
    const dir = path.dirname(filePath);

    // Create directory if needed
    fs.mkdirSync(dir, { recursive: true });

    // Skip if already exists
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
      console.log(`  [${i + 1}/${items.length}] SKIP (exists): ${item.file}`);
      continue;
    }

    console.log(`  [${i + 1}/${items.length}] Generating: ${item.file}...`);

    const imageBuffer = await generateImage(item.prompt, item.size);
    if (imageBuffer) {
      fs.writeFileSync(filePath, imageBuffer);
      console.log(`  [${i + 1}/${items.length}] SAVED: ${item.file} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`  [${i + 1}/${items.length}] FAILED: ${item.file}`);
    }

    // Delay between requests to respect rate limit (5/min = 1 every 13s)
    if (i < items.length - 1) {
      console.log(`  ... waiting 15s (rate limit)...`);
      await new Promise(r => setTimeout(r, 15000));
    }
  }
}

// ========== MAIN ==========

async function main() {
  const category = process.argv[2] || 'all';

  console.log('Lauren Fashion - Asset Generator');
  console.log(`Category: ${category}`);
  console.log(`API Key: ${process.env.OPENAI_API_KEY ? '***' + process.env.OPENAI_API_KEY.slice(-6) : 'MISSING!'}`);

  if (!process.env.OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY not found in .env');
    process.exit(1);
  }

  const batches = category === 'all'
    ? Object.entries(ASSET_BATCHES)
    : [[category, ASSET_BATCHES[category]]];

  for (const [name, items] of batches) {
    if (!items) {
      console.error(`Unknown category: ${name}. Available: ${Object.keys(ASSET_BATCHES).join(', ')}`);
      continue;
    }
    await generateBatch(name, items);
  }

  console.log('\n========== DONE ==========');
  console.log('Assets generated! Use the dev mode (dev.html) to position them.');
}

main().catch(console.error);
