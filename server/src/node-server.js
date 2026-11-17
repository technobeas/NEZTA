import { serve } from '@hono/node-server';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Tiny .env loader so the API can run without extra tooling. */
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const contents = readFileSync(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(resolve(__dirname, '../.env'));
loadEnvFile(resolve(__dirname, '../../.env'));

const app = createApp();
const port = Number(process.env.PORT) || 8787;

serve(
  {
    fetch: (request) => app.fetch(request, process.env),
    port,
    hostname: '127.0.0.1',
  },
  (info) => {
    console.log(`[nezta-api] listening on http://127.0.0.1:${info.port} (demo mode)`);
  },
);
