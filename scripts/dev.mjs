// Local development runner: emulates Vercel's /api/* serverless routing on
// port 3001 (Vite proxies to it) and starts the Vite dev server. Written by
// hand to avoid depending on the Vercel CLI or extra npm packages.

import http from 'node:http';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const API_PORT = 3001;

// Load .env / .env.local without the dotenv package.
for (const file of ['.env', '.env.local']) {
  const full = path.join(ROOT, file);
  if (!existsSync(full)) continue;
  for (const line of readFileSync(full, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const name = url.pathname.replace(/^\/api\//, '').replace(/\/+$/, '');
  const file = path.join(ROOT, 'api', `${name}.js`);
  if (!name || name.startsWith('_') || !existsSync(file)) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  try {
    const mod = await import(pathToFileURL(file).href);
    await mod.default(req, res);
  } catch (err) {
    console.error(`[api] ${req.method} ${req.url} failed:`, err);
    if (!res.headersSent) res.statusCode = 500;
    res.end('Internal error');
  }
});

server.listen(API_PORT, () => {
  console.log(`[api] serverless emulator on http://localhost:${API_PORT}`);
  if (!process.env.GNEWS_API_KEY) {
    console.log('[api] GNEWS_API_KEY not set — serving mock articles');
  }
});

const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });
vite.on('exit', (code) => process.exit(code ?? 0));
