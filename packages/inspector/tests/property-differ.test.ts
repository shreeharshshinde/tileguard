/**
 * Unit tests for PropertyDiffer (Milestone 7 — Step 1)
 */

import { describe, expect, it } from 'vitest';
import type { FeatureSnapshot } from '../src/comparison/models.js';
import { createPropertyDiffer } from '../src/comparison/PropertyDiffer.js';

function makeFeature(properties: Record<string, unknown>): FeatureSnapshot {
  return Object.freeze({
    layerName: 'test',
    featureIndex: 0,
    id: 1,
    geometryType: 'Point',
    properties: Object.freeze(properties),
    geometry: [],
  });
}

describe('PropertyDiffer', () => {
  const differ = createPropertyDiffer();

  describe('identical properties', () => {
    it('returns changed: false for identical simple props', () => {
      const diff = differ.diff(
        makeFeature({ name: 'River Thames', width: 50 }),
        makeFeature({ name: 'River Thames', width: 50 }),
      );
      expect(diff.changed).toBe(false);
      expect(diff.entries).toHaveLength(0);
      expect(diff.addedCount).toBe(0);
      expect(diff.removedCount).toBe(0);
      expect(diff.modifiedCount).toBe(0);
    });

    it('returns changed: false for empty props on both sides', () => {
      const diff = differ.diff(makeFeature({}), makeFeature({}));
      expect(diff.changed).toBe(false);
    });
  });

  describe('added properties', () => {
    it('detects a newly added property', () => {
      const diff = differ.diff(
        makeFeature({ name: 'road' }),
        makeFeature({ name: 'road', lanes: 4 }),
      );
      expect(diff.changed).toBe(true);
      expect(diff.addedCount).toBe(1);
      const added = diff.entries.find((e) => e.kind === 'added');
      expect(added?.key).toBe('lanes');
      expect((added as { valueB: unknown }).valueB).toBe(4);
    });

    it('detects multiple added properties', () => {
      const diff = differ.diff(
        makeFeature({}),
        makeFeature({ a: 1, b: 2, c: 3 }),
      );
      expect(diff.addedCount).toBe(3);
      expect(diff.removedCount).toBe(0);
      expect(diff.modifiedCount).toBe(0);
    });
  });

  describe('removed properties', () => {
    it('detects a removed property', () => {
      const diff = differ.diff(
        makeFeature({ bridge: 'yes', name: 'bridge' }),
        makeFeature({ name: 'bridge' }),
      );
      expect(diff.changed).toBe(true);
      expect(diff.removedCount).toBe(1);
      const removed = diff.entries.find((e) => e.kind === 'removed');
      expect(removed?.key).toBe('bridge');
    });

    it('all properties removed', () => {
      const diff = differ.diff(makeFeature({ x: 1, y: 2 }), makeFeature({}));
      expect(diff.removedCount).toBe(2);
      expect(diff.addedCount).toBe(0);
    });
  });

  describe('modified properties', () => {
    it('detects a changed string value', () => {
      const diff = differ.diff(
        makeFeature({ bridge: 'no' }),
        makeFeature({ bridge: 'yes' }),
      );
      expect(diff.changed).toBe(true);
      expect(diff.modifiedCount).toBe(1);
      const mod = diff.entries.find((e) => e.kind === 'modified');
      expect(mod?.key).toBe('bridge');
      expect((mod as { valueA: unknown }).valueA).toBe('no');
      expect((mod as { valueB: unknown }).valueB).toBe('yes');
    });

    it('detects a changed number value', () => {
      const diff = differ.diff(
        makeFeature({ population: 100 }),
        makeFeature({ population: 200 }),
      );
      expect(diff.modifiedCount).toBe(1);
    });

    it('detects boolean flip', () => {
      const diff = differ.diff(
        makeFeature({ oneway: true }),
        makeFeature({ oneway: false }),
      );
      expect(diff.modifiedCount).toBe(1);
    });

    it('detects type change (number to string)', () => {
      const diff = differ.diff(
        makeFeature({ ref: 42 }),
        makeFeature({ ref: '42' }),
      );
      expect(diff.modifiedCount).toBe(1);
    });
  });

  describe('mixed changes', () => {
    it('handles all three change types simultaneously', () => {
      const diff = differ.diff(
        makeFeature({ name: 'old', removed: 'x', unchanged: 'same' }),
        makeFeature({ name: 'new', added: 'y', unchanged: 'same' }),
      );
      expect(diff.modifiedCount).toBe(1);
      expect(diff.removedCount).toBe(1);
      expect(diff.addedCount).toBe(1);
      expect(diff.entries).toHaveLength(3);
    });
  });

  describe('determinism', () => {
    it('entries are sorted by key', () => {
      const diff = differ.diff(
        makeFeature({ z: 1, a: 1, m: 1 }),
        makeFeature({ z: 2, a: 2, m: 2 }),
      );
      const keys = diff.entries.map((e) => e.key);
      expect(keys).toEqual(['a', 'm', 'z']);
    });
  });

  describe('null and undefined values', () => {
    it('treats null as a valid value — no change when both null', () => {
      const diff = differ.diff(
        makeFeature({ field: null }),
        makeFeature({ field: null }),
      );
      expect(diff.changed).toBe(false);
    });

    it('detects change from null to a string', () => {
      const diff = differ.diff(
        makeFeature({ field: null }),
        makeFeature({ field: 'value' }),
      );
      expect(diff.modifiedCount).toBe(1);
    });
  });

  describe('diffProperties direct API', () => {
    it('works without FeatureSnapshot wrapper', () => {
      const diff = differ.diffProperties(
        { highway: 'primary', lanes: 2 },
        { highway: 'secondary', lanes: 2 },
      );
      expect(diff.modifiedCount).toBe(1);
      expect(diff.changed).toBe(true);
    });
  });
});
