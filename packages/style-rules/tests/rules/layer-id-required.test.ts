import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { layerIdRequiredRule, styleProvider } from '../../src/index.js';

function makeEngine() {
  return createEngine({
    plugins: [{ id: 'test', providers: [styleProvider], rules: [layerIdRequiredRule] }],
  });
}

function json(obj: unknown): string {
  return JSON.stringify(obj);
}

describe('style/layer-id-required', () => {
  it('pass — all layers have non-empty id', async () => {
    const engine = makeEngine();
    const result = await engine.run([
      json({
        version: 8,
        sources: {},
        layers: [{ id: 'background', type: 'background' }],
      }),
    ]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('fail — layer missing id reports diagnostic with index in data', async () => {
    const engine = makeEngine();
    const result = await engine.run([
      json({
        version: 8,
        sources: {},
        layers: [{ type: 'fill' }],
      }),
    ]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('style/layer-id-required');
    expect(result.diagnostics[0]?.data?.index).toBe(0);
    expect(result.diagnostics[0]?.location?.jsonPath).toBe('layers[0].id');
  });

  it('edge — empty string id is treated as missing', async () => {
    const engine = makeEngine();
    const result = await engine.run([
      json({
        version: 8,
        sources: {},
        layers: [{ id: '', type: 'fill' }],
      }),
    ]);
    expect(result.diagnostics).toHaveLength(1);
  });
});
