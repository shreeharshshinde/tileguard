import type { Rule } from '@tileguard/core';
import { findZeroAreaRingIssues } from '../geometry.js';
import { getVectorTile, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

export const zeroAreaRingRule: Rule = {
  id: 'tile/zero-area-ring',
  meta: {
    description: 'Polygon rings in vector tiles must have non-zero area.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/tile/zero-area-ring',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    const tile = getVectorTile(context.artifact);

    for (const [layerName, layer] of Object.entries(tile.layers)) {
      for (let featureIndex = 0; featureIndex < layer.features.length; featureIndex += 1) {
        const feature = layer.features[featureIndex]!;
        for (const issue of findZeroAreaRingIssues(feature)) {
          context.report({
            message: `Polygon ring in layer "${layerName}", feature "${featureIndex}" has zero area.`,
            location: {
              layer: layerName,
              featureIndex,
              ...(issue.partIndex !== undefined && { partIndex: issue.partIndex }),
            },
            suggestion: 'Remove zero-area rings or emit a polygon with measurable area.',
            data: { layer: layerName, featureIndex, partIndex: issue.partIndex },
          });
        }
      }
    }
  },
};
