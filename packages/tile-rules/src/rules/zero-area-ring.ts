/**
 * Rule: `tile/zero-area-ring`
 *
 * Detects polygon rings with zero or near-zero computed area.
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
 * - Can cause numerically unstable earcut triangulation (near-zero slivers)
 *
 * Area is computed using the shoelace formula on the integer MVT grid.
 * By default, only rings with `|signedArea| === 0` are flagged. When the
 * `minArea` option is set, rings with area below the threshold are also
 * flagged — catching sliver polygons from coordinate quantization.
 *
 * The rule reports the affected layer, feature index, and ring (part) index.
 *
 * @example
 * ```ts
 * // Flag rings with area below 1.0 tile unit²
 * rules: {
 *   'tile/zero-area-ring': ['error', { minArea: 1.0 }]
 * }
 * ```
 *
 * @see {@link unclosedRingRule} — related ring integrity check
 * @see {@link selfIntersectionRule} — related ring integrity check
 * @see {@link degenerateGeometryRule} — catches insufficient vertex count
 */
import type { Rule } from '@tileguard/core';
import { findZeroAreaRingIssues } from '../geometry.js';
import { getVectorTile, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

/**
 * Configuration options for the `tile/zero-area-ring` rule.
 */
export interface ZeroAreaRingOptions {
  /**
   * Minimum absolute area in tile coordinate units².
   *
   * - `0` (default): only flag rings with exactly zero area (backward compatible)
   * - `> 0`: also flag "sliver" rings with area below this threshold
   *
   * A value of 1.0 catches sub-pixel polygons at most zoom levels (default extent 4096).
   */
  readonly minArea?: number;
}

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
    const options = (context.options ?? {}) as ZeroAreaRingOptions;
    const minArea = options.minArea ?? 0;
    const tile = getVectorTile(context.artifact);

    for (const [layerName, layer] of Object.entries(tile.layers)) {
      for (
        let featureIndex = 0;
        featureIndex < layer.features.length;
        featureIndex += 1
      ) {
        const feature = layer.features[featureIndex]!;
        for (const issue of findZeroAreaRingIssues(feature, minArea)) {
          const message =
            minArea > 0
              ? `Polygon ring in layer "${layerName}", feature "${featureIndex}" has area below threshold (${minArea}).`
              : `Polygon ring in layer "${layerName}", feature "${featureIndex}" has zero area.`;
          context.report({
            message,
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
