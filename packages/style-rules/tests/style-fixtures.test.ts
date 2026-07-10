import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { stylePlugin } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../..');

describe('Style Fixtures Integration Tests', () => {
  const engine = createEngine({ plugins: [stylePlugin] });

  // Good style
  it('passes on fixtures/good/valid-style.json', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/good/valid-style.json')]);
    expect(result.summary.pass).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });

  // Bad styles
  it('flags version in fixtures/bad/invalid-version.json', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/bad/invalid-version.json')]);
    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics.map((d) => d.ruleId)).toContain('style/version');
  });

  it('flags missing sources in fixtures/bad/missing-sources.json', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/bad/missing-sources.json')]);
    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics.map((d) => d.ruleId)).toContain('style/sources-present');
  });

  it('flags missing layers in fixtures/bad/missing-layers.json', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/bad/missing-layers.json')]);
    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics.map((d) => d.ruleId)).toContain('style/layers-present');
  });

  it('flags missing layer id in fixtures/bad/missing-layer-id.json', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/bad/missing-layer-id.json')]);
    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics.map((d) => d.ruleId)).toContain('style/layer-id-required');
  });

  it('flags duplicate layer id in fixtures/bad/duplicate-layer-id.json', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/bad/duplicate-layer-id.json')]);
    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics.map((d) => d.ruleId)).toContain('style/unique-layer-id');
  });

  it('flags unknown source in fixtures/bad/unknown-source.json', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/bad/unknown-source.json')]);
    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics.map((d) => d.ruleId)).toContain('style/known-source');
  });

  it('flags invalid zoom range in fixtures/bad/invalid-zoom-range.json', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/bad/invalid-zoom-range.json')]);
    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics.map((d) => d.ruleId)).toContain('style/zoom-range');
  });

  it('flags deprecated ref in fixtures/bad/deprecated-ref.json', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/bad/deprecated-ref.json')]);
    expect(result.summary.pass).toBe(true);
    expect(result.diagnostics.map((d) => d.ruleId)).toContain('style/no-deprecated-ref');
  });

  it('flags multi-rule errors in fixtures/bad/broken-style.json', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/bad/broken-style.json')]);
    expect(result.summary.pass).toBe(false);
    const rules = result.diagnostics.map((d) => d.ruleId);
    expect(rules).toContain('style/version');
    expect(rules).toContain('style/known-source');
    expect(rules).toContain('style/unique-layer-id');
    expect(rules).toContain('style/zoom-range');
  });

  it('flags invalid JSON in fixtures/bad/invalid-json.json', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/bad/invalid-json.json')]);
    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('style/valid-json');
  });

  // Edge cases
  it('gracefully ignores empty file in fixtures/edge-cases/empty-style.json', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/edge-cases/empty-style.json')]);
    expect(result.summary.pass).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('passes on minimal valid style in fixtures/edge-cases/minimal-valid-style.json', async () => {
    const result = await engine.run([
      join(repoRoot, 'fixtures/edge-cases/minimal-valid-style.json'),
    ]);
    expect(result.summary.pass).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('flags string version in fixtures/edge-cases/version-as-string.json', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/edge-cases/version-as-string.json')]);
    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics.map((d) => d.ruleId)).toContain('style/version');
  });

  it('flags null sources in fixtures/edge-cases/sources-null.json', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/edge-cases/sources-null.json')]);
    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics.map((d) => d.ruleId)).toContain('style/sources-present');
  });

  it('flags non-array layers in fixtures/edge-cases/layers-not-array.json', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/edge-cases/layers-not-array.json')]);
    expect(result.summary.pass).toBe(false);
    expect(result.diagnostics.map((d) => d.ruleId)).toContain('style/layers-present');
  });

  it('passes on equal min/max zoom in fixtures/edge-cases/zoom-equal.json', async () => {
    const result = await engine.run([join(repoRoot, 'fixtures/edge-cases/zoom-equal.json')]);
    expect(result.summary.pass).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('passes on background layer without source in fixtures/edge-cases/background-no-source.json', async () => {
    const result = await engine.run([
      join(repoRoot, 'fixtures/edge-cases/background-no-source.json'),
    ]);
    expect(result.summary.pass).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });
});
