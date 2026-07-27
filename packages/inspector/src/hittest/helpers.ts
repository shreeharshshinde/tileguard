/**
 * @tileguard/inspector — HitTester Geometry Helpers
 *
 * Pure geometric primitives used exclusively by the HitTester engine.
 * All functions operate in tile coordinate space (integer 0–4096).
 *
 * Design rules:
 *   - Every function is pure (no I/O, no mutation, no shared state).
 *   - Inputs and outputs are plain {x, y} objects — no class allocation.
 *   - Prefer squared-distance comparisons to avoid repeated Math.sqrt().
 *   - Never throw on malformed or degenerate input — return a safe fallback.
 *
 * Boundary: Zero imports from renderer/, viewport/, store/, or DOM APIs.
 * Only imports the TilePoint type from the geometry module.
 */

import type { TilePoint } from '../geometry/index.js';

// ---------------------------------------------------------------------------
// Squared Distance
// ---------------------------------------------------------------------------

/**
 * Squared Euclidean distance between two tile-space points.
 *
 * Avoids `Math.sqrt()` — use when you only need relative comparisons.
 *
 * @param a  First point.
 * @param b  Second point.
 * @returns  dx² + dy²
 */
export function distanceSquared(a: TilePoint, b: TilePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

// ---------------------------------------------------------------------------
// Point-to-Segment Distance (squared)
// ---------------------------------------------------------------------------

/**
 * Squared distance from point `p` to the finite line segment `[a, b]`.
 *
 * Algorithm:
 *   1. Compute the scalar projection t = dot(p−a, b−a) / |b−a|²
 *   2. Clamp t to [0, 1] to stay within the segment bounds.
 *   3. Nearest point on segment = a + t*(b−a).
 *   4. Return squared distance from p to that nearest point.
 *
 * Degenerate case: when `a` and `b` are the same point (|b−a|² = 0),
 * returns the squared distance from `p` to `a`.
 *
 * @param p  Query point.
 * @param a  Segment start.
 * @param b  Segment end.
 * @returns  Squared distance from p to the nearest point on segment [a, b].
 */
export function pointToSegmentDistanceSquared(p: TilePoint, a: TilePoint, b: TilePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // Degenerate segment: a === b
    return distanceSquared(p, a);
  }

  // Scalar projection of (p − a) onto (b − a), clamped to [0, 1]
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));

  // Nearest point on segment
  const nearestX = a.x + t * dx;
  const nearestY = a.y + t * dy;

  const ex = p.x - nearestX;
  const ey = p.y - nearestY;
  return ex * ex + ey * ey;
}

// ---------------------------------------------------------------------------
// Point-in-Polygon (ray casting)
// ---------------------------------------------------------------------------

/**
 * Test whether point `p` lies strictly inside a closed polygon ring.
 *
 * Uses the crossing-number (ray casting) algorithm: cast a ray from `p` in
 * the +x direction and count how many ring edges it crosses. Odd = inside.
 *
 * Properties:
 *   - Points exactly on an edge may return true or false (boundary ambiguity
 *     is expected in ray casting; use distance-to-boundary for edge cases).
 *   - Rings with fewer than 3 vertices always return false.
 *   - Self-intersecting rings behave according to the even-odd fill rule.
 *
 * @param p     Query point.
 * @param ring  Array of vertices defining a closed ring (last == first
 *              or implicitly closed — both are handled correctly).
 * @returns true if p is inside the ring.
 */
export function pointInPolygon(p: TilePoint, ring: readonly TilePoint[]): boolean {
  const n = ring.length;
  if (n < 3) return false;

  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const vi = ring[i];
    const vj = ring[j];
    if (vi === undefined || vj === undefined) continue;

    // Standard crossing-number test
    if (vi.y > p.y !== vj.y > p.y && p.x < ((vj.x - vi.x) * (p.y - vi.y)) / (vj.y - vi.y) + vi.x) {
      inside = !inside;
    }
  }
  return inside;
}

// ---------------------------------------------------------------------------
// Minimum boundary distance for a ring (squared)
// ---------------------------------------------------------------------------

/**
 * Returns the minimum squared distance from point `p` to any segment of
 * `ring`.
 *
 * Used by the polygon hit-tester when the query point is outside the
 * exterior ring or inside a hole ring — the closest boundary segment
 * determines the actual proximity distance.
 *
 * @param p     Query point.
 * @param ring  Array of polygon ring vertices.
 * @returns     Minimum squared distance to the ring boundary, or Infinity
 *              if the ring has fewer than 2 vertices.
 */
export function minRingDistanceSquared(p: TilePoint, ring: readonly TilePoint[]): number {
  const n = ring.length;
  if (n < 2) return Infinity;

  let best = Infinity;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = ring[j];
    const b = ring[i];
    if (a === undefined || b === undefined) continue;
    const d = pointToSegmentDistanceSquared(p, a, b);
    if (d < best) best = d;
  }
  return best;
}
