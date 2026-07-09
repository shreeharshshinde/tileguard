import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { knownSourceRule, styleProvider } from '../../src/index.js';

function makeEngine() {
  return createEngine({
    plugins: [{ id: 'test', providers: [styleProvider], rules: [knownSourceRule] }],
  });
}

function json(obj: unknown): string {
  return JSON.stringify(obj);
}

describe('style/known-source', () => {
  it('pass — layer source references a declared source key', async () => {
    const engine = makeEngine();
    const result = await engine.run([
      json({
        version: 8,
        sources: { tiles: { type: 'vector' } },
        layers: [{ id: 'roads', source: 'tiles' }],
      }),
    ]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('fail — layer references undeclared source key', async () => {
    const engine = makeEngine();
    const result = await engine.run([
      json({
        version: 8,
        sources: { tiles: {} },
        layers: [{ id: 'roads', source: 'missing-source' }],
      }),
    ]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('style/known-source');
    expect(result.diagnostics[0]?.data?.source).toBe('missing-source');
    expect(result.diagnostics[0]?.data?.layerId).toBe('roads');
  });

  it('edge — layer without a source key is silently skipped', async () => {
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
});
