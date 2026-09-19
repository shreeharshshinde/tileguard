/**
 * Tests for the `perf/vertex-budget` rule.
 */
import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { perfVertexBudgetRule, tileProvider } from '../../src/index.js';
import { makeTile } from '../helpers.js';

const plugin = {
  id: 'test',
  providers: [tileProvider],
  rules: [perfVertexBudgetRule],
};

/** Build a LineString with exactly `n` vertices. */
function makeLineWithVertices(n: number) {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    points.push({ x: i, y: i });
  }
  return {
    type: 2 as const,
    points: [points] as const,
    props: {},
  };
}

describe('perf/vertex-budget', () => {
  describe('maxVerticesPerFeature', () => {
    it('pass — feature within per-feature vertex budget', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/vertex-budget': ['warning', { maxVerticesPerFeature: 100 }] },
      });
      const source = await makeTile([
        { name: 'roads', features: [makeLineWithVertices(10)] },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('fail — feature exceeds per-feature vertex budget', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/vertex-budget': ['warning', { maxVerticesPerFeature: 5 }] },
      });
      const source = await makeTile([
        { name: 'roads', features: [makeLineWithVertices(10)] },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.ruleId).toBe('perf/vertex-budget');
      expect(result.diagnostics[0]?.severity).toBe('warning');
      expect(result.diagnostics[0]?.location?.layer).toBe('roads');
      expect(result.diagnostics[0]?.location?.featureIndex).toBe(0);
      expect(result.diagnostics[0]?.data?.vertexCount).toBe(10);
      expect(result.diagnostics[0]?.data?.maxVerticesPerFeature).toBe(5);
    });

    it('fail — multiple offending features each get their own diagnostic', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/vertex-budget': ['warning', { maxVerticesPerFeature: 3 }] },
      });
      const source = await makeTile([
        {
          name: 'roads',
          features: [makeLineWithVertices(10), makeLineWithVertices(10)],
        },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(2);
      expect(result.diagnostics[0]?.location?.featureIndex).toBe(0);
      expect(result.diagnostics[1]?.location?.featureIndex).toBe(1);
    });

    it('fail — offending features in multiple layers are all reported', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/vertex-budget': ['warning', { maxVerticesPerFeature: 3 }] },
      });
      const source = await makeTile([
        { name: 'roads', features: [makeLineWithVertices(10)] },
        { name: 'buildings', features: [makeLineWithVertices(10)] },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(2);
      const layers = result.diagnostics.map((d) => d.location?.layer);
      expect(layers).toContain('roads');
      expect(layers).toContain('buildings');
    });

    it('edge — exactly at the limit passes', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/vertex-budget': ['warning', { maxVerticesPerFeature: 10 }] },
      });
      const source = await makeTile([
        { name: 'roads', features: [makeLineWithVertices(10)] },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('edge — one vertex over the limit fails', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/vertex-budget': ['warning', { maxVerticesPerFeature: 10 }] },
      });
      const source = await makeTile([
        { name: 'roads', features: [makeLineWithVertices(11)] },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(1);
    });
  });

  describe('maxVerticesPerTile', () => {
    it('pass — tile within total vertex budget', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/vertex-budget': ['warning', { maxVerticesPerTile: 1000 }] },
      });
      const source = await makeTile([
        { name: 'roads', features: [makeLineWithVertices(10)] },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('fail — tile exceeds total vertex budget produces tile-level diagnostic', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/vertex-budget': ['warning', { maxVerticesPerTile: 5 }] },
      });
      const source = await makeTile([
        { name: 'roads', features: [makeLineWithVertices(10)] },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.ruleId).toBe('perf/vertex-budget');
      // Tile-level diagnostic has no layer location
      expect(result.diagnostics[0]?.location).toBeUndefined();
      expect(result.diagnostics[0]?.data?.totalVertices).toBe(10);
      expect(result.diagnostics[0]?.data?.maxVerticesPerTile).toBe(5);
    });
  });

  describe('both thresholds', () => {
    it('fail — per-feature + tile both exceeded produces multiple diagnostics', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: {
          'perf/vertex-budget': ['warning', {
            maxVerticesPerFeature: 3,
            maxVerticesPerTile: 5,
          }],
        },
      });
      const source = await makeTile([
        { name: 'roads', features: [makeLineWithVertices(10)] },
      ]);
      const result = await engine.run([source]);
      // One per-feature diagnostic + one tile-level diagnostic
      expect(result.diagnostics.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('no options', () => {
    it('edge — no options produces no diagnostic even for large features', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/vertex-budget': 'warning' },
      });
      const source = await makeTile([
        { name: 'roads', features: [makeLineWithVertices(10000)] },
      ]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(0);
    });
  });
});
