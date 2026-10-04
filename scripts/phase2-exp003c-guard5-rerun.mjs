/**
 * EXP-003c — Re-run TileGuard on 407 deduplicated rings with Guard 5 active.
 *
 * Guard 5 (self-tangency skip) suppresses segment pairs whose only contact is a
 * shared non-adjacent vertex (self-tangency) with no proper interior crossing.
 * This is exactly the AGREE_NOPROPER_TOUCH category from EXP-003b.
 *
 * Method:
 *   1. Load the 407 deduplicated rings from analysis/phase2-oracle/deduplicated-rings.json.
 *   2. Re-run TileGuard's findSelfIntersectionIssues() on each ring's vertex list
 *      using the updated v0.6.0 code with Guard 5 active.
 *   3. Record the new TileGuard verdict (flagged=true if Guard 5 does NOT suppress it).
 *   4. Compare with the EXP-003b verdict (sharedVertex field) to measure Guard 5's impact.
 *   5. Re-compute precision/recall/F1 against the existing dual-oracle ground truth.
 *   6. Write analysis/phase2-oracle/exp003c-guard5-results.json.
 *
 * Note: Oracle 1 (GEOS) and Oracle 2 (Exact Integer) results are unchanged —
 * they are oracle-independent of Guard 5.  Only the TileGuard verdict changes.
 *
 * Usage: node scripts/phase2-exp003c-guard5-rerun.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

// ── Load existing data ────────────────────────────────────────────────────────

const dedup   = JSON.parse(readFileSync(`${ROOT}/analysis/phase2-oracle/deduplicated-rings.json`, 'utf8'));
const agreeEB = JSON.parse(readFileSync(`${ROOT}/analysis/phase2-oracle/agreement-matrix.json`, 'utf8'));
const o2data  = JSON.parse(readFileSync(`${ROOT}/analysis/phase2-oracle/exact-integer-oracle-results.json`, 'utf8'));
const geosData = JSON.parse(readFileSync(`${ROOT}/analysis/phase2-oracle/geos-oracle-results.json`, 'utf8'));

const rings    = dedup.rings;
const o2Map    = Object.fromEntries(o2data.results.map(r => [r.id, r]));
const geosMap  = Object.fromEntries(geosData.results.map(r => [r.id, r]));
const eb3bRows = Object.fromEntries(agreeEB.rows.map(r => [r.id, r]));

console.log(`Loaded ${rings.length} deduplicated rings.`);

// ── Re-implement TileGuard's Guard 5 logic in pure JS ─────────────────────────
//
// We replicate the exact same logic as geometry.ts so we don't need to
// instantiate fake VectorTileFeature objects.  The logic is deterministic and
// pure — same inputs produce same outputs.

function orientation(ax, ay, bx, by, cx, cy) {
  const value = (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
  if (value === 0) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(ax, ay, bx, by, cx, cy) {
  return (
    bx <= Math.max(ax, cx) && bx >= Math.min(ax, cx) &&
    by <= Math.max(ay, cy) && by >= Math.min(ay, cy)
  );
}

function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const o1 = orientation(ax, ay, bx, by, cx, cy);
  const o2 = orientation(ax, ay, bx, by, dx, dy);
  const o3 = orientation(cx, cy, dx, dy, ax, ay);
  const o4 = orientation(cx, cy, dx, dy, bx, by);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(ax, ay, cx, cy, bx, by)) return true;
  if (o2 === 0 && onSegment(ax, ay, dx, dy, bx, by)) return true;
  if (o3 === 0 && onSegment(cx, cy, ax, ay, dx, dy)) return true;
  if (o4 === 0 && onSegment(cx, cy, bx, by, dx, dy)) return true;
  return false;
}

/** Guard 3: collect non-closing duplicate vertex keys */
function collectDuplicateVertices(pts, closed) {
  const seen = new Map();
  const dups = new Set();
  const last = pts.length - 1;

  for (let i = 0; i < pts.length; i++) {
    const key = `${pts[i].x},${pts[i].y}`;
    if (seen.has(key)) {
      const first = seen.get(key);
      if (closed && first === 0 && i === last) continue;
      dups.add(key);
    } else {
      seen.set(key, i);
    }
  }
  return dups;
}

/** Guard 5: collect non-adjacent, non-closure shared vertex keys (self-tangency) */
function collectSelfTangencyVertices(pts, closed) {
  const seen = new Map();
  const last = pts.length - 1;

  for (let i = 0; i < pts.length; i++) {
    const key = `${pts[i].x},${pts[i].y}`;
    const arr = seen.get(key);
    if (!arr) seen.set(key, [i]);
    else arr.push(i);
  }

  const tangency = new Set();
  for (const [key, indices] of seen) {
    if (indices.length < 2) continue;
    for (let a = 0; a < indices.length - 1; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        const i = indices[a];
        const j = indices[b];
        // Skip closure pair
        if (closed && i === 0 && j === last) continue;
        // Skip adjacent pairs (Guard 3 handles those)
        if (Math.abs(i - j) === 1) continue;
        // Non-adjacent, non-closure shared vertex = self-tangency
        tangency.add(key);
      }
    }
  }
  return tangency;
}

