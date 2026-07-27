import type { Rule } from '@tileguard/core';
import { coordinateRangeRule } from './rules/coordinate-range.js';
import { degenerateGeometryRule } from './rules/degenerate-geometry.js';
import { featureCountRule } from './rules/feature-count.js';
import { layerFeatureCountRule } from './rules/layer-feature-count.js';
import { noEmptyRule } from './rules/no-empty.js';
import { requiredLayersRule } from './rules/required-layers.js';
import { requiredPropertiesRule } from './rules/required-properties.js';
import { selfIntersectionRule } from './rules/self-intersection.js';
import { unclosedRingRule } from './rules/unclosed-ring.js';
import { zeroAreaRingRule } from './rules/zero-area-ring.js';

/** Browser-safe default tile validation rule set. */
export const tileRules: readonly Rule[] = [
  requiredLayersRule,
  featureCountRule,
  layerFeatureCountRule,
  requiredPropertiesRule,
  coordinateRangeRule,
  degenerateGeometryRule,
  unclosedRingRule,
  zeroAreaRingRule,
  selfIntersectionRule,
  noEmptyRule,
];
