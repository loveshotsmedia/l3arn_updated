// scripts/check-glb-budget.mjs
import { NodeIO } from '@gltf-transform/core';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

// Spec §8.1 LOW-tier ship gates, applied per-asset as a conservative proxy
// (a single asset should never alone consume a large slice of the LOW budget).
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB per glb
const MAX_TRIANGLES = 150_000; // generous per-asset ceiling within the 500k scene budget

const MODELS_DIR = join(process.cwd(), 'packages/world-engine/public/models');

async function findGlbFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findGlbFiles(full)));
    } else if (entry.name.endsWith('.glb')) {
      files.push(full);
    }
  }
  return files;
}

function countTriangles(document) {
  let triangles = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices();
      const positions = primitive.getAttribute('POSITION');
      const count = indices ? indices.getCount() : positions ? positions.getCount() : 0;
      triangles += Math.floor(count / 3);
    }
  }
  return triangles;
}

async function main() {
  const files = await findGlbFiles(MODELS_DIR);
  if (files.length === 0) {
    console.log('[asset-gate] No .glb files found — nothing to check.');
    return;
  }

  const io = new NodeIO();
  let failed = false;

  for (const file of files) {
    const { size } = await stat(file);
    if (size > MAX_FILE_SIZE_BYTES) {
      console.error(`[asset-gate] FAIL ${file}: ${(size / 1024 / 1024).toFixed(2)}MB exceeds ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB budget`);
      failed = true;
    }

    const document = await io.read(file);
    const triangles = countTriangles(document);
    if (triangles > MAX_TRIANGLES) {
      console.error(`[asset-gate] FAIL ${file}: ${triangles} triangles exceeds ${MAX_TRIANGLES} budget`);
      failed = true;
    } else {
      console.log(`[asset-gate] OK ${file}: ${(size / 1024).toFixed(0)}KB, ${triangles} triangles`);
    }
  }

  if (failed) {
    process.exit(1);
  }
}

main();
