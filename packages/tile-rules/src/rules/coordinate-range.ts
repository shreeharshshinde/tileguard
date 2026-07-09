import type { Rule } from '@tileguard/core';
import { findCoordinateRangeIssues } from '../geometry.js';
import { getVectorTile, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

export const coordinateRangeRule: Rule = {
  id: 'tile/coordinate-range',
  meta: {
    description: 'Vector tile coordinates must stay within each layer extent.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/tile/coordinate-range',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    const tile = getVectorTile(context.artifact);

    for (const [layerName, layer] of Object.entries(tile.layers)) {
      for (let featureIndex = 0; featureIndex < layer.features.length; featureIndex += 1) {
        const feature = layer.features[featureIndex]!;
        for (const issue of findCoordinateRangeIssues(feature, layer.extent)) {
          if (issue.code !== 'OUT_OF_RANGE') continue;
          context.report({
            message: `Coordinate "${issue.point?.x},${issue.point?.y}" in layer "${layerName}" is outside tile extent "0-${layer.extent}".`,
            location: {
              layer: layerName,
              featureIndex,
              ...(issue.partIndex !== undefined && { partIndex: issue.partIndex }),
            },
            suggestion:
              'Clamp, simplify, or reproject geometries so all coordinates fit within the tile extent.',
            data: {
              layer: layerName,
              featureIndex,
              partIndex: issue.partIndex,
              pointIndex: issue.pointIndex,
              point: issue.point,
              extent: layer.extent,
            },
          });
        }
      }
    }
  },
};
