/**
 * Rule: `tile/degenerate-geometry`
 *
 * Validates that geometries have enough unique vertices for their declared type.
 *
 * @remarks
 * A degenerate geometry is one that lacks sufficient distinct coordinates to
 * form a valid shape for its type:
 *
 * - LineString: requires at least 2 unique points
 * - Polygon ring: requires at least 4 points (3 unique + closure)
 *
 * Degenerate geometries typically result from:
 * - Aggressive simplification that collapses vertices
 * - Integer quantization snapping distinct coordinates to the same grid point
 * - Upstream data errors producing zero-length lines or collapsed polygons
 *
 * Such geometries waste tile bytes, may cause rendering engines to skip or
 * crash on the feature, and indicate quality problems in the tile pipeline.
 *
 * The rule reports the affected layer, feature index, part index, and a
 * machine-readable issue code (`DEGENERATE_LINE` or `DEGENERATE_POLYGON`).
 *
 * @see {@link zeroAreaRingRule} — catches polygons that have vertices but zero area
 * @see {@link unclosedRingRule} — catches polygons missing closure vertex
 */
import type { Rule } from '@tileguard/core';
import { findDegenerateGeometryIssues } from '../geometry.js';
import { getVectorTile, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

export const degenerateGeometryRule: Rule = {
  id: 'tile/degenerate-geometry',
  meta: {
    description:
      'Vector tile geometries must have enough unique vertices for their type.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/tile/degenerate-geometry',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    const tile = getVectorTile(context.artifact);

    for (const [layerName, layer] of Object.entries(tile.layers)) {
      for (
        let featureIndex = 0;
        featureIndex < layer.features.length;
        featureIndex += 1
      ) {
        const feature = layer.features[featureIndex]!;
        for (const issue of findDegenerateGeometryIssues(feature)) {
          context.report({
            message: `${issue.message} Layer "${layerName}", feature "${featureIndex}".`,
            location: {
              layer: layerName,
              featureIndex,
              ...(issue.partIndex !== undefined && {
                partIndex: issue.partIndex,
              }),
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
