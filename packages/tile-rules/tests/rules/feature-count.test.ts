import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { featureCountRule, tileProvider } from '../../src/index.js';
import { makeTile } from '../helpers.js';

const plugin = { id: 'test', providers: [tileProvider], rules: [featureCountRule] };

const line = {
  type: 2 as const,
  points: [
    [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ],
  ] as const,
  props: {},
};

describe('tile/feature-count', () => {
  it('pass — feature count within bounds produces no diagnostic', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/feature-count': ['warning', { min: 1, max: 5 }] },
    });
    const source = await makeTile([{ name: 'roads', features: [line, line, line] }]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('fail — below min reports too-few diagnostic', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/feature-count': ['warning', { min: 5 }] },
    });
    const source = await makeTile([{ name: 'roads', features: [line] }]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('tile/feature-count');
    expect(result.diagnostics[0]?.data?.count).toBe(1);
    expect(result.diagnostics[0]?.data?.min).toBe(5);
  });

  it('fail — above max reports too-many diagnostic', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/feature-count': ['warning', { max: 1 }] },
    });
    const source = await makeTile([{ name: 'roads', features: [line, line, line] }]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.data?.count).toBe(3);
    expect(result.diagnostics[0]?.data?.max).toBe(1);
  });

  it('edge — no options produces no diagnostic', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/feature-count': 'warning' },
    });
    const source = await makeTile([{ name: 'roads', features: [line] }]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('edge — legacy minFeatures/maxFeatures aliases work', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/feature-count': ['warning', { minFeatures: 5 }] },
    });
    const source = await makeTile([{ name: 'roads', features: [line] }]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.data?.min).toBe(5);
  });
});
