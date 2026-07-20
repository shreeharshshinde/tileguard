import { createEngine } from '../packages/core/dist/index.js';
import { tilePlugin } from '../packages/tile-rules/dist/index.js';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.split('=');
    return [key, value ?? true];
  }),
);
const mode = args.get('--mode') ?? 'after';
const jsonOutput = args.has('--json');

function buildRules() {
  const rules = {
    'tile/degenerate-geometry': 'error',
    'tile/unclosed-ring': 'error',
    'tile/zero-area-ring': 'error',
    'tile/self-intersection': 'error',
    'tile/no-empty': 'warning',
  };

  if (mode === 'legacy') {
    rules['tile/coordinate-range'] = ['error', { buffer: 0, excludeLayers: [] }];
  } else if (mode === 'after') {
    rules['tile/coordinate-range'] = 'error';
  } else if (mode !== 'disabled') {
    throw new Error(`Unknown evaluation mode: ${mode}`);
  }

  return rules;
}

function log(...parts) {
  if (!jsonOutput) console.log(...parts);
}

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
  log(`Starting real-world evaluation of ${allTiles.length} tiles per dataset...`);
  log(`Mode: ${mode}\n`);

  // Silence standard logger to clean script output
  const silentReporter = {
    report() {},
  };

  const engine = createEngine({
    plugins: [tilePlugin],
    reporter: silentReporter,
    rules: buildRules(),
  });

  const summaryTable = [];

  for (const dataset of datasets) {
    log(`Evaluating dataset: ${dataset.name}...`);
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
      } catch (_err) {
        // Safe skip for tiles that don't exist at high zoom levels for this dataset
        failedFetches++;
      }
    }

    log(`Finished ${dataset.name}:`);
    log(`  - Tiles Processed: ${processed}`);
    log(`  - Failed/Missing Tiles: ${failedFetches}`);
    log(`  - Total Diagnostics: ${totalDiagnostics}`);
    log(`  - Breakdown:`, JSON.stringify(ruleDiagnostics, null, 2));
    log('----------------------------------------\n');

    summaryTable.push({
      Dataset: dataset.name,
      Mode: mode,
      Tiles: processed,
      Failed: failedFetches,
      Diagnostics: totalDiagnostics,
      Breakdown: ruleDiagnostics,
    });
  }

  if (jsonOutput) {
    console.log(
      JSON.stringify({
        type: 'tileguard-real-world-evaluation',
        mode,
        timestamp: new Date().toISOString(),
        tilesPerDataset: allTiles.length,
        results: summaryTable,
      }),
    );
    return;
  }

  console.log('=== FINAL SUMMARY ===');
  console.table(summaryTable);
}

runEvaluation().catch((err) => {
  console.error('Evaluation run failed:', err);
  process.exit(1);
});
