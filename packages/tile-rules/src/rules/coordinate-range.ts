/**
 * Rule: `tile/coordinate-range`
 *
 * Validates that vector tile coordinates stay within the allowed extent range.
 *
 * @remarks
 * MVT coordinates exist in a tile-local integer grid defined by the layer's
 * extent (default 4096). Coordinates beyond this range — outside the
 * configured buffer tolerance — indicate:
 *
 * - Projection errors in the tile generation pipeline
 * - Clipping failures that should have trimmed geometry at tile edges
 * - Data that was incorrectly assigned to this tile
 *
 * The rule accounts for legitimate out-of-extent coordinates:
 *
 * 1. **Clipping buffers**: Tile generators intentionally extend geometry
 *    beyond tile edges (typically 64–80 units) to prevent rendering seams.
 *    The configurable `buffer` option (default: 80) sets this tolerance.
 *
 * 2. **Cross-tile feature duplication**: Label layers duplicate point
 *    features across tile boundaries for rendering continuity. The rule
 *    skips features where ALL coordinates are outside the allowed range
 *    (algorithmic detection) and known label layers (named exclusion).
 *
 * @example
 * ```ts
 * // Allow a wider buffer for tiles with aggressive clipping
 * rules: {
 *   'tile/coordinate-range': ['error', { buffer: 128 }]
 * }
 * ```
 *
 * @see {@link CoordinateRangeOptions} for all configuration options
 */
import type { Rule } from '@tileguard/core';
import { findCoordinateRangeIssues } from '../geometry.js';
import type { VectorTileFeature } from '../types.js';
import {
  getFeatureParts,
  getVectorTile,
  VECTOR_TILE_ARTIFACT_TYPE,
} from '../types.js';

/**
 * Configuration options for the `tile/coordinate-range` rule.
 */
export interface CoordinateRangeOptions {
  readonly buffer?: number;
  /**
   * Layers to skip entirely. Defaults to common label/name layers that use
   * cross-tile point duplication. Set to [] to check all layers.
   */
  readonly excludeLayers?: readonly string[];
  /**
   * When true (default), features where ALL coordinates are outside the
   * allowed range (buffer included) are skipped as cross-tile duplication.
   * This catches label/geometry duplication regardless of layer naming.
   */
  readonly skipCrossTileFeatures?: boolean;
}

/** Default layers known to use cross-tile feature duplication in common tile providers. */
const DEFAULT_EXCLUDE_LAYERS = [
  'place',
  'water_name',
  'centroids',
  'poi',
  'housenumber',
  'transportation_name',
  'mountain_peak',
  'park',
  'aerodrome_label',
];

/**
 * Returns true if every coordinate in the feature is outside the allowed range.
 * This indicates the entire feature was duplicated into this tile for cross-tile
 * rendering continuity — not a genuine geometry that overflows the clipping buffer.
 */
function isEntirelyOutsideTile(
  feature: VectorTileFeature,
  extent: number,
  buffer: number,
): boolean {
  const min = -buffer;
  const max = extent + buffer;
  const parts = getFeatureParts(feature);

  for (const part of parts) {
    for (const point of part) {
      if (
        point.x >= min &&
        point.x <= max &&
        point.y >= min &&
        point.y <= max
      ) {
        return false;
      }
    }
  }

  return true;
}

export const coordinateRangeRule: Rule<CoordinateRangeOptions> = {
  id: 'tile/coordinate-range',
  meta: {
    description: 'Vector tile coordinates must stay within each layer extent.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/tile/coordinate-range',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    const tile = getVectorTile(context.artifact);

    // Default clipping buffer derived from empirical evaluation of production vector tiles.
    const buffer = context.options?.buffer ?? 80;

    // Two-layer false positive suppression:
    // 1. Named layer exclusion (handles known label layers with mixed in/out coordinates)
    // 2. Algorithmic detection (handles any layer where ALL coords are outside)
    const excludeLayers = new Set(
      context.options?.excludeLayers ?? DEFAULT_EXCLUDE_LAYERS,
    );
    const skipCrossTile = context.options?.skipCrossTileFeatures ?? true;

    for (const [layerName, layer] of Object.entries(tile.layers)) {
      // Layer-level exclusion: known label/name layers
      if (excludeLayers.has(layerName)) continue;

      for (
        let featureIndex = 0;
        featureIndex < layer.features.length;
        featureIndex += 1
      ) {
        const feature = layer.features[featureIndex]!;

        // Feature-level exclusion: if ALL coordinates are outside, it's cross-tile duplication
        if (
          skipCrossTile &&
          isEntirelyOutsideTile(feature, layer.extent, buffer)
        ) {
          continue;
        }

        for (const issue of findCoordinateRangeIssues(
          feature,
          layer.extent,
          buffer,
        )) {
          if (issue.code !== 'OUT_OF_RANGE') continue;

          const minAllowed = -buffer;
          const maxAllowed = layer.extent + buffer;
          const rangeStr =
            buffer > 0
              ? `[${minAllowed}, ${maxAllowed}] (extent: ${layer.extent}, buffer: ${buffer})`
              : `[0, ${layer.extent}]`;

          context.report({
            message: `Coordinate "${issue.point?.x},${issue.point?.y}" in layer "${layerName}" is outside allowed range ${rangeStr}.`,
            location: {
              layer: layerName,
              featureIndex,
              ...(issue.partIndex !== undefined && {
                partIndex: issue.partIndex,
              }),
            },
            suggestion:
              'Clamp, simplify, or reproject geometries so all coordinates fit within the allowed range.',
            data: {
              layer: layerName,
              featureIndex,
              partIndex: issue.partIndex,
              pointIndex: issue.pointIndex,
              point: issue.point,
              extent: layer.extent,
              buffer,
            },
          });
        }
      }
    }
  },
};
