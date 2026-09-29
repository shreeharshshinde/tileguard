/**
 * Task 1.3 — Geometry-Type Split on 170 Cat B1 Crossings
 *
 * Reads the 619-ring self-intersection dataset from EXP-003 and isolates
 * the 170 Cat B1 genuine crossings (sharedVertex === false), then splits
 * them by OGC geometry type (Polygon vs LineString).
 *
 * Under OGC Simple Features:
 *   - A self-crossing Polygon ring is INVALID (breaks planar partitioning
 *     and earcut triangulation). True defect.
 *   - A self-crossing LineString is NON-SIMPLE but still VALID. Optional
 *     diagnostic — the rule fires, but OGC does not classify this as invalid.
 *
 * Output: analysis/phase1-corpus/geometry-type-split.json
 *
 * Usage: node scripts/phase1-geometry-type-split.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Input ────────────────────────────────────────────────────────────────────
const RINGS_PATH = resolve(ROOT, 'analysis/phase2-self-intersection/self-intersection-rings.json');
const OUT_DIR    = resolve(ROOT, 'analysis/phase1-corpus');
const OUT_PATH   = resolve(OUT_DIR, 'geometry-type-split.json');

// ── Load data ────────────────────────────────────────────────────────────────
const allRings = JSON.parse(readFileSync(RINGS_PATH, 'utf8'));
console.log(`Total rings in EXP-003 dataset: ${allRings.length}`);

// ── Cat B1 isolation ─────────────────────────────────────────────────────────
// sharedVertex === false means the crossing pair shares no vertex endpoint,
// i.e. it is a genuine non-adjacent interior segment crossing.
// This matches the 170 remaining after all 4 guards in ADR-007.
const catB1 = allRings.filter(r => r.sharedVertex === false);
console.log(`Cat B1 (sharedVertex=false): ${catB1.length}`);

// ── Geometry-type split ───────────────────────────────────────────────────────
const polygonCrossings    = catB1.filter(r => r.geometryType === 'Polygon');
const lineStringCrossings = catB1.filter(r => r.geometryType === 'LineString');

console.log(`  Polygon (OGC invalid):    ${polygonCrossings.length}`);
console.log(`  LineString (OGC non-simple but valid): ${lineStringCrossings.length}`);

// ── Per-dataset breakdown ─────────────────────────────────────────────────────
const datasets = [...new Set(catB1.map(r => r.dataset))].sort();

const perDataset = {};
for (const ds of datasets) {
  const dsRings     = catB1.filter(r => r.dataset === ds);
  const dsPoly      = dsRings.filter(r => r.geometryType === 'Polygon');
  const dsLine      = dsRings.filter(r => r.geometryType === 'LineString');
  const layers      = [...new Set(dsRings.map(r => r.layer))].sort();
  const zoomLevels  = [...new Set(dsRings.map(r => r.tileZ))].sort((a, b) => a - b);

  perDataset[ds] = {
    total:      dsRings.length,
    polygon:    dsPoly.length,
    lineString: dsLine.length,
    layers,
    zoomLevels,
  };
}

// ── Layer breakdown for Polygon crossings ────────────────────────────────────
const polyByLayer = {};
for (const r of polygonCrossings) {
  const key = `${r.dataset}::${r.layer}`;
  polyByLayer[key] = (polyByLayer[key] || 0) + 1;
}

// ── Summary stats ────────────────────────────────────────────────────────────
const summary = {
  totalCatB1:         catB1.length,
  polygonCrossings:   polygonCrossings.length,
  lineStringCrossings: lineStringCrossings.length,
  polygonPct:         +((polygonCrossings.length / catB1.length) * 100).toFixed(2),
  lineStringPct:      +((lineStringCrossings.length / catB1.length) * 100).toFixed(2),
  ogcClassification: {
    polygon:    'INVALID under OGC Simple Features — breaks planar partitioning and earcut triangulation. Render impact untested until EXP-007.',
    lineString: 'NON-SIMPLE but valid under OGC Simple Features. Diagnostic is optional; not a structural defect.',
  },
};

// ── Output document ──────────────────────────────────────────────────────────
const output = {
  meta: {
    task:        '1.3',
    description: 'Geometry-type split on Cat B1 genuine crossings from EXP-003',
    generated:   new Date().toISOString(),
    inputFile:   'analysis/phase2-self-intersection/self-intersection-rings.json',
    outputFile:  'analysis/phase1-corpus/geometry-type-split.json',
    gapsClosed:  ['C1'],
    specReference: 'OGC Simple Features Access Part 1: Common Architecture (ISO 19125-1)',
  },
  catB1Definition: {
    field:    'sharedVertex',
    value:    false,
    meaning:  'Non-adjacent segment pair with no shared vertex endpoint — a genuine interior crossing.',
    totalMatchingRows: catB1.length,
  },
  summary,
  perDataset,
  polygonCrossingsByLayer: polyByLayer,
  headlineCorrection: {
    old: '170 self-intersections (geometry type unspecified)',
    new: `${polygonCrossings.length} Polygon crossings (OGC invalid, true defects) + ${lineStringCrossings.length} LineString crossings (OGC non-simple, valid — optional diagnostic)`,
    note: 'Render impact of Polygon crossings remains untested until EXP-007 (Phase 3).',
  },
};

// ── Write output ─────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
console.log(`\nOutput written to: ${OUT_PATH}`);

// ── Console report ───────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════');
console.log('  Task 1.3 — Geometry-Type Split Results');
console.log('═══════════════════════════════════════════════');
console.log(`  Total Cat B1 crossings:      ${catB1.length}`);
console.log(`  Polygon  (OGC invalid):      ${polygonCrossings.length}  (${summary.polygonPct}%)`);
console.log(`  LineString (OGC non-simple): ${lineStringCrossings.length}  (${summary.lineStringPct}%)`);
console.log('');
console.log('  Per-dataset breakdown:');
for (const [ds, info] of Object.entries(perDataset)) {
  console.log(`    ${ds}: ${info.total} total | Polygon: ${info.polygon} | LineString: ${info.lineString} | layers: ${info.layers.join(', ')}`);
}
console.log('');
console.log('  Polygon crossings by dataset::layer:');
for (const [key, count] of Object.entries(polyByLayer)) {
  console.log(`    ${key}: ${count}`);
}
console.log('═══════════════════════════════════════════════');
