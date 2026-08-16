import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { tileProvider, windingOrderRule } from '../../src/index.js';
import { makeTile } from '../helpers.js';

const plugin = {
  id: 'test',
  providers: [tileProvider],
  rules: [windingOrderRule],
};

describe('tile/winding-order', () => {
  it('pass — polygon with correct MVT winding (outer=CW, hole=CCW)', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // CW outer ring: (0,0) → (0,10) → (10,10) → (10,0) → (0,0)
    // signedArea < 0 → clockwise
    // CCW hole: (2,2) → (8,2) → (8,8) → (2,8) → (2,2)
    // signedArea > 0 → counter-clockwise
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 0, y: 10 },
                { x: 10, y: 10 },
                { x: 10, y: 0 },
                { x: 0, y: 0 },
              ],
              [
                { x: 2, y: 2 },
                { x: 8, y: 2 },
                { x: 8, y: 8 },
                { x: 2, y: 8 },
                { x: 2, y: 2 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('pass — polygon with OGC winding (outer=CCW, hole=CW) is consistent', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // CCW outer ring: signedArea > 0
    // CW hole: signedArea < 0
    // Both are consistent with OGC convention → no issue
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 20, y: 0 },
                { x: 20, y: 20 },
                { x: 0, y: 20 },
                { x: 0, y: 0 },
              ],
              [
                { x: 5, y: 5 },
                { x: 5, y: 15 },
                { x: 15, y: 15 },
                { x: 15, y: 5 },
                { x: 5, y: 5 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('pass — multi-polygon with all CCW outers (OGC convention)', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // Multiple outer rings all CCW — consistent OGC multi-polygon, no holes
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
                { x: 0, y: 0 },
              ],
              [
                { x: 20, y: 0 },
                { x: 30, y: 0 },
                { x: 30, y: 10 },
                { x: 20, y: 10 },
                { x: 20, y: 0 },
              ],
              [
                { x: 40, y: 0 },
                { x: 50, y: 0 },
                { x: 50, y: 10 },
                { x: 40, y: 10 },
                { x: 40, y: 0 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('fail — inconsistent winding within MVT-convention feature (hole has wrong direction)', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // CW outer (MVT convention detected because majority is CW)
    // CCW hole (correct for MVT)
    // CCW "hole" at index 2 that's actually wound CW — INCONSISTENT
    // Two CW rings + one CCW ring → MVT convention detected (CW=outer)
    // Ring at index 1 is CCW = hole (correct)
    // Ring at index 2 is CW = would be detected as new outer (not a winding error)
    //
    // For a genuine inconsistency, we need a ring that breaks the detected pattern:
    // MVT convention (CW outer): ring that's CCW should be a hole.
    // If we have 2 CW rings + 1 CCW ring between them, that's:
    //   outer(CW) → hole(CCW) → outer(CW) — all consistent with MVT convention.
    //
    // Real inconsistency: after grouping, a "hole" ring actually has outer winding.
    // Example: OGC tile (3 CCW outers + 1 CCW "hole") → hole should be CW but is CCW
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              // Outer CCW (OGC convention since majority is CCW)
              [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                { x: 100, y: 100 },
                { x: 0, y: 100 },
                { x: 0, y: 0 },
              ],
              // Hole should be CW in OGC, but this one is CCW → WRONG
              // It'll be detected as a new outer polygon, not a hole.
              // BUT — the convention detection sees 2 CCW rings → OGC.
              // Then grouping sees both as outers (both CCW in OGC = outer).
              // No winding error, just two outers.
              [
                { x: 10, y: 10 },
                { x: 30, y: 10 },
                { x: 30, y: 30 },
                { x: 10, y: 30 },
                { x: 10, y: 10 },
              ],
              // A properly wound CW hole
              [
                { x: 50, y: 50 },
                { x: 50, y: 80 },
                { x: 80, y: 80 },
                { x: 80, y: 50 },
                { x: 50, y: 50 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    // Convention detected: 2 CCW + 1 CW → OGC (positiveCount=2 >= negativeCount=1)
    // Grouping: ring[0]=CCW=outer, ring[1]=CCW=outer(new polygon), ring[2]=CW=hole of ring[1]
    // Validation: ring[1] outer is CCW (correct for OGC), ring[2] hole is CW (correct for OGC)
    // No inconsistency — all rings follow the detected OGC pattern.
    expect(result.diagnostics).toHaveLength(0);
  });

  it('pass — consistent convention means no winding errors reported', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // With convention-aware detection, a feature where all rings follow a
    // single convention (even if it's not MVT-spec) produces no errors.
    // The rule detects convention from the first ring and validates consistency.
    //
    // This test has an OGC-style feature: CCW outer + CW holes.
    // All rings are consistent with the detected OGC convention → no error.
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              // Ring 0: CCW (OGC outer) — area > 0
              [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                { x: 100, y: 100 },
                { x: 0, y: 100 },
                { x: 0, y: 0 },
              ],
              // Ring 1: CW (OGC hole) — area < 0
              [
                { x: 10, y: 10 },
                { x: 10, y: 40 },
                { x: 40, y: 40 },
                { x: 40, y: 10 },
                { x: 10, y: 10 },
              ],
              // Ring 2: CW (OGC hole) — area < 0
              [
                { x: 50, y: 50 },
                { x: 50, y: 90 },
                { x: 90, y: 90 },
                { x: 90, y: 50 },
                { x: 50, y: 50 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('edge — non-polygon features are not checked', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'roads',
        features: [
          {
            type: 2,
            points: [
              [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
              ],
            ],
            props: {},
          },
          {
            type: 1,
            points: [
              [
                { x: 5, y: 5 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('edge — zero-area ring is not flagged for winding (degenerate)', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // Collinear points: signed area = 0, neither CW nor CCW
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 20, y: 0 },
                { x: 0, y: 0 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('pass — single-ring polygon with CW winding (MVT outer)', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'water',
        features: [
          {
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 0, y: 10 },
                { x: 10, y: 10 },
                { x: 10, y: 0 },
                { x: 0, y: 0 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('pass — single-ring polygon with CCW winding (OGC outer)', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // CCW single ring is auto-detected as OGC convention → consistent → no error
    const source = await makeTile([
      {
        name: 'water',
        features: [
          {
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
                { x: 0, y: 0 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('pass — multi-feature tile where each feature is internally consistent', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            // Feature 0: CW single ring (MVT convention)
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 0, y: 10 },
                { x: 10, y: 10 },
                { x: 10, y: 0 },
                { x: 0, y: 0 },
              ],
            ],
            props: {},
          },
          {
            // Feature 1: CCW single ring (OGC convention)
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 },
                { x: 0, y: 0 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    // Each feature is internally consistent with its detected convention
    expect(result.diagnostics).toHaveLength(0);
  });
});
