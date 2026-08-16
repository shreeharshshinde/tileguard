import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { tileProvider, unclosedRingRule } from '../../src/index.js';
import { makeTile } from '../helpers.js';

const plugin = {
  id: 'test',
  providers: [tileProvider],
  rules: [unclosedRingRule],
};

// ── Multi-ring polygon tests ──────────────────────────────────────────────────

describe('tile/unclosed-ring — multi-ring polygons', () => {
  it('outer closed, inner ring unclosed → flags hole only', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              // Outer ring: closed
              [
                { x: 0, y: 0 },
                { x: 0, y: 100 },
                { x: 100, y: 100 },
                { x: 100, y: 0 },
                { x: 0, y: 0 },
              ],
              // Inner ring: NOT closed (last != first)
              [
                { x: 20, y: 20 },
                { x: 80, y: 20 },
                { x: 80, y: 80 },
                { x: 20, y: 80 },
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

  it('both rings unclosed → two diagnostics with correct partIndex', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              // Outer ring: NOT closed
              [
                { x: 0, y: 0 },
                { x: 0, y: 100 },
                { x: 100, y: 100 },
                { x: 100, y: 0 },
              ],
              // Inner ring: NOT closed
              [
                { x: 20, y: 20 },
                { x: 80, y: 20 },
                { x: 80, y: 80 },
                { x: 20, y: 80 },
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

  it('inner ring closed, outer ring unclosed → flags outer only', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              // Outer ring: NOT closed
              [
                { x: 0, y: 0 },
                { x: 0, y: 100 },
                { x: 100, y: 100 },
                { x: 100, y: 0 },
              ],
              // Inner ring: closed
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
});

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
