/**
 * Unit tests for GeometryDiffer (Milestone 7 — Step 1)
 */

import { describe, expect, it } from 'vitest';
import { createGeometryDiffer } from '../src/comparison/GeometryDiffer.js';
import type { FeatureSnapshot } from '../src/comparison/models.js';

function makeFeature(
  geometryType: string,
  geometry: readonly (readonly { x: number; y: number }[])[],
): FeatureSnapshot {
  return Object.freeze({
    layerName: 'test',
    featureIndex: 0,
    id: 1,
    geometryType,
    properties: {},
    geometry,
  });
}

const ring = (coords: [number, number][]) =>
  coords.map(([x, y]) => Object.freeze({ x, y }));

describe('GeometryDiffer', () => {
  const differ = createGeometryDiffer();

  describe('identical geometry', () => {
    it('returns changed: false for identical LineStrings', () => {
      const geo = [
        ring([
          [0, 0],
          [100, 100],
          [200, 0],
        ]),
      ];
      const diff = differ.diff(
        makeFeature('LineString', geo),
        makeFeature('LineString', geo),
      );
      expect(diff.changed).toBe(false);
      expect(diff.typeChanged).toBe(false);
      expect(diff.vertexCountDelta).toBe(0);
      expect(diff.ringCountDelta).toBe(0);
      expect(diff.boundsChanged).toBe(false);
      expect(diff.centroidShift).toBeCloseTo(0, 1);
    });

    it('returns changed: false for identical Points', () => {
      const geo = [ring([[512, 512]])];
      expect(
        differ.diff(makeFeature('Point', geo), makeFeature('Point', geo))
          .changed,
      ).toBe(false);
    });

    it('returns changed: false for identical multi-ring Polygons', () => {
      const outer = ring([
        [0, 0],
        [2000, 0],
        [2000, 2000],
        [0, 2000],
        [0, 0],
      ]);
      const hole = ring([
        [500, 500],
        [1500, 500],
        [1500, 1500],
        [500, 1500],
        [500, 500],
      ]);
      const geo = [outer, hole];
      expect(
        differ.diff(makeFeature('Polygon', geo), makeFeature('Polygon', geo))
          .changed,
      ).toBe(false);
    });
  });

  describe('geometry type changes', () => {
    it('detects type change from Point to Polygon', () => {
      const a = makeFeature('Point', [ring([[0, 0]])]);
      const b = makeFeature('Polygon', [
        ring([
          [0, 0],
          [100, 0],
          [100, 100],
          [0, 100],
          [0, 0],
        ]),
      ]);
      const diff = differ.diff(a, b);
      expect(diff.typeChanged).toBe(true);
      expect(diff.typeA).toBe('Point');
      expect(diff.typeB).toBe('Polygon');
      expect(diff.changed).toBe(true);
    });
  });

  describe('vertex count changes', () => {
    it('detects added vertices', () => {
      const a = makeFeature('LineString', [
        ring([
          [0, 0],
          [100, 100],
        ]),
      ]);
      const b = makeFeature('LineString', [
        ring([
          [0, 0],
          [50, 50],
          [100, 100],
        ]),
      ]);
      const diff = differ.diff(a, b);
      expect(diff.vertexCountA).toBe(2);
      expect(diff.vertexCountB).toBe(3);
      expect(diff.vertexCountDelta).toBe(1);
      expect(diff.changed).toBe(true);
    });

    it('detects removed vertices', () => {
      const a = makeFeature('LineString', [
        ring([
          [0, 0],
          [50, 50],
          [100, 100],
        ]),
      ]);
      const b = makeFeature('LineString', [
        ring([
          [0, 0],
          [100, 100],
        ]),
      ]);
      const diff = differ.diff(a, b);
      expect(diff.vertexCountDelta).toBe(-1);
    });

    it('counts vertices across multiple rings', () => {
      const r1 = ring([
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
        [0, 0],
      ]); // 5
      const r2 = ring([
        [200, 200],
        [300, 200],
        [300, 300],
      ]); // 3
      const diff = differ.diff(
        makeFeature('Polygon', [r1, r2]),
        makeFeature('Polygon', [r1, r2]),
      );
      expect(diff.vertexCountA).toBe(8);
    });
  });

  describe('ring count changes', () => {
    it('detects added ring', () => {
      const outer = ring([
        [0, 0],
        [2000, 0],
        [2000, 2000],
        [0, 2000],
        [0, 0],
      ]);
      const hole = ring([
        [500, 500],
        [1500, 500],
        [1500, 1500],
        [500, 1500],
        [500, 500],
      ]);
      const a = makeFeature('Polygon', [outer]);
      const b = makeFeature('Polygon', [outer, hole]);
      const diff = differ.diff(a, b);
      expect(diff.ringCountA).toBe(1);
      expect(diff.ringCountB).toBe(2);
      expect(diff.ringCountDelta).toBe(1);
    });
  });

  describe('bounds', () => {
    it('detects bounds expansion', () => {
      const a = makeFeature('Polygon', [
        ring([
          [0, 0],
          [100, 0],
          [100, 100],
          [0, 100],
          [0, 0],
        ]),
      ]);
      const b = makeFeature('Polygon', [
        ring([
          [0, 0],
          [200, 0],
          [200, 200],
          [0, 200],
          [0, 0],
        ]),
      ]);
      expect(differ.diff(a, b).boundsChanged).toBe(true);
    });

    it('reports correct bounds', () => {
      const diff = differ.diff(
        makeFeature('LineString', [
          ring([
            [10, 20],
            [300, 400],
          ]),
        ]),
        makeFeature('LineString', [
          ring([
            [10, 20],
            [300, 400],
          ]),
        ]),
      );
      expect(diff.boundsA).toEqual({
        minX: 10,
        minY: 20,
        maxX: 300,
        maxY: 400,
      });
    });
  });

  describe('centroid', () => {
    it('computes centroid shift when feature moves', () => {
      const a = makeFeature('Point', [ring([[0, 0]])]);
      const b = makeFeature('Point', [ring([[100, 100]])]);
      const diff = differ.diff(a, b);
      // sqrt(100^2 + 100^2) ≈ 141.4
      expect(diff.centroidShift).toBeGreaterThan(140);
      expect(diff.centroidShift).toBeLessThan(143);
    });
  });

  describe('empty geometry', () => {
    it('handles empty geometry on both sides', () => {
      const diff = differ.diff(
        makeFeature('Point', []),
        makeFeature('Point', []),
      );
      expect(diff.vertexCountA).toBe(0);
      expect(diff.vertexCountB).toBe(0);
      expect(diff.changed).toBe(false);
    });

    it('detects change from empty to non-empty', () => {
      const a = makeFeature('LineString', []);
      const b = makeFeature('LineString', [
        ring([
          [0, 0],
          [100, 100],
        ]),
      ]);
      const diff = differ.diff(a, b);
      expect(diff.changed).toBe(true);
      expect(diff.vertexCountDelta).toBe(2);
    });
  });
});
