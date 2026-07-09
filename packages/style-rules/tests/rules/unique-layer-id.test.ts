import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { styleProvider, uniqueLayerIdRule } from '../../src/index.js';

function makeEngine() {
  return createEngine({
    plugins: [{ id: 'test', providers: [styleProvider], rules: [uniqueLayerIdRule] }],
  });
}

function json(obj: unknown): string {
  return JSON.stringify(obj);
}

describe('style/unique-layer-id', () => {
  it('pass — all layer ids are unique', async () => {
    const engine = makeEngine();
    const result = await engine.run([
      json({
        version: 8,
        sources: {},
        layers: [{ id: 'layer-a' }, { id: 'layer-b' }],
      }),
    ]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('fail — duplicate id reports one diagnostic per duplicate occurrence', async () => {
    const engine = makeEngine();
    const result = await engine.run([
      json({
        version: 8,
        sources: {},
        layers: [{ id: 'roads' }, { id: 'water' }, { id: 'roads' }],
      }),
    ]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('style/unique-layer-id');
    expect(result.diagnostics[0]?.data?.id).toBe('roads');
    expect(result.diagnostics[0]?.data?.firstIndex).toBe(0);
    expect(result.diagnostics[0]?.data?.duplicateIndex).toBe(2);
  });

  it('edge — three layers with same id reports two diagnostics (index 1 and 2)', async () => {
    const engine = makeEngine();
    const result = await engine.run([
      json({
        version: 8,
        sources: {},
        layers: [{ id: 'x' }, { id: 'x' }, { id: 'x' }],
      }),
    ]);
    expect(result.diagnostics).toHaveLength(2);
  });
});
