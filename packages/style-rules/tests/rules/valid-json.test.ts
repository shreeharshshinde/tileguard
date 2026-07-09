import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { styleProvider, validJsonRule } from '../../src/index.js';

function makeEngine() {
  return createEngine({
    plugins: [{ id: 'test', providers: [styleProvider], rules: [validJsonRule] }],
  });
}

function json(obj: unknown): string {
  return JSON.stringify(obj);
}

describe('style/valid-json', () => {
  it('pass — valid JSON does not trigger the rule', async () => {
    const engine = makeEngine();
    const result = await engine.run([json({ version: 8, sources: {}, layers: [] })]);
    const d = result.diagnostics.filter((x) => x.ruleId === 'style/valid-json');
    expect(d).toHaveLength(0);
  });

  it('fail — invalid JSON reports one diagnostic with parse error in data', async () => {
    const engine = makeEngine();
    const result = await engine.run(['{ "version": 8,']);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('style/valid-json');
    expect(result.diagnostics[0]?.severity).toBe('error');
    expect(result.diagnostics[0]?.data?.error).toBeTruthy();
  });

  it('edge — inline object JSON does not trigger valid-json even when other rules would fire', async () => {
    const engine = makeEngine();
    const result = await engine.run([json({ version: 8, sources: {}, layers: [] })]);
    expect(result.diagnostics.filter((d) => d.ruleId === 'style/valid-json')).toHaveLength(0);
    expect(result.summary.artifactCount).toBe(1);
  });
});