/**
 * Run TileGuard's self-intersection check with all 5 guards on a vertex array.
 * Returns true if the ring is flagged (genuine crossing found), false if suppressed.
 *
 * @param {Array<{x:number,y:number}>} pts  - Ring vertices (closed: first === last for polygons)
 * @param {boolean} closed                  - Whether the ring is topologically closed
 */
function tileguardFlaggedV6(pts, closed) {
  // Guard 1: minimum-vertex guard
  if (pts.length < 4) return false;

  const duplicateVertices    = collectDuplicateVertices(pts, closed);
  const selfTangencyVertices = collectSelfTangencyVertices(pts, closed);

  const segCount = pts.length - 1;

  for (let first = 0; first < segCount; first++) {
    const ax = pts[first].x,     ay = pts[first].y;
    const bx = pts[first+1].x,   by = pts[first+1].y;

    const aMinX = Math.min(ax, bx), aMaxX = Math.max(ax, bx);
    const aMinY = Math.min(ay, by), aMaxY = Math.max(ay, by);

    for (let second = first + 1; second < segCount; second++) {
      // Adjacency skip
      if (Math.abs(first - second) <= 1) continue;
      // Guard 2: closure skip
      if (closed && first === 0 && second === segCount - 1) continue;

      const cx = pts[second].x,   cy = pts[second].y;
      const dx = pts[second+1].x, dy = pts[second+1].y;

      // Guard 4: AABB pre-check
      if (aMinX > Math.max(cx, dx) || aMaxX < Math.min(cx, dx) ||
          aMinY > Math.max(cy, dy) || aMaxY < Math.min(cy, dy)) continue;

      // Guard 3: duplicate-vertex skip
      if (duplicateVertices.size > 0) {
        const aKey = `${ax},${ay}`, bKey = `${bx},${by}`;
        const cKey = `${cx},${cy}`, dKey = `${dx},${dy}`;
        if ((duplicateVertices.has(bKey) && (bKey === cKey || bKey === dKey)) ||
            (duplicateVertices.has(aKey) && (aKey === cKey || aKey === dKey)) ||
            (duplicateVertices.has(cKey) && (cKey === aKey || cKey === bKey)) ||
            (duplicateVertices.has(dKey) && (dKey === aKey || dKey === bKey))) continue;
      }

      // Guard 5: self-tangency skip
      if (selfTangencyVertices.size > 0) {
        const aKey = `${ax},${ay}`, bKey = `${bx},${by}`;
        const cKey = `${cx},${cy}`, dKey = `${dx},${dy}`;
        if ((selfTangencyVertices.has(bKey) && (bKey === cKey || bKey === dKey)) ||
            (selfTangencyVertices.has(aKey) && (aKey === cKey || aKey === dKey)) ||
            (selfTangencyVertices.has(cKey) && (cKey === aKey || cKey === bKey)) ||
            (selfTangencyVertices.has(dKey) && (dKey === aKey || dKey === bKey))) continue;
      }

      if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return true;
    }
  }
  return false;
}

// ── Re-run TileGuard on all 407 rings ─────────────────────────────────────────

console.log('\nRe-running TileGuard v0.6.0 (Guard 5 active) on all rings...');

const ringId = r =>
  `${r.dataset}|${r.tile}|${r.layer}|fi${r.featureIndex}|pi${r.partIndex}`;

let guard5Suppressed = 0;
let unchanged        = 0;

const updatedRows = [];

