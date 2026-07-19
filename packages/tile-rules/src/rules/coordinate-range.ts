import type { Rule } from '@tileguard/core';
import { findCoordinateRangeIssues } from '../geometry.js';
import { getVectorTile, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

export interface CoordinateRangeOptions {
  readonly buffer?: number;
  readonly excludeLayers?: readonly string[];
}

export const coordinateRangeRule: Rule<CoordinateRangeOptions> = {
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

    // Default clipping buffer derived from empirical evaluation of production vector tiles.
    const buffer = context.options?.buffer ?? 80;

    // Skip layers that use label duplication (placing points far outside extent for cross-tile rendering).
    const excludeLayers = new Set(
      context.options?.excludeLayers ?? ['place', 'water_name', 'centroids'],
    );

    for (const [layerName, layer] of Object.entries(tile.layers)) {
      if (excludeLayers.has(layerName)) continue;

      for (let featureIndex = 0; featureIndex < layer.features.length; featureIndex += 1) {
        const feature = layer.features[featureIndex]!;
        for (const issue of findCoordinateRangeIssues(feature, layer.extent, buffer)) {
          if (issue.code !== 'OUT_OF_RANGE') continue;

          const minAllowed = -buffer;
          const maxAllowed = layer.extent + buffer;
          const rangeStr =
            buffer > 0
              ? `[${minAllowed}, ${maxAllowed}] (extent: ${layer.extent}, buffer: ${buffer})`
              : `[0, ${layer.extent}]`;

          context.report({
            message: `Coordinate "${issue.point?.x},${issue.point?.y}" in layer "${layerName}" is outside allowed range ${rangeStr}.`,
            location: {
              layer: layerName,
              featureIndex,
              ...(issue.partIndex !== undefined && { partIndex: issue.partIndex }),
            },
            suggestion:
              'Clamp, simplify, or reproject geometries so all coordinates fit within the allowed range.',
            data: {
              layer: layerName,
              featureIndex,
              partIndex: issue.partIndex,
              pointIndex: issue.pointIndex,
              point: issue.point,
              extent: layer.extent,
              buffer,
            },
          });
        }
      }
    }
  },
};
