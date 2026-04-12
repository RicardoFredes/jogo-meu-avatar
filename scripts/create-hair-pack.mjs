/**
 * Hair Pack v6 - REDESIGNED for front-view chibi
 *
 * KEY INSIGHT: Character is viewed FROM THE FRONT. So:
 * - BACK layer (z=10, behind head) = hair SIDES framing the face + hair below head
 * - FRONT layer (z=80, over face) = bangs on forehead only
 *
 * Head coords in 600x800:
 *   Top=186, Bottom=394, Left=191, Right=409, Center=(300,290)
 *   Eyes at y=260-315. BANGS stop at y<=238.
 *
 * Style: thick organic curves like the user's SVGs. stroke-width=6.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const F = '#FF00FF', S = '#CC00CC', SW = 6;

function svg(c) {
  return `<svg viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg">\n${c}\n</svg>\n`;
}
function w(f, c) {
  const p = path.join(ROOT, f);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, svg(c));
  console.log('  ' + f);
}

// ==========================================
// BACK LAYERS - hair silhouette from front view
// These frame the face: sides of hair + below head
// ==========================================

w('assets/hair/back/longo-liso.svg', `
  <!-- Longo liso: two straight curtains on each side of face, to waist -->
  <!-- Crown/top above head connecting both sides -->
  <path d="M190 200 C195 170, 230 150, 300 148 C370 150, 405 170, 410 200 L410 210 L190 210 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Left hair curtain: from temple, past ear, down to waist -->
  <path d="M190 200
    C182 210, 172 240, 168 275
    C164 310, 162 350, 160 390
    C158 440, 158 490, 160 530
    C162 555, 168 570, 178 575
    C185 578, 190 568, 192 555
    L195 390 C196 350, 198 310, 200 280
    C202 255, 205 235, 210 220 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Right hair curtain -->
  <path d="M410 200
    C418 210, 428 240, 432 275
    C436 310, 438 350, 440 390
    C442 440, 442 490, 440 530
    C438 555, 432 570, 422 575
    C415 578, 410 568, 408 555
    L405 390 C404 350, 402 310, 400 280
    C398 255, 395 235, 390 220 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
`);

w('assets/hair/back/longo-ondulado.svg', `
  <!-- Longo ondulado: wavy curtains on sides with volume -->
  <path d="M188 200 C192 168, 232 148, 300 146 C368 148, 408 168, 412 200 L412 212 L188 212 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Left wavy curtain -->
  <path d="M188 205
    C178 220, 165 260, 158 305
    C152 345, 155 380, 162 405
    C168 425, 158 448, 150 475
    C145 505, 148 535, 158 555
    C168 572, 180 568, 185 555
    C190 535, 188 508, 185 480
    C182 455, 190 430, 198 405
    C205 380, 202 348, 200 310
    C198 270, 200 240, 208 218 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Right wavy curtain -->
  <path d="M412 205
    C422 220, 435 260, 442 305
    C448 345, 445 380, 438 405
    C432 425, 442 448, 450 475
    C455 505, 452 535, 442 555
    C432 572, 420 568, 415 555
    C410 535, 412 508, 415 480
    C418 455, 410 430, 402 405
    C395 380, 398 348, 400 310
    C402 270, 400 240, 392 218 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
`);

w('assets/hair/back/medio.svg', `
  <!-- Medio: sides to shoulder level, rounder shape -->
  <path d="M190 200 C195 170, 232 150, 300 148 C368 150, 405 170, 410 200 L410 212 L190 212 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Left side to shoulder -->
  <path d="M190 205
    C180 218, 170 248, 166 285
    C162 325, 164 365, 170 395
    C176 420, 188 430, 200 425
    C208 418, 210 400, 208 375
    L205 310 C204 278, 206 250, 212 228 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Right side to shoulder -->
  <path d="M410 205
    C420 218, 430 248, 434 285
    C438 325, 436 365, 430 395
    C424 420, 412 430, 400 425
    C392 418, 390 400, 392 375
    L395 310 C396 278, 394 250, 388 228 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
`);

w('assets/hair/back/curto.svg', `
  <!-- Curto: short hair, just around head contour -->
  <path d="M190 200 C195 170, 232 152, 300 150 C368 152, 405 170, 410 200 L410 210 L190 210 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Left side short -->
  <path d="M190 205
    C182 218, 175 248, 172 280
    C170 310, 174 338, 184 355
    C192 368, 202 365, 206 350
    L205 290 C206 262, 208 240, 214 225 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Right side short -->
  <path d="M410 205
    C418 218, 425 248, 428 280
    C430 310, 426 338, 416 355
    C408 368, 398 365, 394 350
    L395 290 C394 262, 392 240, 386 225 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
`);

w('assets/hair/back/careca.svg', `<!-- Careca -->`);

// ==========================================
// FRONT LAYERS (BANGS) - over the forehead
// All stop at y<=238. Eyes start at y=260.
// ==========================================

w('assets/hair/front/sem-franja.svg', `<!-- Sem franja -->`);

w('assets/hair/front/franja-reta.svg', `
  <!-- Franja reta: solid cap + 4-5 straight chunky sections -->
  <!-- Solid cap (hair mass on top of head) -->
  <path d="M185 235 C182 205, 195 170, 225 156 C258 142, 342 142, 375 156 C405 170, 418 205, 415 235 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Chunky straight bang sections -->
  <path d="M188 228 L192 240 C198 238, 215 232, 235 230 L238 240
    C248 236, 265 230, 282 228 L285 238
    C295 234, 310 230, 325 228 L328 238
    C342 234, 358 230, 372 232 L375 240
    C385 238, 398 235, 412 240 L415 228"
    fill="${F}" stroke="${S}" stroke-width="4"/>
`);

w('assets/hair/front/franja-lateral.svg', `
  <!-- Franja lateral: cap + side-swept bangs to the right -->
  <path d="M185 235 C182 205, 195 170, 225 156 C258 142, 342 142, 375 156 C405 170, 418 205, 415 235 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- One big side-swept section from left to right -->
  <path d="M188 225
    C195 218, 225 210, 280 208
    C335 210, 380 220, 415 232
    L412 238
    C385 228, 340 218, 285 216
    C235 218, 202 225, 192 235 Z"
    fill="${F}" stroke="${S}" stroke-width="4"/>
  <!-- Small piece on the left side of face -->
  <path d="M185 235 C182 242, 180 255, 182 265 C186 258, 190 252, 192 248 L190 238 Z"
    fill="${F}" stroke="${S}" stroke-width="3"/>
`);

w('assets/hair/front/franja-repartida.svg', `
  <!-- Franja repartida ao meio: cap + center part with two curtain bangs -->
  <path d="M185 235 C182 205, 195 170, 225 156 C258 142, 342 142, 375 156 C405 170, 418 205, 415 235 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Center part line -->
  <line x1="300" y1="148" x2="300" y2="235" stroke="${S}" stroke-width="2" opacity="0.5"/>
  <!-- Left curtain bang -->
  <path d="M188 230 C195 220, 225 212, 270 210
    L295 215 L295 235
    C270 225, 235 222, 210 228 L195 238 Z"
    fill="${F}" stroke="${S}" stroke-width="3"/>
  <!-- Right curtain bang -->
  <path d="M412 230 C405 220, 375 212, 330 210
    L305 215 L305 235
    C330 225, 365 222, 390 228 L405 238 Z"
    fill="${F}" stroke="${S}" stroke-width="3"/>
`);

w('assets/hair/front/franja-cacheada.svg', `
  <!-- Franja cacheada: cap + round/curly bang sections -->
  <path d="M185 232 C182 202, 195 168, 225 154 C258 140, 342 140, 375 154 C405 168, 418 202, 415 232 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Round/bouncy curly bang sections -->
  <path d="M195 225 C198 212, 215 205, 232 210 C248 215, 250 228, 242 235 C232 240, 212 238, 200 232 Z"
    fill="${F}" stroke="${S}" stroke-width="4"/>
  <path d="M238 218 C242 205, 262 198, 280 204 C298 210, 302 225, 292 232 C280 238, 258 235, 245 228 Z"
    fill="${F}" stroke="${S}" stroke-width="4"/>
  <path d="M288 215 C292 202, 315 196, 335 202 C352 208, 355 222, 345 230 C332 236, 308 233, 295 225 Z"
    fill="${F}" stroke="${S}" stroke-width="4"/>
  <path d="M340 220 C345 208, 368 202, 388 210 C405 218, 405 232, 395 237 C382 242, 358 238, 348 230 Z"
    fill="${F}" stroke="${S}" stroke-width="4"/>
`);

w('assets/hair/front/topete.svg', `
  <!-- Topete: cap + pompadour/volume going up -->
  <path d="M185 235 C182 205, 195 170, 225 156 C258 142, 342 142, 375 156 C405 170, 418 205, 415 235 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Pompadour volume on top -->
  <path d="M220 168 C228 130, 270 108, 300 105 C330 108, 372 130, 380 168
    C375 148, 345 128, 300 125 C255 128, 225 148, 220 168 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
`);

console.log('\\nHair Pack v6 - Redesigned for front view!');
console.log('Back layers: hair SIDES framing face (not back of head)');
console.log('Front layers: bangs only, all stop at y<=238');
console.log('Organic curves, thick strokes, solid fills');
