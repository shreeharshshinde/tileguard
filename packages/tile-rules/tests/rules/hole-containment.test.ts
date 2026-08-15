import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { tileProvider, holeContainmentRule } from '../../src/index.js';
import { makeTile } from '../helpers.js';

const plugin = {
  id: 'test',
  providers: [tileProvider],
  rules: [holeContainmentRule],
};

describe('tile/hole-containment', () => {
  it('pass — hole ring fully contained within outer ring', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              // Outer ring
              [
                { x: 0, y: 0 },
                { x: 0, y: 100 },
                { x: 100, y: 100 },
                { x: 100, y: 0 },
                { x: 0, y: 0 },
              ],
              // Hole fully inside
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
    expect(result.diagnostics).toHaveLength(0);
  });

  it('fail — hole ring fully outside outer ring', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              // Outer ring
              [
                { x: 0, y: 0 },
                { x: 0, y: 50 },
                { x: 50, y: 50 },
                { x: 50, y: 0 },
                { x: 0, y: 0 },
              ],
              // Hole entirely outside
              [
                { x: 60, y: 60 },
                { x: 90, y: 60 },
                { x: 90, y: 90 },
                { x: 60, y: 90 },
                { x: 60, y: 60 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('tile/hole-containment');
    expect(result.diagnostics[0]?.location?.partIndex).toBe(1);
  });

  it('fail — hole ring partially outside outer ring', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              // Outer ring
              [
                { x: 0, y: 0 },
                { x: 0, y: 100 },
                { x: 100, y: 100 },
                { x: 100, y: 0 },
                { x: 0, y: 0 },
              ],
              // Hole partially outside (one vertex at 120, outside the 100 boundary)
              [
                { x: 20, y: 20 },
                { x: 120, y: 20 },
                { x: 120, y: 80 },
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
    expect(result.diagnostics[0]?.ruleId).toBe('tile/hole-containment');
    expect(result.diagnostics[0]?.location?.partIndex).toBe(1);
  });

  it('pass — hole vertex exactly on outer ring boundary', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              // Outer ring
              [
                { x: 0, y: 0 },
                { x: 0, y: 100 },
                { x: 100, y: 100 },
                { x: 100, y: 0 },
                { x: 0, y: 0 },
              ],
              // Hole with vertex on boundary (x=0 is the left edge of outer ring)
              [
                { x: 0, y: 30 },
                { x: 50, y: 30 },
                { x: 50, y: 70 },
                { x: 0, y: 70 },
                { x: 0, y: 30 },
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

  it('pass — polygon with no holes (single ring)', async () => {
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
                { x: 0, y: 100 },
                { x: 100, y: 100 },
                { x: 100, y: 0 },
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
                { x: 200, y: 200 },
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

  it('fail — multiple holes, only one outside', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              // Outer ring
              [
                { x: 0, y: 0 },
                { x: 0, y: 200 },
                { x: 200, y: 200 },
                { x: 200, y: 0 },
                { x: 0, y: 0 },
              ],
              // Hole 1 — inside (valid)
              [
                { x: 10, y: 10 },
                { x: 50, y: 10 },
                { x: 50, y: 50 },
                { x: 10, y: 50 },
                { x: 10, y: 10 },
              ],
              // Hole 2 — outside (invalid)
              [
                { x: 210, y: 210 },
                { x: 250, y: 210 },
                { x: 250, y: 250 },
                { x: 210, y: 250 },
                { x: 210, y: 210 },
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

  it('reports correct featureIndex when not first feature', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            // Feature 0: valid polygon
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 0, y: 50 },
                { x: 50, y: 50 },
                { x: 50, y: 0 },
                { x: 0, y: 0 },
              ],
            ],
            props: {},
          },
          {
            // Feature 1: hole outside
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 0, y: 50 },
                { x: 50, y: 50 },
                { x: 50, y: 0 },
                { x: 0, y: 0 },
              ],
              [
                { x: 60, y: 60 },
                { x: 80, y: 60 },
                { x: 80, y: 80 },
                { x: 60, y: 80 },
                { x: 60, y: 60 },
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

  it('pass — hole vertex on outer ring vertex (corner touching)', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              // Outer: triangle
              [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                { x: 50, y: 100 },
                { x: 0, y: 0 },
              ],
              // Hole shares vertex with outer ring at (50, 50) which is on the edge
              [
                { x: 30, y: 20 },
                { x: 70, y: 20 },
                { x: 50, y: 50 },
                { x: 30, y: 20 },
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
});
