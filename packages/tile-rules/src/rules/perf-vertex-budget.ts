/**
 * Rule: `perf/vertex-budget`
 *
 * Validates that no single feature exceeds the configured per-feature vertex
 * limit and that the total tile-wide vertex count stays within a tile-level
 * budget.
 *
 * @remarks
 * Vertex count is the primary rendering cost driver for vector tiles.
 * GPUs render tiles by uploading vertex buffers; a single feature with
 * 10,000+ vertices can stall the render thread long enough to drop frames.
 *
 * Two distinct checks serve complementary purposes:
 *
 * - **Per-feature limit**: catches individual geometry outliers — a coastline
 *   or administrative boundary that wasn't simplified for this zoom level.
 *   Every offending feature gets its own diagnostic with a location pointer.
 *
 * - **Tile-wide limit**: catches tiles that are globally over-complex even
 *   when no single feature is an outlier — e.g., a z10 tile with 50,000
 *   building footprints each with 10 vertices.
 *
 * Counts all vertex coordinates across all parts of all features in all
 * layers. For LineStrings and Polygons this means summing across rings.
 *
 * @example
 * ```ts
 * rules: {
 *   'perf/vertex-budget': ['warning', {
 *     maxVerticesPerFeature: 3000,
 *     maxVerticesPerTile: 200_000,
 *   }]
 * }
 * ```
 *
 * @see {@link VertexBudgetOptions} for configuration
 */
import type { Rule } from '@tileguard/core';
import {
  getFeatureParts,
  getVectorTile,
  VECTOR_TILE_ARTIFACT_TYPE,
} from '../types.js';

/**
 * Configuration options for the `perf/vertex-budget` rule.
 */
export interface VertexBudgetOptions {
  /**
   * Maximum number of vertices in a single feature across all its geometry
   * parts (rings / lines).
   *
   * Features with more vertices than this limit will each produce one
   * diagnostic with `location: { layer, featureIndex }` so the offender
   * can be located precisely.
   *
   * Typical budget: 3,000 vertices/feature.
   */
  readonly maxVerticesPerFeature?: number;

  /**
   * Maximum total vertices across the entire tile (all layers, all features).
   *
   * One tile-level diagnostic is emitted when this limit is exceeded.
   * Typical budget: 200,000 vertices/tile.
   */
  readonly maxVerticesPerTile?: number;
}

/**
 * Count the number of vertices in a single feature by summing the lengths
 * of all geometry parts (rings / lines / point arrays).
 */
function countFeatureVertices(
  geometry: ReturnType<typeof getFeatureParts>,
): number {
  let total = 0;
  for (const part of geometry) {
    total += part.length;
  }
  return total;
}

export const perfVertexBudgetRule: Rule<VertexBudgetOptions> = {
  id: 'perf/vertex-budget',
  meta: {
    description:
      'Feature and tile vertex counts must not exceed configured performance budgets.',
    defaultSeverity: 'warning',
    docsUrl: 'https://tileguard.dev/rules/perf/vertex-budget',
    recommended: true,
    since: '0.6.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    const { maxVerticesPerFeature, maxVerticesPerTile } =
      context.options ?? {};
    if (maxVerticesPerFeature === undefined && maxVerticesPerTile === undefined)
      return;

    const tile = getVectorTile(context.artifact);
    let totalVertices = 0;

    for (const [layerName, layer] of Object.entries(tile.layers)) {
      for (let featureIndex = 0; featureIndex < layer.features.length; featureIndex++) {
        const feature = layer.features[featureIndex]!;
        const parts = getFeatureParts(feature);
        const vertexCount = countFeatureVertices(parts);

        totalVertices += vertexCount;

        if (
          maxVerticesPerFeature !== undefined &&
          vertexCount > maxVerticesPerFeature
        ) {
          context.report({
            message: `Feature #${featureIndex} in layer "${layerName}" has ${vertexCount.toLocaleString()} vertices, exceeding the per-feature budget of ${maxVerticesPerFeature.toLocaleString()}.`,
            location: { layer: layerName, featureIndex },
            suggestion:
              'Apply geometry simplification (e.g., Douglas-Peucker) to this feature for this zoom level.',
            data: {
              layer: layerName,
              featureIndex,
              vertexCount,
              maxVerticesPerFeature,
            },
          });
        }
      }
    }

    if (
      maxVerticesPerTile !== undefined &&
      totalVertices > maxVerticesPerTile
    ) {
      context.report({
        message: `Tile contains ${totalVertices.toLocaleString()} total vertices, exceeding the tile-wide budget of ${maxVerticesPerTile.toLocaleString()}.`,
        suggestion:
          'Simplify geometries globally, reduce feature density at this zoom level, or split this tile into sub-tiles.',
        data: { totalVertices, maxVerticesPerTile },
      });
    }
  },
};
