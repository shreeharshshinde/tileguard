/**
 * @file self-intersection.test.ts
 * @description Behaviour tests for the `tile/self-intersection` rule.
 *
 * ## Test structure
 *
 * Tests are grouped into six suites that mirror the implementation's layered
 * design:
 *
 *   1. **Baseline** — the pre-existing pass/fail contract that must survive every
 *      future change.  The bounding-box pre-check (Guard 4) is a pure performance
 *      optimisation; these tests confirm it does not alter which rings are flagged.
 *
 *   2. **Fix 1: closed-LineString closure skip** — a LineString whose first vertex
 *      equals its last vertex must not be flagged purely because `seg[0]` and
 *      `seg[segCount-1]` share the closing vertex.  Mirrors the existing Polygon
 *      closure skip.  Source: Cat B2 (282 / 619 corpus diagnostics, 45.6%).
 *
 *   3. **Fix 2: duplicate-vertex spike skip** — a ring that revisits an interior
 *      vertex due to float→int quantization must not be flagged for the contact
 *      at the duplicated grid point.  Source: Cat A (161 / 619, 26.0%).
 *
 *   4. **Fix 3: bounding-box pre-check** — large rings with genuine or absent
 *      crossings must produce the same result as before the optimisation.
 *
 *   5. **Fix 4: minimum-vertex guard** — rings with fewer than 4 vertices are
 *      skipped before entering the O(N²) loop.
 *
 *   6. **False-negative guard** — genuinely self-intersecting rings must always
 *      produce a diagnostic regardless of the other fixes.  This is the
 *      equivalent of the `poi`-layer fixture from the coordinate-range hardening.
 *
 * ## Evidence references
 * - Phase 2 root-cause investigation: `docs/engineering/ROOT_CAUSE_INVESTIGATION.md`
 * - Design decisions: `docs/architecture/adr/007-self-intersection-hardening.md`
 */

import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { selfIntersectionRule, tileProvider } from '../../src/index.js';
import { makeTile } from '../helpers.js';

// ─── Shared engine plugin ─────────────────────────────────────────────────────

const plugin = { id: 'test', providers: [tileProvider], rules: [selfIntersectionRule] };

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Builds a tile from `layers`, runs the engine, and returns only the
 * `tile/self-intersection` diagnostics for easy assertion.
 */
async function run(layers: Parameters<typeof makeTile>[0]) {
  const engine = createEngine({ plugins: [plugin] });
  const source = await makeTile(layers);
  const result = await engine.run([source]);
  return result.diagnostics.filter((d) => d.ruleId === 'tile/self-intersection');
}

// ─── 1. Baseline ──────────────────────────────────────────────────────────────
//
// Core pass/fail contract established before v0.5.2.  These must remain stable
// regardless of which optimisation passes are active.

