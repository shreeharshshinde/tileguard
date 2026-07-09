import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { layerFeatureCountRule, tileProvider } from '../../src/index.js';
import { makeTile } from '../helpers.js';

const plugin = { id: 'test', providers: [tileProvider], rules: [layerFeatureCountRule] };

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

describe('tile/layer-feature-count', () => {
  it('pass — all layers within configured bounds', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: {
        'tile/layer-feature-count': [
          'warning',
          {
            layers: { roads: { min: 1, max: 10 }, water: { min: 1 } },
          },
        ],
      },
    });
    const source = await makeTile([
      { name: 'roads', features: [line, line] },
      { name: 'water', features: [line] },
    ]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('fail — layer below min produces diagnostic with layer name and counts in data', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/layer-feature-count': ['warning', { layers: { roads: { min: 5 } } }] },
    });
    const source = await makeTile([{ name: 'roads', features: [line] }]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('tile/layer-feature-count');
    expect(result.diagnostics[0]?.location?.layer).toBe('roads');
    expect(result.diagnostics[0]?.data?.layer).toBe('roads');
    expect(result.diagnostics[0]?.data?.count).toBe(1);
    expect(result.diagnostics[0]?.data?.min).toBe(5);
  });

  it('fail — layer above max produces diagnostic', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/layer-feature-count': ['warning', { layers: { roads: { max: 1 } } }] },
    });
    const source = await makeTile([{ name: 'roads', features: [line, line, line] }]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.data?.count).toBe(3);
    expect(result.diagnostics[0]?.data?.max).toBe(1);
  });

  it('edge — unconfigured layer is skipped silently', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: { 'tile/layer-feature-count': ['warning', { layers: { water: { min: 1 } } }] },
    });
    // Only 'roads' present, but config only checks 'water' — 'water' is absent, skipped
    const source = await makeTile([{ name: 'roads', features: [line] }]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('edge — legacy layerConfig alias works', async () => {
    const engine = createEngine({
      plugins: [plugin],
      rules: {
        'tile/layer-feature-count': ['warning', { layerConfig: { roads: { minFeatures: 5 } } }],
      },
    });
    const source = await makeTile([{ name: 'roads', features: [line] }]);
    const result = await engine.run([source]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.data?.min).toBe(5);
  });
});
