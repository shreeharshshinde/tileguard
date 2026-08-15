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

  it('fail — outer ring has CCW winding (should be CW)', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // CCW outer ring: (0,0) → (10,0) → (10,10) → (0,10) → (0,0)
    // signedArea > 0 → counter-clockwise → WRONG for outer
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
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('tile/winding-order');
    expect(result.diagnostics[0]?.location?.layer).toBe('buildings');
    expect(result.diagnostics[0]?.location?.partIndex).toBe(0);
  });

  it('fail — hole ring has CW winding (should be CCW)', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // CW outer (correct): (0,0) → (0,20) → (20,20) → (20,0) → (0,0)
    // CW hole (WRONG): (5,5) → (5,15) → (15,15) → (15,5) → (5,5)
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 0, y: 20 },
                { x: 20, y: 20 },
                { x: 20, y: 0 },
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
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('tile/winding-order');
    expect(result.diagnostics[0]?.location?.partIndex).toBe(1);
  });

  it('fail — both outer and hole have wrong winding', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // CCW outer (WRONG): (0,0) → (20,0) → (20,20) → (0,20) → (0,0)
    // CW hole (WRONG): (5,5) → (5,15) → (15,15) → (15,5) → (5,5)
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
    expect(result.diagnostics).toHaveLength(2);
    const partIndices = result.diagnostics.map((d) => d.location?.partIndex);
    expect(partIndices).toContain(0);
    expect(partIndices).toContain(1);
  });

  it('fail — multi-ring polygon: one hole correct, one hole wrong', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // CW outer (correct)
    // CCW hole 1 (correct)
    // CW hole 2 (WRONG)
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              // Outer ring CW
              [
                { x: 0, y: 0 },
                { x: 0, y: 100 },
                { x: 100, y: 100 },
                { x: 100, y: 0 },
                { x: 0, y: 0 },
              ],
              // Hole 1 CCW (correct)
              [
                { x: 10, y: 10 },
                { x: 30, y: 10 },
                { x: 30, y: 30 },
                { x: 10, y: 30 },
                { x: 10, y: 10 },
              ],
              // Hole 2 CW (WRONG)
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
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.location?.partIndex).toBe(2);
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
    // Zero area means signedArea = 0, which is NOT > 0, so it won't flag outer as wrong
    // This is correct — zero-area rings are handled by tile/zero-area-ring rule
    expect(result.diagnostics).toHaveLength(0);
  });

  it('pass — single-ring polygon with correct CW winding', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // CW: (0,0) → (0,10) → (10,10) → (10,0) → (0,0) — signedArea < 0
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

  it('reports correct featureIndex for second feature', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            // Feature 0: correct CW
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
            // Feature 1: wrong CCW
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
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.location?.featureIndex).toBe(1);
  });
});
