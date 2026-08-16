import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { degenerateGeometryRule, tileProvider } from '../../src/index.js';
import { makeTile } from '../helpers.js';

const plugin = {
  id: 'test',
  providers: [tileProvider],
  rules: [degenerateGeometryRule],
};

describe('tile/degenerate-geometry', () => {
  it('pass — valid LineString with 2 unique points', async () => {
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
                { x: 10, y: 10 },
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

  it('pass — valid Polygon with 3+ unique vertices and a closing point', async () => {
    const engine = createEngine({ plugins: [plugin] });
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

  it('fail — LineString with duplicate points (degenerate line)', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'roads',
        features: [
          {
            type: 2,
            points: [
              [
                { x: 5, y: 5 },
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
    expect(result.diagnostics[0]?.ruleId).toBe('tile/degenerate-geometry');
    expect(result.diagnostics[0]?.data?.code).toBe('DEGENERATE_LINE');
  });

  it('fail — Polygon ring with only 2 unique vertices', async () => {
    const engine = createEngine({ plugins: [plugin] });
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
                { x: 0, y: 0 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    const codes = result.diagnostics.map((d) => d.data?.code);
    expect(codes).toContain('DEGENERATE_POLYGON');
  });

  it('edge — Point features are not checked (Points cannot be degenerate by type)', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'poi',
        features: [{ type: 1, points: [[{ x: 100, y: 100 }]], props: {} }],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });
});

// ── Multi-ring polygon tests ──────────────────────────────────────────────────

describe('tile/degenerate-geometry — multi-ring polygons', () => {
  it('valid outer, degenerate hole (2 unique vertices) → flags hole', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              // Valid outer ring
              [
                { x: 0, y: 0 },
                { x: 0, y: 100 },
                { x: 100, y: 100 },
                { x: 100, y: 0 },
                { x: 0, y: 0 },
              ],
              // Degenerate hole (only 2 unique vertices)
              [
                { x: 20, y: 20 },
                { x: 80, y: 80 },
                { x: 20, y: 20 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.location?.partIndex).toBe(1);
  });

  it('degenerate outer, valid hole → flags outer only', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              // Degenerate outer (2 unique vertices)
              [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                { x: 0, y: 0 },
              ],
              // Valid hole
              [
                { x: 20, y: 20 },
                { x: 80, y: 20 },
                { x: 80, y: 80 },
                { x: 20, y: 80 },
                { x: 20, y: 20 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.location?.partIndex).toBe(0);
  });

  it('multiple holes, only one degenerate → flags only the bad one', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              // Valid outer
              [
                { x: 0, y: 0 },
                { x: 0, y: 200 },
                { x: 200, y: 200 },
                { x: 200, y: 0 },
                { x: 0, y: 0 },
              ],
              // Valid hole
              [
                { x: 10, y: 10 },
                { x: 50, y: 10 },
                { x: 50, y: 50 },
                { x: 10, y: 50 },
                { x: 10, y: 10 },
              ],
              // Degenerate hole (all same point)
              [
                { x: 100, y: 100 },
                { x: 100, y: 100 },
                { x: 100, y: 100 },
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
});
