/**
 * Hair Pack v5 - ViewBox 600x800, coordenadas exatas da cabeca
 *
 * Head reference:
 *   Top: y=186, Center: y=290, Bottom: y=394
 *   Left: x=191, Right: x=409
 *   Volume extends ~25px beyond head on each side
 *
 * FRANJA: bottom edge NEVER below y=240 (eyes start at y=260)
 * Style: solid fills + stroke outlines, stroke-width=6
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const F = '#FF00FF';
const S = '#CC00CC';
const SW = 6;
const VB = '0 0 600 800';

function svg(c) {
  return `<svg viewBox="${VB}" fill="none" xmlns="http://www.w3.org/2000/svg">\n${c}\n</svg>\n`;
}
function w(f, c) {
  fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, f), svg(c));
  console.log('  ' + f);
}

// ==================== HAIR BACKS (5) ====================

w('assets/hair/back/longo.svg', `
  <!-- Longo: volume atras da cabeca, cai ate y=600 -->
  <!-- Massa central atras -->
  <path d="M210 185 C240 175, 360 175, 390 185
    L395 560 C395 585, 375 598, 350 600
    L250 600 C225 598, 205 585, 205 560 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Mecha esquerda caindo -->
  <path d="M185 220 C172 245, 162 290, 158 340
    L155 520 C155 545, 168 555, 182 552
    L195 548 C200 546, 202 538, 202 528
    L205 300 C208 260, 215 235, 222 215 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Mecha direita caindo -->
  <path d="M415 220 C428 245, 438 290, 442 340
    L445 520 C445 545, 432 555, 418 552
    L405 548 C400 546, 398 538, 398 528
    L395 300 C392 260, 385 235, 378 215 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
`);

w('assets/hair/back/medio.svg', `
  <!-- Medio: ate os ombros, y~480 -->
  <path d="M210 185 C240 175, 360 175, 390 185
    L395 445 C395 465, 375 478, 350 480
    L250 480 C225 478, 205 465, 205 445 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Laterais -->
  <path d="M188 220 C175 250, 168 300, 166 345
    L164 430 C164 448, 175 455, 188 452
    L200 448 L202 310 C205 268, 215 238, 225 218 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <path d="M412 220 C425 250, 432 300, 434 345
    L436 430 C436 448, 425 455, 412 452
    L400 448 L398 310 C395 268, 385 238, 375 218 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
`);

w('assets/hair/back/curto.svg', `
  <!-- Curto: so atras da cabeca ate pescoco, y~420 -->
  <path d="M210 185 C240 178, 360 178, 390 185
    L400 365 C402 390, 388 408, 365 412
    L235 412 C212 408, 198 390, 200 365 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
`);

w('assets/hair/back/calvo.svg', `
  <!-- Calvo: bem curto, so no topo -->
  <path d="M220 188 C248 180, 352 180, 380 188
    L385 240 C385 255, 372 262, 358 260
    L300 252 L242 260 C228 262, 215 255, 215 240 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
`);

w('assets/hair/back/longo-cacheado.svg', `
  <!-- Longo cacheado: volume + ondas -->
  <path d="M205 185 C235 172, 365 172, 395 185
    L400 540 C400 568, 380 582, 355 585
    L245 585 C220 582, 200 568, 200 540 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Ondas/cachos nas laterais -->
  <path d="M180 225 C165 258, 148 310, 145 365
    C142 415, 150 465, 162 505
    C170 530, 185 540, 198 535
    L202 310 C208 262, 218 235, 228 215 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <circle cx="155" cy="520" r="18" fill="${F}" stroke="${S}" stroke-width="4"/>
  <circle cx="175" cy="540" r="15" fill="${F}" stroke="${S}" stroke-width="4"/>
  <path d="M420 225 C435 258, 452 310, 455 365
    C458 415, 450 465, 438 505
    C430 530, 415 540, 402 535
    L398 310 C392 262, 382 235, 372 215 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <circle cx="445" cy="520" r="18" fill="${F}" stroke="${S}" stroke-width="4"/>
  <circle cx="425" cy="540" r="15" fill="${F}" stroke="${S}" stroke-width="4"/>
`);

w('assets/hair/back/longo-enrolado.svg', `
  <!-- Longo enrolado: cachos bem definidos tipo espiral -->
  <path d="M215 185 C242 175, 358 175, 385 185
    L390 400 C390 415, 378 425, 365 422
    L235 422 C222 425, 210 415, 210 400 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Espirais/cachos longos esquerda -->
  <path d="M185 235 C170 268, 155 320, 155 380
    C155 420, 162 452, 175 478
    C168 492, 178 498, 185 492
    C178 478, 172 458, 170 430
    C168 400, 162 370, 165 338
    C170 360, 178 388, 185 405
    C192 438, 195 475, 188 510
    C182 535, 195 545, 205 538
    L208 340 C212 285, 222 248, 232 225 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Espirais/cachos longos direita -->
  <path d="M415 235 C430 268, 445 320, 445 380
    C445 420, 438 452, 425 478
    C432 492, 422 498, 415 492
    C422 478, 428 458, 430 430
    C432 400, 438 370, 435 338
    C430 360, 422 388, 415 405
    C408 438, 405 475, 412 510
    C418 535, 405 545, 395 538
    L392 340 C388 285, 378 248, 368 225 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
`);

w('assets/hair/back/medio-liso.svg', `
  <!-- Medio liso: liso ate os ombros -->
  <path d="M210 185 C240 175, 360 175, 390 185
    L395 445 C395 465, 375 478, 350 480
    L250 480 C225 478, 205 465, 205 445 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <path d="M188 220 C175 250, 168 300, 166 345
    L164 430 C164 448, 175 455, 188 452
    L200 448 L202 310 C205 268, 215 238, 225 218 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <path d="M412 220 C425 250, 432 300, 434 345
    L436 430 C436 448, 425 455, 412 452
    L400 448 L398 310 C395 268, 385 238, 375 218 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
`);

w('assets/hair/back/careca.svg', `<!-- Careca - sem cabelo -->`);

// ==================== FRANJAS (6) ====================

// Todas as franjas incluem o "cap" solido que cobre o topo da cabeca.
// Cap: forma solida de y~155 (acima da cabeca) ate onde a franja termina.
// Franja PARA em y<=240. Olhos comecam em y=260.

w('assets/hair/front/sem-franja.svg', `<!-- Sem franja -->`);

w('assets/hair/front/franjinha.svg', `
  <!-- Franjinha: cap solido + franja reta com 5 mechas -->
  <!-- Cap solido cobrindo topo da cabeca -->
  <path d="M180 238
    C178 210, 185 175, 210 160
    C240 145, 360 145, 390 160
    C415 175, 422 210, 420 238 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- 5 mechas da franja (pontas retas/anguladas) -->
  <path d="M182 232
    L186 240 L220 235 L222 225
    L258 238 L295 238 L298 222
    L335 238 L372 235 L378 225
    L412 238 L418 232
    L420 238 L180 238 Z"
    fill="${F}" stroke="${S}" stroke-width="3"/>
`);

w('assets/hair/front/repartido-meio.svg', `
  <!-- Repartido ao meio: cap + risca central + mechas caindo pros lados -->
  <path d="M180 240
    C178 210, 185 175, 210 160
    C240 145, 360 145, 390 160
    C415 175, 422 210, 420 240 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Risca central -->
  <line x1="300" y1="150" x2="300" y2="240" stroke="${S}" stroke-width="3" opacity="0.5"/>
  <!-- Mecha esquerda descendo -->
  <path d="M180 238 C185 228, 210 218, 250 215
    C275 214, 295 218, 298 225
    L298 240 C290 232, 268 226, 248 228
    C218 232, 195 240, 182 245 Z"
    fill="${F}" stroke="${S}" stroke-width="3"/>
  <!-- Mecha direita descendo -->
  <path d="M420 238 C415 228, 390 218, 350 215
    C325 214, 305 218, 302 225
    L302 240 C310 232, 332 226, 352 228
    C382 232, 405 240, 418 245 Z"
    fill="${F}" stroke="${S}" stroke-width="3"/>
`);

w('assets/hair/front/repartido-lado.svg', `
  <!-- Repartido pro lado: cap + risca lateral esquerda + mechas pro lado direito -->
  <path d="M180 240
    C178 210, 185 175, 210 160
    C240 145, 360 145, 390 160
    C415 175, 422 210, 420 240 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Risca lateral esquerda -->
  <line x1="225" y1="155" x2="220" y2="240" stroke="${S}" stroke-width="3" opacity="0.5"/>
  <!-- Grande mecha caindo pra direita -->
  <path d="M182 235
    C195 225, 240 210, 310 208
    C370 210, 408 222, 418 235
    L415 242
    C400 232, 365 220, 305 218
    C245 220, 200 232, 185 242 Z"
    fill="${F}" stroke="${S}" stroke-width="3"/>
`);

w('assets/hair/front/moicano.svg', `
  <!-- Moicano: cap + espinhos centrais pra cima -->
  <path d="M180 238
    C178 210, 185 175, 210 160
    C240 145, 360 145, 390 160
    C415 175, 422 210, 420 238 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Espinhos centrais -->
  <path d="M255 195 L245 115 L275 175 L268 90 L300 165
    L332 90 L325 175 L355 115 L345 195"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
`);

w('assets/hair/front/cacheado.svg', `
  <!-- Cacheado: cap + mechas arredondadas/cachos no topo -->
  <path d="M180 240
    C178 210, 185 175, 210 160
    C240 145, 360 145, 390 160
    C415 175, 422 210, 420 240 Z"
    fill="${F}" stroke="${S}" stroke-width="${SW}"/>
  <!-- Cachos arredondados sobre o cap -->
  <circle cx="210" cy="195" r="22" fill="${F}" stroke="${S}" stroke-width="4"/>
  <circle cx="255" cy="178" r="25" fill="${F}" stroke="${S}" stroke-width="4"/>
  <circle cx="300" cy="170" r="26" fill="${F}" stroke="${S}" stroke-width="4"/>
  <circle cx="345" cy="178" r="25" fill="${F}" stroke="${S}" stroke-width="4"/>
  <circle cx="390" cy="195" r="22" fill="${F}" stroke="${S}" stroke-width="4"/>
  <!-- Mechas laterais encaracoladas -->
  <circle cx="178" cy="225" r="18" fill="${F}" stroke="${S}" stroke-width="3"/>
  <circle cx="422" cy="225" r="18" fill="${F}" stroke="${S}" stroke-width="3"/>
`);

console.log('\\nHair Pack v5 created!');
console.log('ViewBox 600x800 - same as body/head');
console.log('All bangs stop at y<=240 (eyes at y=260)');
console.log('Solid fills + stroke outlines matching user style');
