/**
 * Rule: `tile/no-empty`
 *
 * Flags vector tiles that contain zero features across all layers.
 *
 * @remarks
 * An empty tile (zero features) can be intentional — ocean tiles in a
 * buildings layer, for example — or it can indicate a pipeline failure
 * where data was silently dropped. This rule helps distinguish the two cases.
 *
 * Common causes of unintentional empty tiles:
 * - Filter expressions that exclude all features at certain zoom levels
 * - Coordinate reprojection errors placing features outside tile bounds
 * - Source data gaps for specific geographic regions
 *
 * The rule defaults to `warning` severity because empty tiles are often
 * legitimate. Set to `error` for pipelines where every tile must contain data,
 * or disable with `{ allowEmpty: true }` for intentionally sparse tilesets.
 *
 * @example
 * ```ts
 * // Disable the rule entirely
 * rules: { 'tile/no-empty': 'off' }
 *
 * // Allow empty tiles via options
 * rules: { 'tile/no-empty': ['warning', { allowEmpty: true }] }
 * ```
 *
 * @see {@link NoEmptyOptions} for configuration
 */
import type { Rule } from '@tileguard/core';
import {
  getVectorTile,
  totalFeatureCount,
  VECTOR_TILE_ARTIFACT_TYPE,
} from '../types.js';

/**
 * Configuration options for the `tile/no-empty` rule.
 */
export interface NoEmptyOptions {
  /** When `true`, suppresses the diagnostic for empty tiles. Default: `false`. */
  readonly allowEmpty?: boolean;
}

export const noEmptyRule: Rule<NoEmptyOptions> = {
  id: 'tile/no-empty',
  meta: {
    description:
      'Vector tiles should contain at least one feature unless empty tiles are explicitly allowed.',
    defaultSeverity: 'warning',
    docsUrl: 'https://tileguard.dev/rules/tile/no-empty',
    recommended: true,
    since: '0.3.0',
  },
  artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],

  create(context) {
    if (context.options?.allowEmpty === true) return;

    const tile = getVectorTile(context.artifact);
    const count = totalFeatureCount(tile);
    if (count > 0) return;

    context.report({
      message: `Tile contains 0 features.`,
      suggestion:
        'Confirm this is an intentional empty tile, or fix the tile generation filters.',
      data: { totalFeatures: count, layers: Object.keys(tile.layers) },
    });
  },
};
