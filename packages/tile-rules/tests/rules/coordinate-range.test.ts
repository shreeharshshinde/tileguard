import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { coordinateRangeRule, tileProvider } from '../../src/index.js';
import { makeTile } from '../helpers.js';

const plugin = { id: 'test', providers: [tileProvider], rules: [coordinateRangeRule] };

describe('tile/coordinate-range', () => {
  // ── Existing tests (updated for default buffer=80) ──────────────────────

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

  it('fail — coordinate far below zero reports diagnostic with point in data', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'roads',
        features: [
          {
            type: 2,
            points: [
              [
                { x: -200, y: 0 },
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
    expect(result.diagnostics[0]?.data?.point).toMatchObject({ x: -200, y: 0 });
    expect(result.diagnostics[0]?.location?.layer).toBe('roads');
  });

  it('fail — y coordinate far above extent reports diagnostic', async () => {
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

  it('buffer — allows coordinates within explicit buffer tolerance', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: {
        'tile/coordinate-range': ['error', { buffer: 100 }],
      },
    });
    const source = await makeTile([
      {
        name: 'roads',
        features: [
          {
            type: 2,
            points: [
              [
                { x: -50, y: 0 },
                { x: 4150, y: 4150 },
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

  it('buffer — fails when coordinates exceed explicit buffer tolerance', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: {
        'tile/coordinate-range': ['error', { buffer: 100 }],
      },
    });
    const source = await makeTile([
      {
        name: 'roads',
        features: [
          {
            type: 2,
            points: [
              [
                { x: -101, y: 0 },
                { x: 4096, y: 4197 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(2);
  });

  // ── Group 1 — Default buffer boundary tests (buffer=80) ─────────────────

  it('default buffer — coordinate at exactly 0 is valid', async () => {
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

  it('default buffer — coordinate at exactly extent (4096) is valid', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'roads',
        features: [
          {
            type: 2,
            points: [
              [
                { x: 4096, y: 0 },
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

  it('default buffer — coordinate at exactly extent+80 is valid', async () => {
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
                { x: 4176, y: 0 },
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

  it('default buffer — coordinate at extent+81 triggers diagnostic', async () => {
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
                { x: 4177, y: 0 },
              ],
            ],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.data?.point).toMatchObject({ x: 4177, y: 0 });
  });

  it('default buffer — coordinate at exactly -80 is valid', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'roads',
        features: [
          {
            type: 2,
            points: [
              [
                { x: -80, y: 0 },
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

  it('default buffer — coordinate at -81 triggers diagnostic', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'roads',
        features: [
          {
            type: 2,
            points: [
              [
                { x: -81, y: 0 },
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
    expect(result.diagnostics[0]?.data?.point).toMatchObject({ x: -81, y: 0 });
  });

  // ── Group 2 — Default layer exclusion tests ─────────────────────────────

  it('excludeLayers default — place layer with out-of-range point produces no diagnostic', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'place',
        features: [
          {
            type: 1,
            points: [[{ x: 8000, y: 2000 }]],
            props: { name: 'test-city' },
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('excludeLayers default — water_name layer with out-of-range point produces no diagnostic', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'water_name',
        features: [
          {
            type: 1,
            points: [[{ x: -5000, y: 1000 }]],
            props: { name: 'test-lake' },
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('excludeLayers default — centroids layer with out-of-range point produces no diagnostic', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'centroids',
        features: [
          {
            type: 1,
            points: [[{ x: 10000, y: 10000 }]],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  // ── Group 3 — False-negative guard ──────────────────────────────────────

  it('false-negative guard — poi layer with corrupt point IS flagged (not in excludeLayers)', async () => {
    const engine = createEngine({ plugins: [plugin] });
    const source = await makeTile([
      {
        name: 'poi',
        features: [
          {
            type: 1,
            points: [[{ x: 50000, y: 100 }]],
            props: { name: 'corrupt-poi' },
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.location?.layer).toBe('poi');
  });

  // ── Group 4 — Override behavior tests ───────────────────────────────────

  it('excludeLayers override — custom list replaces default; place layer IS flagged', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: {
        'tile/coordinate-range': ['error', { excludeLayers: ['custom-layer'] }],
      },
    });
    const source = await makeTile([
      {
        name: 'place',
        features: [
          {
            type: 1,
            points: [[{ x: 8000, y: 2000 }]],
            props: { name: 'test-city' },
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.location?.layer).toBe('place');
  });

  it('excludeLayers override — empty array checks ALL layers including normally-excluded ones', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: {
        'tile/coordinate-range': ['error', { excludeLayers: [] }],
      },
    });
    const source = await makeTile([
      {
        name: 'place',
        features: [
          {
            type: 1,
            points: [[{ x: 8000, y: 2000 }]],
            props: { name: 'test-city' },
          },
        ],
      },
      {
        name: 'water_name',
        features: [
          {
            type: 1,
            points: [[{ x: -5000, y: 1000 }]],
            props: { name: 'test-lake' },
          },
        ],
      },
      {
        name: 'centroids',
        features: [
          {
            type: 1,
            points: [[{ x: 10000, y: 10000 }]],
            props: {},
          },
        ],
      },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(3);
  });
});
