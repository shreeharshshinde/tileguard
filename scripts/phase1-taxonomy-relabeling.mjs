/**
 * Task 1.5 — 4-Way Taxonomy Relabeling of EXP-002 & EXP-003 Diagnostics
 *
 * Systematically assigns every diagnostic from EXP-002 (coordinate-range)
 * and EXP-003 (self-intersection) into one of four taxonomy categories:
 *
 *   1. Checker Error      — Caused by a bug or edge case in TileGuard itself.
 *   2. Quantization Artifact — Caused by floating-point → integer coordinate
 *                           snapping during tile compilation.
 *   3. Spec-Permitted Convention — Encoding choice permitted or recommended by
 *                           the MVT spec (e.g., clipping buffer, label centroids
 *                           outside tile extent).
 *   4. Genuine Defect     — True topological/structural defect in tile data.
 *
 * Sources:
 *   EXP-002: analysis/phase1-coordinate-range/classification.json
 *            (148,268 total diagnostics, fully classified in prior work)
 *   EXP-003: analysis/phase2-self-intersection/self-intersection-rings.json
 *            (619 rings, per-ring category from sharedVertex, hasDuplicateVertices,
 *             isCollinear, isTouchAtVertex fields)
 *
 * Output: analysis/phase1-corpus/exp002-exp003-taxonomy-relabeling.json
 *
 * Usage: node scripts/phase1-taxonomy-relabeling.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const OUT_DIR   = join(ROOT, 'analysis', 'phase1-corpus');
const OUT_PATH  = join(OUT_DIR, 'exp002-exp003-taxonomy-relabeling.json');

// ── Taxonomy category definitions ─────────────────────────────────────────────
const TAXONOMY = {
  CHECKER_ERROR: {
    id:          'checker_error',
    label:       'Checker Error',
    definition:  'Diagnostic caused by a rule bug or edge case in TileGuard itself. The tile data is valid; TileGuard incorrectly flags it.',
  },
  QUANTIZATION_ARTIFACT: {
    id:          'quantization_artifact',
    label:       'Quantization Artifact',
    definition:  'Diagnostic caused by floating-point → integer coordinate snapping during tile compilation. The geometry is valid in source data; integer rounding creates apparent violations (e.g., duplicate vertices, hairpin spikes, self-touching rings).',
  },
  SPEC_PERMITTED: {
    id:          'spec_permitted_convention',
    label:       'Spec-Permitted Convention',
    definition:  'Encoding choice explicitly permitted or recommended by the MVT specification or established tile compiler practice (e.g., clipping buffer extends geometry past tile extent, label point duplication across tiles).',
  },
  GENUINE_DEFECT: {
    id:          'genuine_defect',
    label:       'Genuine Defect',
    definition:  'True topological or structural defect in the tile data. Not an artifact of compilation or a convention difference. Represents real data quality issues.',
  },
};

// ── EXP-002 Taxonomy (Coordinate-Range Diagnostics) ───────────────────────────
//
// From classification.json:
//   148,268 total diagnostics:
//   - 63,944 (43.1%) label duplication — Point features in place/water_name/centroids
//     duplicated across tile boundaries so labels render without clipping.
//     → Spec-Permitted Convention (MVT §4.3.1 permits features beyond clipping bounds)
//
//   - 84,324 (56.9%) geometry clipping buffer — Polygon/LineString extended 64–80 units
//     beyond tile edge. Two distinct buffer values: 80 units (OpenMapTiles countries/geolines)
//     and 64 units (OpenFreeMap/CARTO water/boundary/landcover/park/waterway).
//     → Spec-Permitted Convention (MVT §4.3.4.3 notes geometry may extend for buffer clipping)
//
//   No diagnostics from EXP-002 were ever attributed to a checker bug or genuine defect.
//   The self-intersection investigation (EXP-003) confirmed 0 coordinate-range genuine defects.

const EXP002_TOTAL = 148268;

const exp002Relabeling = {
  experimentId: 'EXP-002',
  ruleName:     'tile/coordinate-range',
  totalDiagnostics: EXP002_TOTAL,
  categories: [
    {
      ...TAXONOMY.SPEC_PERMITTED,
      subcategory:  'label_point_duplication',
      count:        63944,
      pct:          +((63944 / EXP002_TOTAL) * 100).toFixed(2),
      affectedLayers: ['place', 'water_name', 'centroids'],
      geometryType: 'Point',
      rationale:    'Tile compilers intentionally duplicate label features across tile boundaries. MVT §4.3.1 permits features to extend beyond the tile\'s clipping bounds. Rule suppressed via excludeLayers default.',
      evidence:     '1,695 cross-provider identity-confirmed matches; offsets up to 4096 (full extent); symmetric direction balance.',
      resolution:   'Suppressed by default in v0.5.1 via excludeLayers: [\'place\', \'water_name\', \'centroids\']',
    },
    {
      ...TAXONOMY.SPEC_PERMITTED,
      subcategory:  'geometry_clipping_buffer',
      count:        84324,
      pct:          +((84324 / EXP002_TOTAL) * 100).toFixed(2),
      affectedLayers: ['countries', 'water', 'boundary', 'landcover', 'park', 'waterway', 'geolines'],
      geometryType: 'Polygon, LineString',
      rationale:    'Tile compilers apply a clipping buffer (64 or 80 units for extent=4096) when cutting geometry at tile boundaries to prevent rendering seams. MVT §4.3.4.3 notes geometry may extend beyond tile area for buffer clipping.',
      evidence:     'P95 offset = 80 (OpenMapTiles) or 64 (OpenFreeMap/CARTO); two distinct buffer populations confirmed by bimodal distribution; max offset = 80 (1.95% of extent).',
      resolution:   'Suppressed by default in v0.5.1 via buffer: 80 configuration',
    },
  ],
  taxonomySummary: {
    checker_error:           { count: 0,      pct: 0 },
    quantization_artifact:   { count: 0,      pct: 0 },
    spec_permitted_convention: { count: 148268, pct: 100 },
    genuine_defect:          { count: 0,      pct: 0 },
  },
  conclusion: 'All 148,268 EXP-002 diagnostics are Spec-Permitted Convention. No genuine defects, no checker errors, no quantization artifacts. The coordinate-range rule was misconfigured with zero-buffer defaults that did not account for established tile compiler behavior.',
};

// ── EXP-003 Taxonomy (Self-Intersection Diagnostics) ──────────────────────────
//
// From self-intersection-rings.json (619 total rings):
//
//   Per the ADR-007 root-cause analysis, the 619 rings break into 4 categories:
//   (These were already classified in EXP-003; here we map them to the 4-way taxonomy)
//
//   Cat A — 161 rings — hasDuplicateVertices=true:
//     Duplicate vertex created by integer-grid quantization (two adjacent floating-point
//     coordinates round to the same integer). The "spike" this creates looks like a
//     self-intersection to the naive algorithm.
//     → QUANTIZATION ARTIFACT
//
//   Cat B1 — 170 rings — sharedVertex=false (genuine non-adjacent interior crossings):
//     Of these, 154 are Polygon (OGC invalid — Task 1.3) and 16 are LineString
//     (OGC non-simple but valid — Task 1.3).
//     - 154 Polygon crossings → GENUINE DEFECT (true topological error)
//     - 16 LineString crossings → SPEC-PERMITTED CONVENTION (OGC valid; crossing
//       LineStrings are legal under OGC Simple Features and occur naturally in
//       road/boundary datasets — e.g., overpasses, self-touching boundary loops)
//
//   Cat B2 — 282 rings — closed LineString, missing closure skip:
//     The rule's O(N²) comparator was checking segment (0, N-1) in closed LineStrings
//     as if they were non-adjacent. This is a rule logic error — those segments are
//     topologically adjacent at the closing vertex.
//     → CHECKER ERROR (Guard 2 in v0.5.2 fixes this)
//
//   Cat C — 6 rings — collinear overlap at closing pair:
//     Related to the B2 issue. The closing pair (0, N-1) produces a collinear
//     overlap false positive. Also a rule logic edge case.
//     → CHECKER ERROR (Guard 2 in v0.5.2 also suppresses these)

const EXP003_TOTAL = 619;

// Load rings to verify B1 count from data
const rings = JSON.parse(
  readFileSync(
    join(ROOT, 'analysis/phase2-self-intersection/self-intersection-rings.json'),
    'utf8',
  ),
);

// The rings.json has 619 records (one per ring, FIRST crossing found by legacy algorithm).
// The Cat A/B2/C split was determined by ADR-007 guard analysis (what each guard eliminates),
// NOT by direct field derivation from rings.json — the hasDuplicateVertices field in the JSON
// was an annotation added post-hoc and doesn't cleanly separate A from B2.
//
// Authoritative counts from EXP-003 / ADR-007:
//   Cat A  = 161 (Guard 3 eliminated)
//   Cat B1 = 170 (genuine — sharedVertex=false in rings.json, confirmed)
//   Cat B2 = 282 (Guard 2 eliminated — closed LineString closure skip)
//   Cat C  =   6 (Guard 2 also eliminated — collinear closing pair)
//
// Verify B1 from data (this is the only count directly derivable from rings.json):
const catB1DataCheck = rings.filter(r => r.sharedVertex === false).length;
if (catB1DataCheck !== 170) {
  throw new Error(`B1 count mismatch: expected 170, got ${catB1DataCheck}`);
}

// Use authoritative EXP-003 / ADR-007 counts
const catA  = 161;
const catB1 = 170;
const catC  = 6;
const catB2 = 619 - catA - catB1 - catC;  // = 282

// B1 sub-split (from Task 1.3, confirmed from data)
const catB1Polygon    = rings.filter(r => r.sharedVertex === false && r.geometryType === 'Polygon').length;
const catB1LineString = rings.filter(r => r.sharedVertex === false && r.geometryType === 'LineString').length;

console.log('\nEXP-003 ring counts (authoritative from ADR-007 guard analysis):');
console.log(`  Cat A  (quantization spike, Guard 3):      ${catA}`);
console.log(`  Cat B1 (genuine crossing):                 ${catB1}  → Polygon: ${catB1Polygon}, LineString: ${catB1LineString}`);
console.log(`  Cat B2 (checker error, closure, Guard 2):  ${catB2}`);
console.log(`  Cat C  (checker error, collinear, Guard 2):${catC}`);
console.log(`  Total:                                     ${catA + catB1 + catB2 + catC}`);
console.log(`  B1 from rings.json (sharedVertex=false):   ${catB1DataCheck} ✓`);

const exp003Relabeling = {
  experimentId: 'EXP-003',
  ruleName:     'tile/self-intersection',
  totalDiagnostics: EXP003_TOTAL,
  priorClassification: {
    note: 'EXP-003 already established 4 internal categories (Cat A, B1, B2, C) in ADR-007. This task maps those to the 4-way research taxonomy.',
    catA:  { count: catA,  label: 'Duplicate-vertex quantization spike' },
    catB1: { count: catB1, label: 'Genuine topological crossing', polygons: catB1Polygon, lineStrings: catB1LineString },
    catB2: { count: catB2, label: 'Closed LineString closure skip error' },
    catC:  { count: catC,  label: 'Collinear overlap at closing pair' },
  },
  categories: [
    {
      ...TAXONOMY.CHECKER_ERROR,
      subcategory:  'closed_linestring_closure_skip',
      priorCat:     'B2',
      count:        catB2,
      pct:          +((catB2 / EXP003_TOTAL) * 100).toFixed(2),
      rationale:    'Rule compared segment (0, N-1) in closed LineStrings as non-adjacent. Those segments share the closing vertex and are topologically adjacent — comparing them always yields an apparent intersection. This is a rule logic error (missing Guard 2 for LineStrings).',
      fix:          'Guard 2 in v0.5.2: skip (0, segCount-1) pair for closed LineStrings.',
      affectedLayers: ['boundary'],
      providers:    ['OpenFreeMap', 'CARTO Streets'],
    },
    {
      ...TAXONOMY.CHECKER_ERROR,
      subcategory:  'collinear_closing_pair',
      priorCat:     'C',
      count:        catC,
      pct:          +((catC / EXP003_TOTAL) * 100).toFixed(2),
      rationale:    'Collinear overlap detected at the closing (0, N-1) pair. Related to Cat B2 — the closure skip was missing, allowing the algorithm to find collinear overlaps at the closing vertex.',
      fix:          'Guard 2 in v0.5.2 also suppresses these.',
      affectedLayers: ['countries'],
      providers:    ['OpenMapTiles'],
    },
    {
      ...TAXONOMY.QUANTIZATION_ARTIFACT,
      subcategory:  'duplicate_vertex_quantization_spike',
      priorCat:     'A',
      count:        catA,
      pct:          +((catA / EXP003_TOTAL) * 100).toFixed(2),
      rationale:    'Tile compilers quantize floating-point source coordinates to the integer grid (extent=4096). When two adjacent real-world points round to the same integer, the ring visits the grid point twice, creating a hairpin spike. The two non-adjacent segments meeting at the duplicated vertex produce an apparent self-intersection.',
      fix:          'Guard 3 in v0.5.2: pre-scan for duplicate vertices; skip pairs whose only contact is a duplicated grid point.',
      affectedLayers: ['countries'],
      providers:    ['OpenMapTiles'],
    },
    {
      ...TAXONOMY.GENUINE_DEFECT,
      subcategory:  'polygon_interior_crossing',
      priorCat:     'B1 (Polygon)',
      count:        catB1Polygon,
      pct:          +((catB1Polygon / EXP003_TOTAL) * 100).toFixed(2),
      rationale:    'Non-adjacent polygon ring segments genuinely cross in tile coordinate space. Under OGC Simple Features, a self-crossing Polygon ring is invalid — it breaks planar partitioning and earcut triangulation. These are true structural defects in the tile data.',
      ogcStatus:    'Invalid — OGC Simple Features §6.1.11.2',
      renderImpact: 'Untested until EXP-007 (Phase 3). May cause earcut triangulation collapse or fill inversion in MapLibre.',
      affectedLayers: ['countries'],
      providers:    ['OpenMapTiles'],
    },
    {
      ...TAXONOMY.SPEC_PERMITTED,
      subcategory:  'linestring_crossing',
      priorCat:     'B1 (LineString)',
      count:        catB1LineString,
      pct:          +((catB1LineString / EXP003_TOTAL) * 100).toFixed(2),
      rationale:    'Non-adjacent LineString segments cross in tile coordinate space. Under OGC Simple Features, a self-crossing LineString is non-simple but still VALID. Crossing lines occur naturally in road networks (underpasses/overpasses), transit routes, and boundary loops. TileGuard reports these, but OGC does not classify them as defects.',
      ogcStatus:    'Non-simple but valid — OGC Simple Features §6.1.7',
      note:         'TileGuard\'s tile/self-intersection rule fires on both Polygon and LineString crossings. The LineString diagnostic is optional and may be suppressed in future versions for non-simple but valid geometries.',
      affectedLayers: ['boundary'],
      providers:    ['CARTO Streets', 'OpenFreeMap'],
    },
  ],
  taxonomySummary: {
    checker_error: {
      count: catB2 + catC,
      pct:   +(((catB2 + catC) / EXP003_TOTAL) * 100).toFixed(2),
      subcategories: ['closed_linestring_closure_skip (B2)', 'collinear_closing_pair (C)'],
    },
    quantization_artifact: {
      count: catA,
      pct:   +((catA / EXP003_TOTAL) * 100).toFixed(2),
      subcategories: ['duplicate_vertex_quantization_spike (A)'],
    },
    spec_permitted_convention: {
      count: catB1LineString,
      pct:   +((catB1LineString / EXP003_TOTAL) * 100).toFixed(2),
      subcategories: ['linestring_crossing (B1 LineString)'],
    },
    genuine_defect: {
      count: catB1Polygon,
      pct:   +((catB1Polygon / EXP003_TOTAL) * 100).toFixed(2),
      subcategories: ['polygon_interior_crossing (B1 Polygon)'],
    },
  },
  conclusion: `Of 619 EXP-003 diagnostics: ${catB2 + catC} (${(((catB2 + catC) / EXP003_TOTAL) * 100).toFixed(1)}%) are Checker Errors, ${catA} (${((catA / EXP003_TOTAL) * 100).toFixed(1)}%) are Quantization Artifacts, ${catB1LineString} (${((catB1LineString / EXP003_TOTAL) * 100).toFixed(1)}%) are Spec-Permitted Conventions, and ${catB1Polygon} (${((catB1Polygon / EXP003_TOTAL) * 100).toFixed(1)}%) are Genuine Defects.`,
};

// ── Combined summary ──────────────────────────────────────────────────────────
const combined = {
  totalDiagnostics:    EXP002_TOTAL + EXP003_TOTAL,
  checker_error:       exp003Relabeling.taxonomySummary.checker_error.count,
  quantization_artifact: exp003Relabeling.taxonomySummary.quantization_artifact.count,
  spec_permitted_convention:
    exp002Relabeling.taxonomySummary.spec_permitted_convention.count +
    exp003Relabeling.taxonomySummary.spec_permitted_convention.count,
  genuine_defect:      exp003Relabeling.taxonomySummary.genuine_defect.count,
};
combined.checker_error_pct          = +((combined.checker_error / combined.totalDiagnostics) * 100).toFixed(2);
combined.quantization_artifact_pct  = +((combined.quantization_artifact / combined.totalDiagnostics) * 100).toFixed(2);
combined.spec_permitted_pct         = +((combined.spec_permitted_convention / combined.totalDiagnostics) * 100).toFixed(2);
combined.genuine_defect_pct         = +((combined.genuine_defect / combined.totalDiagnostics) * 100).toFixed(2);

// ── Output document ───────────────────────────────────────────────────────────
const output = {
  meta: {
    task:        '1.5',
    description: '4-way taxonomy relabeling of all EXP-002 and EXP-003 diagnostics',
    generated:   new Date().toISOString(),
    gapsClosed:  ['C1'],
    c1GapNote:   'Gap C1: conflated diagnostic causes and geometry types fully resolved by 4-way classification.',
    taxonomyDefinitions: TAXONOMY,
    classificationCriteria: {
      checkerError:         'Diagnostic disappears after fixing TileGuard rule logic with no tile data change.',
      quantizationArtifact: 'Diagnostic disappears when tile compiler applies higher precision or different rounding; source geometry is valid.',
      specPermitted:        'Encoding choice has explicit or implicit MVT spec/compiler-practice justification.',
      genuineDefect:        'Diagnostic persists with corrected rule on correctly compiled tile; represents real data quality issue.',
    },
  },
  exp002: exp002Relabeling,
  exp003: exp003Relabeling,
  combinedSummary: combined,
  researchBriefUpdate: {
    section:  'Section 6 — Diagnostic Taxonomy',
    oldClaim: '"72.5% false positive rate" (conflated all non-genuine causes)',
    newClaim: `Of 148,887 total diagnostics across EXP-002 and EXP-003:
      - ${((combined.checker_error / combined.totalDiagnostics) * 100).toFixed(2)}% Checker Error (${combined.checker_error} diagnostics — rule logic fixed in v0.5.2)
      - ${((combined.quantization_artifact / combined.totalDiagnostics) * 100).toFixed(2)}% Quantization Artifact (${combined.quantization_artifact} diagnostics — suppressed by Guard 3 in v0.5.2)
      - ${((combined.spec_permitted_convention / combined.totalDiagnostics) * 100).toFixed(2)}% Spec-Permitted Convention (${combined.spec_permitted_convention} diagnostics — suppressed by rule configuration in v0.5.1/v0.5.2)
      - ${((combined.genuine_defect / combined.totalDiagnostics) * 100).toFixed(2)}% Genuine Defect (${combined.genuine_defect} diagnostics — true polygon topology errors)`,
  },
};

// ── Write output ──────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
console.log(`\nOutput written to: ${OUT_PATH}`);

// ── Console report ────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  Task 1.5 — 4-Way Taxonomy Relabeling Results');
console.log('═══════════════════════════════════════════════════════════════');

console.log('\n  EXP-002 (tile/coordinate-range) — 148,268 diagnostics:');
for (const cat of exp002Relabeling.categories) {
  console.log(`    [${cat.label}] ${cat.subcategory}: ${cat.count} (${cat.pct}%)`);
}

console.log('\n  EXP-003 (tile/self-intersection) — 619 diagnostics:');
for (const cat of exp003Relabeling.categories) {
  console.log(`    [${cat.label}] ${cat.subcategory}: ${cat.count} (${cat.pct}%)`);
}

console.log('\n  Combined (148,887 total):');
console.log(`    Checker Error:             ${combined.checker_error}  (${combined.checker_error_pct}%)`);
console.log(`    Quantization Artifact:     ${combined.quantization_artifact}  (${combined.quantization_artifact_pct}%)`);
console.log(`    Spec-Permitted Convention: ${combined.spec_permitted_convention}  (${combined.spec_permitted_pct}%)`);
console.log(`    Genuine Defect:            ${combined.genuine_defect}  (${combined.genuine_defect_pct}%)`);
console.log('═══════════════════════════════════════════════════════════════');
