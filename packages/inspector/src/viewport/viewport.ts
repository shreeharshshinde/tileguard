/**
 * @tileguard/inspector — Viewport & Coordinate Transformation Engine
 *
 * Implements a deterministic, platform-independent transformation engine that
 * maps MVT tile coordinates (integer grid 0–extent) to screen pixel space and
 * back, using a cached 2×3 affine matrix.
 *
 * ## Coordinate Spaces
 *
 *   Tile Space        0 … extent (default 4096)
 *       │  tileToScreen()
 *       ▼
 *   Screen Space      0 … canvas.width / 0 … canvas.height
 *       │  screenToTile()
 *       ▲
 *
 * The forward transform is:
 *
 *   screenX = tileX * scale + panX
 *   screenY = tileY * scale + panY
 *
 * The inverse:
 *
 *   tileX = (screenX - panX) / scale
 *   tileY = (screenY - panY) / scale
 *
 * ## Internal Model
 *
 *   ViewportImpl
 *     ├── state    (ViewportState)
 *     ├── matrix   (Matrix2D — forward transform, cached)
 *     └── inverse  (Matrix2D — inverse transform, cached)
 *
 * Matrices are recomputed once on construction and after every state change.
 * No transform math is scattered in individual methods.
 *
 * ## Immutability
 *
 * Every mutation method (pan, zoomAt, fitBounds, resize) returns a NEW
 * ViewportImpl instance. The original is never modified. This makes the
 * viewport safe to pass to React state without defensive copying.
 *
 * Public API:
 *   - DEFAULT_EXTENT      — standard MVT tile grid size (4096)
 *   - DEFAULT_MIN_ZOOM    — minimum allowed zoom (0.25)
 *   - DEFAULT_MAX_ZOOM    — maximum allowed zoom (64)
 *   - INVERSE_TOLERANCE   — acceptable roundtrip error in tile units (1e-6)
 *   - ViewportState       — serialisable camera snapshot
 *   - BoundingBox         — re-exported from geometry/bounds
 *   - TilePoint           — re-exported from geometry/point
 *   - ScreenPoint         — re-exported from geometry/point
 *   - Viewport            — public interface
 *   - createViewport()    — factory (throws on invalid options)
 */

// ---------------------------------------------------------------------------
// Geometry primitives — owned by geometry/, consumed here
// ---------------------------------------------------------------------------

import type { TilePoint, ScreenPoint, BoundingBox, Matrix2D } from '../geometry/index.js';
import { buildMatrix, invertMatrix, applyMatrix } from '../geometry/index.js';

// Re-export so existing consumers that import from viewport.ts still compile.
export type { TilePoint, ScreenPoint, BoundingBox } from '../geometry/index.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Standard MVT tile coordinate extent. */
export const DEFAULT_EXTENT = 4096;

/** Minimum zoom: the tile is 1/4 of the canvas dimension at this level. */
export const DEFAULT_MIN_ZOOM = 0.25;

/** Maximum zoom: 64× tile resolution. */
export const DEFAULT_MAX_ZOOM = 64;

/**
 * Acceptable error for the round-trip invariant:
 *   screenToTile(tileToScreen(P)) ≈ P  (within ±INVERSE_TOLERANCE tile units)
 *
 * This constant is intended for unit test assertions and numerical verification
 * of transform correctness — not as a rendering precision target.
 */
export const INVERSE_TOLERANCE = 1e-6;

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

/** Immutable serialisable snapshot of the current camera state. */
export interface ViewportState {
  /** Current scale factor: screen pixels per tile unit. */
  readonly zoom: number;
  /** Horizontal translation from tile origin to screen origin, in screen px. */
  readonly panX: number;
  /** Vertical translation from tile origin to screen origin, in screen px. */
  readonly panY: number;
  /** Tile coordinate extent (typically 4096). */
  readonly extent: number;
  /** Canvas width in CSS pixels. */
  readonly width: number;
  /** Canvas height in CSS pixels. */
  readonly height: number;
  /** Lower bound for zoom clamping. */
  readonly minZoom: number;
  /** Upper bound for zoom clamping. */
  readonly maxZoom: number;
}

// ---------------------------------------------------------------------------
// Public Interface
// ---------------------------------------------------------------------------

/**
 * Viewport — coordinate transformation engine.
 *
 * All state-mutating methods return a **new** Viewport. The original is
 * never modified (value semantics / immutable update pattern).
 *
 * This API is frozen as of Milestone 2. Milestone 3 consumes it as-is.
 */
export interface Viewport {
  /** Map a point from tile space to screen pixels. */
  tileToScreen(point: TilePoint): ScreenPoint;

  /** Map a point from screen pixels to tile space. */
  screenToTile(point: ScreenPoint): TilePoint;

