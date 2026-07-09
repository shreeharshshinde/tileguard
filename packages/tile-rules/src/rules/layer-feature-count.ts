import type { Rule } from '@tileguard/core';
import { getVectorTile, type LayerFeatureBounds, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

export interface LayerFeatureCountOptions {
  readonly layers?: Readonly<Record<string, LayerFeatureBounds>>;
  readonly layerConfig?: Readonly<Record<string, LayerFeatureBounds>>;
}

export const layerFeatureCountRule: Rule<LayerFeatureCountOptions> = {
  id: 'tile/layer-feature-count',
  meta: {
    description: 'Vector tile layers must satisfy configured per-layer feature count bounds.',
    defaultSeverity: 'warning',
    docsUrl: 'https://tileguard.dev/rules/tile/layer-feature-count',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    const layerConfig = context.options?.layers ?? context.options?.layerConfig ?? {};
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
