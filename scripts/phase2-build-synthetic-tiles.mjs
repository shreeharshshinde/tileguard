/**
 * Task 2.2 — EXP-009: Synthetic Defect Injection & Metamorphic Testing
 *
 * Builds a reference set of synthetic PBF tiles with known ground truth:
 *
 *   TRUE POSITIVE (TP) set — tile/self-intersection MUST fire:
 *     tp-butterfly.pbf          Butterfly crossing: two triangles meeting at a point
 *     tp-hourglass.pbf          Hourglass polygon: ring crosses itself in the middle
 *     tp-crossing-hole.pbf      Self-crossing interior hole ring
 *
 *   TRUE NEGATIVE (TN) set — tile/self-intersection MUST NOT fire:
 *     tn-convex-square.pbf      Simple convex square, no crossings
 *     tn-valid-buffer.pbf       Valid ring with clipping buffer (+80 units outside extent)
 *     tn-quantization-spike.pbf Duplicate-adjacent-vertex (Cat A artifact, Guard 3 suppressed)
 *
 *   METAMORPHIC VARIANTS (for each TP/TN fixture):
 *     *-translated.pbf          MR1: all coordinates shifted by (+200, +150) within extent
 *     *-scaled.pbf              MR2: coordinates scaled by factor k=2 from centroid
 *
 * Metamorphic relations (scoped to geometry rules only):
 *   MR1 — Translation invariance: translating integer coords within [-80, extent+80]
 *          must NOT change self-intersection diagnostic outcomes.
 *   MR2 — Uniform scale invariance: scaling coords by constant k preserves
 *          topological self-intersection verdicts.
 *
 * After building tiles, runs TileGuard's tile/self-intersection rule on all
 * fixtures programmatically and computes:
 *   - Precision, Recall, F1 on the TP/TN set
 *   - Metamorphic Pass Rate (MR1 + MR2 separately)
 *
 * Output:
 *   fixtures/phase2-synthetic/   All synthetic .pbf files
 *   analysis/phase2-synthetic/synthetic-results.json
 *
 * Usage: node scripts/phase2-build-synthetic-tiles.mjs
 */

import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { createEngine } from '../packages/core/dist/index.js';
import { tilePlugin } from '../packages/tile-rules/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT       = resolve(__dirname, '..');
const OUT_DIR    = join(ROOT, 'fixtures', 'phase2-synthetic');
const RESULTS_DIR= join(ROOT, 'analysis', 'phase2-synthetic');

mkdirSync(OUT_DIR,     { recursive: true });
mkdirSync(RESULTS_DIR, { recursive: true });

// ── Raw MVT PBF encoder (reused from generate-synthetic-fixtures.mts) ─────────

function varint(value) {
  const bytes = [];
  let v = value >>> 0;
  while (v > 0x7f) { bytes.push((v & 0x7f) | 0x80); v >>>= 7; }
  bytes.push(v);
  return Buffer.from(bytes);
}
function zz(n) { return (n << 1) ^ (n >> 31); }
function concat(parts) { return Buffer.concat(parts); }
function fieldVarint(f, v) { return concat([varint((f << 3) | 0), varint(v)]); }
function fieldLd(f, data) { return concat([varint((f << 3) | 2), varint(data.length), data]); }
function packed(nums) { return concat(nums.map(varint)); }
function str(s) { return Buffer.from(s, 'utf8'); }

function encodeGeometry(rings) {
  let cx = 0, cy = 0;
  const cmds = [];
  for (const pts of rings) {
    if (pts.length === 0) continue;
    const first = pts[0];
    cmds.push((1 << 3) | 1, zz(first.x - cx), zz(first.y - cy));
    cx = first.x; cy = first.y;
    const last = pts[pts.length - 1];
    const closes = pts.length > 1 && last.x === first.x && last.y === first.y;
    const body = closes ? pts.slice(1, -1) : pts.slice(1);
    if (body.length > 0) {
      cmds.push((body.length << 3) | 2);
      for (const p of body) {
        cmds.push(zz(p.x - cx), zz(p.y - cy));
        cx = p.x; cy = p.y;
      }
    }
    if (closes) cmds.push((1 << 3) | 7);
  }
  return cmds;
}

function buildFeature(f, keys, vals) {
  const tags = [];
  for (const [k, v] of Object.entries(f.props)) {
    tags.push(keys.indexOf(k), vals.indexOf(String(v)));
  }
  const parts = [fieldLd(2, packed(tags)), fieldVarint(3, f.type), fieldLd(4, packed(encodeGeometry(f.points)))];
  if (f.id !== undefined) parts.unshift(fieldVarint(1, f.id));
  return concat(parts);
}

