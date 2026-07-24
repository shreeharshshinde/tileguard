/**
 * @tileguard/inspector — Geometry: Bounding Box
 *
 * Axis-aligned bounding box type and a suite of pure, immutable utility
 * functions. Consumers include the viewport (fitBounds), the renderer
 * (tile boundary), overlay highlighting, hit-testing, and feature zoom.
 *
 * All functions are free of side effects. Where a new box is needed, a
 * fresh object is returned — existing boxes are never mutated.
 */

import type { TilePoint } from './point.js';

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

/**
 * An axis-aligned bounding box in tile coordinate space.
 *
 * Invariant: minX ≤ maxX and minY ≤ maxY.
 * Functions in this module enforce that invariant at runtime where relevant.
 */
export interface BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/**
 * Build the tightest BoundingBox that contains all the given points.
 *
 * Throws if the point array is empty — a bounds with no content is meaningless.
 *
 * @param points  One or more points in tile coordinate space.
 */
export function createBoundsFromPoints(points: readonly TilePoint[]): BoundingBox {
  const first = points[0];
  if (!first || points.length === 0) {
    throw new Error('createBoundsFromPoints: points array must not be empty.');
  }
  let minX = first.x;
  let minY = first.y;
  let maxX = first.x;
  let maxY = first.y;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (!p) continue;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

// ---------------------------------------------------------------------------
// Dimension Accessors
// ---------------------------------------------------------------------------

/** Width of the bounding box (maxX − minX). Always ≥ 0. */
export function width(box: BoundingBox): number {
  return box.maxX - box.minX;
}

/** Height of the bounding box (maxY − minY). Always ≥ 0. */
export function height(box: BoundingBox): number {
  return box.maxY - box.minY;
}

/**
 * Centre point of the bounding box.
 * Returns a TilePoint at ( (minX+maxX)/2, (minY+maxY)/2 ).
 */
export function center(box: BoundingBox): TilePoint {
  return {
    x: (box.minX + box.maxX) / 2,
    y: (box.minY + box.maxY) / 2,
  };
}

// ---------------------------------------------------------------------------
// Spatial Tests
// ---------------------------------------------------------------------------

/**
 * Return true if `point` lies strictly inside or on the boundary of `box`.
 *
 * Boundary inclusion follows the closed-interval convention [min, max] on
 * both axes, which matches MVT pixel snapping semantics.
 */
export function containsPoint(box: BoundingBox, point: TilePoint): boolean {
  return (
    point.x >= box.minX &&
    point.x <= box.maxX &&
    point.y >= box.minY &&
    point.y <= box.maxY
  );
}

/**
 * Return true if two bounding boxes overlap or touch.
 *
 * Two boxes that share only an edge (e.g. a.maxX === b.minX) are considered
 * intersecting under the closed-interval convention.
 */
export function intersects(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY
  );
}

// ---------------------------------------------------------------------------
// Transformation
// ---------------------------------------------------------------------------

/**
 * Return a new BoundingBox expanded uniformly by `amount` on every side.
 *
 * `amount` may be negative to shrink the box; clamping is intentionally
 * omitted so that callers can detect degenerate (inverted) results.
 *
 * @param box     Source bounding box.
 * @param amount  Expansion distance in tile coordinate units.
 */
export function expand(box: BoundingBox, amount: number): BoundingBox {
  return {
    minX: box.minX - amount,
    minY: box.minY - amount,
    maxX: box.maxX + amount,
    maxY: box.maxY + amount,
  };
}
