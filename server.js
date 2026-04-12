const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;

// MIME types
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

// Build category ID → file path mapping by scanning data/ JSONs
function buildCategoryMap() {
  const map = {};
  const dirs = ['data/body-parts', 'data/accessories', 'data/clothing'];
  for (const dir of dirs) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    for (const file of fs.readdirSync(fullDir)) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(dir, file);
      try {
        const data = JSON.parse(fs.readFileSync(path.join(ROOT, filePath), 'utf8'));
        if (data.category) map[data.category] = filePath;
      } catch (e) { /* skip invalid */ }
    }
  }
  map['body-shapes'] = 'data/body-shapes.json';
  return map;
}

let categoryMap = buildCategoryMap();

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: List all JSON config files
  if (req.method === 'GET' && req.url === '/api/json') {
    const result = {};
    const dirs = ['data', 'data/body-parts', 'data/accessories', 'data/clothing'];
    for (const dir of dirs) {
      const fullDir = path.join(ROOT, dir);
      if (!fs.existsSync(fullDir)) continue;
      for (const file of fs.readdirSync(fullDir)) {
        if (!file.endsWith('.json')) continue;
        const filePath = path.join(dir, file);
        try {
          const data = JSON.parse(fs.readFileSync(path.join(ROOT, filePath), 'utf8'));
          result[filePath] = {
            category: data.category || file.replace('.json', ''),
            type: data.type || 'unknown',
            label: data.label || file,
            itemCount: data.items ? data.items.length : (data.shapes ? data.shapes.length : 0),
          };
        } catch (e) { /* skip */ }
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // API: Read a specific JSON config file
  if (req.method === 'GET' && req.url.startsWith('/api/json/')) {
    const relPath = decodeURIComponent(req.url.slice('/api/json/'.length));
    // Security: only allow reading from data/ directory
    const safePath = path.normalize(relPath);
    if (safePath.startsWith('..') || !safePath.startsWith('data')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Access denied' }));
      return;
    }
    const fullPath = path.join(ROOT, safePath);
    if (!fs.existsSync(fullPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    try {
      const data = fs.readFileSync(fullPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // API: Write a specific JSON config file directly
  if (req.method === 'PUT' && req.url.startsWith('/api/json/')) {
    const relPath = decodeURIComponent(req.url.slice('/api/json/'.length));
    const safePath = path.normalize(relPath);
    if (safePath.startsWith('..') || !safePath.startsWith('data')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Access denied' }));
      return;
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        // Validate JSON
        const data = JSON.parse(body);
        const fullPath = path.join(ROOT, safePath);
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n');
        categoryMap = buildCategoryMap();
        console.log(`  Saved: ${safePath}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, file: safePath }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // API: Save JSON configs (batch by category)
  if (req.method === 'POST' && req.url === '/api/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const files = JSON.parse(body);
        const saved = [];
        for (const [categoryId, data] of Object.entries(files)) {
          const filePath = categoryMap[categoryId];
          if (!filePath) {
            console.warn(`  No file mapping for category: ${categoryId}`);
            continue;
          }
          const fullPath = path.join(ROOT, filePath);
          fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n');
          saved.push(filePath);
          console.log(`  Saved: ${filePath}`);
        }
        // Rebuild map in case new categories were added
        categoryMap = buildCategoryMap();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, saved }));
      } catch (e) {
        console.error('Save error:', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // API: Save SVG asset file
  if (req.method === 'PUT' && req.url.startsWith('/api/svg/')) {
    const relPath = decodeURIComponent(req.url.slice('/api/svg/'.length));
    const safePath = path.normalize(relPath);
    // Only allow writing to assets/ directory
    if (safePath.startsWith('..') || !safePath.startsWith('assets')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Access denied' }));
      return;
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const fullPath = path.join(ROOT, safePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, body);
        console.log(`  Saved SVG: ${safePath}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, file: safePath }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // Static file serving
  let filePath = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
  filePath = path.join(ROOT, filePath);

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n  Dev server: http://localhost:${PORT}`);
  console.log(`  Admin:      http://localhost:${PORT}/dev.html\n`);
  console.log('  Category map:');
  for (const [cat, file] of Object.entries(categoryMap)) {
    console.log(`    ${cat} → ${file}`);
  }
  console.log('');
});
