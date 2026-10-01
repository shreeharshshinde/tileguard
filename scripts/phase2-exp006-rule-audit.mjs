/**
 * Task 2.3 — EXP-006: Diagnostic Classification for Remaining 10 Rules
 *
 * Runs the 10 rules NOT yet classified in EXP-002/EXP-003 against the full
 * 294-tile benchmark corpus (OpenMapTiles 94 + OpenFreeMap 100 + CARTO 100).
 *
 * Rules already classified:
 *   - tile/coordinate-range  (EXP-002)
 *   - tile/self-intersection (EXP-003 / EXP-003b)
 *
 * Rules evaluated here (14):
 *   tile/winding-order  tile/unclosed-ring  tile/zero-area-ring
 *   tile/hole-containment  tile/degenerate-geometry  tile/no-empty
 *   tile/required-layers  tile/required-properties
 *   tile/feature-count  tile/layer-feature-count
 *   perf/tile-size  perf/vertex-budget  perf/feature-density  perf/layer-size
 *
 * Output:
 *   analysis/phase2-rules/exp006-raw-diagnostics.json
 *   analysis/phase2-rules/exp006-sampled-classification.json
 *
 * Usage:
 *   node scripts/phase2-exp006-rule-audit.mjs
 */

import { createEngine } from '../packages/core/dist/index.js';
import { tilePlugin } from '../packages/tile-rules/dist/index.js';
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const CACHE_DIR = join(ROOT, 'fixtures', 'benchmark-cache');
const OUT_DIR   = join(ROOT, 'analysis', 'phase2-rules');

mkdirSync(OUT_DIR, { recursive: true });

