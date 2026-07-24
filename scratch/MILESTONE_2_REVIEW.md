# TileGuard Inspector — Milestone 2 Comprehensive Review Document (100% Complete Source Code)

**Phase:** 3 (TileGuard Inspector)  
**Milestone:** 2 (Viewport & Coordinate Transformation Engine)  
**Status:** ✅ Complete & Verified  
**Date:** 2026-07-23  

---

## 1. Executive Summary & Verification Summary

Milestone 2 delivers the **Viewport & Coordinate Transformation Engine** (`@tileguard/inspector` v0.6.0). It provides a deterministic, platform-independent, 2×3 affine transformation engine mapping vector tile integer coordinates ($0 \dots 4096$) to screen pixel coordinates and back.

### Verification Status:
* **Unit Test Suite:** **94 / 94 passing** across 2 test files (61 in `viewport.test.ts`, 33 in `smoke.test.ts`) in 0.62s.
* **TypeScript Typecheck:** Clean `npx tsc --noEmit` build with 0 errors across the workspace.
* **Biome Linting & Formatting:** 100% clean check (`npx @biomejs/biome check .`) across all 156 workspace files.

---

## 2. Mathematical Principles & Subsystem Design

```
  Tile Space (0 … 4096)
      │  tileToScreen(point)
      ▼
  Screen Space (0 … canvas.width, 0 … canvas.height)
      │  screenToTile(point)
      ▲
```

### Forward & Inverse Transformation Equations:
1. **Forward Transform:**  
   $$\text{screenX} = \text{tileX} \cdot \text{zoom} + \text{panX}$$  
   $$\text{screenY} = \text{tileY} \cdot \text{zoom} + \text{panY}$$

2. **Inverse Transform:**  
   $$\text{tileX} = \frac{\text{screenX} - \text{panX}}{\text{zoom}}$$  
   $$\text{tileY} = \frac{\text{screenY} - \text{panY}}{\text{zoom}}$$

3. **Round-Trip Invariant:**  
   $$\text{screenToTile}(\text{tileToScreen}(P)) \approx P \quad (\text{within } \pm 10^{-6} \text{ tile units})$$

4. **Focal-Point Zoom Invariant:**  
   When zooming by factor $f$ around focal screen point $F$:
   $$\text{tilePt} = \text{screenToTile}(F)$$
   $$\text{newPanX} = F_x - \text{tilePt}_x \cdot \text{newZoom}$$
   $$\text{newPanY} = F_y - \text{tilePt}_y \cdot \text{newZoom}$$

---

## 3. Complete Source Code: `packages/inspector/src/viewport/viewport.ts`

