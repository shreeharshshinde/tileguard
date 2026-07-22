/**
 * @tileguard/inspector — Viewport & Matrix Transform Engine
 *
 * Maps MVT tile coordinate space (integer grid 0–4096) to screen pixel space
 * using 2×3 affine transform matrices. All operations are pure and side-effect-free.
 *
 * Implemented in Milestone 2.
 *
 * Public surface:
 *   - ViewportState    — serialisable snapshot of current transform
 *   - Viewport         — interface for the coordinate-transform engine
 *   - createViewport() — factory that returns a mutable Viewport instance
 */

// ---------------------------------------------------------------------------
// Types — implemented in Milestone 2
// ---------------------------------------------------------------------------

/** Immutable snapshot of the current viewport transform. */
export interface ViewportState {
  /** Current zoom level (1 = tile fills canvas, > 1 = zoomed in). */
  readonly zoom: number;
  /** Translation in screen pixels (origin offset). */
  readonly panX: number;
  readonly panY: number;
  /** Canvas dimensions in CSS pixels. */
  readonly width: number;
  readonly height: number;
}

/** A 2D point in tile coordinate space (0–4096 integers by MVT convention). */
export interface TilePoint {
  readonly x: number;
  readonly y: number;
}

/** A 2D point in screen pixel space. */
export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Viewport — coordinate transform engine.
 *
 * Transforms between MVT tile space (0–4096) and screen pixel space.
 * All state mutation methods return a new Viewport (immutable update pattern),
 * except `resize` which may mutate canvas dimensions in place.
 *
 * Implemented in Milestone 2.
 */
export interface Viewport {
  /** Map a tile-space point to screen pixels. */
  tileToScreen(point: TilePoint): ScreenPoint;

  /** Map a screen pixel to tile coordinates. */
  screenToTile(point: ScreenPoint): TilePoint;

  /** Fit the full tile extent (0–4096) within the canvas with optional padding. */
  fitBounds(padding?: number): Viewport;

  /** Translate the viewport by (dx, dy) screen pixels. */
  pan(dx: number, dy: number): Viewport;

  /**
   * Zoom toward or away from a focal point in screen space.
   * Zoom is clamped to [minZoom, maxZoom].
   */
  zoomAt(factor: number, focal: ScreenPoint): Viewport;

  /** Update canvas dimensions (e.g. on window resize). */
  resize(width: number, height: number): Viewport;

  /** Return a serialisable snapshot of the current state. */
  getState(): ViewportState;
}

// ---------------------------------------------------------------------------
// Factory — implemented in Milestone 2
// ---------------------------------------------------------------------------

/**
 * Creates a Viewport instance sized to the given canvas dimensions.
 * The initial transform is identity (no pan, zoom = 1).
 *
 * Full implementation delivered in Milestone 2.
 */
export function createViewport(_width: number, _height: number): Viewport {
  throw new Error('createViewport() — implemented in Milestone 2');
}