  /**
   * Return a new Viewport scaled and centered so that the given bounding box
   * (in tile space) fills the canvas with optional padding in screen pixels.
   *
   * If the box has zero width or zero height, the non-degenerate axis is used
   * to determine scale; if both are zero (a single point), zoom is set to
   * maxZoom and the point is centered.
   *
   * @param bounds   Axis-aligned bounding box in tile coordinate space.
   * @param padding  Padding in screen pixels on each side (default 20).
   */
  fitBounds(bounds: BoundingBox, padding?: number): Viewport;

  /**
   * Return a new Viewport translated by (dx, dy) screen pixels.
   * Positive dx moves the geometry right; positive dy moves it down.
   */
  pan(dx: number, dy: number): Viewport;

  /**
   * Return a new Viewport zoomed by `factor` around the given screen-space
   * focal point. The focal point remains fixed on screen after the zoom.
   * Zoom is clamped to [minZoom, maxZoom].
   *
   * @param factor       Multiplicative zoom factor (> 1 zooms in, < 1 zooms out).
   * @param focalScreen  Screen-space point that stays fixed during the zoom.
   */
  zoomAt(factor: number, focalScreen: ScreenPoint): Viewport;

  /**
   * Return a new Viewport with updated canvas dimensions.
   *
   * Camera position is intentionally preserved. Zoom and pan are unchanged;
   * only `width` and `height` are updated.
   *
   * @param width   New canvas width in CSS pixels.
   * @param height  New canvas height in CSS pixels.
   */
  resize(width: number, height: number): Viewport;

  /** Return a serialisable snapshot of the current camera state. */
  getState(): ViewportState;
}

// ---------------------------------------------------------------------------
// Internal Implementation
// ---------------------------------------------------------------------------

/** Options accepted by ViewportImpl constructor (pre-validated). */
interface ViewportOptions {
  zoom: number;
  panX: number;
  panY: number;
  extent: number;
  width: number;
  height: number;
  minZoom: number;
  maxZoom: number;
}

class ViewportImpl implements Viewport {
  private readonly state: ViewportState;
  private readonly matrix: Matrix2D;
  private readonly inverse: Matrix2D;

  constructor(opts: ViewportOptions) {
    const zoom = clamp(opts.zoom, opts.minZoom, opts.maxZoom);
    this.state = Object.freeze({
      zoom,
      panX: opts.panX,
      panY: opts.panY,
      extent: opts.extent,
      width: opts.width,
      height: opts.height,
      minZoom: opts.minZoom,
      maxZoom: opts.maxZoom,
    });
    this.matrix = buildMatrix(zoom, opts.panX, opts.panY);
    this.inverse = invertMatrix(this.matrix);
  }

  getState(): ViewportState {
    return this.state;
  }

  tileToScreen(point: TilePoint): ScreenPoint {
    return applyMatrix(this.matrix, point);
  }

  screenToTile(point: ScreenPoint): TilePoint {
    return applyMatrix(this.inverse, point);
  }

  pan(dx: number, dy: number): Viewport {
    const s = this.state;
    return new ViewportImpl({
      ...s,
      panX: s.panX + dx,
      panY: s.panY + dy,
    });
  }

  zoomAt(factor: number, focalScreen: ScreenPoint): Viewport {
    const s = this.state;
    const newZoom = clamp(s.zoom * factor, s.minZoom, s.maxZoom);
    // The focal point in tile space must remain at the same screen position:
    //   focalScreen.x = focalTile.x * newZoom + newPanX
    const focalTile = this.screenToTile(focalScreen);
    const newPanX = focalScreen.x - focalTile.x * newZoom;
    const newPanY = focalScreen.y - focalTile.y * newZoom;
    return new ViewportImpl({ ...s, zoom: newZoom, panX: newPanX, panY: newPanY });
  }

  fitBounds(bounds: BoundingBox, padding = 20): Viewport {
    if (bounds.minX > bounds.maxX || bounds.minY > bounds.maxY) {
      throw new Error(
        `Invalid BoundingBox: minX (${bounds.minX}) must be ≤ maxX (${bounds.maxX}) ` +
        `and minY (${bounds.minY}) must be ≤ maxY (${bounds.maxY}).`,
      );
    }
    const s = this.state;
    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;

    const availW = Math.max(s.width - padding * 2, 1);
    const availH = Math.max(s.height - padding * 2, 1);

    let newZoom: number;
    if (bw === 0 && bh === 0) {
      newZoom = s.maxZoom;
    } else if (bw === 0) {
      newZoom = availH / bh;
    } else if (bh === 0) {
      newZoom = availW / bw;
    } else {
      newZoom = Math.min(availW / bw, availH / bh);
    }

    newZoom = clamp(newZoom, s.minZoom, s.maxZoom);

    const centerTileX = (bounds.minX + bounds.maxX) / 2;
    const centerTileY = (bounds.minY + bounds.maxY) / 2;
    const newPanX = s.width / 2 - centerTileX * newZoom;
    const newPanY = s.height / 2 - centerTileY * newZoom;

    return new ViewportImpl({ ...s, zoom: newZoom, panX: newPanX, panY: newPanY });
  }

