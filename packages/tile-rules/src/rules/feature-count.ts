/**
 * Rule: `tile/feature-count`
 *
 * Validates that the total feature count across all layers falls within
 * configured bounds.
 *
 * @remarks
 * Feature count bounds serve as a tile-level sanity check:
 *
 * - **Minimum**: catches tiles that are suspiciously sparse, indicating
 *   possible data loss or overly aggressive filtering.
 * - **Maximum**: catches tiles that are overloaded with features, indicating
 *   missing simplification or incorrect zoom-level assignment. Oversized
 *   tiles degrade rendering performance and increase bandwidth costs.
 *
 * This rule checks the aggregate count across all layers. For per-layer
 * bounds, use {@link layerFeatureCountRule}.
 *
 * @example
 * ```ts
 * rules: {
 *   'tile/feature-count': ['warning', { min: 1, max: 50000 }]
 * }
 * ```
 *
 * @see {@link layerFeatureCountRule} for per-layer bounds
 * @see {@link FeatureCountOptions} for configuration
 */
import type { Rule } from '@tileguard/core';
import {
  getVectorTile,
  totalFeatureCount,
  VECTOR_TILE_ARTIFACT_TYPE,
} from '../types.js';

/**
 * Configuration options for the `tile/feature-count` rule.
 */
export interface FeatureCountOptions {
  /** Minimum acceptable total feature count. */
  readonly min?: number;
  /** Maximum acceptable total feature count. */
  readonly max?: number;
  /** @deprecated Use `min` instead. */
  readonly minFeatures?: number;
  /** @deprecated Use `max` instead. */
  readonly maxFeatures?: number;
}

export const featureCountRule: Rule<FeatureCountOptions> = {
  id: 'tile/feature-count',
  meta: {
    description:
      'Vector tiles must satisfy configured total feature count bounds.',
    defaultSeverity: 'warning',
    docsUrl: 'https://tileguard.dev/rules/tile/feature-count',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    const options = context.options;
    const min = options?.min ?? options?.minFeatures;
    const max = options?.max ?? options?.maxFeatures;
    if (min === undefined && max === undefined) return;

    const tile = getVectorTile(context.artifact);
    const count = totalFeatureCount(tile);

    if (min !== undefined && count < min) {
      context.report({
        message: `Tile has "${count}" features total, expected at least "${min}".`,
        suggestion:
          'Adjust the tile generation filters or lower the configured minimum feature count.',
        data: { count, min },
      });
    }

    if (max !== undefined && count > max) {
      context.report({
        message: `Tile has "${count}" features total, expected at most "${max}".`,
        suggestion:
          'Simplify, filter, or split the tile data, or raise the configured maximum feature count.',
        data: { count, max },
      });
    }
  },
};
