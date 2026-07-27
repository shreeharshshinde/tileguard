/**
 * @tileguard/inspector — Overlay Strategies Unit Tests
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { describe, expect, it } from 'vitest';
import { coordinateRangeStrategy } from '../src/overlay/strategies/coordinate-range.js';
import { degenerateGeometryStrategy } from '../src/overlay/strategies/degenerate-geometry.js';
import { noEmptyStrategy } from '../src/overlay/strategies/no-empty.js';
import { selfIntersectionStrategy } from '../src/overlay/strategies/self-intersection.js';
import { unclosedRingStrategy } from '../src/overlay/strategies/unclosed-ring.js';
import { zeroAreaRingStrategy } from '../src/overlay/strategies/zero-area-ring.js';

const mockArtifact = {} as VectorTileArtifact;

describe('Overlay Strategies', () => {
  describe('coordinateRangeStrategy', () => {
    it('produces point-marker descriptor for valid diagnostic', () => {
      const diagnostic: Diagnostic = {
        ruleId: 'tile/coordinate-range',
        severity: 'error',
        message: 'Coordinate out of range',
        artifact: { type: 'VectorTile', source: 'tile.pbf' },
        location: { layer: 'buildings', featureIndex: 3 },
        data: { pointIndex: 5 },
      };

      const result = coordinateRangeStrategy.toDescriptors(
        diagnostic,
        mockArtifact,
      );
      expect(result).toEqual([
        {
          type: 'point-marker',
          layerName: 'buildings',
          featureIndex: 3,
          target: 5,
          severity: 'error',
        },
      ]);
    });

    it('returns empty array if layer or featureIndex is missing', () => {
      const diagnostic: Diagnostic = {
        ruleId: 'tile/coordinate-range',
        severity: 'error',
        message: 'Invalid location',
        artifact: { type: 'VectorTile', source: 'tile.pbf' },
      };

      expect(
        coordinateRangeStrategy.toDescriptors(diagnostic, mockArtifact),
      ).toEqual([]);
    });

    it('returns empty array if pointIndex is missing', () => {
      const diagnostic: Diagnostic = {
        ruleId: 'tile/coordinate-range',
        severity: 'error',
        message: 'Missing pointIndex',
        artifact: { type: 'VectorTile', source: 'tile.pbf' },
        location: { layer: 'roads', featureIndex: 0 },
      };

      expect(
        coordinateRangeStrategy.toDescriptors(diagnostic, mockArtifact),
      ).toEqual([]);
    });
  });

  describe('selfIntersectionStrategy', () => {
    it('produces segment-highlight descriptor for self-intersecting segments', () => {
      const diagnostic: Diagnostic = {
        ruleId: 'tile/self-intersection',
        severity: 'error',
        message: 'Segments 2 and 5 intersect',
        artifact: { type: 'VectorTile', source: 'tile.pbf' },
        location: { layer: 'landuse', featureIndex: 1 },
        data: { segments: [2, 5] },
      };

      const result = selfIntersectionStrategy.toDescriptors(
        diagnostic,
        mockArtifact,
      );
      expect(result).toEqual([
        {
          type: 'segment-highlight',
          layerName: 'landuse',
          featureIndex: 1,
          target: [2, 3],
          severity: 'error',
        },
      ]);
    });

    it('returns empty array if segments tuple is missing or invalid', () => {
      const diagnostic: Diagnostic = {
        ruleId: 'tile/self-intersection',
        severity: 'error',
        message: 'Missing segments',
        artifact: { type: 'VectorTile', source: 'tile.pbf' },
        location: { layer: 'landuse', featureIndex: 1 },
      };

      expect(
        selfIntersectionStrategy.toDescriptors(diagnostic, mockArtifact),
      ).toEqual([]);
    });
  });

  describe('zeroAreaRingStrategy', () => {
    it('produces ring-highlight descriptor for zero-area polygon ring', () => {
      const diagnostic: Diagnostic = {
        ruleId: 'tile/zero-area-ring',
        severity: 'error',
        message: 'Zero area ring',
        artifact: { type: 'VectorTile', source: 'tile.pbf' },
        location: { layer: 'water', featureIndex: 0, partIndex: 1 },
      };

      const result = zeroAreaRingStrategy.toDescriptors(
        diagnostic,
        mockArtifact,
      );
      expect(result).toEqual([
        {
          type: 'ring-highlight',
          layerName: 'water',
          featureIndex: 0,
          target: 1,
          severity: 'error',
        },
      ]);
    });
  });

  describe('degenerateGeometryStrategy', () => {
    it('produces bbox-fill descriptor for degenerate feature', () => {
      const diagnostic: Diagnostic = {
        ruleId: 'tile/degenerate-geometry',
        severity: 'error',
        message: 'Insufficient vertices',
        artifact: { type: 'VectorTile', source: 'tile.pbf' },
        location: { layer: 'roads', featureIndex: 4 },
        data: { code: 'TOO_FEW_POINTS' },
      };

      const result = degenerateGeometryStrategy.toDescriptors(
        diagnostic,
        mockArtifact,
      );
      expect(result).toEqual([
        {
          type: 'bbox-fill',
          layerName: 'roads',
          featureIndex: 4,
          target: 0,
          severity: 'error',
        },
      ]);
    });
  });

  describe('unclosedRingStrategy', () => {
    it('produces ring-highlight descriptor for unclosed ring', () => {
      const diagnostic: Diagnostic = {
        ruleId: 'tile/unclosed-ring',
        severity: 'error',
        message: 'Unclosed ring',
        artifact: { type: 'VectorTile', source: 'tile.pbf' },
        location: { layer: 'buildings', featureIndex: 2, partIndex: 0 },
      };

      const result = unclosedRingStrategy.toDescriptors(
        diagnostic,
        mockArtifact,
      );
      expect(result).toEqual([
        {
          type: 'ring-highlight',
          layerName: 'buildings',
          featureIndex: 2,
          target: 0,
          severity: 'error',
        },
      ]);
    });
  });

  describe('noEmptyStrategy', () => {
    it('returns empty array unconditionally for empty tile diagnostic', () => {
      const diagnostic: Diagnostic = {
        ruleId: 'tile/no-empty',
        severity: 'warning',
        message: 'Tile contains 0 features',
        artifact: { type: 'VectorTile', source: 'tile.pbf' },
        data: { totalFeatures: 0 },
      };

      const result = noEmptyStrategy.toDescriptors(diagnostic, mockArtifact);
      expect(result).toEqual([]);
    });
  });
});
