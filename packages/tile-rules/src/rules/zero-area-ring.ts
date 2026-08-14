/**
 * Rule: `tile/zero-area-ring`
 *
 * Detects polygon rings with zero computed area.
 *
 * @remarks
 * A zero-area ring is a degenerate polygon that occupies no space —
 * typically caused by all vertices being collinear or by duplicate
 * points collapsing the ring into a line or point. Such rings:
 *
 * - Are invisible when rendered (zero fill area)
 * - Waste tile bytes without contributing visual information
 * - May cause division-by-zero in centroid or label-placement algorithms
 * - Indicate upstream geometry processing errors
 *
 * Area is computed using the shoelace formula on the integer MVT grid.
 * Rings with `|signedArea| === 0` are flagged regardless of vertex count.
 *
 * The rule reports the affected layer, feature index, and ring (part) index.
 *
 * @see {@link unclosedRingRule} — related ring integrity check
 * @see {@link selfIntersectionRule} — related ring integrity check
 * @see {@link degenerateGeometryRule} — catches insufficient vertex count
 */
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
      for (
        let featureIndex = 0;
        featureIndex < layer.features.length;
        featureIndex += 1
      ) {
        const feature = layer.features[featureIndex]!;
        for (const issue of findZeroAreaRingIssues(feature)) {
          context.report({
            message: `Polygon ring in layer "${layerName}", feature "${featureIndex}" has zero area.`,
            location: {
              layer: layerName,
              featureIndex,
              ...(issue.partIndex !== undefined && {
                partIndex: issue.partIndex,
              }),
            },
            suggestion:
              'Remove zero-area rings or emit a polygon with measurable area.',
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
