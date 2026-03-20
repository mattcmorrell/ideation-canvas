#!/usr/bin/env node

/**
 * Mockup Canvas — Lightweight infinite canvas for HTML mockup review
 *
 * Usage:
 *   ideation-canvas [directory] [port]   Start the canvas server
 *   ideation-canvas setup                Install the /canvas skill for Claude Code
 *
 * Zero dependencies. Requires Node 18+.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ── Setup command ───────────────────────────────────────────────────
if (process.argv[2] === 'setup') {
  const skillDir = path.join(process.env.HOME, '.claude', 'skills', 'canvas');
  const skillSrc = path.join(__dirname, 'skill', 'SKILL.md');

  if (!fs.existsSync(skillSrc)) {
    console.error('Error: skill/SKILL.md not found. Run from the ideation-canvas directory.');
    process.exit(1);
  }

  fs.mkdirSync(skillDir, { recursive: true });
  fs.copyFileSync(skillSrc, path.join(skillDir, 'SKILL.md'));

  console.log('');
  console.log('  Ideation Canvas — Setup complete');
  console.log('  ─────────────────────────────────');
  console.log(`  ✓ Installed /canvas skill to ${skillDir}`);
  console.log('');
  console.log('  Open Claude Code in any project and type:');
  console.log('');
  console.log('    /canvas');
  console.log('');
  console.log('  Then ask Claude to make mockups. They\'ll appear on the canvas.');
  console.log('');
  process.exit(0);
}

// ── Config ──────────────────────────────────────────────────────────
const MOCKUP_DIR = path.resolve(process.argv[2] || '.');
const PORT = parseInt(process.argv[3]) || 3333;
const PUBLIC_DIR = path.join(__dirname, 'public');
const STATE_FILE = path.join(MOCKUP_DIR, '.canvas-state.json');

if (!fs.existsSync(MOCKUP_DIR) || !fs.statSync(MOCKUP_DIR).isDirectory()) {
  console.error(`Error: "${MOCKUP_DIR}" is not a valid directory.`);
  process.exit(1);
}

// ── MIME types ──────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html', '.htm': 'text/html',
  '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

// ── SSE clients ─────────────────────────────────────────────────────
const sseClients = new Set();

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    res.write(msg);
  }
}

// ── File discovery ──────────────────────────────────────────────────
function parseVersionInfo(filename) {
  const base = filename.replace(/\.html?$/i, '');
  const match = base.match(/^(.+?)[-_]v?(\d+)$/i);
  if (match) return { group: match[1], version: parseInt(match[2]) };
  return { group: null, version: null };
}

function parseTabs(html) {
  const tabs = [];
  const switcherMatch = html.match(/<div[^>]*class="[^"]*switcher[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (switcherMatch) {
    const btnRe = /<button[^>]*>(.*?)<\/button>/gi;
    let m;
    while ((m = btnRe.exec(switcherMatch[1])) !== null) {
      tabs.push(m[1].replace(/<[^>]*>/g, '').trim());
    }
  }
  return tabs;
}

function listHtmlFiles() {
  const files = [];
  try {
    const entries = fs.readdirSync(MOCKUP_DIR);
    for (const name of entries) {
      if (!/\.html?$/i.test(name)) continue;
      if (name.startsWith('.')) continue;
      const fullPath = path.join(MOCKUP_DIR, name);
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;
      const html = fs.readFileSync(fullPath, 'utf-8');
      const { group, version } = parseVersionInfo(name);
      files.push({
        name,
        size: stat.size,
        modified: stat.mtime.toISOString(),
        group,
        version,
        tabs: parseTabs(html),
      });
    }
  } catch (e) {
    console.error('Error scanning directory:', e.message);
  }
  files.sort((a, b) => {
    if (a.group && b.group && a.group === b.group) return (a.version || 0) - (b.version || 0);
    return a.name.localeCompare(b.name);
  });
  return files;
}

// ── State persistence ───────────────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch (e) {}
  return null;
}

function saveState(data) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving state:', e.message);
  }
}

// ── File watcher ────────────────────────────────────────────────────
let watchDebounce = null;
try {
  fs.watch(MOCKUP_DIR, (eventType, filename) => {
    if (!filename || !/\.html?$/i.test(filename)) return;
    clearTimeout(watchDebounce);
    watchDebounce = setTimeout(() => {
      broadcast('files-changed', { file: filename, event: eventType });
    }, 300);
  });
} catch (e) {
  console.error('Warning: file watching unavailable:', e.message);
}

// ── HTTP helpers ────────────────────────────────────────────────────
function sendJson(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime, 'Content-Length': content.length });
    res.end(content);
  } catch (e) {
    res.writeHead(404);
    res.end('Not found');
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function safePath(base, requested) {
  const resolved = path.resolve(base, requested);
  if (!resolved.startsWith(path.resolve(base))) return null;
  return resolved;
}

// ── Server ──────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(parsed.pathname);

  // CORS headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // ── API routes ──
  if (pathname === '/api/files') {
    return sendJson(res, listHtmlFiles());
  }

  if (pathname === '/api/state' && req.method === 'GET') {
    const state = loadState();
    return sendJson(res, state || {});
  }

  if (pathname === '/api/state' && req.method === 'POST') {
    try {
      const data = await readBody(req);
      saveState(data);
      return sendJson(res, { ok: true });
    } catch (e) {
      return sendJson(res, { error: e.message }, 400);
    }
  }

  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('data: connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // ── Mockup files (served from target directory) ──
  if (pathname.startsWith('/mockup/')) {
    const relPath = pathname.slice(8);
    const filePath = safePath(MOCKUP_DIR, relPath);
    if (!filePath) { res.writeHead(403); return res.end('Forbidden'); }
    return sendFile(res, filePath);
  }

  // ── Static files (canvas app) ──
  let staticPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = safePath(PUBLIC_DIR, staticPath.slice(1));
  if (!filePath) { res.writeHead(403); return res.end('Forbidden'); }
  return sendFile(res, filePath);
});

server.listen(PORT, () => {
  const files = listHtmlFiles();
  const dir = MOCKUP_DIR === process.cwd() ? '.' : MOCKUP_DIR;
  console.log('');
  console.log('  Mockup Canvas');
  console.log('  ─────────────────────────────────');
  console.log(`  Watching:  ${dir}`);
  console.log(`  Files:     ${files.length} HTML file${files.length !== 1 ? 's' : ''} found`);
  console.log(`  Canvas:    http://localhost:${PORT}`);
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('');

  // Open browser
  const openCmd = process.platform === 'darwin' ? 'open'
    : process.platform === 'win32' ? 'start'
    : 'xdg-open';
  exec(`${openCmd} http://localhost:${PORT}`);
});
