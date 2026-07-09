import type { Rule } from '@tileguard/core';
import { findDegenerateGeometryIssues } from '../geometry.js';
import { getVectorTile, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

export const degenerateGeometryRule: Rule = {
  id: 'tile/degenerate-geometry',
  meta: {
    description: 'Vector tile geometries must have enough unique vertices for their type.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/tile/degenerate-geometry',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    const tile = getVectorTile(context.artifact);

    for (const [layerName, layer] of Object.entries(tile.layers)) {
      for (let featureIndex = 0; featureIndex < layer.features.length; featureIndex += 1) {
        const feature = layer.features[featureIndex]!;
        for (const issue of findDegenerateGeometryIssues(feature)) {
          context.report({
            message: `${issue.message} Layer "${layerName}", feature "${featureIndex}".`,
            location: {
              layer: layerName,
              featureIndex,
              ...(issue.partIndex !== undefined && { partIndex: issue.partIndex }),
            },
            suggestion:
              'Remove degenerate geometry or emit enough distinct coordinates for the feature type.',
            data: {
              code: issue.code,
              layer: layerName,
              featureIndex,
              partIndex: issue.partIndex,
            },
          });
        }
      }
    }
  },
};
