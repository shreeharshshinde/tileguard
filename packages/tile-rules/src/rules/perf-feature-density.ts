/**
 * Rule: `perf/feature-density`
 *
 * Validates that individual layers do not exceed a configurable per-layer
 * feature count limit.
 *
 * @remarks
 * This is the performance-scoped companion to `tile/layer-feature-count`.
 * While that rule checks arbitrary min/max bounds as a data correctness
 * concern, this rule is purely about render performance: too many features
 * in a single layer produces too many draw calls and too much label collision
 * detection, degrading map rendering performance.
 *
 * A global `maxFeaturesPerLayer` threshold applies to all layers not
 * explicitly listed in the `layers` override map. Per-layer `maxFeatures`
 * values take priority over the global default.
 *
 * Layers not present in the tile are silently skipped. Layers present in
 * the tile but not configured (and no global default set) are also skipped.
 *
 * @example
 * ```ts
 * rules: {
 *   'perf/feature-density': ['warning', {
 *     maxFeaturesPerLayer: 10000,
 *     layers: {
 *       poi: { maxFeatures: 2000 },
 *       transportation: { maxFeatures: 5000 },
 *     }
 *   }]
 * }
 * ```
 *
 * @see {@link FeatureDensityOptions} for configuration
 */
import type { Rule } from '@tileguard/core';
import { getVectorTile, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

/**
 * Configuration options for the `perf/feature-density` rule.
 */
export interface FeatureDensityOptions {
  /**
   * Default maximum features per layer, applied to all layers that are
   * not explicitly listed in the `layers` override map.
   *
   * Layers without a matching entry and without a global default are
   * not checked.
   */
  readonly maxFeaturesPerLayer?: number;

  /**
   * Per-layer maximum feature count overrides.
   *
   * Takes priority over `maxFeaturesPerLayer` for the listed layers.
   * Layers listed here without a `maxFeatures` value are not checked
   * (but they do suppress the global default for that layer).
   */
  readonly layers?: Readonly<Record<string, { maxFeatures?: number }>>;
}

export const perfFeatureDensityRule: Rule<FeatureDensityOptions> = {
  id: 'perf/feature-density',
  meta: {
    description:
      'Per-layer feature counts must not exceed configured render performance budgets.',
    defaultSeverity: 'warning',
    docsUrl: 'https://tileguard.dev/rules/perf/feature-density',
    recommended: false,
    since: '0.6.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    const { maxFeaturesPerLayer, layers: layerOverrides } =
      context.options ?? {};

    // Nothing to check if no budget is configured at all.
    if (maxFeaturesPerLayer === undefined && !layerOverrides) return;

    const tile = getVectorTile(context.artifact);

    for (const [layerName, layer] of Object.entries(tile.layers)) {
      const override = layerOverrides?.[layerName];

      // If there's an explicit entry but it has no maxFeatures, skip this
      // layer — the user has opted it out of the global default too.
      if (override !== undefined && override.maxFeatures === undefined) {
        continue;
      }

      // Resolve the effective limit: per-layer override wins over global default.
      const maxFeatures = override?.maxFeatures ?? maxFeaturesPerLayer;
      if (maxFeatures === undefined) continue;

      const featureCount = layer.features.length;
      if (featureCount > maxFeatures) {
        context.report({
          message: `Layer "${layerName}" has ${featureCount.toLocaleString()} features, exceeding the per-layer render budget of ${maxFeatures.toLocaleString()}.`,
          location: { layer: layerName },
          suggestion: `Add zoom-level-appropriate filtering or simplification for the "${layerName}" layer, or raise its configured budget.`,
          data: { layer: layerName, featureCount, maxFeatures },
        });
      }
    }
  },
};
