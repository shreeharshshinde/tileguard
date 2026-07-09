import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { sourcesPresentRule, styleProvider } from '../../src/index.js';

function makeEngine() {
  return createEngine({
    plugins: [{ id: 'test', providers: [styleProvider], rules: [sourcesPresentRule] }],
  });
}

function json(obj: unknown): string {
  return JSON.stringify(obj);
}

describe('style/sources-present', () => {
  it('pass — sources is an object', async () => {
    const engine = makeEngine();
    const result = await engine.run([json({ version: 8, sources: { tiles: {} }, layers: [] })]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('fail — missing sources key reports diagnostic', async () => {
    const engine = makeEngine();
    const result = await engine.run([json({ version: 8, layers: [] })]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('style/sources-present');
    expect(result.diagnostics[0]?.location?.jsonPath).toBe('sources');
  });

  it('edge — sources as an array (not an object) reports diagnostic', async () => {
    const engine = makeEngine();
    const result = await engine.run([json({ version: 8, sources: [], layers: [] })]);
    expect(result.diagnostics).toHaveLength(1);
  });
});
