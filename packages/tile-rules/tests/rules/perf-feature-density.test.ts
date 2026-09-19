/**
 * Tests for the `perf/feature-density` rule.
 */
import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { perfFeatureDensityRule, tileProvider } from '../../src/index.js';
import { makeTile, type FeatureDesc } from '../helpers.js';

const plugin = {
  id: 'test',
  providers: [tileProvider],
  rules: [perfFeatureDensityRule],
};

const point: FeatureDesc = {
  type: 1,
  points: [[{ x: 10, y: 10 }]],
  props: {},
};

/** Build an array of `n` identical point features. */
function makePoints(n: number): FeatureDesc[] {
  return Array.from({ length: n }, () => ({ ...point }));
}

describe('perf/feature-density', () => {
  describe('maxFeaturesPerLayer (global default)', () => {
    it('pass — layer within global default budget', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/feature-density': ['warning', { maxFeaturesPerLayer: 100 }] },
      });
      const source = await makeTile([
        { name: 'poi', features: makePoints(50) },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('fail — layer exceeds global default budget', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/feature-density': ['warning', { maxFeaturesPerLayer: 10 }] },
      });
      const source = await makeTile([
        { name: 'poi', features: makePoints(50) },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.ruleId).toBe('perf/feature-density');
      expect(result.diagnostics[0]?.severity).toBe('warning');
      expect(result.diagnostics[0]?.location?.layer).toBe('poi');
      expect(result.diagnostics[0]?.data?.featureCount).toBe(50);
      expect(result.diagnostics[0]?.data?.maxFeatures).toBe(10);
    });

    it('fail — multiple layers exceeding budget each produce a diagnostic', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/feature-density': ['warning', { maxFeaturesPerLayer: 5 }] },
      });
      const source = await makeTile([
        { name: 'poi', features: makePoints(20) },
        { name: 'roads', features: makePoints(20) },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(2);
      const layers = result.diagnostics.map((d) => d.location?.layer);
      expect(layers).toContain('poi');
      expect(layers).toContain('roads');
    });

    it('edge — exactly at the limit passes', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/feature-density': ['warning', { maxFeaturesPerLayer: 10 }] },
      });
      const source = await makeTile([
        { name: 'poi', features: makePoints(10) },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(0);
    });
  });

  describe('per-layer overrides', () => {
    it('pass — per-layer override takes priority over global default', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: {
          'perf/feature-density': ['warning', {
            maxFeaturesPerLayer: 5,
            layers: { poi: { maxFeatures: 100 } },
          }],
        },
      });
      const source = await makeTile([
        { name: 'poi', features: makePoints(50) },
      ]);
      const result = await engine.run([source]);
      // poi uses its override of 100, not the global 5
      expect(result.diagnostics).toHaveLength(0);
    });

    it('fail — per-layer override fires at its own threshold', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: {
          'perf/feature-density': ['warning', {
            maxFeaturesPerLayer: 1000,
            layers: { poi: { maxFeatures: 10 } },
          }],
        },
      });
      const source = await makeTile([
        { name: 'poi', features: makePoints(50) },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.data?.maxFeatures).toBe(10);
    });

    it('pass — layer entry without maxFeatures opts out of global default', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: {
          'perf/feature-density': ['warning', {
            maxFeaturesPerLayer: 5,
            // roads listed but no maxFeatures → skip for roads
            layers: { roads: {} },
          }],
        },
      });
      const source = await makeTile([
        { name: 'roads', features: makePoints(50) },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('pass — unconfigured layer with no global default is skipped', async () => {
      const engine = createEngine({
        plugins: [plugin],
        // No global default, no layer entry for 'water'
        rules: {
          'perf/feature-density': ['warning', {
            layers: { poi: { maxFeatures: 100 } },
          }],
        },
      });
      const source = await makeTile([
        { name: 'water', features: makePoints(50000) },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(0);
    });
  });

  describe('no options', () => {
    it('edge — no options produces no diagnostic', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/feature-density': 'warning' },
      });
      const source = await makeTile([
        { name: 'poi', features: makePoints(100000) },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(0);
    });
  });
});
