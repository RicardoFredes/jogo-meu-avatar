#!/usr/bin/env node
/**
 * Inicia o dev server e abre o admin (dev.html) no browser.
 *
 * Usage:
 *   node scripts/open-admin.mjs          → abre admin.html (editor SVG/vetores)
 *   node scripts/open-admin.mjs --dev    → abre dev.html (editor visual de posicao)
 *   node scripts/open-admin.mjs --game   → abre index.html (jogo)
 */

import { spawn, exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 3000;

// Decide which page to open
const arg = process.argv[2] || '';
const pages = {
  '--dev': '/dev.html',
  '--game': '/index.html',
};
const page = pages[arg] || '/admin.html';
const url = `http://localhost:${PORT}${page}`;

// Platform-specific open command
function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open'
    : platform === 'win32' ? 'start'
    : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

// Check if server is already running
function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/`, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

async function main() {
  const running = await checkServer();

  if (running) {
    console.log(`\n  Servidor ja rodando em http://localhost:${PORT}`);
    console.log(`  Abrindo ${page}...\n`);
    openBrowser(url);
    return;
  }

  console.log(`\n  Iniciando servidor...`);
  const server = spawn('node', ['server.js'], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  // Wait for server to be ready
  let attempts = 0;
  const maxAttempts = 30;
  const check = setInterval(async () => {
    attempts++;
    const ready = await checkServer();
    if (ready) {
      clearInterval(check);
      console.log(`  Abrindo ${page}...\n`);
      openBrowser(url);
    } else if (attempts >= maxAttempts) {
      clearInterval(check);
      console.error('  Erro: servidor nao iniciou a tempo.');
      process.exit(1);
    }
  }, 300);

  server.on('close', (code) => {
    clearInterval(check);
    if (code !== 0) console.error(`  Servidor encerrou com codigo ${code}`);
  });

  // Forward SIGINT to gracefully stop
  process.on('SIGINT', () => {
    server.kill('SIGINT');
    process.exit(0);
  });
}

main();
