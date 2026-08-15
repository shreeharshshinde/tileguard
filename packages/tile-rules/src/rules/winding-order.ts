/**
 * Rule: `tile/winding-order`
 *
 * Validates that polygon rings follow the MVT winding order convention.
 *
 * @remarks
 * The Mapbox Vector Tile specification defines a strict winding convention:
 *
 * - **Outer rings** (shell): clockwise (CW)
 * - **Inner rings** (holes): counter-clockwise (CCW)
 *
 * This convention allows renderers — and critically, earcut triangulation —
 * to distinguish outer boundaries from holes without additional metadata.
 *
 * When winding order is incorrect:
 * - Outer rings interpreted as holes → polygon disappears entirely
 * - Holes interpreted as outer rings → inverted fill
 * - Mixed winding in a multi-ring polygon → garbage triangulation
 *
 * MapLibre wraps earcut in a try/catch, so incorrect winding typically
 * results in silent visual errors rather than crashes — making this a
 * particularly insidious data quality issue.
 *
 * The rule uses the signed area (shoelace formula) to determine winding:
 * - Negative signed area → clockwise (correct for outer rings in MVT)
 * - Positive signed area → counter-clockwise (correct for holes in MVT)
 *
 * @see {@link zeroAreaRingRule} — catches rings with zero area (no winding)
 * @see {@link selfIntersectionRule} — catches rings that cross themselves
 */
import type { Rule } from '@tileguard/core';
import { findWindingOrderIssues } from '../geometry.js';
import { getVectorTile, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

export const windingOrderRule: Rule = {
  id: 'tile/winding-order',
  meta: {
    description:
      'Polygon rings must follow the MVT winding order convention (outer=CW, holes=CCW).',
    defaultSeverity: 'error',
    docsUrl: 'https://tileguard.dev/rules/tile/winding-order',
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
        for (const issue of findWindingOrderIssues(feature)) {
          const ringType = issue.partIndex === 0 ? 'Outer ring' : `Hole ring ${issue.partIndex}`;
          const expected = issue.partIndex === 0 ? 'clockwise' : 'counter-clockwise';
          context.report({
            message: `${ringType} in layer "${layerName}", feature ${featureIndex} has incorrect winding order.`,
            location: {
              layer: layerName,
              featureIndex,
              ...(issue.partIndex !== undefined && {
                partIndex: issue.partIndex,
              }),
            },
            suggestion: `Reverse the vertex order of the ring to make it ${expected} per the MVT specification.`,
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
