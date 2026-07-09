import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { styleProvider, zoomRangeRule } from '../../src/index.js';

function makeEngine() {
  return createEngine({
    plugins: [{ id: 'test', providers: [styleProvider], rules: [zoomRangeRule] }],
  });
}

function json(obj: unknown): string {
  return JSON.stringify(obj);
}

describe('style/zoom-range', () => {
  it('pass — minzoom less than maxzoom', async () => {
    const engine = makeEngine();
    const result = await engine.run([
      json({
        version: 8,
        sources: {},
        layers: [{ id: 'roads', minzoom: 5, maxzoom: 15 }],
      }),
    ]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('pass — minzoom equals maxzoom is valid', async () => {
    const engine = makeEngine();
    const result = await engine.run([
      json({
        version: 8,
        sources: {},
        layers: [{ id: 'roads', minzoom: 10, maxzoom: 10 }],
      }),
    ]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('fail — minzoom greater than maxzoom reports diagnostic with both values', async () => {
    const engine = makeEngine();
    const result = await engine.run([
      json({
        version: 8,
        sources: {},
        layers: [{ id: 'roads', minzoom: 18, maxzoom: 12 }],
      }),
    ]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('style/zoom-range');
    expect(result.diagnostics[0]?.data?.minzoom).toBe(18);
    expect(result.diagnostics[0]?.data?.maxzoom).toBe(12);
    expect(result.diagnostics[0]?.location?.jsonPath).toBe('layers[0].minzoom');
  });

  it('edge — layer with only minzoom (no maxzoom) is skipped', async () => {
    const engine = makeEngine();
    const result = await engine.run([
      json({
        version: 8,
        sources: {},
        layers: [{ id: 'roads', minzoom: 18 }],
      }),
    ]);
    expect(result.diagnostics).toHaveLength(0);
  });
});
