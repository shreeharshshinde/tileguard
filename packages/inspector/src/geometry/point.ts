/**
 * @tileguard/inspector — Geometry: Point Types
 *
 * Reusable point primitives shared across the viewport, renderer, overlay,
 * and hit-tester subsystems. Kept as plain interfaces (no class) to stay
 * serialisable and easy to spread/destructure.
 */

// ---------------------------------------------------------------------------
// Tile Space
// ---------------------------------------------------------------------------

/**
 * A point in MVT tile coordinate space (0 – extent, default 4096).
 *
 * Tile coordinates are integer-valued in the MVT spec but floating-point
 * arithmetic during transforms is intentional — clipping buffers extend
 * outside the [0, extent] range.
 */
export interface TilePoint {
  readonly x: number;
  readonly y: number;
}

// ---------------------------------------------------------------------------
// Screen Space
// ---------------------------------------------------------------------------

/**
 * A point in screen pixel space (0 – canvas.width, 0 – canvas.height).
 *
 * Screen coordinates originate at the top-left corner of the canvas element
 * and increase right and down, matching the Canvas 2D coordinate system.
 */
export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}
