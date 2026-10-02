/**
 * Task 3.3 — EXP-008: Higher-Zoom Corpus Audit
 *
 * Runs all relevant tile rules on the 1,800 phase3 higher-zoom tiles
 * (z8 / z12 / z14) from OpenFreeMap and CARTO Streets, applies the
 * 4-way taxonomy to every diagnostic, and compares defect density
 * against the z0–z4 baseline from EXP-002/003.
 *
 * Input:
 *   fixtures/phase3-highzoom/**\/*.pbf
 *
 * Output:
 *   analysis/phase3-higher-zooms/higher-zooms-results.json
 *
 * Usage: node scripts/phase3-highzoom-audit.mjs
 */

import { createEngine }  from '../packages/core/dist/index.js';
import { tilePlugin }    from '../packages/tile-rules/dist/index.js';
import { readdirSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const TILE_ROOT = join(ROOT, 'fixtures', 'phase3-highzoom');
const OUT_DIR   = join(ROOT, 'analysis', 'phase3-higher-zooms');

mkdirSync(OUT_DIR, { recursive: true });

// ── Engine — same recommended rules as EXP-002/003/006 ───────────────────────
const engine = createEngine({
  plugins: [tilePlugin],
  rules: {
    'tile/coordinate-range':    ['error', { buffer: 80, excludeLayers: ['place', 'water_name', 'centroids', 'poi_label', 'place_label', 'transit_stop_label'] }],
    'tile/self-intersection':   'error',
    'tile/winding-order':       'error',
    'tile/unclosed-ring':       'error',
    'tile/zero-area-ring':      'error',
    'tile/hole-containment':    'error',
    'tile/degenerate-geometry': 'error',
    'tile/no-empty':            'off',
    'tile/required-layers':     'off',
    'tile/required-properties': 'off',
    'tile/feature-count':       'off',
    'tile/layer-feature-count': 'off',
    'perf/tile-size':           'off',
    'perf/vertex-budget':       'off',
    'perf/feature-density':     'off',
    'perf/layer-size':          'off',
  },
});

// ── 4-way taxonomy classifier ─────────────────────────────────────────────────
// Applies the same criteria as CLASSIFICATION_CRITERIA.md and EXP-002/003/006.
// All diagnostics on production tiles get one of four labels.
function classify(ruleId, diagnostic) {
  const { message, location } = diagnostic;
  const layer = location?.layer ?? '';

  switch (ruleId) {
    case 'tile/coordinate-range':
      // At higher zooms, label centroids are still Spec-Permitted; clipping buffer still Spec-Permitted
      return 'Spec-Permitted Convention';

    case 'tile/hole-containment':
      // MVT tile-boundary clipping causes holes to appear outside outer ring — same pattern as EXP-006
      return 'Spec-Permitted Convention';

    case 'tile/self-intersection': {
      // At higher zooms genuine polygon crossings are Genuine Defect;
      // vertex-touching suppressed by Guard 3 never reaches here (sharedVertex=true filtered by rule)
      // A small number may still be quantization artefacts at z14 (aggressive simplification)
      // Conservative: flag all as Genuine Defect — same as EXP-003 Cat B1 treatment
      return 'Genuine Defect';
    }

    case 'tile/winding-order':
      // Intra-feature winding inconsistency at higher zoom: likely pipeline artefact from simplification
      return 'Quantization Artifact';

    case 'tile/zero-area-ring':
      // At higher zooms, zero-area rings come from aggressive simplification collapsing small polygons
      return 'Quantization Artifact';

    case 'tile/unclosed-ring':
      return 'Genuine Defect';

    case 'tile/degenerate-geometry':
      // Collapsed geometry after simplification at high zoom
      return 'Quantization Artifact';

    default:
      return 'Genuine Defect';
  }
}

// ── Discover tiles ────────────────────────────────────────────────────────────
const PROVIDERS_ZOOMS = [];
for (const providerDir of readdirSync(TILE_ROOT)) {
  const provPath = join(TILE_ROOT, providerDir);
  if (!statSync(provPath).isDirectory()) continue;
  for (const zoomDir of readdirSync(provPath)) {
    const zoomPath = join(provPath, zoomDir);
    if (!statSync(zoomPath).isDirectory()) continue;
    const z = parseInt(zoomDir.replace('z', ''), 10);
    const files = readdirSync(zoomPath).filter(f => f.endsWith('.pbf'));
    PROVIDERS_ZOOMS.push({ provider: providerDir.replace('_', ' '), z, dir: zoomPath, files });
  }
}

// Sort: provider asc, zoom asc
PROVIDERS_ZOOMS.sort((a, b) => a.provider.localeCompare(b.provider) || a.z - b.z);

// ── Run audit ─────────────────────────────────────────────────────────────────
const results = [];

// Taxonomy tallies per provider+zoom
const tallies = {}; // key: `${provider}|z${z}` → { ruleId → { taxonomy → count } }

let totalTiles = 0;
let totalErrors = 0;

for (const { provider, z, dir, files } of PROVIDERS_ZOOMS) {
  const key = `${provider}|z${z}`;
  tallies[key] = {};

  let tileDiagCount = 0;
  let tileCount = 0;
  let tileErrors = 0;

  for (const file of files) {
    const tilePath = join(dir, file);
    const [tz, tx, ty] = file.replace('.pbf', '').split('-').map(Number);
    let result;
    try {
      result = await engine.run([tilePath]);
    } catch (err) {
      tileErrors++;
      continue;
    }
    tileCount++;

    for (const diag of result.diagnostics) {
      const taxonomy = classify(diag.ruleId, diag);
      if (!tallies[key][diag.ruleId]) tallies[key][diag.ruleId] = {};
      tallies[key][diag.ruleId][taxonomy] = (tallies[key][diag.ruleId][taxonomy] ?? 0) + 1;
      tileDiagCount++;

      results.push({
        provider,
        z,
        tile:       `${tz}/${tx}/${ty}`,
        ruleId:     diag.ruleId,
        severity:   diag.severity,
        layer:      diag.location?.layer ?? null,
        featureIdx: diag.location?.featureIndex ?? null,
        taxonomy,
        message:    diag.message,
      });
    }
  }

  totalTiles  += tileCount;
  totalErrors += tileErrors;
  console.log(`  ${provider} z${z}: ${tileCount} tiles, ${tileDiagCount} diagnostics  (${tileErrors} errors)`);
}

// ── Summary table ─────────────────────────────────────────────────────────────

// Taxonomy totals per provider+zoom
function taxTotals(tally) {
  const t = { 'Checker Error': 0, 'Quantization Artifact': 0, 'Spec-Permitted Convention': 0, 'Genuine Defect': 0 };
  for (const ruleCounts of Object.values(tally)) {
    for (const [tax, cnt] of Object.entries(ruleCounts)) {
      t[tax] = (t[tax] ?? 0) + cnt;
    }
  }
  t.total = Object.values(t).reduce((a, b) => a + b, 0);
  return t;
}

// Build comparison table
const zoomSummary = {};
for (const { provider, z, files } of PROVIDERS_ZOOMS) {
  const key = `${provider}|z${z}`;
  const tax = taxTotals(tallies[key]);
  const nTiles = files.length;
  const diagPerTile = nTiles > 0 ? +(tax.total / nTiles).toFixed(3) : 0;
  const genuinePerTile = nTiles > 0 ? +(tax['Genuine Defect'] / nTiles).toFixed(3) : 0;
  if (!zoomSummary[z]) zoomSummary[z] = {};
  zoomSummary[z][provider] = { nTiles, ...tax, diagPerTile, genuinePerTile };
}

// z0-z4 baselines from EXP-002/003/006
// EXP-006 totals: CE=288 QA=161 SP=148393 GD=154 across 294 tiles (all 3 providers)
// For 2-provider comparison use proportional estimate (OMT 94 tiles dropped → OFM 100 + CARTO 100 = 200 tiles)
// From EXP-003 by dataset:  OFM: 8 diags  CARTO: 8 diags
// From EXP-002 by dataset:  OFM: 223 coord-range  CARTO: 223 coord-range
// From EXP-006 hole-containment: 0 for OFM and CARTO
// Approximate per-tile baselines for OFM+CARTO only:
const Z04_BASELINE = {
  provider_note: "OFM+CARTO, z0-z4, 200 tiles (OMT excluded to match EXP-008 scope)",
  nTiles: 200,
  // SP from coord-range (OFM 223 + CARTO 223 = 446)
  // GD from self-intersection (OFM 8 + CARTO 8 = 16 Polygon crossings)
  'Spec-Permitted Convention': 446,
  'Genuine Defect': 16,
  'Quantization Artifact': 0,
  'Checker Error': 0,
  total: 462,
  diagPerTile: +(462 / 200).toFixed(3),
  genuinePerTile: +(16 / 200).toFixed(3),
};

// ── Print results ─────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log('  EXP-008 — Diagnostic Summary by Zoom Level');
console.log('════════════════════════════════════════════════════════════════');
console.log(`  ${'Provider+Zoom'.padEnd(32)} ${'Tiles'.padStart(6)} ${'Total'.padStart(7)} ${'GD'.padStart(5)} ${'QA'.padStart(5)} ${'SP'.padStart(7)} ${'CE'.padStart(5)} ${'diag/tile'.padStart(10)} ${'GD/tile'.padStart(8)}`);
console.log('  ' + '─'.repeat(85));

for (const z of [8, 12, 14]) {
  for (const [prov, s] of Object.entries(zoomSummary[z] ?? {})) {
    console.log(
      `  ${(prov + ' z' + z).padEnd(32)} ${String(s.nTiles).padStart(6)} ${String(s.total).padStart(7)} ${String(s['Genuine Defect']).padStart(5)} ${String(s['Quantization Artifact']).padStart(5)} ${String(s['Spec-Permitted Convention']).padStart(7)} ${String(s['Checker Error']).padStart(5)} ${String(s.diagPerTile).padStart(10)} ${String(s.genuinePerTile).padStart(8)}`
    );
  }
}

console.log('  ' + '─'.repeat(85));
console.log(
  `  ${'z0-z4 baseline (OFM+CARTO)'.padEnd(32)} ${String(Z04_BASELINE.nTiles).padStart(6)} ${String(Z04_BASELINE.total).padStart(7)} ${String(Z04_BASELINE['Genuine Defect']).padStart(5)} ${String(Z04_BASELINE['Quantization Artifact']).padStart(5)} ${String(Z04_BASELINE['Spec-Permitted Convention']).padStart(7)} ${String(Z04_BASELINE['Checker Error']).padStart(5)} ${String(Z04_BASELINE.diagPerTile).padStart(10)} ${String(Z04_BASELINE.genuinePerTile).padStart(8)}`
);
console.log('════════════════════════════════════════════════════════════════');
console.log(`  Total tiles run: ${totalTiles}  |  Errors: ${totalErrors}`);

// ── Write output ──────────────────────────────────────────────────────────────
const output = {
  meta: {
    task:        '3.3',
    experiment:  'EXP-008',
    description: 'Higher-zoom corpus (z8/z12/z14) benchmark — defect density vs z0-z4 baseline',
    generated:   new Date().toISOString(),
    gapsClosed:  ['D2'],
    bbox: {
      z8_z12:  { lon: [139.0, 141.0], lat: [35.0, 37.0], size: '2°×2°' },
      z14:     { lon: [139.65, 139.90], lat: [35.50, 35.75], size: '0.25°×0.25°',
                 note: 'Full 2°×2° at z14 = 10,396 tiles/provider — impractical. Sub-region used.' },
    },
    providers:    ['OpenFreeMap (Planetiler)', 'CARTO Streets (proprietary)'],
    omt_note:    'OpenMapTiles (demotiles.maplibre.org) has maxzoom=6; cannot serve z8+. EXP-008 uses 2 of 3 providers.',
    tilesTotal:  totalTiles,
    tileErrors:  totalErrors,
    rulesEnabled: [
      'tile/coordinate-range (buffer=80)',
      'tile/self-intersection',
      'tile/winding-order',
      'tile/unclosed-ring',
      'tile/zero-area-ring',
      'tile/hole-containment',
      'tile/degenerate-geometry',
    ],
  },
  baseline_z04:  Z04_BASELINE,
  zoomSummary,
  talliesByProviderZoom: tallies,
  diagnostics:   results,
};

const outPath = join(OUT_DIR, 'higher-zooms-results.json');
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\nOutput: ${outPath}`);
