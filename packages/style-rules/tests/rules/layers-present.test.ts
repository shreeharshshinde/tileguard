import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { layersPresentRule, styleProvider } from '../../src/index.js';

function makeEngine() {
  return createEngine({
    plugins: [{ id: 'test', providers: [styleProvider], rules: [layersPresentRule] }],
  });
}

function json(obj: unknown): string {
  return JSON.stringify(obj);
}

describe('style/layers-present', () => {
  it('pass — layers is an array', async () => {
    const engine = makeEngine();
    const result = await engine.run([json({ version: 8, sources: {}, layers: [] })]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('fail — missing layers key reports diagnostic', async () => {
    const engine = makeEngine();
    const result = await engine.run([json({ version: 8, sources: {} })]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('style/layers-present');
    expect(result.diagnostics[0]?.location?.jsonPath).toBe('layers');
  });

  it('edge — layers as an object (not an array) reports diagnostic', async () => {
    const engine = makeEngine();
    const result = await engine.run([json({ version: 8, sources: {}, layers: {} })]);
    expect(result.diagnostics).toHaveLength(1);
  });
});
