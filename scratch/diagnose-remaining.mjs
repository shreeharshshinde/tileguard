import { createEngine } from '../packages/core/dist/index.js';
import { tilePlugin } from '../packages/tile-rules/dist/index.js';

const allTiles = [];
// Let's use the urbanTiles from evaluate-real-world.mjs or just the same logic to locate one tile with coordinate-range issues.
const baseTiles = [];
for (let z = 0; z <= 3; z++) {
  const limit = 2 ** z;
  for (let x = 0; x < limit; x++) {
    for (let y = 0; y < limit; y++) {
      baseTiles.push({ z, x, y });
    }
  }
}
const urbanTiles = [
  { z: 4, x: 14, y: 7 },
  { z: 5, x: 28, y: 14 },
  { z: 6, x: 56, y: 28 },
  { z: 7, x: 113, y: 57 },
  { z: 8, x: 227, y: 114 },
  { z: 9, x: 454, y: 228 },
  { z: 10, x: 909, y: 457 },
  { z: 11, x: 1818, y: 915 },
  { z: 12, x: 3637, y: 1830 },
  { z: 13, x: 7275, y: 3661 },
  { z: 14, x: 14551, y: 7322 },
  { z: 14, x: 4825, y: 6159 }, // Manhattan Core
  { z: 14, x: 4826, y: 6159 },
  { z: 14, x: 4825, y: 6160 },
  { z: 14, x: 4826, y: 6160 },
];
const tiles = [...baseTiles, ...urbanTiles];

const engine = createEngine({
  plugins: [tilePlugin],
  rules: {
    'tile/coordinate-range': 'error',
  },
});

const urlPattern = (z, x, y) =>
  `https://tiles.openfreemap.org/planet/20260621_080001_pt/${z}/${x}/${y}.pbf`;

async function main() {
  const issues = [];
  for (const t of tiles) {
    const url = urlPattern(t.z, t.x, t.y);
    try {
      const result = await engine.run([url]);
      for (const diag of result.diagnostics) {
        if (diag.ruleId === 'tile/coordinate-range') {
          issues.push({
            tile: `${t.z}/${t.x}/${t.y}`,
            layer: diag.location.layer,
            message: diag.message,
            point: diag.data?.point,
            buffer: diag.data?.buffer,
            extent: diag.data?.extent,
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }

  console.log(`Found ${issues.length} coordinate-range issues.`);
  // Group by layer name
  const byLayer = {};
  for (const issue of issues) {
    byLayer[issue.layer] = (byLayer[issue.layer] || 0) + 1;
  }
  console.log('Issues by layer:', byLayer);
  console.log('Sample issues:', issues.slice(0, 10));
}

main().catch(console.error);
