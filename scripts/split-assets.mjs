/**
 * Split the user's hand-made SVGs (crianca.svg, adulto.svg) into
 * separate layer files for the game.
 *
 * Each source SVG is split into: body, head, eyes, nose, mouth, shoes
 * Colors are converted to grayscale for skin parts (body, head) so tinting works.
 *
 * Usage: node scripts/split-assets.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Color mapping: skin color -> grayscale for tinting
const SKIN = '#FFE8D1';
const SKIN_SHADOW = '#D1BAA3';
const SKIN_WHITE = '#FFFFFF';
const SKIN_SHADOW_GRAY = '#E0E0E0';

function skinToGrayscale(svgContent) {
  return svgContent
    .replaceAll('#FFE8D1', SKIN_WHITE)
    .replaceAll('#ffe8d1', SKIN_WHITE)
    .replaceAll('#D1BAA3', SKIN_SHADOW_GRAY)
    .replaceAll('#d1baa3', SKIN_SHADOW_GRAY);
}

function wrapSvg(viewBox, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">\n${content}\n</svg>\n`;
}

// ========== CRIANCA (child) ==========
function splitCrianca() {
  console.log('Splitting crianca.svg...');
  const vb = '0 0 600 800'; // original viewBox

  // BODY (torso+arms+legs path + neck + waist detail) - grayscale
  const bodyPaths = skinToGrayscale(`
  <!-- Neck -->
  <path d="M300 358C313.255 358 324 368.745 324 382V402C324 415.255 313.255 426 300 426C286.745 426 276 415.255 276 402V382C276 368.745 286.745 358 300 358Z" fill="${SKIN}" stroke="${SKIN_SHADOW}" stroke-width="8"/>
  <!-- Body outline -->
  <path d="M345 406C348.947 406 352.777 406.525 356.423 407.503C366.445 408.712 375.851 414.341 381.507 423.65L474.051 575.965C477.355 581.405 475.624 588.495 470.184 591.8V591.801C464.109 595.492 457.132 596.458 450.7 595.049L450.553 594.231L450.054 594.897C443.464 593.281 437.476 589.149 433.671 582.887L394.02 517.628L408.592 714.335V714.336C408.966 719.391 405.102 723.722 400.103 723.987L399.616 724H315C310.03 724 306 719.971 306 715V614H294V715C294 719.971 289.97 724 285 724H200.384C195.152 724 191.023 719.554 191.409 714.336V714.335L206.015 517.117L166.056 582.887C162.251 589.15 156.263 593.281 149.673 594.897L149.173 594.231L149.027 595.049C142.595 596.458 135.617 595.492 129.542 591.801V591.8C124.102 588.495 122.371 581.405 125.676 575.965L218.22 423.65C223.969 414.19 233.589 408.527 243.796 407.445C247.375 406.505 251.131 406 255 406H345Z" stroke="${SKIN_SHADOW}" stroke-width="8" stroke-linejoin="bevel"/>
  <!-- Body fill -->
  <path d="M345 410C348.689 410 352.261 410.502 355.652 411.437C364.618 412.43 373.042 417.422 378.088 425.728L470.632 578.042C472.79 581.594 471.659 586.224 468.107 588.382C462.945 591.518 457.024 592.34 451.556 591.142C455.587 588.566 456.915 583.247 454.499 579.062L451.517 573.897C450.274 571.745 447.521 571.008 445.369 572.25C443.217 573.493 442.48 576.245 443.723 578.397L451.007 591.013C445.403 589.638 440.322 586.13 437.089 580.81L388.803 501.338L404.602 714.631C404.817 717.53 402.523 720 399.616 720H315C312.239 720 310 717.761 310 715V610H290V715C290 717.761 287.761 720 285 720H200.385C197.478 720 195.184 717.53 195.398 714.631L211.234 500.825L162.638 580.81C159.405 586.13 154.324 589.638 148.72 591.013L156.004 578.397C157.246 576.245 156.509 573.493 154.357 572.25C152.205 571.007 149.452 571.745 148.21 573.897L145.227 579.062C142.811 583.248 144.139 588.566 148.171 591.142C142.702 592.34 136.781 591.518 131.619 588.382C128.067 586.224 126.937 581.594 129.095 578.042L221.639 425.728C226.77 417.282 235.393 412.26 244.528 411.388C247.866 410.485 251.376 410 255 410H345Z" fill="${SKIN}"/>
  <!-- Waist detail -->
  <path d="M397.062 558L397.459 570.729L308.569 611H291.936L203.77 570.724L203.969 558H397.062Z" stroke="${SKIN_SHADOW}" stroke-width="4"/>
  `);
  fs.writeFileSync(path.join(ROOT, 'assets/bodies/child-female-normal.svg'),
    wrapSvg(vb, bodyPaths));
  console.log('  -> assets/bodies/child-female-normal.svg');

  // HEAD (head shape + ears) - grayscale
  const headPaths = skinToGrayscale(`
  <!-- Left ear -->
  <path d="M191 268C176.641 268 165 279.641 165 294C165 308.359 176.641 320 191 320H217V268H191Z" fill="${SKIN}" stroke="${SKIN_SHADOW}" stroke-width="8"/>
  <!-- Right ear -->
  <path d="M410 268C424.359 268 436 279.641 436 294C436 308.359 424.359 320 410 320H384V268H410Z" fill="${SKIN}" stroke="${SKIN_SHADOW}" stroke-width="8"/>
  <!-- Head -->
  <path d="M325 186C371.392 186 409 223.608 409 270V310C409 356.392 371.392 394 325 394H275C228.608 394 191 356.392 191 310V270C191 223.608 228.608 186 275 186H325Z" fill="${SKIN}" stroke="${SKIN_SHADOW}" stroke-width="8"/>
  `);
  fs.writeFileSync(path.join(ROOT, 'assets/faces/shapes/face-round-v2.svg'),
    wrapSvg(vb, headPaths));
  console.log('  -> assets/faces/shapes/face-round-v2.svg');

  // EYES
  const eyesPaths = `
  <!-- Left eye white -->
  <path d="M265 259C280.464 259 293 271.536 293 287C293 302.464 280.464 315 265 315C249.536 315 237 302.464 237 287C237 271.536 249.536 259 265 259Z" fill="white" stroke="#B29797" stroke-width="4"/>
  <!-- Left pupil -->
  <ellipse cx="270.5" cy="289.5" rx="16.5" ry="20.5" fill="#634848"/>
  <!-- Right eye white -->
  <path d="M337 259C352.464 259 365 271.536 365 287C365 302.464 352.464 315 337 315C321.536 315 309 302.464 309 287C309 271.536 321.536 259 337 259Z" fill="white" stroke="#B29797" stroke-width="4"/>
  <!-- Right pupil -->
  <ellipse cx="342.5" cy="289.5" rx="16.5" ry="20.5" fill="#634848"/>
  `;
  fs.writeFileSync(path.join(ROOT, 'assets/faces/eyes/eyes-round-v2.svg'),
    wrapSvg(vb, eyesPaths));
  console.log('  -> assets/faces/eyes/eyes-round-v2.svg');

  // NOSE
  const nosePaths = `
  <circle cx="301" cy="317" r="7" fill="#D1BAA3"/>
  `;
  fs.writeFileSync(path.join(ROOT, 'assets/faces/noses/nose-round-v2.svg'),
    wrapSvg(vb, nosePaths));
  console.log('  -> assets/faces/noses/nose-round-v2.svg');

  // MOUTH
  const mouthPaths = `
  <mask id="mouth-mask" fill="white">
    <path d="M325 333C327.761 333 330 335.239 330 338V338C330 354.569 316.569 368 300 368V368C283.431 368 270 354.569 270 338V338C270 335.239 272.239 333 275 333L325 333Z"/>
  </mask>
  <path d="M325 333C327.761 333 330 335.239 330 338V338C330 354.569 316.569 368 300 368V368C283.431 368 270 354.569 270 338V338C270 335.239 272.239 333 275 333L325 333Z" fill="#FFE8D1" stroke="#FFA7A7" stroke-width="16" mask="url(#mouth-mask)"/>
  `;
  fs.writeFileSync(path.join(ROOT, 'assets/faces/mouths/mouth-smile-v2.svg'),
    wrapSvg(vb, mouthPaths));
  console.log('  -> assets/faces/mouths/mouth-smile-v2.svg');

  // SHOES
  const shoesPaths = `
  <!-- Left shoe -->
  <path d="M294 715C294 719.971 289.971 724 285 724L180 724C175.029 724 171 719.971 171 715L171 700C171 686.745 181.745 676 195 676L270 676L270.619 676.008C283.588 676.336 294 686.952 294 700L294 715Z" fill="#A3A3A3" stroke="#838282" stroke-width="8"/>
  <!-- Right shoe -->
  <path d="M429 715C429 719.971 424.971 724 420 724L315 724C310.029 724 306 719.971 306 715L306 700C306 686.745 316.745 676 330 676L405 676L405.619 676.008C418.588 676.336 429 686.952 429 700L429 715Z" fill="#A3A3A3" stroke="#838282" stroke-width="8"/>
  `;
  fs.writeFileSync(path.join(ROOT, 'assets/clothing/shoes/sneakers-v2.svg'),
    wrapSvg(vb, shoesPaths));
  console.log('  -> assets/clothing/shoes/sneakers-v2.svg');
}

// ========== ADULTO (adult) ==========
function splitAdulto() {
  console.log('\nSplitting adulto.svg...');
  const vb = '0 0 600 800';

  // BODY (grayscale)
  const bodyPaths = skinToGrayscale(`
  <!-- Neck -->
  <path d="M300 248C313.255 248 324 258.745 324 272V292C324 305.255 313.255 316 300 316C286.745 316 276 305.255 276 292V272C276 258.745 286.745 248 300 248Z" fill="${SKIN}" stroke="${SKIN_SHADOW}" stroke-width="8"/>
  <!-- Body outline -->
  <path d="M345.036 296C349.082 296 352.994 296.722 356.699 298.056C367.156 299.788 376.402 307.643 381.8 319.671L474.417 526.032C475.858 529.242 476.171 532.841 475.584 536.093C475.02 539.218 473.557 542.36 471.03 544.558L470.782 544.768C464.649 549.813 457.357 551.275 450.539 549.253L450.374 548.488L449.867 549.039C442.989 546.756 437.146 541.072 433.549 533.058L394.044 445.036L408.68 712.507C408.831 715.276 408.112 717.983 406.66 720.099C405.26 722.14 402.952 723.888 399.984 723.995L399.695 724H315.012C312.063 724 309.72 722.373 308.257 720.393C306.793 718.411 306.008 715.864 306.008 713.226V534.968H293.992V713.226C293.992 715.864 293.208 718.411 291.744 720.393C290.281 722.373 287.938 724 284.988 724H200.306C197.199 724 194.787 722.206 193.341 720.099C191.89 717.983 191.17 715.276 191.321 712.507L205.992 444.344L166.178 533.058C162.581 541.072 156.738 546.756 149.86 549.039L149.353 548.487L149.188 549.253C142.369 551.275 135.078 549.813 128.944 544.768C126.265 542.563 124.725 539.319 124.143 536.093C123.556 532.841 123.869 529.242 125.31 526.032L217.927 319.671L218.191 319.093C223.712 307.201 233.04 299.508 243.53 297.975C247.168 296.693 251.002 296 254.965 296H345.036Z" stroke="${SKIN_SHADOW}" stroke-width="8" stroke-linejoin="bevel"/>
  <!-- Body fill -->
  <path d="M345.036 300C348.728 300 352.302 300.68 355.697 301.946C364.67 303.292 373.1 310.056 378.15 321.308L470.768 527.67C472.927 532.482 471.796 538.755 468.241 541.679C463.075 545.928 457.149 547.041 451.676 545.418C455.711 541.927 457.04 534.722 454.622 529.052L451.637 522.055C450.394 519.139 447.639 518.139 445.485 519.823C443.331 521.506 442.594 525.235 443.837 528.151L451.127 545.243C445.519 543.381 440.434 538.628 437.198 531.419L388.874 423.748L404.686 712.726C404.901 716.653 402.605 720 399.696 720H315.012C312.249 720 310.008 716.967 310.008 713.226V530.968H289.992V713.226C289.992 716.967 287.752 720 284.988 720H200.306C197.397 720 195.101 716.653 195.316 712.726L211.164 423.053L162.529 531.419C159.293 538.628 154.208 543.381 148.6 545.243L155.89 528.151C157.133 525.235 156.396 521.506 154.242 519.823C152.088 518.139 149.333 519.139 148.09 522.055L145.105 529.052C142.687 534.722 144.016 541.928 148.051 545.418C142.577 547.041 136.652 545.928 131.486 541.679C127.931 538.755 126.799 532.482 128.959 527.67L221.577 321.308C226.712 309.866 235.342 303.062 244.485 301.88C247.825 300.657 251.338 300 254.965 300H345.036Z" fill="${SKIN}"/>
  <!-- Waist -->
  <path d="M397.062 478L397.459 490.729L308.57 531H291.936L203.77 490.724L203.969 478H397.062Z" stroke="${SKIN_SHADOW}" stroke-width="4"/>
  `);
  fs.writeFileSync(path.join(ROOT, 'assets/bodies/adult-female-normal.svg'),
    wrapSvg(vb, bodyPaths));
  console.log('  -> assets/bodies/adult-female-normal.svg');

  // HEAD
  const headPaths = skinToGrayscale(`
  <path d="M191 158C176.641 158 165 169.641 165 184C165 198.359 176.641 210 191 210H217V158H191Z" fill="${SKIN}" stroke="${SKIN_SHADOW}" stroke-width="8"/>
  <path d="M410 158C424.36 158 436 169.641 436 184C436 198.359 424.36 210 410 210H384V158H410Z" fill="${SKIN}" stroke="${SKIN_SHADOW}" stroke-width="8"/>
  <path d="M325 76C371.392 76 409 113.608 409 160V200C409 246.392 371.392 284 325 284H275C228.608 284 191 246.392 191 200V160C191 113.608 228.608 76 275 76H325Z" fill="${SKIN}" stroke="${SKIN_SHADOW}" stroke-width="8"/>
  `);
  fs.writeFileSync(path.join(ROOT, 'assets/faces/shapes/face-round-adult.svg'),
    wrapSvg(vb, headPaths));
  console.log('  -> assets/faces/shapes/face-round-adult.svg');

  // Shoes (same as child)
  const shoesPaths = `
  <path d="M294 715C294 719.971 289.971 724 285 724L180 724C175.03 724 171 719.971 171 715L171 700C171 686.745 181.745 676 195 676L270 676L270.619 676.008C283.588 676.336 294 686.952 294 700L294 715Z" fill="#A3A3A3" stroke="#838282" stroke-width="8"/>
  <path d="M429 715C429 719.971 424.971 724 420 724L315 724C310.03 724 306 719.971 306 715L306 700C306 686.745 316.745 676 330 676L405 676L405.619 676.008C418.588 676.336 429 686.952 429 700L429 715Z" fill="#A3A3A3" stroke="#838282" stroke-width="8"/>
  `;
  fs.writeFileSync(path.join(ROOT, 'assets/clothing/shoes/sneakers-adult.svg'),
    wrapSvg(vb, shoesPaths));
  console.log('  -> assets/clothing/shoes/sneakers-adult.svg');
}

// Run
splitCrianca();
splitAdulto();
console.log('\nDone! Assets split into separate layers.');
console.log('Body/head parts are grayscale (white + gray) for skin tinting.');
console.log('Use dev mode to position and calibrate.');
