import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { styleProvider, versionRule } from '../../src/index.js';

function makeEngine() {
  return createEngine({
    plugins: [{ id: 'test', providers: [styleProvider], rules: [versionRule] }],
  });
}

function json(obj: unknown): string {
  return JSON.stringify(obj);
}

describe('style/version', () => {
  it('pass — version 8 produces no diagnostic', async () => {
    const engine = makeEngine();
    const result = await engine.run([json({ version: 8, sources: {}, layers: [] })]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('fail — version 7 reports diagnostic with actual value in data', async () => {
    const engine = makeEngine();
    const result = await engine.run([json({ version: 7, sources: {}, layers: [] })]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('style/version');
    expect(result.diagnostics[0]?.data?.actual).toBe(7);
    expect(result.diagnostics[0]?.location?.jsonPath).toBe('version');
  });

  it('edge — missing version key reports diagnostic', async () => {
    const engine = makeEngine();
    const result = await engine.run([json({ sources: {}, layers: [] })]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('style/version');
  });
});
