import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { tileProvider, unclosedRingRule } from '../../src/index.js';
import { makeTile } from '../helpers.js';

const plugin = { id: 'test', providers: [tileProvider], rules: [unclosedRingRule] };

describe('tile/unclosed-ring', () => {
  it('pass — polygon ring where first point equals last point', async () => {
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

  it('fail — polygon ring where last point differs from first', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // Build an unclosed ring by passing raw non-closing points
    // The helper does NOT auto-close unless first==last, so this ring stays open
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
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('tile/unclosed-ring');
    expect(result.diagnostics[0]?.location?.layer).toBe('buildings');
    expect(result.diagnostics[0]?.location?.featureIndex).toBe(0);
  });

  it('edge — non-polygon types (LineString, Point) are not checked', async () => {
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

  it('edge — diagnostic includes partIndex in data', async () => {
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
                { x: 0, y: 10 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics[0]?.data?.partIndex).toBe(0);
  });
});
