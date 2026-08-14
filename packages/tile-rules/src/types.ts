/**
 * @tileguard/tile-rules — Vector Tile Domain Types
 *
 * Type definitions for the decoded Mapbox Vector Tile (MVT) format.
 * These types represent the in-memory structure produced by the PBF decoder
 * and consumed by all tile validation rules.
 *
 * The MVT coordinate model uses integer values in a tile-local grid.
 * The default extent is 4096 units per tile edge. Coordinates may exceed
 * this range due to clipping buffers (typically 64–80 units) that extend
 * geometries beyond tile boundaries to prevent rendering seams.
 *
 * @see {@link https://github.com/mapbox/vector-tile-spec | MVT Specification}
 * @packageDocumentation
 */

import type { Artifact } from '@tileguard/core';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * The artifact type discriminant for decoded vector tiles.
 *
 * Used by rules to declare which artifacts they handle and by the engine
 * to route artifacts to matching rules.
 *
 * @example
 * ```ts
 * const myRule: Rule = {
 *   artifactTypes: [VECTOR_TILE_ARTIFACT_TYPE],
 *   // ...
 * };
 * ```
 */
export const VECTOR_TILE_ARTIFACT_TYPE = 'VectorTile';

// ---------------------------------------------------------------------------
// Geometry primitives
// ---------------------------------------------------------------------------

/**
 * MVT geometry type encoded as an integer.
 *
 * - `0` — Unknown geometry type
 * - `1` — Point (or MultiPoint)
 * - `2` — LineString (or MultiLineString)
 * - `3` — Polygon (or MultiPolygon)
 *
 * @see {@link GeometryTypeName} for the human-readable equivalent.
 */
export type GeometryType = 0 | 1 | 2 | 3;

/**
 * Human-readable geometry type name corresponding to {@link GeometryType}.
 */
export type GeometryTypeName = 'Unknown' | 'Point' | 'LineString' | 'Polygon';

/**
 * A single coordinate in the MVT tile-local integer grid.
 *
 * Values are typically in the range `[0, extent]` (default extent = 4096),
 * but may exceed this range due to clipping buffers or cross-tile
 * feature duplication.
 */
export interface Point {
  readonly x: number;
  readonly y: number;
}

// ---------------------------------------------------------------------------
// Feature model
// ---------------------------------------------------------------------------

/**
 * The set of value types that MVT feature properties can hold.
 *
 * MVT properties are stored in a string-table encoding (keys + values arrays)
 * and decoded into native JavaScript types by the PBF decoder.
 */
export type TileValue = string | number | boolean | null;

/**
 * Decoded geometry for a single feature.
 *
 * - For Point features: a flat array of {@link Point} coordinates.
 * - For LineString/Polygon features: an array of rings/lines, where each
 *   ring/line is an array of {@link Point} coordinates.
 *
 * Polygon rings follow the MVT winding order convention:
 * exterior rings are clockwise, interior rings (holes) are counter-clockwise.
 */
export type VectorTileGeometry =
  | readonly Point[]
  | readonly (readonly Point[])[];

/**
 * A single decoded feature within a vector tile layer.
 *
 * Features are the atomic unit of geographic data in MVT. Each feature
 * has a geometry type, coordinate geometry, and a set of key-value properties.
 *
 * @example
 * ```ts
 * // Accessing feature data in a rule
 * const feature = layer.features[0];
 * console.log(feature.geometryType); // 'Polygon'
 * console.log(feature.properties.name); // 'Central Park'
 * ```
 */
export interface VectorTileFeature {
  /** Optional feature ID. Not all tile generators assign IDs. */
  readonly id?: number;

  /** Geometry type as an integer code (0–3). */
  readonly type: GeometryType;

  /** Geometry type as a human-readable string. */
  readonly geometryType: GeometryTypeName;

  /** Key-value properties attached to this feature. */
  readonly properties: Readonly<Record<string, TileValue>>;

  /**
   * Decoded geometry coordinates in tile-local integer format.
   *
   * Structure depends on geometry type:
   * - Point: `Point[]` (one or more points)
   * - LineString: `Point[][]` (one or more lines)
   * - Polygon: `Point[][]` (one or more rings; first is exterior)
   */
  readonly geometry: VectorTileGeometry;
}

// ---------------------------------------------------------------------------
// Layer model
// ---------------------------------------------------------------------------

/**
 * A single layer within a decoded vector tile.
 *
 * Layers group related features (e.g., "water", "roads", "buildings").
 * Each layer has its own coordinate extent, string tables, and feature array.
 */
export interface VectorTileLayer {
  /** Layer name as declared in the tile (e.g., "water", "transportation"). */
  readonly name: string;

