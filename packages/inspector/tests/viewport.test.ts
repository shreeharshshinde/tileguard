/**
 * @tileguard/inspector — Viewport & Coordinate Transformation Engine Tests
 *
 * 40 focused mathematical tests. No DOM, no Canvas, no React.
 * Pure TypeScript, runs in the Vitest Node environment.
 *
 * Design notes
 * ─────────────
 * • W=800, H=600, EXTENT=4096 gives a natural fit zoom of ~0.137 which is
 *   below DEFAULT_MIN_ZOOM (0.25) and gets clamped. Tests that check exact
 *   zoom/pan arithmetic either use a small custom extent (so fit zoom stays
 *   above minZoom) or pass explicit zoom/panX/panY to avoid clamping surprises.
 *
 * • The round-trip tolerance is INVERSE_TOLERANCE (1e-6 tile units). All
 *   floating-point comparisons use the `approx` helper below.
 *
 * Test organisation
 * ─────────────────
 *  1. createViewport — default state and initial geometry
 *  2. ViewportState  — zoom clamping, immutability
 *  3. tileToScreen   — forward transform correctness
 *  4. screenToTile   — inverse transform correctness
 *  5. Round-trip     — screenToTile(tileToScreen(P)) ≈ P
 *  6. pan            — translation, immutability
 *  7. zoomAt         — focal-point invariant, clamping
 *  8. fitBounds      — geometry types, padding, degenerate cases
 *  9. resize         — dimension update, transform preservation
 * 10. Edge cases      — extremes, negative coords, custom extent
 */

import { describe, expect, it } from 'vitest';
import type { BoundingBox, ScreenPoint, TilePoint } from '../src/viewport/viewport';
import {
  createViewport,
  DEFAULT_EXTENT,
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
  INVERSE_TOLERANCE,
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

// A small extent that keeps fit-zoom above DEFAULT_MIN_ZOOM for W×H canvas:
//   fit = (600-40)/128 = 4.375 → above 0.25 ✓
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
    // Use SMALL_EXTENT so the natural fit zoom (4.375) is above DEFAULT_MIN_ZOOM
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
    const zoom = 0.5; // above DEFAULT_MIN_ZOOM (0.25)
    const vp = createViewport({ width: W, height: H, zoom, panX: 0, panY: 0 });
    expectScreen(vp.tileToScreen({ x: DEFAULT_EXTENT, y: DEFAULT_EXTENT }), {
      x: DEFAULT_EXTENT * zoom,
      y: DEFAULT_EXTENT * zoom,
    });
  });

  it('maps tile centre to screen centre when the tile is perfectly centred', () => {
    const zoom = 0.5; // above DEFAULT_MIN_ZOOM (0.25)
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
  // Explicit zoom/pan — no clamping uncertainty
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
    // The tile point under the focal pixel must stay under the focal pixel
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
    // Use SMALL_EXTENT so the computed zoom is above DEFAULT_MIN_ZOOM
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

  it('throws on inverted bounding box (minX > maxX)', () => {
    expect(() => vp.fitBounds({ minX: 3000, minY: 0, maxX: 1000, maxY: 1000 })).toThrow(
      'Invalid BoundingBox',
    );
  });

  it('throws on inverted bounding box (minY > maxY)', () => {
    expect(() => vp.fitBounds({ minX: 0, minY: 3000, maxX: 1000, maxY: 1000 })).toThrow(
      'Invalid BoundingBox',
    );
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

  it('same tile point maps to same screen coords before and after resize (zoom/pan unchanged)', () => {
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
    // zoom 0.1 < minZoom 1 → clamped to 1
    const vp = createViewport({ width: W, height: H, minZoom: 1, maxZoom: 8, zoom: 0.1 });
    expect(vp.getState().zoom).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 11. Invalid-construction guards — createViewport must reject bad inputs
// ---------------------------------------------------------------------------

describe('createViewport — invalid construction guards', () => {
  it('throws when width is 0', () => {
    expect(() => createViewport({ width: 0, height: 600 })).toThrow(
      'width',
    );
  });

  it('throws when height is 0', () => {
    expect(() => createViewport({ width: 800, height: 0 })).toThrow(
      'height',
    );
  });

  it('throws when width is negative', () => {
    expect(() => createViewport({ width: -1, height: 600 })).toThrow(
      'width',
    );
  });

  it('throws when height is negative', () => {
    expect(() => createViewport({ width: 800, height: -1 })).toThrow(
      'height',
    );
  });

  it('throws when zoom is NaN', () => {
    expect(() => createViewport({ width: 800, height: 600, zoom: NaN })).toThrow(
      'zoom',
    );
  });

  it('throws when zoom is Infinity', () => {
    expect(() => createViewport({ width: 800, height: 600, zoom: Infinity })).toThrow(
      'zoom',
    );
  });

  it('throws when zoom is -Infinity', () => {
    expect(() => createViewport({ width: 800, height: 600, zoom: -Infinity })).toThrow(
      'zoom',
    );
  });

  it('throws when minZoom > maxZoom', () => {
    expect(() =>
      createViewport({ width: 800, height: 600, minZoom: 10, maxZoom: 5 }),
    ).toThrow('minZoom');
  });

  it('throws when minZoom === maxZoom (degenerate range)', () => {
    // Equal bounds produce a fixed zoom with no range — treat as invalid.
    expect(() =>
      createViewport({ width: 800, height: 600, minZoom: 4, maxZoom: 4 }),
    ).toThrow('minZoom');
  });

  it('throws when panX is NaN', () => {
    expect(() => createViewport({ width: 800, height: 600, panX: NaN })).toThrow(
      'panX',
    );
  });

  it('throws when panY is NaN', () => {
    expect(() => createViewport({ width: 800, height: 600, panY: NaN })).toThrow(
      'panY',
    );
  });

  it('throws when extent is 0', () => {
    expect(() => createViewport({ width: 800, height: 600, extent: 0 })).toThrow(
      'extent',
    );
  });

  it('throws when extent is negative', () => {
    expect(() => createViewport({ width: 800, height: 600, extent: -1 })).toThrow(
      'extent',
    );
  });

  it('accepts a valid minimal viewport without throwing', () => {
    expect(() =>
      createViewport({ width: 1, height: 1, zoom: DEFAULT_MIN_ZOOM }),
    ).not.toThrow();
  });
});
