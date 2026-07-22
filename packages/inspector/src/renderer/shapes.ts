/**
 * @tileguard/inspector — Renderer: Pure Drawing Routines
 *
 * Pure drawing primitives for all MVT geometry types. Each function accepts
 * a Canvas 2D rendering context and a pre-transformed array of screen points,
 * and issues the minimal set of canvas path commands to draw the geometry.
 *
 * Polygon interior rings are rendered with the `evenodd` fill rule to
 * correctly subtract holes from exterior rings, matching MVT winding semantics.
 *
 * Implemented in Milestone 3.
 *
 * All functions are pure (no state, no side effects outside the canvas context)
 * and do not depend on the Viewport — callers must transform coordinates first.
 */

import type { ScreenPoint } from '../viewport/viewport.ts';

// ---------------------------------------------------------------------------
// Geometry drawing stubs — implemented in Milestone 3
// ---------------------------------------------------------------------------

/**
 * Draw a Point geometry as a filled circle.
 * Implemented in Milestone 3.
 */
export function drawPoint(
  _ctx: CanvasRenderingContext2D,
  _point: ScreenPoint,
  _radius?: number,
): void {
  // Milestone 3
}

/**
 * Draw a LineString geometry as a stroked polyline.
 * Implemented in Milestone 3.
 */
export function drawLineString(_ctx: CanvasRenderingContext2D, _points: ScreenPoint[]): void {
  // Milestone 3
}

/**
 * Draw a Polygon geometry.
 * `rings[0]` is the exterior ring; `rings[1..n]` are interior rings (holes).
 * Interior rings are subtracted using the `evenodd` fill rule.
 * Implemented in Milestone 3.
 */
export function drawPolygon(_ctx: CanvasRenderingContext2D, _rings: ScreenPoint[][]): void {
  // Milestone 3
}

/**
 * Draw vertex markers (small squares) for each point in a ring or linestring.
 * Used to highlight individual vertices during feature inspection.
 * Implemented in Milestone 3.
 */
export function drawVertexMarkers(
  _ctx: CanvasRenderingContext2D,
  _points: ScreenPoint[],
  _size?: number,
): void {
  // Milestone 3
}

/**
 * Draw a tile boundary guide (outer extent box) and optional buffer zone.
 * Implemented in Milestone 3.
 */
export function drawTileBoundary(
  _ctx: CanvasRenderingContext2D,
  _origin: ScreenPoint,
  _tileSize: number,
  _bufferSize?: number,
): void {
  // Milestone 3
}
