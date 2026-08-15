/**
 * Rule: `tile/hole-containment`
 *
 * Validates that hole rings lie within the outer ring of a polygon.
 *
 * @remarks
 * Earcut's triangulation algorithm assumes that all hole rings are contained
 * within the outer ring. When a hole is partially or fully outside the shell:
 *
 * - Earcut's linked-list ear-clipping corrupts, producing overlapping or
 *   missing triangles
 * - The resulting mesh has visual gaps, z-fighting, or renders parts that
 *   should be empty
 * - In severe cases, earcut enters a degenerate state and produces zero
 *   triangles
 *
 * This commonly occurs after geometry simplification (Douglas-Peucker at
 * aggressive tolerances can push hole vertices outside a simplified outer
 * ring) or after coordinate quantization to the integer tile grid.
 *
 * The rule uses a ray-casting (point-in-polygon) test: for each vertex of
 * each hole ring, it casts a horizontal ray and counts intersections with
 * the outer ring. Vertices exactly on the boundary are considered valid.
 *
 * Only applies to Polygon features with 2 or more rings.
 *
 * @see {@link windingOrderRule} — validates ring winding direction
 * @see {@link selfIntersectionRule} — catches rings that cross themselves
 */
import type { Rule } from '@tileguard/core';
import { findHoleContainmentIssues } from '../geometry.js';
import { getVectorTile, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

export const holeContainmentRule: Rule = {
  id: 'tile/hole-containment',
  meta: {
    description:
      'Polygon hole rings must be contained within the outer ring.',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/tile/hole-containment',
    recommended: true,
    since: '0.4.0',
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
        for (const issue of findHoleContainmentIssues(feature)) {
          context.report({
            message: `Hole ring ${issue.partIndex} in layer "${layerName}", feature ${featureIndex} has vertices outside the outer ring.`,
            location: {
              layer: layerName,
              featureIndex,
              ...(issue.partIndex !== undefined && {
                partIndex: issue.partIndex,
              }),
            },
            suggestion:
              'Simplify with topology preservation or clip holes to the outer ring boundary.',
            data: {
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