describe('tile/self-intersection — baseline', () => {
  it('pass — simple convex polygon produces no diagnostic', async () => {
    // Triangle: (0,0)→(10,0)→(10,10)→(0,0).  No non-adjacent segment pair exists.
    const diags = await run([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 0 }]],
            props: {},
          },
        ],
      },
    ]);
    expect(diags).toHaveLength(0);
  });

  it('fail — bowtie polygon (diagonals cross) produces a self-intersection diagnostic', async () => {
    // (0,0)→(10,10)→(0,10)→(10,0)→(0,0): the two diagonals cross at (5,5).
    // Segment indices and layer name must be present in the diagnostic.
    const diags = await run([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
                { x: 10, y: 0 },
                { x: 0, y: 0 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    expect(diags).toHaveLength(1);
    expect(diags[0]?.data?.segments).toHaveLength(2);
    expect(diags[0]?.location?.layer).toBe('buildings');
  });

  it('fail — figure-8 open LineString produces a self-intersection diagnostic', async () => {
    // (0,0)→(10,10)→(10,0)→(0,10): the two crossing diagonals form a figure-8.
    const diags = await run([
      {
        name: 'roads',
        features: [
          {
            type: 2,
            points: [[{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 10, y: 0 }, { x: 0, y: 10 }]],
            props: {},
          },
        ],
      },
    ]);
    expect(diags).toHaveLength(1);
  });

  it('pass — Point features are not subject to the self-intersection check', async () => {
    // The rule applies only to LineString and Polygon features.
    const diags = await run([
      {
        name: 'poi',
        features: [{ type: 1, points: [[{ x: 5, y: 5 }]], props: {} }],
      },
    ]);
    expect(diags).toHaveLength(0);
  });
});

// ─── 2. Fix 1 — Closed-LineString closure skip ────────────────────────────────
//
// Root cause: the closure skip (seg[0] vs seg[segCount-1]) was applied only to
// Polygon rings (`closed = feature.type === 3`).  A closed LineString
// (first vertex == last vertex) is topologically equivalent but was not
// receiving the skip, causing every valid boundary loop to be flagged.
//
// Corpus impact: 282 / 619 false positives (Cat B2, 45.6%).
// Reference: ROOT_CAUSE_INVESTIGATION.md §4 — Category B2.

describe('tile/self-intersection — Fix 1: closed-LineString closure skip', () => {
  it('pass — closed-LineString triangle loop is not self-intersecting', async () => {
    // A→B→C→A (3 interior vertices plus the closing repeat of A).
    // seg[0] = A→B and seg[2] = C→A share endpoint A — this must be treated as the
    // logically adjacent closure, not as a crossing.
    const diags = await run([
      {
        name: 'boundary',
        features: [
          {
            type: 2,
            points: [
              [
                { x: 100, y: 100 },
                { x: 200, y: 100 },
                { x: 150, y: 200 },
                { x: 100, y: 100 }, // start == end: closed
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    expect(diags).toHaveLength(0);
  });

  it('pass — closed-LineString quadrilateral loop is not self-intersecting', async () => {
    // A simple square loop: A→B→C→D→A.  No interior crossing.
    const diags = await run([
      {
        name: 'boundary',
        features: [
          {
            type: 2,
            points: [
              [
                { x: 10, y: 10 },
                { x: 50, y: 10 },
                { x: 50, y: 50 },
                { x: 10, y: 50 },
                { x: 10, y: 10 }, // start == end: closed
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    expect(diags).toHaveLength(0);
  });

  it('pass — open LineString simple path is not self-intersecting', async () => {
    // Regression: Fix 1 must not suppress the intersection check on non-closed
    // LineStrings.  A straight path with 4 vertices has no crossing.
    const diags = await run([
      {
        name: 'roads',
        features: [
          {
            type: 2,
            points: [[{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }, { x: 300, y: 10 }]],
            props: {},
          },
        ],
      },
    ]);
    expect(diags).toHaveLength(0);
  });

  it('fail — closed LineString with a genuine interior crossing is still caught', async () => {
    // False-negative guard for Fix 1.
    // Bowtie closed loop: (0,0)→(10,10)→(0,10)→(10,0)→(0,0).
    // The interior diagonals cross at (5,5) — a non-closure segment pair.
    // Fix 1 must suppress only the closure-pair contact; the interior crossing
    // must still be reported.
    const diags = await run([
      {
        name: 'boundary',
        features: [
          {
            type: 2,
            points: [
              [
                { x: 0, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
                { x: 10, y: 0 },
                { x: 0, y: 0 }, // closed, interior crossing present
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    expect(diags).toHaveLength(1);
  });
});

// ─── 3. Fix 2 — Duplicate-vertex spike skip ───────────────────────────────────
//
// Root cause: tile compilers quantize floating-point coordinates to the integer
// grid.  Two real-world points that are distinct in float space but round to the
// same integer create a ring that visits the same vertex twice, producing a
// hairpin / spike.  The orientation test treats the two non-adjacent segments
// meeting at the duplicated vertex as intersecting.
//
// Corpus impact: 161 / 619 false positives (Cat A, 26.0%).
// Reference: ROOT_CAUSE_INVESTIGATION.md §4 — Category A.

describe('tile/self-intersection — Fix 2: duplicate-vertex spike skip', () => {
  it('pass — Polygon ring with a hairpin (visits same vertex twice) is not flagged', async () => {
    // Ring: A(0,0)→B(10,5)→C(10,10)→B(10,5)→D(0,10)→A(0,0)
    // B appears at index 1 and index 3.  The two non-adjacent segments meeting
    // at B — seg[0]=(A→B) and seg[2]=(C→B) — share B as an endpoint.
    // Without Fix 2 this contact is flagged as a self-intersection.
    const diags = await run([
      {
        name: 'countries',
        features: [
          {
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 10, y: 5 },  // B — first occurrence
                { x: 10, y: 10 },
                { x: 10, y: 5 },  // B — duplicate (index 3)
                { x: 0, y: 10 },
                { x: 0, y: 0 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    expect(diags).toHaveLength(0);
  });

  it('pass — open LineString with a spike (duplicate interior vertex) is not flagged', async () => {
    // Path: (0,0)→P(10,0)→(20,10)→P(10,0)→(30,0)
    // P appears at index 1 and index 3.  The hairpin created by P is a
    // quantization artefact, not a real crossing.
    const diags = await run([
      {
        name: 'boundary',
        features: [
          {
            type: 2,
            points: [
              [
                { x: 0, y: 0 },
                { x: 10, y: 0 },  // P — first occurrence
                { x: 20, y: 10 },
                { x: 10, y: 0 },  // P — duplicate
                { x: 30, y: 0 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    expect(diags).toHaveLength(0);
  });

  it('fail — ring with a duplicate vertex AND a separate genuine crossing still reports the crossing', async () => {
    // False-negative guard for Fix 2.
    //
    // Ring: (0,0)→Q(10,10)→(5,5)→Q(10,10)→(0,10)→(10,0)→(0,0)
    // Q = (10,10) is a non-closing duplicate — the spike pair involving Q is
    // suppressed by Fix 2.
    //
    // However, this ring also contains a bowtie: the segment (0,0)→Q(10,10)
    // crosses the segment (0,10)→(10,0) at (5,5).  That pair shares no duplicate
    // vertex and must still be reported.
    const diags = await run([
      {
        name: 'countries',
        features: [
          {
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 10, y: 10 }, // Q — first occurrence
                { x: 5, y: 5 },   // collinear point on the diagonal
                { x: 10, y: 10 }, // Q — duplicate
                { x: 0, y: 10 },
                { x: 10, y: 0 },
                { x: 0, y: 0 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    expect(diags).toHaveLength(1);
  });
});

// ─── 4. Fix 3 — Bounding-box pre-check (output unchanged) ────────────────────
//
// The bounding-box pre-check is a pure performance optimisation — it must not
// change which rings are flagged or passed.  These tests use large-vertex rings
// to exercise the code path and confirm output parity.

describe('tile/self-intersection — Fix 3: bounding-box pre-check (output unchanged)', () => {
  it('pass — 100-vertex convex polygon (circle approximation) produces no diagnostic', async () => {
    // A regular 100-gon inscribed in a circle of radius 1000 centred at (2000,2000).
    // All non-adjacent segments are geographically separated; the BB pre-check
    // rejects ~100% of pairs, and no intersection exists.
    const n = 100;
    const pts = Array.from({ length: n }, (_, i) => ({
      x: Math.round(2000 + 1000 * Math.cos((2 * Math.PI * i) / n)),
      y: Math.round(2000 + 1000 * Math.sin((2 * Math.PI * i) / n)),
    }));
    pts.push(pts[0]!); // close the ring
    const diags = await run([
      { name: 'landcover', features: [{ type: 3, points: [pts], props: {} }] },
    ]);
    expect(diags).toHaveLength(0);
  });

  it('fail — 20-vertex ring with a forced crossing mid-ring is still caught', async () => {
    // Start with a convex 20-gon, then swap vertices 5 and 15 to introduce a
    // genuine crossing that the BB pre-check cannot reject (the swapped segments
    // span across the centre of the polygon).
    const n = 20;
    const pts = Array.from({ length: n }, (_, i) => ({
      x: Math.round(2000 + 1000 * Math.cos((2 * Math.PI * i) / n)),
      y: Math.round(2000 + 1000 * Math.sin((2 * Math.PI * i) / n)),
    }));
    const tmp = pts[5]!;
    pts[5] = pts[15]!;
    pts[15] = tmp;
    pts.push(pts[0]!);
    const diags = await run([
      { name: 'landcover', features: [{ type: 3, points: [pts], props: {} }] },
    ]);
    expect(diags).toHaveLength(1);
  });
});

// ─── 5. Fix 4 — Minimum-vertex guard ─────────────────────────────────────────
//
// A ring with fewer than 4 vertices has at most 2 non-closing segments.
// After the adjacency skip and the closure skip, no segment pair remains.
// The guard avoids entering the O(N²) loop for these degenerate inputs.

describe('tile/self-intersection — Fix 4: minimum-vertex guard', () => {
  it('pass — LineString with exactly 3 vertices (2 segments) produces no diagnostic', async () => {
    // segCount = 2.  The only candidate pair is (0,1), which is adjacent — skipped.
    const diags = await run([
      {
        name: 'roads',
        features: [
          {
            type: 2,
            points: [[{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 0 }]],
            props: {},
          },
        ],
      },
    ]);
    expect(diags).toHaveLength(0);
  });

  it('pass — Polygon with 3 vertices (no closing vertex) produces no diagnostic', async () => {
    // segCount = 2.  Same reasoning as above; no non-adjacent pair exists.
    const diags = await run([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }]],
            props: {},
          },
        ],
      },
    ]);
    expect(diags).toHaveLength(0);
  });
});

// ─── 6. False-negative guard ──────────────────────────────────────────────────
//
// Genuinely self-intersecting geometry must always produce a diagnostic,
// regardless of which guards are active and in which layer the feature appears.
// These cases are the canonical "poi-layer" equivalent from the coordinate-range
// hardening — the proof that the fixes do not suppress real defects.

describe('tile/self-intersection — false-negative guard', () => {
  it('fail — canonical bowtie polygon is always caught', async () => {
    // The simplest possible self-intersecting polygon.  Layer name "water" is
    // deliberately different from "boundary"/"countries" to confirm the fix is
    // not layer-scoped.
    const diags = await run([
      {
        name: 'water',
        features: [
          {
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 100, y: 100 },
                { x: 0, y: 100 },
                { x: 100, y: 0 },
                { x: 0, y: 0 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    expect(diags).toHaveLength(1);
    expect(diags[0]?.location?.layer).toBe('water');
  });

  it('fail — canonical figure-8 open LineString is always caught', async () => {
    // Open LineString with two crossing diagonals — not a closed loop, no duplicate
    // vertices.  None of the guards should fire.
    const diags = await run([
      {
        name: 'roads',
        features: [
          {
            type: 2,
            points: [
              [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 100, y: 0 }, { x: 0, y: 100 }],
            ],
            props: {},
          },
        ],
      },
    ]);
    expect(diags).toHaveLength(1);
  });

  it('fail — bowtie polygon in an arbitrary layer is always caught', async () => {
    // Ensures Fix 2's duplicate-vertex skip is not accidentally applied to rings
    // that have no duplicate vertices.  Layer "poi" is unrelated to the corpus
    // layers (boundary, countries) to confirm layer-agnostic behaviour.
    const diags = await run([
      {
        name: 'poi',
        features: [
          {
            type: 3,
            points: [
              [
                { x: 10, y: 10 },
                { x: 50, y: 50 },
                { x: 10, y: 50 },
                { x: 50, y: 10 },
                { x: 10, y: 10 },
              ],
            ],
            props: { name: 'test-poi' },
          },
        ],
      },
    ]);
    expect(diags).toHaveLength(1);
  });
});