for (const ring of rings) {
  const rid    = ringId(ring);
  const pts    = ring.vertices;
  // For polygons, first === last (closed). For LineStrings, may or may not be closed.
  const firstPt = pts[0], lastPt = pts[pts.length - 1];
  const isClosedLS = ring.geometryType === 'LineString' &&
                     firstPt.x === lastPt.x && firstPt.y === lastPt.y;
  const closed = ring.geometryType === 'Polygon' || isClosedLS;

  // v0.6.0 verdict (Guards 1–5)
  const tgV6Flagged = tileguardFlaggedV6(pts, closed);

  // v0.5.2 verdict was: sharedVertex=false → flagged, sharedVertex=true → suppressed
  const tgEB3bFlagged = !ring.sharedVertex;

  const changed = tgV6Flagged !== tgEB3bFlagged;
  if (changed) {
    // Guard 5 suppressed something that v0.5.2 flagged
    if (!tgV6Flagged && tgEB3bFlagged) guard5Suppressed++;
    // (should not happen: Guard 5 only suppresses, never flags more)
  } else {
    unchanged++;
  }

  // Fetch oracle verdicts
  const o2 = o2Map[rid];
  const geo = geosMap[rid];
  const eb3b = eb3bRows[rid];

  const geosFlagged = geo ? (geo.geos_non_simple ?? false) : false;
  const o2Proper    = o2 ? o2.oracle2_has_proper_crossing : false;
  const dualConsensus = geosFlagged && o2Proper;

  // Re-classify
  let category;
  if (tgV6Flagged && geosFlagged && o2Proper) {
    category = 'AGREE_DEFECT';
  } else if (!tgV6Flagged && !geosFlagged && !(o2 ? o2.oracle2_self_intersects : false)) {
    category = 'AGREE_CLEAN';
  } else if (geosFlagged && !tgV6Flagged) {
    if (ring.hasDuplicateVertices) {
      category = 'GEOS_EXTRA_DUP_VERTEX';
    } else if (tgV6Flagged !== tgEB3bFlagged) {
      // Guard 5 newly suppressed this
      category = 'GEOS_EXTRA_SELF_TANGENCY';
    } else {
      category = 'GEOS_EXTRA_CLOSURE';
    }
  } else if (tgV6Flagged && geosFlagged && !o2Proper) {
    category = 'AGREE_NOPROPER_TOUCH';
  } else if (tgV6Flagged && !geosFlagged) {
    category = 'TILEGUARD_EXTRA';
  } else if (o2Proper && !geosFlagged) {
    category = 'ORACLE2_EXTRA';
  } else {
    // Not flagged by TileGuard, not flagged by GEOS, Oracle2 touch-only
    category = 'PARTIAL_AGREE';
  }

  updatedRows.push({
    id:                rid,
    dataset:           ring.dataset,
    geometryType:      ring.geometryType,
    layer:             ring.layer,
    sharedVertex_eb3b: ring.sharedVertex,   // original v0.5.2 verdict
    tgV52Flagged:      tgEB3bFlagged,       // v0.5.2 flagged?
    tgV6Flagged:       tgV6Flagged,         // v0.6.0 (Guard 5) flagged?
    guard5Changed:     changed,             // Guard 5 suppressed this ring?
    geos_flagged:      geosFlagged,
    o2_proper:         o2Proper,
    dual_consensus_defect: dualConsensus,
    category_eb3b:     eb3b ? eb3b.category : 'N/A',
    category_ec3c:     category,
  });
}

console.log(`\nGuard 5 impact:`);
console.log(`  Rings newly suppressed by Guard 5: ${guard5Suppressed}`);
console.log(`  Rings unchanged:                   ${unchanged}`);

// ── Category counts ────────────────────────────────────────────────────────────

const catCounts = {};
for (const row of updatedRows) {
  catCounts[row.category_ec3c] = (catCounts[row.category_ec3c] ?? 0) + 1;
}

console.log('\nEXP-003c agreement categories (all 407 rings):');
for (const [cat, count] of Object.entries(catCounts).sort((a,b) => b[1]-a[1])) {
  const eb3bCount = agreeEB.categoryCounts[cat] ?? 0;
  const delta = count - eb3bCount;
  const deltaStr = delta === 0 ? '(no change)' : (delta > 0 ? `(+${delta})` : `(${delta})`);
  console.log(`  ${cat.padEnd(35)} ${count}  ${deltaStr}`);
}

// ── Precision / Recall / F1 (Polygon rings only) ──────────────────────────────

const polyRows = updatedRows.filter(r => r.geometryType === 'Polygon');

const TP = polyRows.filter(r => r.tgV6Flagged && r.dual_consensus_defect).length;
const FP = polyRows.filter(r => r.tgV6Flagged && !r.dual_consensus_defect).length;
const FN = polyRows.filter(r => !r.tgV6Flagged && r.dual_consensus_defect).length;
const TN = polyRows.filter(r => !r.tgV6Flagged && !r.dual_consensus_defect).length;

const precision = TP + FP > 0 ? TP / (TP + FP) : null;
const recall    = TP + FN > 0 ? TP / (TP + FN) : null;
const f1        = precision !== null && recall !== null && precision + recall > 0
                    ? 2 * precision * recall / (precision + recall) : null;

console.log('\nPolygon ring metrics (EXP-003c, Guard 5 active):');
console.log(`  TP=${TP}  FP=${FP}  FN=${FN}  TN=${TN}`);
if (precision !== null) console.log(`  Precision: ${(precision*100).toFixed(1)}%`);
if (recall    !== null) console.log(`  Recall:    ${(recall*100).toFixed(1)}%`);
if (f1        !== null) console.log(`  F1:        ${f1.toFixed(4)}`);

