/**
 * @tileguard/inspector — Geometry: Traversal
 *
 * Canonical geometry traversal for the Inspector subsystem. Walks decoded
 * VectorTileArtifact geometry and dispatches each part to a typed visitor.
 *
 * Layering guarantee: this module operates directly on the public
 * VectorTileFeature / VectorTileArtifact interfaces and does NOT import
 * anything from @tileguard/tile-rules at runtime beyond its type definitions
 * (which are erased at compile time).
 *
 * Geometry dispatch rules
 * ───────────────────────
 *   GeometryType 1 (Point)      → onPoint,      once per feature (partIndex = 0)
 *   GeometryType 2 (LineString) → onLineString, once per line part (partIndex = 0..n)
 *   GeometryType 3 (Polygon)    → onPolygon,    once per polygon part (partIndex = 0..n)
 *   GeometryType 0 (Unknown)    → skipped silently
 *
 * Multi-geometry dispatch
 * ───────────────────────
 * The MVT spec encodes Multi* geometries as a single feature with multiple
 * geometry parts. Each part is dispatched as a separate callback with an
 * incrementing `partIndex`.
 *
 * For Point features, the decoder represents geometry as a flat `readonly Point[]`
 * array containing all vertices of the feature. Traversal emits a single `onPoint`
 * call containing the full vertex array with `partIndex = 0`.
 *
 * For LineString features, each line segment is dispatched separately with an
 * incrementing `partIndex`.
 *
 * For Polygon features, the outer geometry array contains all rings
 * (exterior + interior holes). Traversal passes the full rings array to
 * `onPolygon` with `partIndex = 0`.
 *
 * Public API
 * ──────────
 *   GeometryVisitor       — typed visitor callbacks
 *   FeatureContext        — per-call context passed to each visitor
 *   walkFeatureGeometry   — walk a single feature
 *   walkLayer             — walk all features in a layer
 *   walkArtifact          — walk all layers of a decoded tile
 */

import type {
  Point,
  VectorTileArtifact,
  VectorTileFeature,
  VectorTileLayer,
} from '@tileguard/tile-rules';

export type { Point };

// ---------------------------------------------------------------------------
// FeatureContext
// ---------------------------------------------------------------------------

/**
 * Contextual information provided to each geometry visitor callback.
 * All fields are read-only — visitors must never mutate them.
 */
export interface FeatureContext {
  /** Name of the layer containing this feature. */
  readonly layerName: string;
  /** The full layer object (extent, keys, values, features). */
  readonly layer: VectorTileLayer;
  /** Zero-based index of this feature within the layer's features array. */
  readonly featureIndex: number;
  /** The raw feature (geometry, type, properties, id). */
  readonly feature: VectorTileFeature;
  /**
   * Zero-based index of this geometry part within the feature.
   * Always 0 for single-part features. Increments for each part in
   * MultiLineString / MultiPolygon features.
   */
  readonly partIndex: number;
}

// ---------------------------------------------------------------------------
// GeometryVisitor
// ---------------------------------------------------------------------------

/**
 * GeometryVisitor — typed visitor interface for MVT geometry traversal.
 *
 * All callbacks are optional. A missing callback silently skips features of
 * that geometry type. Visitor callbacks are purely observational — they must
 * not mutate the artifact, layer, feature, or geometry arrays.
 */
export interface GeometryVisitor {
  /**
   * Called once per Point geometry feature.
   *
   * `points` is the array of vertex coordinates (Point[]).
   * For a Point feature with multiple vertices, all points are delivered
   * in a single `onPoint` call.
   */
  onPoint?(points: readonly Point[], context: FeatureContext): void;

  /**
   * Called once per LineString geometry part.
   *
   * For a MultiLineString each line segment is dispatched separately with an
   * incrementing `partIndex`.
   */
  onLineString?(points: readonly Point[], context: FeatureContext): void;

  /**
   * Called once per Polygon geometry part.
   *
   * `rings[0]` is the exterior ring; `rings[1..n]` are interior rings (holes).
   */
  onPolygon?(rings: readonly (readonly Point[])[], context: FeatureContext): void;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Normalise raw VectorTileGeometry into the canonical parts representation.
 *
 * MVT geometry union:
 *   type 1 (Point):      geometry is readonly Point[]
 *   type 2/3:            geometry is readonly (readonly Point[])[]
 *
 * We wrap the Point case so the downstream walk loop is uniform.
 */
function normaliseToParts(feature: VectorTileFeature): readonly (readonly Point[])[] {
  if (feature.type === 1) {
    return [feature.geometry as readonly Point[]];
  }
  return feature.geometry as readonly (readonly Point[])[];
}

// ---------------------------------------------------------------------------
// Public walk functions
// ---------------------------------------------------------------------------

/**
 * Walk the geometry of a single feature, dispatching each part to the
 * appropriate visitor callback.
 *
 * GeometryType 0 (Unknown) is silently skipped.
 *
 * @param feature      The feature to traverse.
 * @param layerName    The name of the containing layer (for FeatureContext).
 * @param layer        The containing layer object (for FeatureContext).
 * @param featureIndex Zero-based index of this feature within the layer.
 * @param visitor      Visitor to receive dispatched geometry.
 */
export function walkFeatureGeometry(
  feature: VectorTileFeature,
  layerName: string,
  layer: VectorTileLayer,
  featureIndex: number,
  visitor: GeometryVisitor,
): void {
  const { type } = feature;
  if (type === 0) return; // Unknown — skip silently

  const parts = normaliseToParts(feature);

  if (type === 1) {
    // Point / MultiPoint — single onPoint call per feature with full vertex array
    for (let partIndex = 0; partIndex < parts.length; partIndex++) {
      const part = parts[partIndex];
      if (part === undefined) continue;
      const context: FeatureContext = { layerName, layer, featureIndex, feature, partIndex };
      visitor.onPoint?.(part, context);
    }
  } else if (type === 2) {
    // LineString / MultiLineString — each element is an array of vertices
    for (let partIndex = 0; partIndex < parts.length; partIndex++) {
      const part = parts[partIndex];
      if (part === undefined) continue;
      const context: FeatureContext = { layerName, layer, featureIndex, feature, partIndex };
      visitor.onLineString?.(part, context);
    }
  } else if (type === 3) {
    // Polygon / MultiPolygon — rings array passed to onPolygon
    const context: FeatureContext = { layerName, layer, featureIndex, feature, partIndex: 0 };
    visitor.onPolygon?.(parts, context);
  }
}

/**
 * Walk all features in a single layer, dispatching geometry to the visitor.
 *
 * @param layer   The VectorTileLayer to traverse.
 * @param visitor Visitor to receive dispatched geometry.
 */
export function walkLayer(layer: VectorTileLayer, visitor: GeometryVisitor): void {
  const { features, name } = layer;
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    if (feature === undefined) continue;
    walkFeatureGeometry(feature, name, layer, i, visitor);
  }
}

/**
 * Walk all layers and all features of a decoded VectorTileArtifact.
 *
 * @param artifact The decoded tile to traverse.
 * @param visitor  Visitor to receive dispatched geometry.
 */
export function walkArtifact(artifact: VectorTileArtifact, visitor: GeometryVisitor): void {
  for (const layer of Object.values(artifact.content.layers)) {
    if (layer === undefined) continue;
    walkLayer(layer, visitor);
  }
}
