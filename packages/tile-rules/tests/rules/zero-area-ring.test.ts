import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { tileProvider, zeroAreaRingRule } from '../../src/index.js';
import { makeTile } from '../helpers.js';

const plugin = {
  id: 'test',
  providers: [tileProvider],
  rules: [zeroAreaRingRule],
};

describe('tile/zero-area-ring', () => {
  it('pass — polygon ring with non-zero signed area', async () => {
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

  it('fail — collinear polygon ring (zero area) reports diagnostic', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // Collinear points: all on y=0, so signed area = 0
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
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('tile/zero-area-ring');
    expect(result.diagnostics[0]?.location?.layer).toBe('buildings');
  });

  it('fail — bowtie / self-crossing polygon that happens to have zero net area', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // Bowtie: (0,0)→(10,10)→(0,10)→(10,0)→(0,0) — signed areas cancel
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
    const ruleIds = result.diagnostics.map((d) => d.ruleId);
    expect(ruleIds).toContain('tile/zero-area-ring');
  });

  it('edge — non-polygon types are not checked', async () => {
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

  // ── Epsilon / minArea threshold tests ─────────────────────────────────────

  it('epsilon — flags near-zero area ring when minArea is set', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: {
        'tile/zero-area-ring': ['error', { minArea: 2.0 }],
      },
    });
    // Thin triangle with area = 0.5: (0,0)→(2,0)→(1,1)→(0,0)
    // area = |0*0 - 2*0 + 2*1 - 1*0 + 1*0 - 0*1| / 2 = |2 - 0 + 0 - 0| / 2... 
    // Actually: (0*0 - 2*0) + (2*1 - 1*0) + (1*0 - 0*1) = 0 + 2 + 0 = 2 → area = 1.0
    // area = 1.0 < minArea 2.0 → should flag
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 2, y: 0 },
                { x: 1, y: 1 },
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
    expect(result.diagnostics[0]?.ruleId).toBe('tile/zero-area-ring');
  });

  it('epsilon — passes ring with area above minArea threshold', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: {
        'tile/zero-area-ring': ['error', { minArea: 1.0 }],
      },
    });
    // Triangle with area = 50: (0,0)→(10,0)→(10,10)→(0,0)
    // area = |(0*0 - 10*0) + (10*10 - 10*0) + (10*0 - 0*10)| / 2 = |0 + 100 - 10| ... 
    // Actually: signedArea = (0*0 - 10*0 + 10*10 - 10*0 + 10*0 - 0*10) / 2 = 90/2 = 45
    // |45| > 1.0 → should pass
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

  it('epsilon — backward compatible: minArea=0 only catches exact zero', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: {
        'tile/zero-area-ring': ['error', { minArea: 0 }],
      },
    });
    // Thin triangle with area = 1.0 — NOT zero, so should pass with minArea=0
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 2, y: 0 },
                { x: 1, y: 1 },
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

  it('epsilon — default (no options) only catches exact zero', async () => {
    const engine = createEngine({ plugins: [plugin] });
    // Same thin triangle with area = 1.0 — should pass with default (no minArea)
    const source = await makeTile([
      {
        name: 'buildings',
        features: [
          {
            type: 3,
            points: [
              [
                { x: 0, y: 0 },
                { x: 2, y: 0 },
                { x: 1, y: 1 },
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
});
