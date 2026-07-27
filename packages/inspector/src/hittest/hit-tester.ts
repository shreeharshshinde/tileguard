/**
 * @tileguard/inspector — Hit-Tester Engine
 *
 * Answers "which feature is closest to this tile-space point?"
 *
 * All algorithms operate in MVT tile coordinate space (integers 0–4096).
 * The caller is responsible for converting screen pixels to tile coordinates
 * via `Viewport.screenToTile()` before calling `hitTest()`.
 *
 * Architecture — two-layer separation:
 *   ┌──────────────────────────────────────────────┐
 *   │  HitTesterImpl                               │
 *   │  - Artifact traversal (layers → features)    │
 *   │  - Closest-feature bookkeeping               │
 *   │  - Hit radius logic (squared comparison)     │
 *   └───────────────┬──────────────────────────────┘
 *                   │ delegates geometry math to
 *   ┌───────────────▼──────────────────────────────┐
 *   │  helpers.ts                                   │
 *   │  - distanceSquared()                          │
 *   │  - pointToSegmentDistanceSquared()            │
 *   │  - pointInPolygon()                           │
 *   │  - minRingDistanceSquared()                   │
 *   └──────────────────────────────────────────────┘
 *
 * Three hit-test algorithms:
 *   - Point features (type=1):
 *       Minimum distanceSquared() over all vertices.
 *       Hit if √d ≤ radius.
 *
 *   - LineString features (type=2):
 *       Minimum pointToSegmentDistanceSquared() over all segments in all parts.
 *       Hit if √d ≤ radius.
 *
 *   - Polygon features (type=3):
 *       First ring = exterior; remaining rings = holes.
 *       If query is inside exterior AND outside every hole → distance = 0.
 *       Otherwise: minimum boundary distance across all rings.
 *       Hit if √d ≤ radius (or d = 0).
 *
 * Closest-feature selection:
 *   All features within the hit radius are compared; the one with the
 *   smallest distance is returned. Ties are broken by layer iteration order
 *   then feature index (deterministic since layer order is stable in V8 Maps).
 *
 * Robustness:
 *   - Malformed geometry (empty rings, null vertices) is silently skipped.
 *   - Never throws.
 *
 * Boundary: Zero imports from renderer/, viewport/, store/, or DOM APIs.
 *
 * Public surface:
 *   - DEFAULT_HIT_RADIUS      — default radius in tile coordinate units
 *   - HitResult               — result of a successful hit test
 *   - HitTester               — interface
 *   - createHitTester()       — factory
 */

import type { VectorTileArtifact, VectorTileFeature } from '@tileguard/tile-rules';
import type { TilePoint } from '../geometry/index.js';
import {
  distanceSquared,
  minRingDistanceSquared,
  pointInPolygon,
  pointToSegmentDistanceSquared,
} from './helpers.js';

// ---------------------------------------------------------------------------
// Public Constant
// ---------------------------------------------------------------------------

/** Default hit radius in tile coordinate units (same space as MVT extent 4096). */
export const DEFAULT_HIT_RADIUS = 10;

// ---------------------------------------------------------------------------
// Result Type
// ---------------------------------------------------------------------------

/** The result of a successful hit test. */
export interface HitResult {
  /** Layer name containing the hit feature. */
  readonly layerName: string;
  /** Feature index within that layer (0-indexed). */
  readonly featureIndex: number;
  /**
   * Distance from the query point to the feature in tile coordinate units.
   * 0 for polygon interior hits; positive for all other hits.
   */
  readonly distance: number;
}

// ---------------------------------------------------------------------------
// HitTester Interface
// ---------------------------------------------------------------------------

/**
 * HitTester — stateless geometric feature selection engine.
 *
 * Operates exclusively in tile coordinate space. Callers must convert screen
 * coordinates to tile coordinates via `Viewport.screenToTile()` before calling
 * `hitTest()`.
 */
export interface HitTester {
  /**
   * Find the feature closest to `point` within `radius` tile units.
   *
   * @param point     Query point in tile coordinate space.
   * @param artifact  Decoded tile artifact to search.
   * @param radius    Hit radius in tile coordinate units.
   *                  Defaults to DEFAULT_HIT_RADIUS (10).
   * @returns The closest matching HitResult, or undefined if nothing is in range.
   */
  hitTest(point: TilePoint, artifact: VectorTileArtifact, radius?: number): HitResult | undefined;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * HitTesterImpl — concrete implementation of HitTester.
 *
 * Stateless: every hitTest() call is independent. Holds no mutable state.
 */
class HitTesterImpl implements HitTester {
  hitTest(
    point: TilePoint,
    artifact: VectorTileArtifact,
    radius = DEFAULT_HIT_RADIUS,
  ): HitResult | undefined {
    const radiusSq = radius * radius;
    let bestDistSq = Infinity; // track strictly best so far
    let bestLayerName: string | undefined;
    let bestFeatureIndex = -1;
    let bestDist = Infinity;

    for (const [layerName, layer] of Object.entries(artifact.content.layers)) {
      for (let fi = 0; fi < layer.features.length; fi++) {
        const feature = layer.features[fi];
        if (feature === undefined) continue;

        const distSq = this._featureDistanceSq(point, feature);
        if (distSq === undefined) continue;

        // Must be within radius AND strictly closer than current best
        if (distSq <= radiusSq && distSq < bestDistSq) {
          bestDistSq = distSq;
          bestLayerName = layerName;
          bestFeatureIndex = fi;
          bestDist = Math.sqrt(distSq);
        }
      }
    }

    if (bestLayerName === undefined) return undefined;

    return {
      layerName: bestLayerName,
      featureIndex: bestFeatureIndex,
      distance: bestDist,
    };
  }

