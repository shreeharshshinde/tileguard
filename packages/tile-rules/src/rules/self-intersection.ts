import type { Rule } from '@tileguard/core';
import { findSelfIntersectionIssues } from '../geometry.js';
import { getVectorTile, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

export const selfIntersectionRule: Rule = {
  id: 'tile/self-intersection',
  meta: {
    description: 'Vector tile line and polygon geometries must not self-intersect.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/tile/self-intersection',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    const tile = getVectorTile(context.artifact);

    for (const [layerName, layer] of Object.entries(tile.layers)) {
      for (let featureIndex = 0; featureIndex < layer.features.length; featureIndex += 1) {
        const feature = layer.features[featureIndex]!;
        for (const issue of findSelfIntersectionIssues(feature)) {
          const segments = issue.segments ?? ['?', '?'];
          context.report({
            message: `Geometry in layer "${layerName}", feature "${featureIndex}" has intersecting segments "${segments[0]}" and "${segments[1]}".`,
            location: {
              layer: layerName,
              featureIndex,
              ...(issue.partIndex !== undefined && { partIndex: issue.partIndex }),
            },
            suggestion: 'Simplify or repair this geometry so non-adjacent segments do not cross.',
            data: {
              layer: layerName,
              featureIndex,
              partIndex: issue.partIndex,
              segments: issue.segments,
            },
          });
        }
      }
    }
  },
};
