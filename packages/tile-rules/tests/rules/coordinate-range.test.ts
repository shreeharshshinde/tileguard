import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { coordinateRangeRule, tileProvider } from '../../src/index.js';
import { makeTile } from '../helpers.js';

const plugin = { id: 'test', providers: [tileProvider], rules: [coordinateRangeRule] };

describe('tile/coordinate-range', () => {
  it('pass — all coordinates within 0-4096 extent', async () => {
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
                { x: 4096, y: 4096 },
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

  it('fail — negative x coordinate reports diagnostic with point in data', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'roads',
        features: [
          {
            type: 2,
            points: [
              [
                { x: -1, y: 0 },
                { x: 10, y: 10 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('tile/coordinate-range');
    expect(result.diagnostics[0]?.data?.point).toMatchObject({ x: -1, y: 0 });
    expect(result.diagnostics[0]?.location?.layer).toBe('roads');
  });

  it('fail — y coordinate above extent reports diagnostic', async () => {
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
                { x: 0, y: 5000 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.data?.point).toMatchObject({ x: 0, y: 5000 });
  });

  it('edge — coordinate exactly at extent boundary (4096) is valid', async () => {
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
                { x: 4096, y: 0 },
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