  // ── Private geometry dispatch ─────────────────────────────────────────────

  /**
   * Returns the squared distance from `point` to the given feature.
   * Returns undefined for unknown / zero-geometry features (skip silently).
   */
  private _featureDistanceSq(point: TilePoint, feature: VectorTileFeature): number | undefined {
    switch (feature.type) {
      case 1:
        return this._pointFeatureDistanceSq(point, feature);
      case 2:
        return this._lineFeatureDistanceSq(point, feature);
      case 3:
        return this._polygonFeatureDistanceSq(point, feature);
      default:
        return undefined;
    }
  }

  // ── Point features (type = 1) ─────────────────────────────────────────────

  /**
   * Point feature: minimum distanceSquared() over all vertices.
   *
   * MVT type=1 geometry is a flat `Point[]` (not `Point[][]`).
   */
  private _pointFeatureDistanceSq(
    point: TilePoint,
    feature: VectorTileFeature,
  ): number | undefined {
    const geom = feature.geometry as readonly TilePoint[];
    if (geom.length === 0) return undefined;

    let best = Infinity;
    for (const vertex of geom) {
      const d = distanceSquared(point, vertex);
      if (d < best) best = d;
    }
    return best;
  }

  // ── LineString features (type = 2) ───────────────────────────────────────

  /**
   * LineString feature: minimum pointToSegmentDistanceSquared() over all
   * segments across all parts.
   */
  private _lineFeatureDistanceSq(point: TilePoint, feature: VectorTileFeature): number | undefined {
    const parts = feature.geometry as readonly (readonly TilePoint[])[];
    let best = Infinity;
    let hasPart = false;

    for (const part of parts) {
      if (part.length < 2) continue;
      hasPart = true;

      for (let i = 1; i < part.length; i++) {
        const a = part[i - 1];
        const b = part[i];
        if (a === undefined || b === undefined) continue;
        const d = pointToSegmentDistanceSquared(point, a, b);
        if (d < best) best = d;
      }
    }

    return hasPart ? best : undefined;
  }

  // ── Polygon features (type = 3) ──────────────────────────────────────────

  /**
   * Polygon feature: uses the MVT ring convention.
   *
   * Ring layout (by winding sign in screen/tile Y-down space):
   *   rings[0]      — exterior ring (CW winding → signedArea > 0 in MVT)
   *   rings[1..n]   — interior hole rings (CCW winding)
   *
   * Hit distance:
   *   - 0 if point is inside exterior ring AND outside every hole ring.
   *   - Otherwise: minimum boundary distance across all rings.
   *   This way a point inside a hole correctly registers a boundary proximity
   *   to the nearest ring wall rather than a miss.
   */
  private _polygonFeatureDistanceSq(
    point: TilePoint,
    feature: VectorTileFeature,
  ): number | undefined {
    const rings = feature.geometry as readonly (readonly TilePoint[])[];
    if (rings.length === 0) return undefined;

    const exterior = rings[0];
    if (exterior === undefined || exterior.length < 3) return undefined;

    // ── Interior test ────────────────────────────────────────────────────
    const insideExterior = pointInPolygon(point, exterior);

    if (insideExterior) {
      // Check holes: if point is inside any hole ring, it's outside the polygon solid.
      let insideHole = false;
      for (let hi = 1; hi < rings.length; hi++) {
        const hole = rings[hi];
        if (hole === undefined || hole.length < 3) continue;
        if (pointInPolygon(point, hole)) {
          insideHole = true;
          break;
        }
      }

      if (!insideHole) {
        // Exact interior hit — distance 0 beats everything.
        return 0;
      }
    }

    // ── Boundary distance ────────────────────────────────────────────────
    // Point is outside the polygon solid. Find the minimum distance to any
    // ring boundary (exterior or hole walls).
    let best = Infinity;
    for (const ring of rings) {
      if (ring.length < 2) continue;
      const d = minRingDistanceSquared(point, ring);
      if (d < best) best = d;
    }

    return best === Infinity ? undefined : best;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a stateless HitTester instance.
 *
 * The same instance is safe to reuse across multiple hitTest() calls and
 * across different artifacts — no internal state is retained.
 */
export function createHitTester(): HitTester {
  return new HitTesterImpl();
}
