/**
 * Rule: `perf/layer-size`
 *
 * Validates that no single layer contributes more than a configured fraction
 * of the tile's total rendering cost.
 *
 * @remarks
 * MVT does not encode per-layer byte sizes. This rule uses a deterministic
 * **proxy size** instead: each layer's fractional contribution is estimated
 * as its share of total tile vertex count. This is fast (zero I/O, pure
 * arithmetic), reproducible across runs, and well-correlated with actual
 * rendering cost because vertex buffer size dominates tile cost at decode
 * time.
 *
 * Formula:
 *   layerVertices / totalTileVertices = estimatedFraction
 *
 * A fraction of 0.48 means this layer is estimated to contribute ~48% of
 * the tile's rendering work. Layers that dominate the tile are candidates
 * for simplification or splitting.
 *
 * This rule is `recommended: false` (opt-in). It is most useful in profiling
 * pipelines and CI dashboards where you want to catch single-layer dominance
 * automatically, rather than as a universal correctness gate.
 *
 * Tiles with zero total vertices produce no diagnostics (no cost to report).
 *
 * @example
 * ```ts
 * rules: {
 *   'perf/layer-size': ['info', { maxLayerFraction: 0.5 }]
 * }
 * ```
 *
 * @see {@link LayerSizeOptions} for configuration
 */
import type { Rule } from '@tileguard/core';
import {
  getFeatureParts,
  getVectorTile,
  VECTOR_TILE_ARTIFACT_TYPE,
} from '../types.js';

/**
 * Configuration options for the `perf/layer-size` rule.
 */
export interface LayerSizeOptions {
  /**
   * Maximum proportion of the tile's total vertex count attributable to a
   * single layer. Value in the range `0–1`.
   *
   * A value of `0.5` means any layer contributing more than 50% of all
   * tile vertices will be flagged. Common production values: 0.4–0.6.
   */
  readonly maxLayerFraction?: number;
}

/**
 * Count total vertices in a layer by summing across all features and parts.
 */
function countLayerVertices(
  features: Parameters<typeof getFeatureParts>[0][],
): number {
  let total = 0;
  for (const feature of features) {
    for (const part of getFeatureParts(feature)) {
      total += part.length;
    }
  }
  return total;
}

export const perfLayerSizeRule: Rule<LayerSizeOptions> = {
  id: 'perf/layer-size',
  meta: {
    description:
      'No single layer should dominate the tile rendering budget beyond a configured fraction.',
    defaultSeverity: 'info',
    docsUrl: 'https://tileguard.dev/rules/perf/layer-size',
    recommended: false,
    since: '0.6.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    const { maxLayerFraction } = context.options ?? {};
    if (maxLayerFraction === undefined) return;

    const tile = getVectorTile(context.artifact);

    // First pass: compute total vertices across the entire tile.
    let totalVertices = 0;
    const layerVertexCounts = new Map<string, number>();

    for (const [layerName, layer] of Object.entries(tile.layers)) {
      const count = countLayerVertices(
        layer.features as Parameters<typeof getFeatureParts>[0][],
      );
      layerVertexCounts.set(layerName, count);
      totalVertices += count;
    }

    // Nothing to report for empty tiles (avoid divide-by-zero).
    if (totalVertices === 0) return;

    // Second pass: flag layers that exceed the fraction threshold.
    for (const [layerName, layerVertices] of layerVertexCounts) {
      const estimatedFraction = layerVertices / totalVertices;

      if (estimatedFraction > maxLayerFraction) {
        const pct = (estimatedFraction * 100).toFixed(1);
        const limitPct = (maxLayerFraction * 100).toFixed(0);

        context.report({
          message: `Layer "${layerName}" accounts for ${pct}% of tile vertices, exceeding the ${limitPct}% layer size budget.`,
          location: { layer: layerName },
          suggestion: `Consider simplifying geometries in the "${layerName}" layer or splitting it into sub-layers with zoom-range filtering.`,
          data: {
            layer: layerName,
            layerVertices,
            totalVertices,
            estimatedFraction: Math.round(estimatedFraction * 10000) / 10000,
            maxLayerFraction,
          },
        });
      }
    }
  },
};