// Compare with EXP-003b
const eb3b = agreeEB.polygonMetrics;
console.log(`\nComparison (EXP-003b → EXP-003c):`);
console.log(`  Precision: ${(eb3b.precision*100).toFixed(1)}% → ${precision !== null ? (precision*100).toFixed(1)+'%' : 'n/a'}`);
console.log(`  Recall:    ${(eb3b.recall*100).toFixed(1)}% → ${recall !== null ? (recall*100).toFixed(1)+'%' : 'n/a'}`);
console.log(`  F1:        ${eb3b.f1.toFixed(4)} → ${f1 !== null ? f1.toFixed(4) : 'n/a'}`);

// LineString breakdown
const lsRows = updatedRows.filter(r => r.geometryType === 'LineString');
const lsTG   = lsRows.filter(r => r.tgV6Flagged).length;
const lsGeos = lsRows.filter(r => r.geos_flagged).length;
const lsO2   = lsRows.filter(r => r.o2_proper).length;
console.log(`\nLineString rings: ${lsRows.length} total`);
console.log(`  TileGuard v0.6.0 flagged: ${lsTG}, GEOS flagged: ${lsGeos}, Oracle2 proper: ${lsO2}`);

// ── Save results ───────────────────────────────────────────────────────────────

const outPath = `${ROOT}/analysis/phase2-oracle/exp003c-guard5-results.json`;
const output  = {
  meta: {
    experiment: 'EXP-003c',
    description: 'Re-run of EXP-003b dual-oracle comparison with TileGuard Guard 5 (self-tangency skip) active',
    generated: new Date().toISOString(),
    guardVersion: 'v0.6.0 (Guards 1–5)',
    oracles: {
      oracle1: 'GEOS via Shapely 2.1.2 — LinearRing.is_simple (unchanged from EXP-003b)',
      oracle2: 'Exact Integer Predicates — Python int orient2d (unchanged from EXP-003b)',
      tileguard: 'TileGuard v0.6.0 — Guards 1–5 active (Guard 5 = self-tangency skip)',
    },
    inputFiles: [
      'analysis/phase2-oracle/deduplicated-rings.json',
      'analysis/phase2-oracle/exact-integer-oracle-results.json',
      'analysis/phase2-oracle/geos-oracle-results.json',
      'analysis/phase2-oracle/agreement-matrix.json',
    ],
    outputFile: 'analysis/phase2-oracle/exp003c-guard5-results.json',
  },
  guard5Impact: {
    ringsSuppressedByGuard5: guard5Suppressed,
    ringsUnchanged: unchanged,
    total: rings.length,
  },
  categoryCounts: catCounts,
  categoryCounts_eb3b: agreeEB.categoryCounts,
  polygonMetrics: {
    TP, FP, FN, TN,
    precision: precision !== null ? Math.round(precision * 10000) / 10000 : null,
    recall:    recall    !== null ? Math.round(recall    * 10000) / 10000 : null,
    f1:        f1        !== null ? Math.round(f1        * 10000) / 10000 : null,
  },
  polygonMetrics_eb3b: eb3b,
  lineStringMetrics: {
    total: lsRows.length,
    tileguardFlagged: lsTG,
    geosFlagged: lsGeos,
    oracle2Proper: lsO2,
    note: 'LineString crossings are OGC non-simple but valid — not evaluated for P/R/F1',
  },
  rows: updatedRows,
};

mkdirSync(`${ROOT}/analysis/phase2-oracle`, { recursive: true });
writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(`\n${'═'.repeat(62)}`);
console.log(`  EXP-003c — Guard 5 Re-Run Results`);
console.log(`${'═'.repeat(62)}`);
console.log(`  Rings processed:            ${rings.length}`);
console.log(`  Newly suppressed by Guard 5: ${guard5Suppressed}`);
for (const [cat, count] of Object.entries(catCounts).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${cat.padEnd(35)} ${count}`);
}
console.log(`${'─'.repeat(62)}`);
if (precision !== null) {
  console.log(`  Polygon Precision:   ${(eb3b.precision*100).toFixed(1)}% → ${(precision*100).toFixed(1)}%`);
  console.log(`  Polygon Recall:      ${(eb3b.recall*100).toFixed(1)}% → ${(recall*100).toFixed(1)}%`);
  console.log(`  Polygon F1:          ${eb3b.f1.toFixed(4)} → ${f1.toFixed(4)}`);
}
console.log(`${'═'.repeat(62)}`);
console.log(`\nOutput: ${outPath}`);
