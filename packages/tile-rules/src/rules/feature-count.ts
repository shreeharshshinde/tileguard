import type { Rule } from '@tileguard/core';
import { getVectorTile, totalFeatureCount, VECTOR_TILE_ARTIFACT_TYPE } from '../types.js';

export interface FeatureCountOptions {
  readonly min?: number;
  readonly max?: number;
  readonly minFeatures?: number;
  readonly maxFeatures?: number;
}

export const featureCountRule: Rule<FeatureCountOptions> = {
  id: 'tile/feature-count',
  meta: {
    description: 'Vector tiles must satisfy configured total feature count bounds.',
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
