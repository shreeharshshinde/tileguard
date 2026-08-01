/**
 * @tileguard/inspector — SpatialIndex tests (Milestone 6 — Step 4)
 *
 * Tests the grid-based spatial index: build, point query, region query,
 * deduplication, replacement, and edge cases.
 */

import { describe, expect, it } from 'vitest';
import { createSpatialIndex } from '../src/performance/SpatialIndex.js';
import type { SpatialFeatureRef } from '../src/performance/SpatialIndex.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ref(
  layerName: string,
  featureIndex: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): SpatialFeatureRef {
  return { layerName, featureIndex, bounds: { minX, minY, maxX, maxY } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SpatialIndex', () => {
  // ── Initial state ──────────────────────────────────────────────────────

  it('starts with size 0 before any build', () => {
    expect(createSpatialIndex().size).toBe(0);
  });

  it('query() and queryRegion() on an unbuilt index return empty arrays', () => {
    const index = createSpatialIndex();
    expect(index.query({ x: 100, y: 100 })).toHaveLength(0);
    expect(
      index.queryRegion({ minX: 0, minY: 0, maxX: 4096, maxY: 4096 }),
    ).toHaveLength(0);
  });

  // ── build() ────────────────────────────────────────────────────────────

  it('build() reports the correct feature count via size', () => {
    const index = createSpatialIndex();
    index.build([
      ref('roads', 0, 0, 0, 100, 100),
      ref('roads', 1, 200, 200, 300, 300),
      ref('buildings', 0, 500, 500, 600, 600),
    ]);
    expect(index.size).toBe(3);
  });

  it('build() with an empty list produces size 0', () => {
    const index = createSpatialIndex();
    index.build([]);
    expect(index.size).toBe(0);
  });

  it('build() replaces a previous index', () => {
    const index = createSpatialIndex();
    index.build([ref('old', 0, 0, 0, 100, 100)]);
    index.build([ref('new', 0, 0, 0, 100, 100)]);

    const results = index.query({ x: 50, y: 50 });
    expect(results.some((r) => r.layerName === 'old')).toBe(false);
    expect(results.some((r) => r.layerName === 'new')).toBe(true);
    expect(index.size).toBe(1);
  });

  // ── query(point) ───────────────────────────────────────────────────────

  it('query() returns a feature whose bounding box covers the point', () => {
    const index = createSpatialIndex();
    index.build([ref('roads', 0, 0, 0, 200, 200)]);

    const results = index.query({ x: 100, y: 100 });
    expect(
      results.some((r) => r.layerName === 'roads' && r.featureIndex === 0),
    ).toBe(true);
  });

  it('query() does not return a feature in a far-away cell', () => {
    const index = createSpatialIndex(32, 4096);
    index.build([ref('roads', 0, 0, 0, 10, 10)]); // tiny feature near origin

    // Query a point far from the feature's cell
    const results = index.query({ x: 4090, y: 4090 });
    expect(results.some((r) => r.layerName === 'roads')).toBe(false);
  });

  it('query() returns multiple features in the same cell', () => {
    const index = createSpatialIndex();
    index.build([ref('a', 0, 0, 0, 200, 200), ref('b', 0, 50, 50, 150, 150)]);
    const results = index.query({ x: 100, y: 100 });
    expect(results.some((r) => r.layerName === 'a')).toBe(true);
    expect(results.some((r) => r.layerName === 'b')).toBe(true);
  });

  it('query() clamps out-of-bounds points to the grid boundary', () => {
    const index = createSpatialIndex(32, 4096);
    index.build([ref('edge', 0, 4000, 4000, 4096, 4096)]);

    // Point slightly beyond extent — should not throw, should clamp
    expect(() => index.query({ x: 5000, y: 5000 })).not.toThrow();
    expect(() => index.query({ x: -100, y: -100 })).not.toThrow();
  });

  // ── queryRegion() ──────────────────────────────────────────────────────

  it('queryRegion() returns features that intersect the region', () => {
    const index = createSpatialIndex();
    index.build([
      ref('inside', 0, 100, 100, 400, 400),
      ref('outside', 0, 3000, 3000, 4000, 4000),
    ]);

    const results = index.queryRegion({
      minX: 0,
      minY: 0,
      maxX: 500,
      maxY: 500,
    });
    expect(results.some((r) => r.layerName === 'inside')).toBe(true);
    expect(results.every((r) => r.layerName !== 'outside')).toBe(true);
  });

  it('queryRegion() deduplicates a feature that spans multiple cells', () => {
    const index = createSpatialIndex();
    index.build([ref('big', 0, 0, 0, 4096, 4096)]);

    const results = index.queryRegion({
      minX: 0,
      minY: 0,
      maxX: 4096,
      maxY: 4096,
    });
    const bigHits = results.filter((r) => r.layerName === 'big');
    expect(bigHits).toHaveLength(1);
  });

  it('queryRegion() returns empty array when no features overlap', () => {
    const index = createSpatialIndex();
    index.build([ref('far', 0, 3500, 3500, 4096, 4096)]);

    const results = index.queryRegion({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 100,
    });
    expect(results).toHaveLength(0);
  });

  // ── Custom constructor options ─────────────────────────────────────────

  it('accepts custom grid size', () => {
    const index = createSpatialIndex(8, 4096);
    index.build([ref('a', 0, 0, 0, 100, 100)]);
    expect(index.size).toBe(1);
    expect(index.query({ x: 50, y: 50 }).some((r) => r.layerName === 'a')).toBe(
      true,
    );
  });

  it('accepts custom extent (e.g. 256)', () => {
    const index = createSpatialIndex(8, 256);
    index.build([ref('tiny', 0, 0, 0, 50, 50)]);
    expect(index.size).toBe(1);
  });

  // ── Large datasets ─────────────────────────────────────────────────────

  it('handles 1000 features without throwing', () => {
    const index = createSpatialIndex();
    const features: SpatialFeatureRef[] = Array.from(
      { length: 1000 },
      (_, i) => ({
        layerName: 'layer',
        featureIndex: i,
        bounds: {
          minX: (i % 64) * 64,
          minY: Math.floor(i / 64) * 64,
          maxX: (i % 64) * 64 + 32,
          maxY: Math.floor(i / 64) * 64 + 32,
        },
      }),
    );
    expect(() => index.build(features)).not.toThrow();
    expect(index.size).toBe(1000);
    expect(() => index.query({ x: 100, y: 100 })).not.toThrow();
  });
});
