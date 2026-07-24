/**
 * @tileguard/inspector — Geometry: Pure Helper Functions
 *
 * Small, focused math utilities that recur across the viewport, renderer,
 * hit-tester, and overlay subsystems.
 *
 * Design rules:
 *   - Every function is pure (no I/O, no mutations, no shared state).
 *   - No MapLibre-style Point class — inputs and outputs are plain objects.
 *   - No external dependencies.
 *   - Prefer squared distances wherever the caller only needs relative
 *     comparisons — avoids the cost of Math.sqrt().
 */

import type { TilePoint } from './point.js';

// ---------------------------------------------------------------------------
// Distance
// ---------------------------------------------------------------------------

/**
 * Squared Euclidean distance between two points.
 *
 * Use this instead of `distance()` whenever you only need to compare distances
 * (e.g. finding the nearest feature) — avoids an unnecessary square root.
 *
 * @param a  First point (TilePoint or any {x, y} object).
 * @param b  Second point.
 */
export function distanceSquared(a: TilePoint, b: TilePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

/**
 * Midpoint between two points.
 *
 * Equivalent to `lerp(a, b, 0.5)` but avoids the multiply.
 *
 * @param a  Start point.
 * @param b  End point.
 */
export function midpoint(a: TilePoint, b: TilePoint): TilePoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Linear interpolation between two points.
 *
 *   result = a + t * (b − a)
 *
 * @param a  Start point (t = 0).
 * @param b  End point   (t = 1).
 * @param t  Interpolation factor. Values outside [0, 1] extrapolate.
 */
export function lerp(a: TilePoint, b: TilePoint, t: number): TilePoint {
  return {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/**
 * Return true if two points are equal within a numerical tolerance.
 *
 * Uses component-wise absolute difference rather than Euclidean distance to
 * stay branchless and avoid a square root.
 *
 * @param a          First point.
 * @param b          Second point.
 * @param tolerance  Maximum allowed per-axis difference (default: 1e-9).
 */
export function equalsWithinTolerance(
  a: TilePoint,
  b: TilePoint,
  tolerance = 1e-9,
): boolean {
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
}

// ---------------------------------------------------------------------------
// Polygon Area & Winding
// ---------------------------------------------------------------------------

/**
 * Calculate the signed area of a ring using the Shoelace formula.
 *
 * MVT Winding Convention (Tile-Y down space):
 *   - Clockwise (CW) winding produces signedArea > 0 (Exterior Ring).
 *   - Counter-Clockwise (CCW) winding produces signedArea < 0 (Interior Ring / Hole).
 *
 * @param ring Array of points defining the polygon ring.
 */
export function signedArea(ring: readonly TilePoint[]): number {
  if (ring.length < 3) return 0;
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const p1 = ring[j];
    const p2 = ring[i];
    if (p1 !== undefined && p2 !== undefined) {
      sum += (p2.x - p1.x) * (p2.y + p1.y);
    }
  }
  return sum / 2;
}