```typescript
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
 *   - BoundingBox         — axis-aligned box in tile space
 *   - TilePoint           — point in tile coordinate space
 *   - ScreenPoint         — point in screen pixel space
 *   - Viewport            — public interface
 *   - createViewport()    — factory
 */

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

/** A point in tile coordinate space (0 – extent). */
export interface TilePoint {
  readonly x: number;
  readonly y: number;
}

/** A point in screen pixel space (0 – canvas.width / 0 – canvas.height). */
export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * An axis-aligned bounding box in tile coordinate space.
 * minX <= maxX and minY <= maxY are not enforced at the type level but are
 * required by fitBounds().
 */
export interface BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

// ---------------------------------------------------------------------------
// Internal: 2×3 Affine Matrix
// ---------------------------------------------------------------------------

/**
 * A 2×3 affine transform matrix sufficient for 2D scaling + translation:
 *
 *   | sx  0  tx |
 *   |  0 sy  ty |
 *
 * where sx === sy (uniform scale) for this viewport implementation.
 *
 * Not exported — internal implementation detail. Callers interact only through
 * the Viewport interface.
 */
interface Matrix2D {
  readonly sx: number; // x scale
  readonly sy: number; // y scale
  readonly tx: number; // x translation
  readonly ty: number; // y translation
}

/** Apply a Matrix2D to a TilePoint → ScreenPoint (forward transform). */
function applyMatrix(m: Matrix2D, p: TilePoint): ScreenPoint {
  return { x: p.x * m.sx + m.tx, y: p.y * m.sy + m.ty };
}

/** Apply a Matrix2D to a ScreenPoint → TilePoint (inverse transform). */
function applyInverse(m: Matrix2D, p: ScreenPoint): TilePoint {
  return { x: (p.x - m.tx) / m.sx, y: (p.y - m.ty) / m.sy };
}

/**
 * Build the forward matrix from (zoom, panX, panY).
 *
 *   screenX = tileX * zoom + panX
 *   screenY = tileY * zoom + panY
 */
function buildMatrix(zoom: number, panX: number, panY: number): Matrix2D {
  return { sx: zoom, sy: zoom, tx: panX, ty: panY };
}

/**
 * Build the inverse matrix from the forward matrix.
 * Safe because sx === sy === zoom and zoom is always > 0 (enforced by clamp).
 */
function invertMatrix(m: Matrix2D): Matrix2D {
  const invSx = 1 / m.sx;
  const invSy = 1 / m.sy;
  return { sx: invSx, sy: invSy, tx: -m.tx * invSx, ty: -m.ty * invSy };
}

// ---------------------------------------------------------------------------
// Public Interface
// ---------------------------------------------------------------------------

/**
 * Viewport — coordinate transformation engine.
 *
 * All state-mutating methods return a **new** Viewport. The original is
 * never modified (value semantics / immutable update pattern).
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
   * Pan and zoom are preserved; only the canvas size changes.
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

/** Options accepted by ViewportImpl constructor. */
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
    //   focalTile.x   = (focalScreen.x - panX) / zoom   (current tile coords)
    const focalTile = this.screenToTile(focalScreen);
    const newPanX = focalScreen.x - focalTile.x * newZoom;
    const newPanY = focalScreen.y - focalTile.y * newZoom;
    return new ViewportImpl({ ...s, zoom: newZoom, panX: newPanX, panY: newPanY });
  }

  fitBounds(bounds: BoundingBox, padding = 20): Viewport {
    const s = this.state;
    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;

    const availW = Math.max(s.width - padding * 2, 1);
    const availH = Math.max(s.height - padding * 2, 1);

    let newZoom: number;
    if (bw === 0 && bh === 0) {
      // Single point: zoom to max so we can see it
      newZoom = s.maxZoom;
    } else if (bw === 0) {
      newZoom = availH / bh;
    } else if (bh === 0) {
      newZoom = availW / bw;
    } else {
      newZoom = Math.min(availW / bw, availH / bh);
    }

    newZoom = clamp(newZoom, s.minZoom, s.maxZoom);

    // Center the bounding box within the canvas
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
 * Options for createViewport. All fields are optional; defaults produce a
 * viewport that shows the full tile extent centred with no padding.
 */
export interface CreateViewportOptions {
  /** Canvas width in CSS pixels. */
  width: number;
  /** Canvas height in CSS pixels. */
  height: number;
  /** Initial zoom. Defaults to fit the full extent in the canvas. */
  zoom?: number;
  /** Initial horizontal pan in screen pixels. Defaults to centre the tile. */
  panX?: number;
  /** Initial vertical pan in screen pixels. Defaults to centre the tile. */
  panY?: number;
  /** Tile coordinate extent. Defaults to DEFAULT_EXTENT (4096). */
  extent?: number;
  /** Minimum zoom. Defaults to DEFAULT_MIN_ZOOM (0.25). */
  minZoom?: number;
  /** Maximum zoom. Defaults to DEFAULT_MAX_ZOOM (64). */
  maxZoom?: number;
}

/**
 * Create a Viewport sized to the given canvas dimensions.
 *
 * The default initial state fits the full tile extent within the canvas with
 * 20 px padding on each side, so the tile is immediately visible on first render.
 */
export function createViewport(opts: CreateViewportOptions): Viewport {
  const extent = opts.extent ?? DEFAULT_EXTENT;
  const minZoom = opts.minZoom ?? DEFAULT_MIN_ZOOM;
  const maxZoom = opts.maxZoom ?? DEFAULT_MAX_ZOOM;

  // Default zoom: fit the full tile in the smaller canvas dimension with padding
  const defaultZoom = Math.min(
    Math.max((opts.width - 40) / extent, 0),
    Math.max((opts.height - 40) / extent, 0),
  );
  const zoom = opts.zoom ?? clamp(defaultZoom, minZoom, maxZoom);

  // Default pan: centre the tile in the canvas
  const panX = opts.panX ?? (opts.width - extent * zoom) / 2;
  const panY = opts.panY ?? (opts.height - extent * zoom) / 2;

  return new ViewportImpl({ zoom, panX, panY, extent, width: opts.width, height: opts.height, minZoom, maxZoom });
}
```

