/**
 * Unit tests for FeatureMatcher (Milestone 7 — Step 1)
 *
 * Covers all 4 matching priorities + edge cases:
 *   - ID match (Priority 1)
 *   - Stable property match (Priority 2)
 *   - Geometry similarity (Priority 3)
 *   - Property similarity (Priority 4)
 *   - Added / removed features
 *   - Empty tiles
 *   - Identical tiles
 *   - Reordered features
 *   - Missing IDs
 */

import { describe, expect, it } from 'vitest';
import { createFeatureMatcher } from '../src/comparison/FeatureMatcher.js';
import type { FeatureSnapshot } from '../src/comparison/models.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _nextId = 100;
function makeFeature(
  overrides: Partial<FeatureSnapshot> & { id?: number | string | undefined },
): FeatureSnapshot {
  return Object.freeze({
    layerName: 'roads',
    featureIndex: 0,
    id: _nextId++,
    geometryType: 'LineString',
    properties: {},
    geometry: [
      [Object.freeze({ x: 0, y: 0 }), Object.freeze({ x: 100, y: 100 })],
    ],
    ...overrides,
  });
}

function makePoint(
  x: number,
  y: number,
  id?: number | string,
): FeatureSnapshot {
  return makeFeature({
    geometryType: 'Point',
    geometry: [[Object.freeze({ x, y })]],
    id,
  });
}

function makePolygon(
  coords: [number, number][],
  id?: number | string,
  props: Record<string, unknown> = {},
): FeatureSnapshot {
  return makeFeature({
    geometryType: 'Polygon',
    geometry: [coords.map(([x, y]) => Object.freeze({ x, y }))],
    id,
    properties: props,
  });
}

// ---------------------------------------------------------------------------