  resize(width: number, height: number): Viewport {
    return new ViewportImpl({ ...this.state, width, height });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Options for createViewport. width and height are required; all other fields
 * are optional and have sensible defaults.
 */
export interface CreateViewportOptions {
  /** Canvas width in CSS pixels. Must be > 0. */
  width: number;
  /** Canvas height in CSS pixels. Must be > 0. */
  height: number;
  /**
   * Initial zoom. Must be a finite number.
   * Defaults to fit the full extent in the canvas, clamped to [minZoom, maxZoom].
   */
  zoom?: number;
  /** Initial horizontal pan in screen pixels. Must be finite. Defaults to centre the tile. */
  panX?: number;
  /** Initial vertical pan in screen pixels. Must be finite. Defaults to centre the tile. */
  panY?: number;
  /** Tile coordinate extent. Must be > 0. Defaults to DEFAULT_EXTENT (4096). */
  extent?: number;
  /** Minimum zoom. Must be finite. Defaults to DEFAULT_MIN_ZOOM (0.25). */
  minZoom?: number;
  /** Maximum zoom. Must be > minZoom. Defaults to DEFAULT_MAX_ZOOM (64). */
  maxZoom?: number;
}

/**
 * Create a Viewport sized to the given canvas dimensions.
 *
 * Throws with a descriptive message for any of these conditions:
 *   - width  ≤ 0
 *   - height ≤ 0
 *   - extent ≤ 0
 *   - zoom / panX / panY is NaN or non-finite (when supplied explicitly)
 *   - minZoom ≥ maxZoom
 */
export function createViewport(opts: CreateViewportOptions): Viewport {
  // --- Width / Height ---
  if (!Number.isFinite(opts.width) || opts.width <= 0) {
    throw new Error(
      `createViewport: width must be a finite positive number (got ${opts.width}).`,
    );
  }
  if (!Number.isFinite(opts.height) || opts.height <= 0) {
    throw new Error(
      `createViewport: height must be a finite positive number (got ${opts.height}).`,
    );
  }

  // --- Extent ---
  const extent = opts.extent ?? DEFAULT_EXTENT;
  if (!Number.isFinite(extent) || extent <= 0) {
    throw new Error(
      `createViewport: extent must be a finite positive number (got ${extent}).`,
    );
  }

  // --- Zoom range ---
  const minZoom = opts.minZoom ?? DEFAULT_MIN_ZOOM;
  const maxZoom = opts.maxZoom ?? DEFAULT_MAX_ZOOM;
  if (!Number.isFinite(minZoom)) {
    throw new Error(`createViewport: minZoom must be a finite number (got ${minZoom}).`);
  }
  if (!Number.isFinite(maxZoom)) {
    throw new Error(`createViewport: maxZoom must be a finite number (got ${maxZoom}).`);
  }
  if (minZoom >= maxZoom) {
    throw new Error(
      `createViewport: minZoom (${minZoom}) must be strictly less than maxZoom (${maxZoom}).`,
    );
  }

  // --- Explicit zoom ---
  if (opts.zoom !== undefined) {
    if (!Number.isFinite(opts.zoom)) {
      throw new Error(
        `createViewport: zoom must be a finite number (got ${opts.zoom}).`,
      );
    }
  }

  // --- Explicit pan ---
  if (opts.panX !== undefined && !Number.isFinite(opts.panX)) {
    throw new Error(`createViewport: panX must be a finite number (got ${opts.panX}).`);
  }
  if (opts.panY !== undefined && !Number.isFinite(opts.panY)) {
    throw new Error(`createViewport: panY must be a finite number (got ${opts.panY}).`);
  }

  // --- Derive defaults ---
  const defaultZoom = Math.min(
    Math.max((opts.width - 40) / extent, 0),
    Math.max((opts.height - 40) / extent, 0),
  );
  const zoom = opts.zoom ?? clamp(defaultZoom, minZoom, maxZoom);
  const clampedZoom = clamp(zoom, minZoom, maxZoom);

  const panX = opts.panX ?? (opts.width - extent * clampedZoom) / 2;
  const panY = opts.panY ?? (opts.height - extent * clampedZoom) / 2;

  return new ViewportImpl({
    zoom,
    panX,
    panY,
    extent,
    width: opts.width,
    height: opts.height,
    minZoom,
    maxZoom,
  });
}
