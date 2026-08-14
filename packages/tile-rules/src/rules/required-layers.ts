/**
 * Rule: `tile/required-layers`
 *
 * Validates that specified layers are present in the vector tile.
 *
 * @remarks
 * Vector tile pipelines produce tiles with a defined layer schema — consumers
 * (map renderers, data processors) depend on specific layers being present.
 * When a tile is missing expected layers, it indicates:
 *
 * - A tile generation pipeline regression (layer dropped from config)
 * - A geographic coverage gap (data source incomplete for this region)
 * - A zoom-level configuration error (layer not generated at this zoom)
 *
 * This rule is especially valuable as a CI gate: it catches schema regressions
 * before they reach production map rendering.
 *
 * @example
 * ```ts
 * rules: {
 *   'tile/required-layers': ['error', {
 *     layers: ['water', 'roads', 'buildings', 'landuse']
 *   }]
 * }
 * ```
 *
 * @see {@link RequiredLayersOptions} for configuration
 */
import type { Rule } from '@tileguard/core';
import { getVectorTile, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

/**
 * Configuration options for the `tile/required-layers` rule.
 */
export interface RequiredLayersOptions {
  /** Layer names that must be present in every validated tile. */
  readonly layers?: readonly string[];
}

export const requiredLayersRule: Rule<RequiredLayersOptions> = {
  id: 'tile/required-layers',
  meta: {
    description: 'Required vector tile layers must be present.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/tile/required-layers',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],
  schema: {
    type: 'object',
    properties: {
      layers: { type: 'array', items: { type: 'string' } },
    },
  },

  create(context) {
    const requiredLayers = context.options?.layers ?? [];
    if (requiredLayers.length === 0) return;

    const tile = getVectorTile(context.artifact);
    const availableLayers = Object.keys(tile.layers);

    for (const layerName of requiredLayers) {
      if (tile.layers[layerName] !== undefined) continue;

      context.report({
        message: `Required layer "${layerName}" is not present in the tile.`,
        location: { layer: layerName },
        suggestion: `Add a "${layerName}" layer to the tile generation pipeline, or remove it from the required layer list.`,
        data: { requiredLayer: layerName, availableLayers },
      });
    }
  },
};
