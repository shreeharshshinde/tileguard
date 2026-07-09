import type { Rule } from '@tileguard/core';
import { findUnclosedRingIssues } from '../geometry.js';
import { getVectorTile, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

export const unclosedRingRule: Rule = {
  id: 'tile/unclosed-ring',
  meta: {
    description: 'Polygon rings in vector tiles must be closed.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/tile/unclosed-ring',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    const tile = getVectorTile(context.artifact);

    for (const [layerName, layer] of Object.entries(tile.layers)) {
      for (let featureIndex = 0; featureIndex < layer.features.length; featureIndex += 1) {
        const feature = layer.features[featureIndex]!;
        for (const issue of findUnclosedRingIssues(feature)) {
          context.report({
            message: `Polygon ring in layer "${layerName}", feature "${featureIndex}" is not closed.`,
            location: {
              layer: layerName,
              featureIndex,
              ...(issue.partIndex !== undefined && { partIndex: issue.partIndex }),
            },
            suggestion: 'Ensure every polygon ring ends with the same coordinate it starts with.',
            data: { layer: layerName, featureIndex, partIndex: issue.partIndex },
          });
        }
      }
    }
  },
};
