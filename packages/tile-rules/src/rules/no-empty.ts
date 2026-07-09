import type { Rule } from '@tileguard/core';
import { getVectorTile, totalFeatureCount, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

export interface NoEmptyOptions {
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
      suggestion: 'Confirm this is an intentional empty tile, or fix the tile generation filters.',
      data: { totalFeatures: count, layers: Object.keys(tile.layers) },
    });
  },
};