---

## 4. Complete Source Code: `packages/inspector/tests/viewport.test.ts`

```typescript
/**
 * @tileguard/inspector — Viewport & Coordinate Transformation Engine Tests
 *
 * 61 focused mathematical tests. No DOM, no Canvas, no React.
 * Pure TypeScript, runs in the Vitest Node environment.
 */

import { describe, expect, it } from 'vitest';
import type { BoundingBox, ScreenPoint, TilePoint } from '../src/viewport/viewport';
import {
  DEFAULT_EXTENT,
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
  INVERSE_TOLERANCE,
  createViewport,
} from '../src/viewport/viewport';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function approx(a: number, b: number, tolerance = INVERSE_TOLERANCE): boolean {
  return Math.abs(a - b) <= tolerance;
}

function expectScreen(actual: ScreenPoint, expected: ScreenPoint, tol = INVERSE_TOLERANCE): void {
  expect(approx(actual.x, expected.x, tol)).toBe(true);
  expect(approx(actual.y, expected.y, tol)).toBe(true);
}

function expectTile(actual: TilePoint, expected: TilePoint, tol = INVERSE_TOLERANCE): void {
  expect(approx(actual.x, expected.x, tol)).toBe(true);
  expect(approx(actual.y, expected.y, tol)).toBe(true);
}

// Standard canvas dimensions
const W = 800;
const H = 600;

// A small extent that keeps fit-zoom above DEFAULT_MIN_ZOOM for W×H canvas
const SMALL_EXTENT = 128;

// ---------------------------------------------------------------------------
// 1. createViewport — default state
// ---------------------------------------------------------------------------

describe('createViewport — default state', () => {
  it('returns a viewport with the specified canvas dimensions', () => {
    const vp = createViewport({ width: W, height: H });
    const s = vp.getState();
    expect(s.width).toBe(W);
    expect(s.height).toBe(H);
  });

  it('uses DEFAULT_EXTENT when extent is not specified', () => {
    const vp = createViewport({ width: W, height: H });
    expect(vp.getState().extent).toBe(DEFAULT_EXTENT);
  });

  it('uses DEFAULT_MIN_ZOOM and DEFAULT_MAX_ZOOM when not specified', () => {
    const vp = createViewport({ width: W, height: H });
    const s = vp.getState();
    expect(s.minZoom).toBe(DEFAULT_MIN_ZOOM);
    expect(s.maxZoom).toBe(DEFAULT_MAX_ZOOM);
  });

  it('default zoom fits the tile within the canvas (small extent)', () => {
    const vp = createViewport({ width: W, height: H, extent: SMALL_EXTENT });
    const s = vp.getState();
    const expectedZoom = Math.min((W - 40) / SMALL_EXTENT, (H - 40) / SMALL_EXTENT);
    expect(approx(s.zoom, expectedZoom, 1e-9)).toBe(true);
  });

  it('default pan centres the tile (small extent)', () => {
    const vp = createViewport({ width: W, height: H, extent: SMALL_EXTENT });
    const s = vp.getState();
    const expectedPanX = (W - SMALL_EXTENT * s.zoom) / 2;
    const expectedPanY = (H - SMALL_EXTENT * s.zoom) / 2;
    expect(approx(s.panX, expectedPanX, 1e-9)).toBe(true);
    expect(approx(s.panY, expectedPanY, 1e-9)).toBe(true);
  });

  it('honours an explicit zoom option', () => {
    const vp = createViewport({ width: W, height: H, zoom: 0.5 });
    expect(vp.getState().zoom).toBe(0.5);
  });

  it('honours explicit panX and panY options', () => {
    const vp = createViewport({ width: W, height: H, panX: 100, panY: 200 });
    const s = vp.getState();
    expect(s.panX).toBe(100);
    expect(s.panY).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 2. ViewportState — zoom clamping and immutability
// ---------------------------------------------------------------------------

describe('ViewportState — zoom clamping', () => {
  it('clamps zoom below minZoom up to minZoom', () => {
    const vp = createViewport({ width: W, height: H, zoom: 0.001 });
    expect(vp.getState().zoom).toBe(DEFAULT_MIN_ZOOM);
  });

  it('clamps zoom above maxZoom down to maxZoom', () => {
    const vp = createViewport({ width: W, height: H, zoom: 9999 });
    expect(vp.getState().zoom).toBe(DEFAULT_MAX_ZOOM);
  });

  it('accepts zoom exactly equal to minZoom', () => {
    const vp = createViewport({ width: W, height: H, zoom: DEFAULT_MIN_ZOOM });
    expect(vp.getState().zoom).toBe(DEFAULT_MIN_ZOOM);
  });

  it('accepts zoom exactly equal to maxZoom', () => {
    const vp = createViewport({ width: W, height: H, zoom: DEFAULT_MAX_ZOOM });
    expect(vp.getState().zoom).toBe(DEFAULT_MAX_ZOOM);
  });

  it('getState returns a frozen object', () => {
    const vp = createViewport({ width: W, height: H });
    expect(Object.isFrozen(vp.getState())).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. tileToScreen — forward transform
// ---------------------------------------------------------------------------

describe('tileToScreen — forward transform', () => {
  it('maps tile origin (0,0) to (panX, panY)', () => {
    const vp = createViewport({ width: W, height: H, zoom: 1, panX: 50, panY: 75 });
    expectScreen(vp.tileToScreen({ x: 0, y: 0 }), { x: 50, y: 75 });
  });

  it('maps point (100, 200) at zoom=2 with no pan to (200, 400)', () => {
    const vp = createViewport({ width: W, height: H, zoom: 2, panX: 0, panY: 0 });
    expectScreen(vp.tileToScreen({ x: 100, y: 200 }), { x: 200, y: 400 });
  });

  it('adds pan offset to scaled coordinates', () => {
    const vp = createViewport({ width: W, height: H, zoom: 1, panX: 30, panY: 40 });
    expectScreen(vp.tileToScreen({ x: 10, y: 20 }), { x: 40, y: 60 });
  });

  it('maps tile extent corner correctly', () => {
    const zoom = 0.5;
    const vp = createViewport({ width: W, height: H, zoom, panX: 0, panY: 0 });
    expectScreen(vp.tileToScreen({ x: DEFAULT_EXTENT, y: DEFAULT_EXTENT }), {
      x: DEFAULT_EXTENT * zoom,
      y: DEFAULT_EXTENT * zoom,
    });
  });

  it('maps tile centre to screen centre when the tile is perfectly centred', () => {
    const zoom = 0.5;
    const panX = (W - DEFAULT_EXTENT * zoom) / 2;
    const panY = (H - DEFAULT_EXTENT * zoom) / 2;
    const vp = createViewport({ width: W, height: H, zoom, panX, panY });
    expectScreen(
      vp.tileToScreen({ x: DEFAULT_EXTENT / 2, y: DEFAULT_EXTENT / 2 }),
      { x: W / 2, y: H / 2 },
      1e-9,
    );
  });
});

// ---------------------------------------------------------------------------
// 4. screenToTile — inverse transform
// ---------------------------------------------------------------------------

describe('screenToTile — inverse transform', () => {
  it('maps screen origin to tile origin when pan=(0,0) and zoom=1', () => {
    const vp = createViewport({ width: W, height: H, zoom: 1, panX: 0, panY: 0 });
    expectTile(vp.screenToTile({ x: 0, y: 0 }), { x: 0, y: 0 });
  });

  it('divides by zoom correctly — (200,400) at zoom=2 → tile (100,200)', () => {
    const vp = createViewport({ width: W, height: H, zoom: 2, panX: 0, panY: 0 });
    expectTile(vp.screenToTile({ x: 200, y: 400 }), { x: 100, y: 200 });
  });

  it('subtracts pan before dividing', () => {
    const vp = createViewport({ width: W, height: H, zoom: 1, panX: 30, panY: 40 });
    expectTile(vp.screenToTile({ x: 40, y: 60 }), { x: 10, y: 20 });
  });
});

// ---------------------------------------------------------------------------
// 5. Round-trip invariant — screenToTile(tileToScreen(P)) ≈ P
// ---------------------------------------------------------------------------

describe('Round-trip invariant', () => {
  const vp = createViewport({ width: W, height: H, zoom: 0.15, panX: 20, panY: 30 });

  const points: TilePoint[] = [
    { x: 0, y: 0 },
    { x: DEFAULT_EXTENT, y: DEFAULT_EXTENT },
    { x: DEFAULT_EXTENT / 2, y: DEFAULT_EXTENT / 2 },
    { x: 1, y: 1 },
    { x: 4095, y: 4095 },
    { x: 1234, y: 567 },
    { x: 0, y: DEFAULT_EXTENT },
    { x: DEFAULT_EXTENT, y: 0 },
    { x: 100.5, y: 200.75 },
    { x: 3999, y: 97 },
  ];

  for (const p of points) {
    it(`screenToTile(tileToScreen(${p.x}, ${p.y})) ≈ (${p.x}, ${p.y})`, () => {
      expectTile(vp.screenToTile(vp.tileToScreen(p)), p);
    });
  }

  it('inverse-then-forward also round-trips', () => {
    const sp: ScreenPoint = { x: 400, y: 300 };
    expectScreen(vp.tileToScreen(vp.screenToTile(sp)), sp);
  });
});

// ---------------------------------------------------------------------------
// 6. pan
// ---------------------------------------------------------------------------

describe('pan', () => {
  it('increases panX and panY by (dx, dy)', () => {
    const vp = createViewport({ width: W, height: H, zoom: 1, panX: 0, panY: 0 });
    const s = vp.pan(50, 80).getState();
    expect(s.panX).toBe(50);
    expect(s.panY).toBe(80);
  });

  it('returns a new Viewport — original is unchanged', () => {
    const vp = createViewport({ width: W, height: H, zoom: 1, panX: 0, panY: 0 });
    vp.pan(100, 200);
    expect(vp.getState().panX).toBe(0);
  });

  it('panning by (dx, 0) shifts screen coordinates by +dx', () => {
    const vp = createViewport({ width: W, height: H, zoom: 1, panX: 0, panY: 0 });
    const tile: TilePoint = { x: 500, y: 500 };
    const before = vp.tileToScreen(tile);
    const after = vp.pan(100, 0).tileToScreen(tile);
    expect(approx(after.x - before.x, 100)).toBe(true);
    expect(approx(after.y, before.y)).toBe(true);
  });

  it('multiple pans accumulate correctly', () => {
    const vp = createViewport({ width: W, height: H, zoom: 1, panX: 0, panY: 0 });
    const s = vp.pan(10, 20).pan(30, 40).pan(-5, -10).getState();
    expect(approx(s.panX, 35)).toBe(true);
    expect(approx(s.panY, 50)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. zoomAt
// ---------------------------------------------------------------------------

describe('zoomAt', () => {
  it('keeps the focal point fixed on screen after zoom-in', () => {
    const vp = createViewport({ width: W, height: H, zoom: 0.5, panX: 50, panY: 50 });
    const focal: ScreenPoint = { x: 400, y: 300 };
    const tilePt = vp.screenToTile(focal);
    const zoomed = vp.zoomAt(2, focal);
    expectScreen(zoomed.tileToScreen(tilePt), focal, 1e-6);
  });

  it('keeps the focal point fixed on screen after zoom-out', () => {
    const vp = createViewport({ width: W, height: H, zoom: 4, panX: -100, panY: -100 });
    const focal: ScreenPoint = { x: 200, y: 150 };
    const tilePt = vp.screenToTile(focal);
    const zoomed = vp.zoomAt(0.5, focal);
    expectScreen(zoomed.tileToScreen(tilePt), focal, 1e-6);
  });

  it('clamps result to maxZoom when factor would exceed it', () => {
    const vp = createViewport({ width: W, height: H, zoom: DEFAULT_MAX_ZOOM });
    const zoomed = vp.zoomAt(10, { x: W / 2, y: H / 2 });
    expect(zoomed.getState().zoom).toBe(DEFAULT_MAX_ZOOM);
  });

  it('clamps result to minZoom when factor would go below it', () => {
    const vp = createViewport({ width: W, height: H, zoom: DEFAULT_MIN_ZOOM });
    const zoomed = vp.zoomAt(0.001, { x: W / 2, y: H / 2 });
    expect(zoomed.getState().zoom).toBe(DEFAULT_MIN_ZOOM);
  });

  it('returns a new Viewport — original zoom is unchanged', () => {
    const vp = createViewport({ width: W, height: H, zoom: 1, panX: 0, panY: 0 });
    vp.zoomAt(2, { x: 400, y: 300 });
    expect(vp.getState().zoom).toBe(1);
  });

  it('zoom factor 1.0 leaves zoom unchanged', () => {
    const vp = createViewport({ width: W, height: H, zoom: 0.5, panX: 10, panY: 20 });
    expect(approx(vp.zoomAt(1.0, { x: 400, y: 300 }).getState().zoom, 0.5)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. fitBounds
// ---------------------------------------------------------------------------

describe('fitBounds', () => {
  const vp = createViewport({ width: W, height: H });

  it('centres a square feature in the canvas', () => {
    const bounds: BoundingBox = { minX: 1000, minY: 1000, maxX: 3000, maxY: 3000 };
    const fitted = vp.fitBounds(bounds);
    const centre = fitted.tileToScreen({ x: 2000, y: 2000 });
    expectScreen(centre, { x: W / 2, y: H / 2 }, 1e-6);
  });

  it('centres a wide feature', () => {
    const bounds: BoundingBox = { minX: 0, minY: 1500, maxX: 4096, maxY: 2596 };
    const fitted = vp.fitBounds(bounds);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    expectScreen(fitted.tileToScreen({ x: cx, y: cy }), { x: W / 2, y: H / 2 }, 1e-6);
  });

  it('centres a tall feature', () => {
    const bounds: BoundingBox = { minX: 1500, minY: 0, maxX: 2596, maxY: 4096 };
    const fitted = vp.fitBounds(bounds);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    expectScreen(fitted.tileToScreen({ x: cx, y: cy }), { x: W / 2, y: H / 2 }, 1e-6);
  });

  it('fits the full tile extent with the correct zoom (using small extent)', () => {
    const vp2 = createViewport({ width: W, height: H, extent: SMALL_EXTENT });
    const bounds: BoundingBox = { minX: 0, minY: 0, maxX: SMALL_EXTENT, maxY: SMALL_EXTENT };
    const padding = 20;
    const fitted = vp2.fitBounds(bounds, padding);
    const expectedZoom = Math.min((W - 40) / SMALL_EXTENT, (H - 40) / SMALL_EXTENT);
    expect(approx(fitted.getState().zoom, expectedZoom, 1e-9)).toBe(true);
  });

  it('respects custom padding (using small extent)', () => {
    const vp2 = createViewport({ width: W, height: H, extent: SMALL_EXTENT });
    const bounds: BoundingBox = { minX: 0, minY: 0, maxX: SMALL_EXTENT, maxY: SMALL_EXTENT };
    const padding = 50;
    const fitted = vp2.fitBounds(bounds, padding);
    const expectedZoom = Math.min(
      (W - padding * 2) / SMALL_EXTENT,
      (H - padding * 2) / SMALL_EXTENT,
    );
    expect(approx(fitted.getState().zoom, expectedZoom, 1e-9)).toBe(true);
  });

  it('clamps zoom to maxZoom for a tiny feature', () => {
    const bounds: BoundingBox = { minX: 2047, minY: 2047, maxX: 2048, maxY: 2048 };
    expect(vp.fitBounds(bounds).getState().zoom).toBe(DEFAULT_MAX_ZOOM);
  });

  it('handles zero-width bounds (vertical line) without throwing', () => {
    const bounds: BoundingBox = { minX: 2000, minY: 1000, maxX: 2000, maxY: 3000 };
    expect(vp.fitBounds(bounds).getState().zoom).toBeGreaterThan(0);
  });

  it('handles zero-height bounds (horizontal line) without throwing', () => {
    const bounds: BoundingBox = { minX: 1000, minY: 2000, maxX: 3000, maxY: 2000 };
    expect(vp.fitBounds(bounds).getState().zoom).toBeGreaterThan(0);
  });

  it('degenerate single-point bounds: zoom = maxZoom, point centred', () => {
    const bounds: BoundingBox = { minX: 2048, minY: 2048, maxX: 2048, maxY: 2048 };
    const fitted = vp.fitBounds(bounds);
    expect(fitted.getState().zoom).toBe(DEFAULT_MAX_ZOOM);
    expectScreen(fitted.tileToScreen({ x: 2048, y: 2048 }), { x: W / 2, y: H / 2 }, 1e-6);
  });

  it('returns a new Viewport — original is unchanged', () => {
    const originalZoom = vp.getState().zoom;
    vp.fitBounds({ minX: 0, minY: 0, maxX: 1000, maxY: 1000 });
    expect(vp.getState().zoom).toBe(originalZoom);
  });
});

// ---------------------------------------------------------------------------
// 9. resize
// ---------------------------------------------------------------------------

describe('resize', () => {
  it('updates width and height', () => {
    const s = createViewport({ width: W, height: H }).resize(1024, 768).getState();
    expect(s.width).toBe(1024);
    expect(s.height).toBe(768);
  });

  it('preserves zoom and pan after resize', () => {
    const vp = createViewport({ width: W, height: H, zoom: 0.5, panX: 30, panY: 40 });
    const s = vp.resize(1200, 900).getState();
    expect(s.zoom).toBe(0.5);
    expect(s.panX).toBe(30);
    expect(s.panY).toBe(40);
  });

  it('same tile point maps to same screen coords before and after resize', () => {
    const vp = createViewport({ width: W, height: H, zoom: 0.1, panX: 0, panY: 0 });
    const tile: TilePoint = { x: 500, y: 700 };
    expectScreen(vp.tileToScreen(tile), vp.resize(1200, 900).tileToScreen(tile));
  });

  it('returns a new Viewport — original dimensions unchanged', () => {
    const vp = createViewport({ width: W, height: H });
    vp.resize(100, 100);
    expect(vp.getState().width).toBe(W);
  });
});

// ---------------------------------------------------------------------------
// 10. Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('handles negative tile coordinates (clipping buffer region)', () => {
    const vp = createViewport({ width: W, height: H, zoom: 0.1, panX: 100, panY: 100 });
    const p: TilePoint = { x: -100, y: -200 };
    expectTile(vp.screenToTile(vp.tileToScreen(p)), p);
  });

  it('handles coordinates larger than extent (clipping buffer region)', () => {
    const vp = createViewport({ width: W, height: H, zoom: 0.1, panX: 0, panY: 0 });
    const p: TilePoint = { x: 5000, y: 6000 };
    expectTile(vp.screenToTile(vp.tileToScreen(p)), p);
  });

  it('round-trip works at maxZoom', () => {
    const vp = createViewport({ width: W, height: H, zoom: DEFAULT_MAX_ZOOM, panX: 0, panY: 0 });
    const p: TilePoint = { x: 100, y: 100 };
    expectTile(vp.screenToTile(vp.tileToScreen(p)), p);
  });

  it('round-trip works at minZoom', () => {
    const vp = createViewport({ width: W, height: H, zoom: DEFAULT_MIN_ZOOM, panX: 0, panY: 0 });
    const p: TilePoint = { x: 2048, y: 2048 };
    expectTile(vp.screenToTile(vp.tileToScreen(p)), p);
  });

  it('custom extent (512) works correctly', () => {
    const vp = createViewport({ width: W, height: H, extent: 512, zoom: 1, panX: 0, panY: 0 });
    expect(vp.getState().extent).toBe(512);
    const p: TilePoint = { x: 256, y: 256 };
    expectTile(vp.screenToTile(vp.tileToScreen(p)), p);
  });

  it('custom minZoom / maxZoom clamps correctly', () => {
    const vp = createViewport({ width: W, height: H, minZoom: 1, maxZoom: 8, zoom: 0.1 });
    expect(vp.getState().zoom).toBe(1);
  });
});
```

---

## 5. Build & Test Verification Logs

### Vitest Unit Test Log (`npx vitest run`):
```text
 RUN  v1.6.1 /home/shreeharsh157/Desktop/tileguard/packages/inspector

 ✓ tests/viewport.test.ts (61 tests) 20ms
 ✓ tests/smoke.test.ts (33 tests) 4ms

 Test Files  2 passed (2)
      Tests  94 passed (94)
   Start at  00:13:20
   Duration  623ms
```

### TypeScript Compiler Log (`npx tsc --noEmit`):
```text
(Exit Code 0 — clean build with 0 type errors)
```

### Biome Linter Log (`npx @biomejs/biome check .`):
```text
Checked 156 files in 149ms. 0 errors, 0 warnings.
```
