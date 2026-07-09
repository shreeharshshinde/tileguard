import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { selfIntersectionRule, tileProvider } from '../../src/index.js';
import { makeTile } from '../helpers.js';

const plugin = { id: 'test', providers: [tileProvider], rules: [selfIntersectionRule] };

describe('tile/self-intersection', () => {
  it('pass — simple convex polygon with no self-intersections', async () => {
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
    const selfIntersects = result.diagnostics.filter((d) => d.ruleId === 'tile/self-intersection');
    expect(selfIntersects).toHaveLength(0);
  });

  it('fail — bowtie polygon segments cross and produce self-intersection diagnostic', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // (0,0)→(10,10)→(0,10)→(10,0)→(0,0): diagonals cross
    const source = await makeTile([
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
    const result = await engine.run([source]);
    const d = result.diagnostics.find((x) => x.ruleId === 'tile/self-intersection');
    expect(d).toBeDefined();
    expect(d?.data?.segments).toHaveLength(2);
    expect(d?.location?.layer).toBe('buildings');
  });

  it('fail — self-intersecting LineString reports diagnostic', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // Figure-8: (0,0)→(10,10)→(10,0)→(0,10)
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
                { x: 10, y: 0 },
                { x: 0, y: 10 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    const d = result.diagnostics.find((x) => x.ruleId === 'tile/self-intersection');
    expect(d).toBeDefined();
  });

  it('edge — Point features are not checked', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'poi',
        features: [{ type: 1, points: [[{ x: 5, y: 5 }]], props: {} }],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics.filter((d) => d.ruleId === 'tile/self-intersection')).toHaveLength(0);
  });
});
