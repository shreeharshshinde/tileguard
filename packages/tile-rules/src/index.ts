/**
 * @tileguard/tile-rules — Vector tile provider + validation rules.
 *
 * This package ports the legacy MVT/PBF decoder and tile validation logic into
 * framework-native providers and independent rules. The geometry checks are
 * intentionally split into separate rule IDs so users can configure expensive
 * or noisy checks independently.
 */

import type { Plugin, Rule } from '@tileguard/core';
import { tileProvider } from './provider.js';
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

export {
  findCoordinateRangeIssues,
  findDegenerateGeometryIssues,
  findSelfIntersectionIssues,
  findUnclosedRingIssues,
  findZeroAreaRingIssues,
  segmentsIntersect,
  signedArea,
  uniquePointCount,
} from './geometry.js';
export { decodeMvt, PbfReader } from './pbf-decoder.js';
export { tileProvider } from './provider.js';
export { coordinateRangeRule } from './rules/coordinate-range.js';
export { degenerateGeometryRule } from './rules/degenerate-geometry.js';
export { featureCountRule } from './rules/feature-count.js';
export { layerFeatureCountRule } from './rules/layer-feature-count.js';
export { noEmptyRule } from './rules/no-empty.js';
export { requiredLayersRule } from './rules/required-layers.js';
export { requiredPropertiesRule } from './rules/required-properties.js';
export { selfIntersectionRule } from './rules/self-intersection.js';
export { unclosedRingRule } from './rules/unclosed-ring.js';
export { zeroAreaRingRule } from './rules/zero-area-ring.js';
export type {
  GeometryType,
  GeometryTypeName,
  LayerFeatureBounds,
  Point,
  TileValue,
  VectorTileArtifact,
  VectorTileContent,
  VectorTileFeature,
  VectorTileGeometry,
  VectorTileLayer,
} from './types.js';
export {
  getFeatureParts,
  getVectorTile,
  totalFeatureCount,
  VECTOR_TILE_ARTIFACT_TYPE,
} from './types.js';

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

export const tilePlugin: Plugin = {
  id: 'tile-rules',
  name: 'TileGuard Tile Rules',
  version: '0.3.0',
  providers: [tileProvider],
  rules: tileRules,
};
