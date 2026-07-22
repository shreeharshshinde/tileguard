/**
 * @tileguard/inspector — Hit-Tester Engine
 *
 * Answers "which feature did the user click?" in tile coordinate space.
 * All algorithms operate on MVT integer coordinates (0–4096) to avoid
 * floating-point inconsistencies from repeated viewport transform round-trips.
 *
 * Three hit-test algorithms:
 *   - Point features    : vertex proximity (Euclidean distance threshold)
 *   - LineString features : point-to-segment minimum distance
 *   - Polygon features  : point-in-polygon ray casting
 *
 * No React or DOM dependency — unit-testable with synthetic feature arrays.
 *
 * Implemented in Milestone 5.
 *
 * Public surface:
 *   - HitResult     — the feature identified by a hit test
 *   - HitTester     — interface for the hit-test engine
 *   - createHitTester() — factory
 */

import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { TilePoint } from '../viewport/viewport.ts';

// ---------------------------------------------------------------------------
// Result Types — implemented in Milestone 5
// ---------------------------------------------------------------------------

/** The result of a successful hit test. */
export interface HitResult {
  /** Layer name containing the hit feature. */
  readonly layerName: string;
  /** Feature index within that layer. */
  readonly featureIndex: number;
  /**
   * Distance from the query point to the feature (tile coordinate units).
   * 0 for polygon hits (point is inside); positive for line/point distance.
   */
  readonly distance: number;
}

// ---------------------------------------------------------------------------
// Interface — implemented in Milestone 5
// ---------------------------------------------------------------------------

/**
 * HitTester — geometric feature selection engine.
 *
 * Operates in tile coordinate space. The caller must convert screen pixel
 * coordinates to tile coordinates using the Viewport before querying.
 *
 * Implemented in Milestone 5.
 */
export interface HitTester {
  /**
   * Find the feature closest to the given tile-space query point.
   * Returns undefined if no feature is within the hit radius.
   *
   * @param point     Query point in tile coordinate space (0–4096).
   * @param artifact  Decoded tile to search.
   * @param radius    Hit radius in tile coordinate units (default: 10).
   */
  hitTest(
    point: TilePoint,
    artifact: VectorTileArtifact,
    radius?: number,
  ): HitResult | undefined;
}

// ---------------------------------------------------------------------------
// Factory — implemented in Milestone 5
// ---------------------------------------------------------------------------

/**
 * Creates a HitTester instance.
 * Full implementation delivered in Milestone 5.
 */
export function createHitTester(): HitTester {
  throw new Error('createHitTester() — implemented in Milestone 5');
}
