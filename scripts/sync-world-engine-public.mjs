import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const src = join(repoRoot, 'packages/world-engine/public');
const dest = join(repoRoot, 'apps/web/public');

if (!existsSync(src)) {
  console.log('[sync-world-engine-public] no packages/world-engine/public directory found, skipping');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`[sync-world-engine-public] copied ${src} -> ${dest}`);
