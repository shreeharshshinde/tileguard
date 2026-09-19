/**
 * Tests for the `perf/layer-size` rule.
 *
 * The rule estimates layer contribution as a fraction of total tile vertices.
 * Tests deliberately construct tiles with controlled vertex distributions
 * to make fractions predictable.
 */
import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { perfLayerSizeRule, tileProvider } from '../../src/index.js';
import { makeTile, type FeatureDesc } from '../helpers.js';

const plugin = {
  id: 'test',
  providers: [tileProvider],
  rules: [perfLayerSizeRule],
};

/** Build a LineString with exactly `n` vertices. */
function makeLineWithVertices(n: number): FeatureDesc {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    points.push({ x: i, y: i });
  }
  return {
    type: 2,
    points: [points],
    props: {},
  };
}

describe('perf/layer-size', () => {
  describe('maxLayerFraction', () => {
    it('pass — layer fraction within budget', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/layer-size': ['info', { maxLayerFraction: 0.6 }] },
      });
      // roads = 40 vertices, buildings = 60 vertices → roads = 40%, buildings = 60%
      // Neither exceeds 60% (buildings is exactly 60%, not > 60%)
      const source = await makeTile([
        { name: 'roads', features: [makeLineWithVertices(40)] },
        { name: 'buildings', features: [makeLineWithVertices(60)] },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('fail — dominant layer exceeds fraction budget', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/layer-size': ['info', { maxLayerFraction: 0.4 }] },
      });
      // roads = 90 vertices, buildings = 10 vertices → roads = 90%
      const source = await makeTile([
        { name: 'roads', features: [makeLineWithVertices(90)] },
        { name: 'buildings', features: [makeLineWithVertices(10)] },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.ruleId).toBe('perf/layer-size');
      expect(result.diagnostics[0]?.severity).toBe('info');
      expect(result.diagnostics[0]?.location?.layer).toBe('roads');
      expect(result.diagnostics[0]?.data?.layer).toBe('roads');
      expect(result.diagnostics[0]?.data?.maxLayerFraction).toBe(0.4);
      // estimatedFraction should be ~0.9
      const frac = result.diagnostics[0]?.data?.estimatedFraction as number;
      expect(frac).toBeCloseTo(0.9, 1);
    });

    it('fail — both layers exceed fraction when tile has two equal-dominant layers', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/layer-size': ['info', { maxLayerFraction: 0.3 }] },
      });
      // roads = 50 vertices, buildings = 50 vertices → each = 50%
      const source = await makeTile([
        { name: 'roads', features: [makeLineWithVertices(50)] },
        { name: 'buildings', features: [makeLineWithVertices(50)] },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(2);
      const layers = result.diagnostics.map((d) => d.location?.layer);
      expect(layers).toContain('roads');
      expect(layers).toContain('buildings');
    });

    it('data — contains layer, layerVertices, totalVertices, estimatedFraction', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/layer-size': ['info', { maxLayerFraction: 0.4 }] },
      });
      const source = await makeTile([
        { name: 'roads', features: [makeLineWithVertices(90)] },
        { name: 'buildings', features: [makeLineWithVertices(10)] },
      ]);
      const result = await engine.run([source]);
      const data = result.diagnostics[0]?.data!;
      expect(data.layer).toBe('roads');
      expect(data.layerVertices).toBe(90);
      expect(data.totalVertices).toBe(100);
      expect(data.estimatedFraction).toBe(0.9);
      expect(data.maxLayerFraction).toBe(0.4);
    });
  });

  describe('edge cases', () => {
    it('edge — no options produces no diagnostic', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/layer-size': 'info' },
      });
      const source = await makeTile([
        { name: 'roads', features: [makeLineWithVertices(100)] },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('edge — tile with zero total vertices produces no diagnostic', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/layer-size': ['info', { maxLayerFraction: 0.5 }] },
      });
      // A tile with an empty layer (no features) → zero vertices
      const source = await makeTile([{ name: 'empty', features: [] }]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('edge — single layer always equals 100% (1.0 fraction) if maxLayerFraction < 1.0', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/layer-size': ['info', { maxLayerFraction: 0.99 }] },
      });
      const source = await makeTile([
        { name: 'roads', features: [makeLineWithVertices(10)] },
      ]);
      const result = await engine.run([source]);
      // 1 layer = 100% → exceeds 99% limit
      expect(result.diagnostics).toHaveLength(1);
      expect((result.diagnostics[0]?.data?.estimatedFraction as number)).toBe(1);
    });
  });
});
