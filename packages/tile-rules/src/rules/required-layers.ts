import type { Rule } from '@tileguard/core';
import { getVectorTile, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

export interface RequiredLayersOptions {
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
