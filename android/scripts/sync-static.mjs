// Mirror android/dist -> server/kursor/static.
// Usage: npm run sync   (after npm run build)
// Removes stale hashed assets so the committed server copy always matches dist.
import { cpSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url)); // android/
const dist = path.join(root, 'dist');
const serverStatic = path.join(root, '..', 'server', 'kursor', 'static');

if (!existsSync(dist)) {
  console.error('[sync] android/dist not found - run "npm run build" first.');
  process.exit(1);
}

// Copy everything (index.html, manifest.json, sw.js, icons, assets/)
cpSync(dist, serverStatic, { recursive: true });

// Prune hashed assets in static/ that no longer exist in dist/
const distAssets = path.join(dist, 'assets');
const staticAssets = path.join(serverStatic, 'assets');
const distFiles = new Set(readdirSync(distAssets));
for (const f of readdirSync(staticAssets)) {
  if (!distFiles.has(f)) {
    rmSync(path.join(staticAssets, f));
    console.log('[sync] removed stale asset:', f);
  }
}

console.log('[sync] static assets synced to server/kursor/static');
