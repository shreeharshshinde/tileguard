/**
 * Rule: `tile/layer-feature-count`
 *
 * Validates that individual layer feature counts fall within configured bounds.
 *
 * @remarks
 * Per-layer bounds are more targeted than the aggregate `tile/feature-count` rule.
 * They allow defining different expectations for each layer:
 *
 * - A `water` layer might always have 1–100 features
 * - A `buildings` layer at zoom 14+ might have 50–10000 features
 * - A `roads` layer might have 10–5000 features
 *
 * When a layer's feature count falls outside its configured bounds, it indicates
 * either data loss (too few) or missing simplification/filtering (too many).
 *
 * Layers not listed in the configuration are not checked. Layers listed in
 * the configuration but absent from the tile are silently skipped (use
 * `tile/required-layers` to enforce layer presence).
 *
 * @example
 * ```ts
 * rules: {
 *   'tile/layer-feature-count': ['warning', {
 *     layers: {
 *       water: { min: 1, max: 500 },
 *       buildings: { max: 10000 },
 *       roads: { min: 5, max: 5000 },
 *     }
 *   }]
 * }
 * ```
 *
 * @see {@link featureCountRule} for aggregate bounds
 * @see {@link LayerFeatureCountOptions} for configuration
 */
import type { Rule } from '@tileguard/core';
import {
  getVectorTile,
  type LayerFeatureBounds,
  VECTOR_TILE_ARTIFACT_TYPE,
} from '../types.js';

/**
 * Configuration options for the `tile/layer-feature-count` rule.
 */
export interface LayerFeatureCountOptions {
  /** Per-layer feature count bounds, keyed by layer name. */
  readonly layers?: Readonly<Record<string, LayerFeatureBounds>>;
  /** @deprecated Use `layers` instead. */
  readonly layerConfig?: Readonly<Record<string, LayerFeatureBounds>>;
}

export const layerFeatureCountRule: Rule<LayerFeatureCountOptions> = {
  id: 'tile/layer-feature-count',
  meta: {
    description:
      'Vector tile layers must satisfy configured per-layer feature count bounds.',
    defaultSeverity: 'warning',
    docsUrl: 'https://tileguard.dev/rules/tile/layer-feature-count',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    const layerConfig =
      context.options?.layers ?? context.options?.layerConfig ?? {};
    const tile = getVectorTile(context.artifact);

    for (const [layerName, bounds] of Object.entries(layerConfig)) {
      const layer = tile.layers[layerName];
      if (layer === undefined) continue;

      const min = bounds.min ?? bounds.minFeatures;
      const max = bounds.max ?? bounds.maxFeatures;
      const count = layer.features.length;

      if (min !== undefined && count < min) {
        context.report({
          message: `Layer "${layerName}" has "${count}" features, expected at least "${min}".`,
          location: { layer: layerName },
          suggestion: `Adjust tile generation for layer "${layerName}", or lower its configured minimum feature count.`,
          data: { layer: layerName, count, min },
        });
      }

      if (max !== undefined && count > max) {
        context.report({
          message: `Layer "${layerName}" has "${count}" features, expected at most "${max}".`,
          location: { layer: layerName },
          suggestion: `Simplify or filter layer "${layerName}", or raise its configured maximum feature count.`,
          data: { layer: layerName, count, max },
        });
      }
    }
  },
};