  /** MVT specification version for this layer (typically 2). Null if absent. */
  readonly version: number | null;

  /**
   * Coordinate extent for this layer.
   *
   * Defines the tile-local coordinate space. Default is 4096.
   * All feature coordinates in this layer are relative to this extent.
   */
  readonly extent: number;

  /** String table of property keys used by features in this layer. */
  readonly keys: readonly string[];

  /** String table of property values used by features in this layer. */
  readonly values: readonly TileValue[];

  /** All features in this layer, in declaration order. */
  readonly features: readonly VectorTileFeature[];
}

// ---------------------------------------------------------------------------
// Tile content model
// ---------------------------------------------------------------------------

/**
 * The fully decoded content of a Mapbox Vector Tile.
 *
 * This is the shape of `artifact.content` for VectorTile artifacts.
 * It contains all layers, each with their features and geometry.
 *
 * @example
 * ```ts
 * const tile = getVectorTile(context.artifact);
 * for (const [name, layer] of Object.entries(tile.layers)) {
 *   console.log(`${name}: ${layer.features.length} features`);
 * }
 * ```
 */
export interface VectorTileContent {
  /** All layers in the tile, keyed by layer name. */
  readonly layers: Readonly<Record<string, VectorTileLayer>>;
}

// ---------------------------------------------------------------------------
// Artifact type alias
// ---------------------------------------------------------------------------

/**
 * A fully-typed vector tile artifact.
 *
 * This narrows the generic `Artifact<T, C>` from `@tileguard/core` to the
 * specific vector tile domain types. Used for type-safe artifact handling
 * in providers and advanced rule implementations.
 */
export type VectorTileArtifact = Artifact<
  typeof VECTOR_TILE_ARTIFACT_TYPE,
  VectorTileContent
>;

// ---------------------------------------------------------------------------
// Configuration types
// ---------------------------------------------------------------------------

/**
 * Per-layer feature count bounds for the `tile/layer-feature-count` rule.
 *
 * @example
 * ```ts
 * rules: {
 *   'tile/layer-feature-count': ['warning', {
 *     layers: {
 *       water: { min: 1, max: 5000 },
 *       buildings: { max: 10000 },
 *     }
 *   }]
 * }
 * ```
 */
export interface LayerFeatureBounds {
  /** Minimum expected feature count. */
  readonly min?: number;
  /** Maximum expected feature count. */
  readonly max?: number;
  /** @deprecated Use `min` instead. */
  readonly minFeatures?: number;
  /** @deprecated Use `max` instead. */
  readonly maxFeatures?: number;
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Extracts the decoded vector tile content from a generic artifact.
 *
 * This is the standard way for rules to access tile data from the
 * rule context's artifact. It performs a type assertion from the
 * generic `Artifact<string, unknown>` to `VectorTileContent`.
 *
 * @param artifact - The artifact provided by the rule context.
 * @returns The decoded vector tile content.
 *
 * @example
 * ```ts
 * create(context) {
 *   const tile = getVectorTile(context.artifact);
 *   for (const [name, layer] of Object.entries(tile.layers)) {
 *     // validate layer...
 *   }
 * }
 * ```
 */
export function getVectorTile(artifact: Artifact): VectorTileContent {
  return artifact.content as VectorTileContent;
}

/**
 * Returns the geometry parts of a feature as a normalized array of rings/lines.
 *
 * For Point features (type 1), wraps the flat coordinate array in an outer
 * array for uniform iteration. For LineString/Polygon features, returns the
 * geometry directly as an array of coordinate arrays.
 *
 * @param feature - The vector tile feature to extract parts from.
 * @returns An array of coordinate arrays, one per geometry part (ring or line).
 *
 * @example
 * ```ts
 * const parts = getFeatureParts(feature);
 * for (const ring of parts) {
 *   for (const point of ring) {
 *     // inspect coordinate...
 *   }
 * }
 * ```
 */
export function getFeatureParts(
  feature: VectorTileFeature,
): readonly (readonly Point[])[] {
  if (feature.type === 1) {
    return [feature.geometry as readonly Point[]];
  }
  return feature.geometry as readonly (readonly Point[])[];
}

/**
 * Counts the total number of features across all layers in a tile.
 *
 * @param tile - The decoded vector tile content.
 * @returns The sum of feature counts across all layers.
 *
 * @example
 * ```ts
 * const count = totalFeatureCount(tile);
 * if (count === 0) {
 *   context.report({ message: 'Tile contains 0 features.' });
 * }
 * ```
 */
export function totalFeatureCount(tile: VectorTileContent): number {
  return Object.values(tile.layers).reduce(
    (total, layer) => total + layer.features.length,
    0,
  );
}
