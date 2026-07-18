import { createEngine } from '../packages/core/dist/index.js';
import { tilePlugin } from '../packages/tile-rules/dist/index.js';

// Define the tile list (85 tiles from z0-z3, plus 15 high-zoom urban tiles for Tokyo/Manhattan)
const baseTiles = [];
for (let z = 0; z <= 3; z++) {
  const limit = 2 ** z;
  for (let x = 0; x < limit; x++) {
    for (let y = 0; y < limit; y++) {
      baseTiles.push({ z, x, y });
    }
  }
}

// Tokyo / Manhattan urban tiles (z4 to z14)
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

const allTiles = [...baseTiles, ...urbanTiles];

const datasets = [
  {
    name: 'OpenMapTiles (MapLibre Demo)',
    urlPattern: (z, x, y) => `https://demotiles.maplibre.org/tiles/${z}/${x}/${y}.pbf`,
  },
  {
    name: 'OpenFreeMap',
    urlPattern: (z, x, y) =>
      `https://tiles.openfreemap.org/planet/20260621_080001_pt/${z}/${x}/${y}.pbf`,
  },
  {
    name: 'CARTO Streets',
    urlPattern: (z, x, y) =>
      `https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/${z}/${x}/${y}.mvt`,
  },
];

async function runEvaluation() {
  console.log(`Starting real-world evaluation of ${allTiles.length} tiles per dataset...\n`);

  // Silence standard logger to clean script output
  const silentReporter = {
    report() {},
  };

  const engine = createEngine({
    plugins: [tilePlugin],
    reporter: silentReporter,
    rules: {
      'tile/coordinate-range': ['error', { buffer: 64 }],
      'tile/degenerate-geometry': 'error',
      'tile/unclosed-ring': 'error',
      'tile/zero-area-ring': 'error',
      'tile/self-intersection': 'error',
      'tile/no-empty': 'warning',
    },
  });

  const summaryTable = [];

  for (const dataset of datasets) {
    console.log(`Evaluating dataset: ${dataset.name}...`);
    let processed = 0;
    let failedFetches = 0;
    let totalDiagnostics = 0;
    const ruleDiagnostics = {};

    for (const tile of allTiles) {
      const url = dataset.urlPattern(tile.z, tile.x, tile.y);
      try {
        const result = await engine.run([url]);
        processed++;

        if (result.diagnostics.length > 0) {
          totalDiagnostics += result.diagnostics.length;
          for (const diag of result.diagnostics) {
            ruleDiagnostics[diag.ruleId] = (ruleDiagnostics[diag.ruleId] || 0) + 1;
          }
        }
      } catch (err) {
        // Safe skip for tiles that don't exist at high zoom levels for this dataset
        failedFetches++;
      }
    }

    console.log(`Finished ${dataset.name}:`);
    console.log(`  - Tiles Processed: ${processed}`);
    console.log(`  - Failed/Missing Tiles: ${failedFetches}`);
    console.log(`  - Total Diagnostics: ${totalDiagnostics}`);
    console.log(`  - Breakdown:`, JSON.stringify(ruleDiagnostics, null, 2));
    console.log('----------------------------------------\n');

    summaryTable.push({
      Dataset: dataset.name,
      Tiles: processed,
      Diagnostics: totalDiagnostics,
      Breakdown: ruleDiagnostics,
    });
  }

  console.log('=== FINAL SUMMARY ===');
  console.table(summaryTable);
}

runEvaluation().catch((err) => {
  console.error('Evaluation run failed:', err);
  process.exit(1);
});
