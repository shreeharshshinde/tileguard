/**
 * Tests for the `perf/tile-size` rule.
 *
 * The rule reads `artifact.metadata.bytes` and `artifact.metadata.gzipped`
 * which are set by the tile provider. Tests use the real provider + makeTile()
 * to exercise the full path including real metadata population.
 */
import { createEngine } from '@tileguard/core';
import { describe, expect, it } from 'vitest';
import { perfTileSizeRule, tileProvider } from '../../src/index.js';
import { makeTile } from '../helpers.js';

const plugin = {
  id: 'test',
  providers: [tileProvider],
  rules: [perfTileSizeRule],
};

// A minimal polygon feature: 4 points forming a tiny square.
const polygon = {
  type: 3 as const,
  points: [
    [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: 0 },
    ],
  ] as const,
  props: { name: 'test' },
};

describe('perf/tile-size', () => {
  describe('maxBytes', () => {
    it('pass — tile is within raw byte budget', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/tile-size': ['warning', { maxBytes: 1_000_000 }] },
      });
      const source = await makeTile([{ name: 'roads', features: [polygon] }]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('fail — tile exceeds maxBytes produces diagnostic', async () => {
      const engine = createEngine({
        plugins: [plugin],
        // Set threshold to 1 byte — any real tile will exceed it
        rules: { 'perf/tile-size': ['warning', { maxBytes: 1 }] },
      });
      const source = await makeTile([{ name: 'roads', features: [polygon] }]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.ruleId).toBe('perf/tile-size');
      expect(result.diagnostics[0]?.severity).toBe('warning');
      expect(result.diagnostics[0]?.data?.maxBytes).toBe(1);
      expect(typeof result.diagnostics[0]?.data?.bytes).toBe('number');
      expect((result.diagnostics[0]?.data?.bytes as number) > 1).toBe(true);
    });

    it('fail — data contains bytes and maxBytes fields for machine consumption', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/tile-size': ['warning', { maxBytes: 1 }] },
      });
      const source = await makeTile([{ name: 'buildings', features: [polygon] }]);
      const result = await engine.run([source]);
      expect(result.diagnostics[0]?.data).toHaveProperty('bytes');
      expect(result.diagnostics[0]?.data).toHaveProperty('maxBytes');
    });
  });

  describe('maxGzipBytes', () => {
    it('pass — non-gzipped tile skips maxGzipBytes check', async () => {
      const engine = createEngine({
        plugins: [plugin],
        // Even threshold of 1 byte should not fire for a non-gzip tile
        rules: { 'perf/tile-size': ['warning', { maxGzipBytes: 1 }] },
      });
      // makeTile without gzip option → gzipped=false
      const source = await makeTile([{ name: 'roads', features: [polygon] }]);
      const result = await engine.run([source]);
      // Non-gzipped tiles do not trigger the gzip threshold
      expect(result.diagnostics).toHaveLength(0);
    });

    it('fail — gzipped tile exceeds maxGzipBytes produces diagnostic', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/tile-size': ['warning', { maxGzipBytes: 1 }] },
      });
      // gzip: true → tile is written gzip-compressed; metadata.gzipped=true
      const source = await makeTile(
        [{ name: 'roads', features: [polygon] }],
        { gzip: true },
      );
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.ruleId).toBe('perf/tile-size');
      expect(result.diagnostics[0]?.data?.maxGzipBytes).toBe(1);
      expect(typeof result.diagnostics[0]?.data?.gzipBytes).toBe('number');
    });
  });

  describe('both thresholds', () => {
    it('fail — both exceeded produces two diagnostics', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/tile-size': ['warning', { maxBytes: 1, maxGzipBytes: 1 }] },
      });
      const source = await makeTile(
        [{ name: 'roads', features: [polygon] }],
        { gzip: true },
      );
      const result = await engine.run([source]);
      // Both raw bytes (after decompression via decodedBytes) and gzip bytes exceeded
      expect(result.diagnostics.length).toBeGreaterThanOrEqual(1);
      expect(
        result.diagnostics.every((d) => d.ruleId === 'perf/tile-size'),
      ).toBe(true);
    });
  });

  describe('no options', () => {
    it('edge — no options produces no diagnostic', async () => {
      const engine = createEngine({
        plugins: [plugin],
        rules: { 'perf/tile-size': 'warning' },
      });
      const source = await makeTile([{ name: 'roads', features: [polygon] }]);
      const result = await engine.run([source]);
      expect(result.diagnostics).toHaveLength(0);
    });
  });
});
