import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { noDeprecatedRefRule, styleProvider } from '../../src/index.js';

function makeEngine() {
  return createEngine({
    plugins: [{ id: 'test', providers: [styleProvider], rules: [noDeprecatedRefRule] }],
  });
}

function json(obj: unknown): string {
  return JSON.stringify(obj);
}

describe('style/no-deprecated-ref', () => {
  it('pass — layer without ref property produces no diagnostic', async () => {
    const engine = makeEngine();
    const result = await engine.run([
      json({
        version: 8,
        sources: {},
        layers: [{ id: 'roads', type: 'line' }],
      }),
    ]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('fail — layer with ref property reports warning (not error)', async () => {
    const engine = makeEngine();
    const result = await engine.run([
      json({
        version: 8,
        sources: {},
        layers: [{ id: 'roads-copy', ref: 'roads' }],
      }),
    ]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('style/no-deprecated-ref');
    expect(result.diagnostics[0]?.severity).toBe('warning');
    expect(result.diagnostics[0]?.data?.layerId).toBe('roads-copy');
    expect(result.diagnostics[0]?.location?.jsonPath).toBe('layers[0].ref');
  });

  it('edge — ref: null is still flagged (property exists)', async () => {
    const engine = makeEngine();
    const result = await engine.run([
      json({
        version: 8,
        sources: {},
        layers: [{ id: 'roads-copy', ref: null }],
      }),
    ]);
    expect(result.diagnostics).toHaveLength(1);
  });
});
