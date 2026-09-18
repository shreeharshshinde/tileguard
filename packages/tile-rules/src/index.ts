/**
 * @tileguard/tile-rules — Vector tile provider + validation rules.
 *
 * This package provides the complete tile validation pipeline for TileGuard:
 *
 * - **Provider**: Loads `.pbf`/`.mvt` files (local or remote), handles gzip
 *   decompression, and decodes the MVT protobuf format into typed artifacts.
 *
 * - **12 validation rules**: Each rule checks one specific aspect of tile
 *   geometry or structure, producing structured diagnostics with layer/feature
 *   location context.
 *
 * - **Geometry utilities**: Pure functions for coordinate validation, ring
 *   closure checking, area computation, and self-intersection detection.
 *   Exported for use in custom rules or analysis pipelines.
 *
 * - **PBF decoder**: Low-level MVT protobuf decoder with structured error
 *   reporting. Exported for advanced use cases.
 *
 * ## Quick Start
 *
 * ```ts
 * import { createEngine } from '@tileguard/core';
 * import { tilePlugin } from '@tileguard/tile-rules';
 *
 * const engine = createEngine({ plugins: [tilePlugin] });
 * const result = await engine.run(['./tile.pbf']);
 * ```
 *
 * ## Rules
 *
 * | Rule ID | Default Severity | What it catches |
 * |---------|-----------------|-----------------|
 * | `tile/required-layers` | error | Missing expected layers |
 * | `tile/required-properties` | error | Features missing declared properties |
 * | `tile/coordinate-range` | error | Coordinates outside valid extent |
 * | `tile/feature-count` | warning | Total feature count outside bounds |
 * | `tile/layer-feature-count` | warning | Per-layer count outside bounds |
 * | `tile/unclosed-ring` | error | Polygon rings not closed |
 * | `tile/zero-area-ring` | error | Degenerate zero-area polygons |
 * | `tile/winding-order` | error | Incorrect ring winding order |
 * | `tile/hole-containment` | error | Hole rings outside outer ring |
 * | `tile/self-intersection` | error | Geometry that crosses itself |
 * | `tile/degenerate-geometry` | error | Insufficient vertices |
 * | `tile/no-empty` | warning | Tiles with zero features |
 *
 * @packageDocumentation
 */

import type { Plugin, Rule } from '@tileguard/core';
import { tileProvider } from './provider.js';
import { coordinateRangeRule } from './rules/coordinate-range.js';
import { degenerateGeometryRule } from './rules/degenerate-geometry.js';
import { featureCountRule } from './rules/feature-count.js';
import { holeContainmentRule } from './rules/hole-containment.js';
import { layerFeatureCountRule } from './rules/layer-feature-count.js';
import { noEmptyRule } from './rules/no-empty.js';
import { requiredLayersRule } from './rules/required-layers.js';
import { requiredPropertiesRule } from './rules/required-properties.js';
import { selfIntersectionRule } from './rules/self-intersection.js';
import { unclosedRingRule } from './rules/unclosed-ring.js';
import { windingOrderRule } from './rules/winding-order.js';
import { zeroAreaRingRule } from './rules/zero-area-ring.js';

// ── Error types ───────────────────────────────────────────────────────────
export { type DecodeDiagnosticData, DecodeError } from './decode-error.js';
export type { LogicalPolygon, WindingConvention } from './geometry.js';
// ── Geometry utilities (for custom rules and analysis) ────────────────────
export {
  detectWindingConvention,
  findCoordinateRangeIssues,
  findDegenerateGeometryIssues,
  findHoleContainmentIssues,
  findSelfIntersectionIssues,
  findUnclosedRingIssues,
  findWindingOrderIssues,
  findZeroAreaRingIssues,
  groupRingsIntoPolygons,
  segmentsIntersect,
  signedArea,
  uniquePointCount,
} from './geometry.js';
// ── Low-level decoder (advanced use) ─────────────────────────────────────
export { decodeMvt, PbfReader } from './pbf-decoder.js';
// ── Provider ──────────────────────────────────────────────────────────────
export { tileProvider } from './provider.js';
export type { CoordinateRangeOptions } from './rules/coordinate-range.js';
// ── Rules ─────────────────────────────────────────────────────────────────
export { coordinateRangeRule } from './rules/coordinate-range.js';
export { degenerateGeometryRule } from './rules/degenerate-geometry.js';
export type { FeatureCountOptions } from './rules/feature-count.js';
export { featureCountRule } from './rules/feature-count.js';
export { holeContainmentRule } from './rules/hole-containment.js';
export type { LayerFeatureCountOptions } from './rules/layer-feature-count.js';
export { layerFeatureCountRule } from './rules/layer-feature-count.js';
export type { NoEmptyOptions } from './rules/no-empty.js';
export { noEmptyRule } from './rules/no-empty.js';
export type { RequiredLayersOptions } from './rules/required-layers.js';
export { requiredLayersRule } from './rules/required-layers.js';
export type { RequiredPropertiesOptions } from './rules/required-properties.js';
export { requiredPropertiesRule } from './rules/required-properties.js';
export { selfIntersectionRule } from './rules/self-intersection.js';
export { unclosedRingRule } from './rules/unclosed-ring.js';
export { windingOrderRule } from './rules/winding-order.js';
export type { ZeroAreaRingOptions } from './rules/zero-area-ring.js';
export { zeroAreaRingRule } from './rules/zero-area-ring.js';
// ── Domain types ──────────────────────────────────────────────────────────
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

/**
 * All tile validation rules in recommended execution order.
 *
 * This array is used by the `tilePlugin` to register all rules with the engine.
 * You can also import it directly to iterate rules for documentation generation
 * or custom rule selection logic.
 */
export const tileRules: readonly Rule[] = [
  requiredLayersRule,
  featureCountRule,
  layerFeatureCountRule,
  requiredPropertiesRule,
  coordinateRangeRule,
  degenerateGeometryRule,
  unclosedRingRule,
  zeroAreaRingRule,
  windingOrderRule,
  holeContainmentRule,
  selfIntersectionRule,
  noEmptyRule,
];

/**
 * The tile validation plugin for TileGuard.
 *
 * Bundles the vector tile provider and all 12 tile validation rules into a
 * single registerable unit. Pass this to `createEngine()` to enable tile
 * validation.
 *
 * @example
 * ```ts
 * import { createEngine } from '@tileguard/core';
 * import { tilePlugin } from '@tileguard/tile-rules';
 *
 * const engine = createEngine({
 *   plugins: [tilePlugin],
 *   rules: {
 *     'tile/required-layers': ['error', { layers: ['water', 'roads'] }],
 *   },
 * });
 * ```
 */
export const tilePlugin: Plugin = {
  id: 'tile-rules',
  name: 'TileGuard Tile Rules',
  version: '0.3.0',
  providers: [tileProvider],
  rules: tileRules,
};