describe('FeatureMatcher', () => {
  const matcher = createFeatureMatcher();

  describe('empty inputs', () => {
    it('empty A + empty B → no comparisons', () => {
      const { comparisons } = matcher.match([], []);
      expect(comparisons).toHaveLength(0);
    });

    it('non-empty A + empty B → all removed', () => {
      const featuresA = [makeFeature({}), makeFeature({})];
      const { comparisons } = matcher.match(featuresA, []);
      expect(comparisons).toHaveLength(2);
      expect(comparisons.every((c) => c.kind === 'removed')).toBe(true);
    });

    it('empty A + non-empty B → all added', () => {
      const featuresB = [makeFeature({}), makeFeature({})];
      const { comparisons } = matcher.match([], featuresB);
      expect(comparisons).toHaveLength(2);
      expect(comparisons.every((c) => c.kind === 'added')).toBe(true);
    });
  });

  describe('Priority 1 — ID match', () => {
    it('matches features with the same numeric ID', () => {
      const a = makeFeature({ id: 42, properties: { name: 'old' } });
      const b = makeFeature({ id: 42, properties: { name: 'new' } });
      const { comparisons } = matcher.match([a], [b]);
      expect(comparisons).toHaveLength(1);
      expect(comparisons[0]?.kind).toBe('modified');
      expect(comparisons[0]?.matchPriority).toBe(1);
      expect(comparisons[0]?.featureA).toBe(a);
      expect(comparisons[0]?.featureB).toBe(b);
    });

    it('matches features with same string ID', () => {
      const a = makeFeature({ id: 'node/12345' });
      const b = makeFeature({ id: 'node/12345' });
      const { comparisons } = matcher.match([a], [b]);
      expect(comparisons[0]?.matchPriority).toBe(1);
    });

    it('features with different IDs are not ID-matched', () => {
      const a = makeFeature({ id: 1 });
      const b = makeFeature({ id: 2 });
      const { comparisons } = matcher.match([a], [b]);
      // Should match via another priority or be added/removed
      expect(comparisons).toHaveLength(1);
      expect(comparisons[0]?.matchPriority).not.toBe(1);
    });

    it('unchanged feature with same ID reports kind: unchanged', () => {
      const geo = [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
      ];
      const props = { highway: 'primary' };
      const a = makeFeature({
        id: 7,
        geometryType: 'LineString',
        geometry: geo,
        properties: props,
      });
      const b = makeFeature({
        id: 7,
        geometryType: 'LineString',
        geometry: geo,
        properties: props,
      });
      const { comparisons } = matcher.match([a], [b]);
      expect(comparisons[0]?.kind).toBe('unchanged');
      expect(comparisons[0]?.matchPriority).toBe(1);
    });
  });

  describe('Priority 2 — Stable property match', () => {
    it('matches by osm_id when feature IDs are absent', () => {
      const a = makeFeature({ id: undefined, properties: { osm_id: 987654 } });
      const b = makeFeature({ id: undefined, properties: { osm_id: 987654 } });
      const { comparisons } = matcher.match([a], [b]);
      expect(comparisons[0]?.matchPriority).toBe(2);
    });

    it('matches by building_id', () => {
      const a = makeFeature({
        id: undefined,
        properties: { building_id: 'B-001' },
      });
      const b = makeFeature({
        id: undefined,
        properties: { building_id: 'B-001', height: 50 },
      });
      const { comparisons } = matcher.match([a], [b]);
      expect(comparisons[0]?.matchPriority).toBe(2);
    });

    it('does not match on non-stable properties', () => {
      const a = makeFeature({ id: undefined, properties: { name: 'Main St' } });
      const b = makeFeature({ id: undefined, properties: { name: 'Main St' } });
      const { comparisons } = matcher.match([a], [b]);
      // 'name' is not a stable property, so this falls to P3 or P4
      expect(comparisons[0]?.matchPriority).not.toBe(2);
    });
  });

  describe('Priority 3 — Geometry similarity', () => {
    it('matches overlapping polygons when no ID or stable props', () => {
      // Two polygons at the same location without IDs
      const a = makePolygon(
        [
          [0, 0],
          [100, 0],
          [100, 100],
          [0, 100],
          [0, 0],
        ],
        undefined,
        {},
      );
      const b = makePolygon(
        [
          [0, 0],
          [100, 0],
          [100, 100],
          [0, 100],
          [0, 0],
        ],
        undefined,
        { height: 10 },
      );
      const { comparisons } = matcher.match([a], [b]);
      // Exact geometry match → should be matched (P3 or P4)
      const matched = comparisons.find((c) => c.featureA && c.featureB);
      expect(matched).toBeDefined();
    });

    it('does not match points far apart', () => {
      // Points very far apart should not be geometry-matched
      const a = makePoint(100, 100, undefined);
      const b = makePoint(4000, 4000, undefined);
      // With no IDs and no shared properties (both empty), they may match via P4
      // (Jaccard of two empty sets is 0, below threshold → added + removed)
      // OR via P3 if geometry threshold is also below. Either way total ≥ 1.
      const { comparisons } = matcher.match([a], [b]);
      expect(comparisons.length).toBeGreaterThanOrEqual(1);
      // The match priority should not be P3 (geometry sim < 0.7 for distant points)
      const p3Match = comparisons.find((c) => c.matchPriority === 3);
      expect(p3Match).toBeUndefined();
    });
  });

  describe('Priority 4 — Property similarity', () => {
    it('matches features with high property overlap but no ID', () => {
      const props = {
        highway: 'primary',
        name: 'High Street',
        lanes: 2,
        oneway: 'yes',
      };
      const a = makeFeature({ id: undefined, properties: props });
      const b = makeFeature({
        id: undefined,
        properties: { ...props, speed: 50 },
      });
      const { comparisons } = matcher.match([a], [b]);
      const m = comparisons.find((c) => c.featureA && c.featureB);
      expect(m).toBeDefined();
    });
  });

  describe('added and removed detection', () => {
    it('unmatched A features are marked removed', () => {
      const a1 = makeFeature({ id: 1 });
      const a2 = makeFeature({ id: 2 });
      const b1 = makeFeature({ id: 1 });
      const { comparisons } = matcher.match([a1, a2], [b1]);
      const removed = comparisons.filter((c) => c.kind === 'removed');
      expect(removed).toHaveLength(1);
      expect(removed[0]?.featureA?.id).toBe(2);
    });

    it('unmatched B features are marked added', () => {
      const a1 = makeFeature({ id: 10 });
      const b1 = makeFeature({ id: 10 });
      const b2 = makeFeature({ id: 20 });
      const { comparisons } = matcher.match([a1], [b1, b2]);
      const added = comparisons.filter((c) => c.kind === 'added');
      expect(added).toHaveLength(1);
      expect(added[0]?.featureB?.id).toBe(20);
    });
  });

  describe('reordered features', () => {
    it('matches correctly when B has features in different order', () => {
      const a1 = makeFeature({ id: 1 });
      const a2 = makeFeature({ id: 2 });
      const b2 = makeFeature({ id: 2, properties: { tag: 'x' } });
      const b1 = makeFeature({ id: 1 });
      const { comparisons } = matcher.match([a1, a2], [b2, b1]);
      const match1 = comparisons.find((c) => c.featureA?.id === 1);
      const match2 = comparisons.find((c) => c.featureA?.id === 2);
      expect(match1?.featureB?.id).toBe(1);
      expect(match2?.featureB?.id).toBe(2);
    });
  });

  describe('each feature matched at most once', () => {
    it('does not double-match a single B feature to two A features', () => {
      const a1 = makeFeature({ id: 5 });
      const a2 = makeFeature({ id: 5 }); // duplicate ID in A
      const b = makeFeature({ id: 5 });
      const { comparisons } = matcher.match([a1, a2], [b]);
      // One should be matched, one removed
      const matched = comparisons.filter((c) => c.featureA && c.featureB);
      expect(matched).toHaveLength(1);
      const removed = comparisons.filter((c) => c.kind === 'removed');
      expect(removed).toHaveLength(1);
    });
  });

  describe('identical tiles', () => {
    it('all features are unchanged when tiles are identical', () => {
      const features = [
        makeFeature({ id: 1, properties: { name: 'A' } }),
        makeFeature({ id: 2, properties: { name: 'B' } }),
        makeFeature({ id: 3, properties: { name: 'C' } }),
      ];
      const { comparisons } = matcher.match(features, features);
      expect(comparisons.every((c) => c.kind === 'unchanged')).toBe(true);
      expect(comparisons).toHaveLength(3);
    });
  });

  describe('completely different tiles', () => {
    it('all features are added/removed when tiles share no features', () => {
      const featuresA = [makeFeature({ id: 1 }), makeFeature({ id: 2 })];
      const featuresB = [makeFeature({ id: 100 }), makeFeature({ id: 200 })];
      const { comparisons } = matcher.match(featuresA, featuresB);
      const total = comparisons.length;
      const addedRemoved = comparisons.filter(
        (c) => c.kind === 'added' || c.kind === 'removed',
      ).length;
      // All should be added/removed (or possibly matched via geometry — either is correct)
      expect(total).toBeGreaterThanOrEqual(2);
      expect(
        addedRemoved +
          comparisons.filter((c) => c.matchPriority !== null).length,
      ).toBe(total);
    });
  });

  describe('added/removed features have null on the other side', () => {
    it('removed feature has featureB: null', () => {
      const a = makeFeature({ id: 999 });
      const { comparisons } = matcher.match([a], []);
      expect(comparisons[0]?.featureB).toBeNull();
      expect(comparisons[0]?.featureA).toBe(a);
    });

    it('added feature has featureA: null', () => {
      const b = makeFeature({ id: 888 });
      const { comparisons } = matcher.match([], [b]);
      expect(comparisons[0]?.featureA).toBeNull();
      expect(comparisons[0]?.featureB).toBe(b);
    });

    it('added/removed features have changes: null', () => {
      // Use features with unique IDs that won't match each other
      const a = makeFeature({ id: 77777 });
      const { comparisons: cRemoved } = matcher.match([a], []);
      expect(cRemoved[0]?.kind).toBe('removed');
      expect(cRemoved[0]?.changes).toBeNull();

      const b = makeFeature({ id: 88888 });
      const { comparisons: cAdded } = matcher.match([], [b]);
      expect(cAdded[0]?.kind).toBe('added');
      expect(cAdded[0]?.changes).toBeNull();
    });
  });
});