function buildLayer(desc) {
  const extent = desc.extent ?? 4096;
  const allProps = desc.features.flatMap(f => Object.entries(f.props));
  const keys = [...new Set(allProps.map(([k]) => k))];
  const vals = [...new Set(allProps.map(([, v]) => String(v)))];
  const parts = [fieldVarint(15, 2), fieldLd(1, str(desc.name)), fieldVarint(5, extent)];
  for (const f of desc.features) parts.push(fieldLd(2, buildFeature(f, keys, vals)));
  for (const k of keys) parts.push(fieldLd(3, str(k)));
  for (const v of vals) parts.push(fieldLd(4, concat([fieldLd(1, str(v))])));
  return concat(parts);
}

function buildTile(layers) {
  return concat(layers.map(l => fieldLd(3, buildLayer(l))));
}

function writePbf(name, layers) {
  const path = join(OUT_DIR, name);
  const data = buildTile(layers);
  writeFileSync(path, data);
  return path;
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

function translateRing(ring, dx, dy) {
  return ring.map(p => ({ x: p.x + dx, y: p.y + dy }));
}

function scaleRing(ring, k) {
  // Scale from centroid
  const cx = Math.round(ring.reduce((s, p) => s + p.x, 0) / ring.length);
  const cy = Math.round(ring.reduce((s, p) => s + p.y, 0) / ring.length);
  return ring.map(p => ({
    x: Math.round(cx + (p.x - cx) * k),
    y: Math.round(cy + (p.y - cy) * k),
  }));
}

function clampRing(ring, min = -80, max = 4096 + 80) {
  return ring.map(p => ({
    x: Math.max(min, Math.min(max, p.x)),
    y: Math.max(min, Math.min(max, p.y)),
  }));
}

function polyLayer(name, ring, props = { class: 'test' }) {
  return {
    name,
    features: [{ type: 3, points: [ring], props }],
  };
}

// ── Fixture definitions ───────────────────────────────────────────────────────
// All rings are in MVT tile coordinates (Y-down, origin top-left, extent=4096).
// Exterior rings are CW (SignedArea > 0 in Y-down = MVT spec-conformant).

const FIXTURES = {};

// ─── TRUE POSITIVE SET ────────────────────────────────────────────────────────

// TP1: Butterfly crossing (proper interior segment crossing — no shared vertex)
// The classic self-intersecting ring where two segments genuinely cross.
// Ring: bottom-left → top-right → top-left → bottom-right → back
// (500,2000)→(2500,500)→(500,500)→(2500,2000)→(500,2000)
// Segment (500,2000)→(2500,500) crosses segment (500,500)→(2500,2000) at (1500,1250).
// No shared vertex — a proper interior crossing, Guard 3 does NOT suppress this.
FIXTURES['tp-butterfly'] = [
  { x: 500,  y: 2000 },
  { x: 2500, y: 500  },
  { x: 500,  y: 500  },
  { x: 2500, y: 2000 },
  { x: 500,  y: 2000 }, // close
];

// TP2: Hourglass polygon
// Simple hourglass — ring goes top-left→top-right→bottom-left→bottom-right→back.
// (800,800)→(2200,800)→(800,2200)→(2200,2200)→(800,800)
// The segment (800,800)→(2200,800) and (800,2200)→(2200,2200) don't cross,
// but (2200,800)→(800,2200) and (2200,2200)→(800,800) DO cross at (1500,1500).
FIXTURES['tp-hourglass'] = [
  { x: 800,  y: 800  },
  { x: 2200, y: 800  },
  { x: 800,  y: 2200 },
  { x: 2200, y: 2200 },
  { x: 800,  y: 800  }, // close
];

// TP3: Self-crossing interior hole
// Outer ring is a valid large square.
// Inner hole ring crosses itself (butterfly shape).
// Outer: CW square (spec-conformant)
// Hole: CCW butterfly (hole in MVT convention = CCW)
// The self-intersection is in the hole ring.
const TP3_OUTER = [
  { x: 100,  y: 100  },
  { x: 3900, y: 100  },
  { x: 3900, y: 3900 },
  { x: 100,  y: 3900 },
  { x: 100,  y: 100  },
];
const TP3_HOLE = [
  { x: 1500, y: 1500 },
  { x: 1500, y: 2500 },
  { x: 2500, y: 1500 },
  { x: 2500, y: 2500 },
  { x: 1500, y: 1500 }, // crossing hole
];
FIXTURES['tp-crossing-hole-outer'] = TP3_OUTER;
FIXTURES['tp-crossing-hole-hole']  = TP3_HOLE;

// ─── TRUE NEGATIVE SET ────────────────────────────────────────────────────────

// TN1: Convex square — simple, no crossings
FIXTURES['tn-convex-square'] = [
  { x: 500,  y: 500  },
  { x: 2000, y: 500  },
  { x: 2000, y: 2000 },
  { x: 500,  y: 2000 },
  { x: 500,  y: 500  },
];

// TN2: Valid ring with clipping buffer (coordinates extend to -80 and 4176)
// This is deliberately outside tile extent but within buffer — should NOT fire self-intersection.
FIXTURES['tn-valid-buffer'] = [
  { x: -80,  y: -80  },
  { x: 4176, y: -80  },
  { x: 4176, y: 4176 },
  { x: -80,  y: 4176 },
  { x: -80,  y: -80  },
];

// TN3: Quantization spike — duplicate adjacent vertices (Cat A artifact)
// Two adjacent vertices at the same integer coordinate.
// Guard 3 suppresses this — should NOT fire after v0.5.2.
FIXTURES['tn-quantization-spike'] = [
  { x: 1000, y: 1000 },
  { x: 2000, y: 1000 },
  { x: 2000, y: 1000 }, // duplicate — quantization spike
  { x: 2000, y: 2000 },
  { x: 1000, y: 2000 },
  { x: 1000, y: 1000 },
];

// ── Build all fixture PBF files ───────────────────────────────────────────────

const fixtureFiles = {};
const MR_DX = 200, MR_DY = 150, MR_K = 2;

function writeFixture(baseName, ring, isMultiRing = false, outerRing = null) {
  let layers;
  if (isMultiRing && outerRing) {
    // TP3: outer + hole
    layers = [{
      name: 'test',
      features: [{ type: 3, points: [outerRing, ring], props: { class: 'test' } }],
    }];
  } else {
    layers = [polyLayer('test', ring)];
  }

  // Base fixture
  const basePath = writePbf(`${baseName}.pbf`, layers);
  fixtureFiles[baseName] = { path: basePath, ring };

  // MR1: translated variant
  let translatedLayers;
  if (isMultiRing && outerRing) {
    translatedLayers = [{
      name: 'test',
      features: [{ type: 3, points: [translateRing(outerRing, MR_DX, MR_DY), translateRing(ring, MR_DX, MR_DY)], props: { class: 'test' } }],
    }];
  } else {
    translatedLayers = [polyLayer('test', translateRing(ring, MR_DX, MR_DY))];
  }
  const translatedPath = writePbf(`${baseName}-translated.pbf`, translatedLayers);
  fixtureFiles[`${baseName}-translated`] = { path: translatedPath, ring: translateRing(ring, MR_DX, MR_DY) };

  // MR2: scaled variant
  let scaledLayers;
  if (isMultiRing && outerRing) {
    const scaledOuter = clampRing(scaleRing(outerRing, MR_K));
    const scaledHole  = clampRing(scaleRing(ring, MR_K));
    scaledLayers = [{
      name: 'test',
      features: [{ type: 3, points: [scaledOuter, scaledHole], props: { class: 'test' } }],
    }];
  } else {
    scaledLayers = [polyLayer('test', clampRing(scaleRing(ring, MR_K)))];
  }
  const scaledPath = writePbf(`${baseName}-scaled.pbf`, scaledLayers);
  fixtureFiles[`${baseName}-scaled`] = { path: scaledPath, ring: clampRing(scaleRing(ring, MR_K)) };

  return basePath;
}

console.log('Building Phase 2 synthetic fixtures...\n');
console.log('TRUE POSITIVE set (tile/self-intersection MUST fire):');
writeFixture('tp-butterfly', FIXTURES['tp-butterfly']);
console.log('  tp-butterfly.pbf + metamorphic variants');
writeFixture('tp-hourglass', FIXTURES['tp-hourglass']);
console.log('  tp-hourglass.pbf + metamorphic variants');
writeFixture('tp-crossing-hole', FIXTURES['tp-crossing-hole-hole'], true, FIXTURES['tp-crossing-hole-outer']);
console.log('  tp-crossing-hole.pbf + metamorphic variants');

console.log('\nTRUE NEGATIVE set (tile/self-intersection MUST NOT fire):');
writeFixture('tn-convex-square', FIXTURES['tn-convex-square']);
console.log('  tn-convex-square.pbf + metamorphic variants');
writeFixture('tn-valid-buffer', FIXTURES['tn-valid-buffer']);
console.log('  tn-valid-buffer.pbf + metamorphic variants');
writeFixture('tn-quantization-spike', FIXTURES['tn-quantization-spike']);
console.log('  tn-quantization-spike.pbf + metamorphic variants');

// ── Run TileGuard on all fixtures ─────────────────────────────────────────────

console.log('\nRunning TileGuard tile/self-intersection on all fixtures...\n');

const engine = createEngine({
  plugins: [tilePlugin],
  rules: {
    'tile/self-intersection': 'error',
    'tile/winding-order': 'error',
    'tile/zero-area-ring': 'error',
    // All other rules off to isolate geometry results
    'tile/coordinate-range': 'off',
    'tile/required-layers': 'off',
    'tile/no-empty': 'off',
    'tile/degenerate-geometry': 'off',
    'tile/unclosed-ring': 'off',
    'tile/hole-containment': 'off',
    'tile/feature-count': 'off',
    'tile/layer-feature-count': 'off',
    'tile/required-properties': 'off',
  },
});

// Expected outcomes per fixture
const EXPECTED = {
  'tp-butterfly':            { selfIntersection: true,  label: 'TP' },
  'tp-butterfly-translated': { selfIntersection: true,  label: 'TP' },
  'tp-butterfly-scaled':     { selfIntersection: true,  label: 'TP' },
  'tp-hourglass':            { selfIntersection: true,  label: 'TP' },
  'tp-hourglass-translated': { selfIntersection: true,  label: 'TP' },
  'tp-hourglass-scaled':     { selfIntersection: true,  label: 'TP' },
  'tp-crossing-hole':        { selfIntersection: true,  label: 'TP' },
  'tp-crossing-hole-translated': { selfIntersection: true,  label: 'TP' },
  'tp-crossing-hole-scaled': { selfIntersection: true,  label: 'TP' },
  'tn-convex-square':        { selfIntersection: false, label: 'TN' },
  'tn-convex-square-translated': { selfIntersection: false, label: 'TN' },
  'tn-convex-square-scaled': { selfIntersection: false, label: 'TN' },
  'tn-valid-buffer':         { selfIntersection: false, label: 'TN' },
  'tn-valid-buffer-translated': { selfIntersection: false, label: 'TN' },
  'tn-valid-buffer-scaled':  { selfIntersection: false, label: 'TN' },
  'tn-quantization-spike':   { selfIntersection: false, label: 'TN' },
  'tn-quantization-spike-translated': { selfIntersection: false, label: 'TN' },
  'tn-quantization-spike-scaled': { selfIntersection: false, label: 'TN' },
};

const results = {};

for (const [name, info] of Object.entries(fixtureFiles)) {
  const engineResult = await engine.run([info.path]);
  const selfIntersectionFired = engineResult.diagnostics.some(
    d => d.ruleId === 'tile/self-intersection',
  );
  const expected = EXPECTED[name];
  const correct  = expected ? selfIntersectionFired === expected.selfIntersection : null;

  results[name] = {
    path:                  info.path.replace(ROOT + '/', ''),
    label:                 expected?.label ?? '?',
    expected_intersection: expected?.selfIntersection ?? null,
    got_intersection:      selfIntersectionFired,
    correct,
    diagnostics:           engineResult.diagnostics.map(d => ({ ruleId: d.ruleId, message: d.message })),
  };

  const icon = correct === null ? '?' : correct ? '✓' : '✗';
  const tag  = selfIntersectionFired ? 'FIRES' : 'silent';
  console.log(`  ${icon} ${name.padEnd(35)} [${tag}]${!correct ? ' ← UNEXPECTED' : ''}`);
}

// ── Compute metrics ───────────────────────────────────────────────────────────

// Base fixtures (no metamorphic suffix)
const baseFixtures = Object.entries(results).filter(([n]) => !n.endsWith('-translated') && !n.endsWith('-scaled'));
const tpBase = baseFixtures.filter(([, r]) => r.label === 'TP');
const tnBase = baseFixtures.filter(([, r]) => r.label === 'TN');

const tp = tpBase.filter(([, r]) => r.got_intersection).length;   // true positive
const fn = tpBase.filter(([, r]) => !r.got_intersection).length;  // false negative
const tn = tnBase.filter(([, r]) => !r.got_intersection).length;  // true negative
const fp = tnBase.filter(([, r]) => r.got_intersection).length;   // false positive

const precision = tp + fp > 0 ? tp / (tp + fp) : null;
const recall    = tp + fn > 0 ? tp / (tp + fn) : null;
const f1        = precision !== null && recall !== null && (precision + recall) > 0
  ? 2 * (precision * recall) / (precision + recall)
  : null;

// Metamorphic pass rates
function mrPass(suffix) {
  const variants = Object.entries(results).filter(([n]) => n.endsWith(suffix));
  const passing  = variants.filter(([n, r]) => {
    const baseName = n.replace(suffix, '');
    const base = results[baseName];
    return base && r.got_intersection === base.got_intersection;
  });
  return { total: variants.length, pass: passing.length, rate: variants.length > 0 ? passing.length / variants.length : null };
}

const mr1 = mrPass('-translated');
const mr2 = mrPass('-scaled');

// ── Output ────────────────────────────────────────────────────────────────────

const output = {
  meta: {
    task:        '2.2',
    experiment:  'EXP-009',
    description: 'Synthetic defect injection + metamorphic testing for tile/self-intersection',
    generated:   new Date().toISOString(),
    gapsClosed:  ['C3'],
    encoder:     'Raw MVT PBF encoder (scripts/phase2-build-synthetic-tiles.mjs) — no vt-pbf dependency',
    tileguardVersion: '0.6.0',
  },
  fixtureDesign: {
    tpSet: {
      fixtures: ['tp-butterfly', 'tp-hourglass', 'tp-crossing-hole'],
      description: 'Polygon rings with known genuine self-intersections. TileGuard MUST flag all.',
    },
    tnSet: {
      fixtures: ['tn-convex-square', 'tn-valid-buffer', 'tn-quantization-spike'],
      description: 'Valid polygon rings or suppressed artifacts. TileGuard MUST NOT flag these.',
    },
    metamorphicRelations: {
      MR1: { description: 'Translation invariance — shift all coords by (+200,+150)', suffix: '-translated', dx: MR_DX, dy: MR_DY },
      MR2: { description: 'Uniform scale invariance — scale coords by k=2 from centroid', suffix: '-scaled', k: MR_K },
    },
  },
  perFixture: results,
  metrics: {
    baseSet: {
      TP: tp, FN: fn, TN: tn, FP: fp,
      precision: precision !== null ? +precision.toFixed(4) : null,
      recall:    recall    !== null ? +recall.toFixed(4)    : null,
      f1:        f1        !== null ? +f1.toFixed(4)        : null,
    },
    metamorphic: {
      MR1_translation: { ...mr1, passRate: mr1.rate !== null ? +mr1.rate.toFixed(4) : null },
      MR2_scale:       { ...mr2, passRate: mr2.rate !== null ? +mr2.rate.toFixed(4) : null },
    },
  },
  completionCriteria: {
    zeroFalseNegatives:         fn === 0,
    mr1PassRate100pct:          mr1.rate === 1.0,
    mr2PassRate100pct:          mr2.rate === 1.0,
    overallPass:                fn === 0 && mr1.rate === 1.0 && mr2.rate === 1.0,
  },
};

writeFileSync(join(RESULTS_DIR, 'synthetic-results.json'), JSON.stringify(output, null, 2));

console.log(`\n${'═'.repeat(60)}`);
console.log('  EXP-009 Results');
console.log('═'.repeat(60));
console.log(`  Base set   — TP: ${tp}  FN: ${fn}  TN: ${tn}  FP: ${fp}`);
console.log(`  Precision: ${precision !== null ? (precision * 100).toFixed(1) + '%' : 'n/a'}  Recall: ${recall !== null ? (recall * 100).toFixed(1) + '%' : 'n/a'}  F1: ${f1 !== null ? f1.toFixed(4) : 'n/a'}`);
console.log(`  MR1 (translation): ${mr1.pass}/${mr1.total} pass  (${mr1.rate !== null ? (mr1.rate*100).toFixed(0) : '?'}%)`);
console.log(`  MR2 (scale):       ${mr2.pass}/${mr2.total} pass  (${mr2.rate !== null ? (mr2.rate*100).toFixed(0) : '?'}%)`);
console.log('');
console.log('  Completion criteria:');
console.log(`    Zero false negatives:  ${fn === 0 ? '✓ PASS' : '✗ FAIL — ' + fn + ' FN'}`);
console.log(`    MR1 pass rate 100%:    ${mr1.rate === 1.0 ? '✓ PASS' : '✗ FAIL — ' + mr1.pass + '/' + mr1.total}`);
console.log(`    MR2 pass rate 100%:    ${mr2.rate === 1.0 ? '✓ PASS' : '✗ FAIL — ' + mr2.pass + '/' + mr2.total}`);
console.log(`    Overall:               ${output.completionCriteria.overallPass ? '✓ PASS' : '✗ NEEDS ATTENTION'}`);
console.log('═'.repeat(60));
console.log(`\nOutput: analysis/phase2-synthetic/synthetic-results.json`);