// ── Reproducible seeded RNG (Mulberry32) ─────────────────────────────────────
const SEED = 20260930;
function mulberry32(seed) {
  let s = seed;
  return function () {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEED);

function seededSample(arr, n) {
  if (arr.length <= n) return [...arr];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// ── Datasets ──────────────────────────────────────────────────────────────────
const DATASETS = [
  { name: 'OpenMapTiles',  dir: join(CACHE_DIR, 'OpenMapTiles') },
  { name: 'OpenFreeMap',   dir: join(CACHE_DIR, 'OpenFreeMap') },
  { name: 'CARTO Streets', dir: join(CACHE_DIR, 'CARTO Streets') },
];

// ── Rules config (rules are set at engine creation time) ─────────────────────
// required-layers / required-properties need options — empty lists = 0 diags
// but confirms the rule runs without crashing.
// feature-count / layer-feature-count: no min/max → rule short-circuits → 0 diags (correct).
// perf/vertex-budget / perf/layer-size: no thresholds → short-circuits → 0 diags (correct).
const RULES_CONFIG = {
  'tile/winding-order':        'error',
  'tile/unclosed-ring':        'error',
  'tile/zero-area-ring':       'error',
  'tile/hole-containment':     'error',
  'tile/degenerate-geometry':  'error',
  'tile/no-empty':             'warning',
  'tile/required-layers':      ['error', { layers: [] }],
  'tile/required-properties':  ['error', { layers: {} }],
  'tile/feature-count':        ['warning', {}],
  'tile/layer-feature-count':  ['warning', { layers: {} }],
  'perf/tile-size':            'warning',
  'perf/vertex-budget':        'warning',
  'perf/feature-density':      'warning',
  'perf/layer-size':           'warning',
};

const TARGET_RULE_IDS = Object.keys(RULES_CONFIG);

// ── Engine (rules set at creation time, not per-run) ─────────────────────────
const silentReporter = { report() {} };

const engine = createEngine({
  plugins:  [tilePlugin],
  reporter: silentReporter,
  rules:    RULES_CONFIG,
});

// ── Storage ───────────────────────────────────────────────────────────────────
const rawByRule = {};
for (const id of TARGET_RULE_IDS) rawByRule[id] = [];

const perDatasetCounts = {};
for (const id of TARGET_RULE_IDS) {
  perDatasetCounts[id] = {};
  for (const ds of DATASETS) perDatasetCounts[id][ds.name] = 0;
}

let totalTilesRun = 0;
let totalErrors   = 0;

// ── Run corpus ────────────────────────────────────────────────────────────────
for (const ds of DATASETS) {
  const files = readdirSync(ds.dir).filter(f => f.endsWith('.pbf'));
  console.log(`\n── ${ds.name}: ${files.length} tiles ──`);

  for (const file of files) {
    const tilePath = join(ds.dir, file);
    const [z, x, y] = file.replace('.pbf', '').split('-').map(Number);

    let result;
    try {
      result = await engine.run([tilePath]);
    } catch (err) {
      totalErrors++;
      console.error(`  ERROR ${file}: ${err.message}`);
      continue;
    }
    totalTilesRun++;

    for (const diag of result.diagnostics) {
      if (!TARGET_RULE_IDS.includes(diag.ruleId)) continue;
      rawByRule[diag.ruleId].push({
        dataset:    ds.name,
        tile:       `${z}/${x}/${y}`,
        file,
        ruleId:     diag.ruleId,
        severity:   diag.severity,
        message:    diag.message,
        layer:      diag.location?.layer        ?? null,
        featureIdx: diag.location?.featureIndex ?? null,
        partIdx:    diag.location?.partIndex    ?? null,
        taxonomyLabel: null,
        reviewerNote:  null,
      });
      perDatasetCounts[diag.ruleId][ds.name]++;
    }
  }
}

// ── Print summary ─────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log('  EXP-006 — Diagnostic Counts (per rule, per dataset)');
console.log('════════════════════════════════════════════════════════════════');

const summaryRows = [];
for (const ruleId of TARGET_RULE_IDS) {
  const c     = perDatasetCounts[ruleId];
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  console.log(
    `  ${ruleId.padEnd(36)} ` +
    `OMT:${String(c['OpenMapTiles']).padStart(5)}  ` +
    `OFM:${String(c['OpenFreeMap']).padStart(5)}  ` +
    `CARTO:${String(c['CARTO Streets']).padStart(5)}  ` +
    `TOTAL:${total}`
  );
  summaryRows.push({
    ruleId,
    openMapTiles: c['OpenMapTiles'],
    openFreeMap:  c['OpenFreeMap'],
    cartoStreets: c['CARTO Streets'],
    total,
  });
}

console.log('────────────────────────────────────────────────────────────────');
console.log(`  Tiles run: ${totalTilesRun}  |  Errors: ${totalErrors}`);
console.log('════════════════════════════════════════════════════════════════');

// ── Write raw diagnostics ─────────────────────────────────────────────────────
const rawOutput = {
  meta: {
    experiment:     'EXP-006',
    task:           '2.3',
    generated:      new Date().toISOString(),
    seed:           SEED,
    tilesRun:       totalTilesRun,
    errors:         totalErrors,
    rulesEvaluated: TARGET_RULE_IDS,
    datasets:       DATASETS.map(d => d.name),
    excludedRules:  ['tile/coordinate-range', 'tile/self-intersection'],
    note:           'tile/required-layers and tile/required-properties use empty options — structural run only. tile/feature-count and tile/layer-feature-count use no bounds — short-circuits to 0 diagnostics, confirms structural correctness. perf/vertex-budget and perf/layer-size use no thresholds — short-circuits to 0 diagnostics.',
  },
  summaryTable:      summaryRows,
  diagnosticsByRule: rawByRule,
};

const rawPath = join(OUT_DIR, 'exp006-raw-diagnostics.json');
writeFileSync(rawPath, JSON.stringify(rawOutput, null, 2));
console.log(`\nRaw diagnostics  →  ${rawPath}`);

// ── Stratified sample (up to 100 per rule, seeded) ───────────────────────────
const SAMPLE_N = 100;
const sampledByRule = {};

for (const ruleId of TARGET_RULE_IDS) {
  const sample = seededSample(rawByRule[ruleId], SAMPLE_N);
  sampledByRule[ruleId] = sample.map((d, i) => ({ sampleIdx: i, ...d }));
}

const sampledOutput = {
  meta: {
    experiment:      'EXP-006',
    task:            '2.3',
    generated:       new Date().toISOString(),
    seed:            SEED,
    sampleN:         SAMPLE_N,
    primaryReviewer: 'Shreeharsh Shinde',
    secondReviewer:  "TBD — labels sampleIdx 0-14 per rule for Cohen's Kappa",
    taxonomyLabels: [
      'Checker Error',
      'Quantization Artifact',
      'Spec-Permitted Convention',
      'Genuine Defect',
    ],
    instructions:
      'Set taxonomyLabel to one of the four values above. Add reviewerNote. ' +
      "Second reviewer independently labels entries sampleIdx 0-14 per rule.",
  },
  sampledByRule,
};

const sampledPath = join(OUT_DIR, 'exp006-sampled-classification.json');
writeFileSync(sampledPath, JSON.stringify(sampledOutput, null, 2));
console.log(`Classification template  →  ${sampledPath}`);
