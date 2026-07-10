import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { stylePlugin } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../..');

describe('@tileguard/style-rules', () => {
  it('accepts a valid style specification', async () => {
    const engine = createEngine({ plugins: [stylePlugin] });

    const result = await engine.run([
      join(repoRoot, 'packages/core/smoke-fixtures/valid-style.json'),
    ]);

    expect(result.summary.pass).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
    expect(result.summary.artifactCount).toBe(1);
  });

  it('reports independent diagnostics for the legacy broken-style checks', async () => {
    const engine = createEngine({ plugins: [stylePlugin] });

    const result = await engine.run([
      join(repoRoot, 'packages/core/smoke-fixtures/broken-style.json'),
    ]);

    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.ruleId)).toEqual([
      'style/known-source',
      'style/known-source',
      'style/unique-layer-id',
      'style/version',
      'style/zoom-range',
    ]);
  });

  it('emits style/valid-json without running object-level style rules on invalid JSON', async () => {
    const engine = createEngine({ plugins: [stylePlugin] });

    const result = await engine.run(['{ "version": 8,']);

    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('style/valid-json');
    expect(result.diagnostics[0]?.artifact.type).toBe('InvalidStyleSpecification');
  });

  it('treats empty placeholder style fixtures as loaded but skipped artifacts', async () => {
    const engine = createEngine({ plugins: [stylePlugin] });

    const result = await engine.run([join(repoRoot, 'fixtures/fill-color/style.json')]);

    expect(result.summary.pass).toBe(true);
    expect(result.summary.artifactCount).toBe(1);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('reports structural style errors and deprecated ref usage', async () => {
    const engine = createEngine({ plugins: [stylePlugin] });
    const source = JSON.stringify({
      version: 8,
      layers: [{ type: 'fill' }, { id: 'copy', ref: 'base' }],
    });

    const result = await engine.run([source]);

    expect(result.diagnostics.map((diagnostic) => diagnostic.ruleId)).toEqual([
      'style/layer-id-required',
      'style/sources-present',
      'style/no-deprecated-ref',
    ]);
    expect(result.summary.errors).toBe(2);
    expect(result.summary.warnings).toBe(1);
  });
});
