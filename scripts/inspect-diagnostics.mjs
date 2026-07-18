import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createEngine } from '../packages/core/dist/index.js';
import { tilePlugin } from '../packages/tile-rules/dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '..', 'fixtures', 'benchmark-cache');

const DATASETS = [
  {
    name: 'OpenMapTiles',
    urlPattern: (z, x, y) => `https://demotiles.maplibre.org/tiles/${z}/${x}/${y}.pbf`,
    tile: { z: 1, x: 0, y: 0 },
  },
  {
    name: 'OpenFreeMap',
    urlPattern: (z, x, y) =>
      `https://tiles.openfreemap.org/planet/20260621_080001_pt/${z}/${x}/${y}.pbf`,
    tile: { z: 1, x: 0, y: 0 },
  },
  {
    name: 'CARTO Streets',
    urlPattern: (z, x, y) =>
      `https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/${z}/${x}/${y}.mvt`,
    tile: { z: 1, x: 0, y: 0 },
  },
];

async function inspect() {
  const engine = createEngine({
    plugins: [tilePlugin],
    rules: {
      'tile/coordinate-range': ['error', { buffer: 64 }],
      'tile/degenerate-geometry': 'error',
      'tile/unclosed-ring': 'error',
      'tile/zero-area-ring': 'error',
      'tile/self-intersection': 'error',
      'tile/no-empty': 'warning',
    },
  });

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  for (const ds of DATASETS) {
    const dir = path.join(CACHE_DIR, ds.name);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const t = ds.tile;
    const filename = `${t.z}-${t.x}-${t.y}.pbf`;
    const filepath = path.join(dir, filename);

    if (!fs.existsSync(filepath) || fs.statSync(filepath).size === 0) {
      const url = ds.urlPattern(t.z, t.x, t.y);
      console.log(`Downloading ${url} for inspection...`);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const buf = await res.arrayBuffer();
      fs.writeFileSync(filepath, Buffer.from(buf));
    }

    console.log(`\n=== Diagnostics for ${ds.name} (File: ${path.basename(filepath)}) ===`);
    const result = await engine.run([filepath]);
    console.log(`Total diagnostics found: ${result.diagnostics.length}`);

    // Print first 5 diagnostics
    const sample = result.diagnostics.slice(0, 5);
    console.log(JSON.stringify(sample, null, 2));
  }
}

inspect().catch(console.error);
