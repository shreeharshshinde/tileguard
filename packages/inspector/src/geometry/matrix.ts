/**
 * @tileguard/inspector — Geometry: 2×3 Affine Matrix
 *
 * A minimal affine transform sufficient for 2D uniform scaling + translation:
 *
 *   | sx   0  tx |
 *   |  0  sy  ty |
 *
 * In this viewport, sx === sy (uniform scale), so the matrix degenerates to a
 * single scale factor plus a 2D translation vector.
 *
 * All functions are pure. The Matrix2D type is intentionally not exported to
 * consumers outside the geometry module — they interact with the Viewport API
 * rather than with raw matrices.
 */

import type { TilePoint, ScreenPoint } from './point.js';

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

/**
 * A 2×3 affine transform matrix for 2D scaling + translation.
 *
 * sx / sy : scale factors on the x and y axes respectively.
 * tx / ty : translation in the output coordinate space.
 *
 * Not exported beyond the geometry module boundary — callers use the Viewport
 * interface instead.
 */
export interface Matrix2D {
  readonly sx: number; // x scale
  readonly sy: number; // y scale
  readonly tx: number; // x translation
  readonly ty: number; // y translation
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/**
 * Build the forward (tile → screen) matrix from zoom and pan values.
 *
 *   screenX = tileX * zoom + panX
 *   screenY = tileY * zoom + panY
 *
 * @param zoom  Uniform scale factor (screen pixels per tile unit). Must be > 0.
 * @param panX  Horizontal translation from tile origin to screen origin, in px.
 * @param panY  Vertical translation from tile origin to screen origin, in px.
 */
export function buildMatrix(zoom: number, panX: number, panY: number): Matrix2D {
  return { sx: zoom, sy: zoom, tx: panX, ty: panY };
}

/**
 * Derive the inverse (screen → tile) matrix from a forward matrix.
 *
 * Safe because sx === sy === zoom and zoom is always > 0 (enforced by the
 * viewport's clamp guard before this function is called).
 *
 * @param m  A forward Matrix2D produced by buildMatrix().
 */
export function invertMatrix(m: Matrix2D): Matrix2D {
  const invSx = 1 / m.sx;
  const invSy = 1 / m.sy;
  return { sx: invSx, sy: invSy, tx: -m.tx * invSx, ty: -m.ty * invSy };
}

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

/**
 * Apply a Matrix2D to a TilePoint, returning the transformed ScreenPoint.
 *
 *   outX = p.x * m.sx + m.tx
 *   outY = p.y * m.sy + m.ty
 *
 * The same function handles both forward (TilePoint → ScreenPoint) and inverse
 * (ScreenPoint → TilePoint) transforms, since both are just affine multiplies.
 * TypeScript types are relaxed to `TilePoint` for the parameter and `ScreenPoint`
 * for the return because both interfaces share the same shape { x, y }.
 */
export function applyMatrix(m: Matrix2D, p: TilePoint): ScreenPoint {
  return { x: p.x * m.sx + m.tx, y: p.y * m.sy + m.ty };
}
