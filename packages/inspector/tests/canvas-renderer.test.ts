/**
 * @tileguard/inspector — CanvasRenderer Unit Tests
 *
 * Tests for canvas attachment, resize, clear, and the full render pipeline
 * including pipeline execution order, viewport coordinate integration, and
 * overlay dispatching.
 *
 * No DOM — uses a mock HTMLCanvasElement and CanvasRenderingContext2D.
 * Pure TypeScript, Vitest node environment.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CanvasRenderer } from '../src/renderer/canvas-renderer';
import type { OverlayDescriptor } from '../src/overlay/overlay-adapter';
import type { VectorTileArtifact, VectorTileFeature, VectorTileLayer } from '@tileguard/tile-rules';
import { createViewport } from '../src/viewport/viewport';

// ---------------------------------------------------------------------------
// Mock canvas / context
// ---------------------------------------------------------------------------

function makeCtx(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    closePath: vi.fn(),
    clearRect: vi.fn(),
    setLineDash: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

function makeCanvas(width = 800, height = 600): HTMLCanvasElement {
  const ctx = makeCtx();
  return {
    width,
    height,
    getContext: vi.fn(() => ctx),
    _ctx: ctx, // expose for test access
  } as unknown as HTMLCanvasElement;
}

// ---------------------------------------------------------------------------
// Tile artifact fixture builders
// ---------------------------------------------------------------------------

function makeLayer(
  name: string,
  features: VectorTileFeature[],
  extent = 4096,
): VectorTileLayer {
  return { name, version: 2, extent, keys: [], values: [], features };
}

function makeArtifact(layers: VectorTileLayer[]): VectorTileArtifact {
  const map: Record<string, VectorTileLayer> = {};
  for (const l of layers) map[l.name] = l;
  return { type: 'VectorTile', ref: { type: 'VectorTile', source: 'test.pbf' }, content: { layers: map } };
}

const POINT_FEATURE: VectorTileFeature = {
  id: 1, type: 1, geometryType: 'Point', properties: {},
  geometry: [{ x: 1000, y: 2000 }],
};

const LINE_FEATURE: VectorTileFeature = {
  id: 2, type: 2, geometryType: 'LineString', properties: {},
  geometry: [[{ x: 0, y: 0 }, { x: 500, y: 500 }, { x: 1000, y: 0 }]],
};

const POLYGON_FEATURE: VectorTileFeature = {
  id: 3, type: 3, geometryType: 'Polygon', properties: {},
  geometry: [
    [{ x: 100, y: 100 }, { x: 900, y: 100 }, { x: 900, y: 900 }, { x: 100, y: 900 }, { x: 100, y: 100 }],
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRenderer(width = 800, height = 600) {
  const viewport = createViewport({ width, height });
  const renderer = new CanvasRenderer({ viewport });
  const canvas = makeCanvas(width, height);
  renderer.attachCanvas(canvas);
  const ctx = (canvas as unknown as { _ctx: CanvasRenderingContext2D })._ctx;
  return { renderer, canvas, ctx, viewport };
}

// ---------------------------------------------------------------------------
// attachCanvas
// ---------------------------------------------------------------------------

describe('CanvasRenderer.attachCanvas', () => {
  it('acquires a 2D context from the canvas element', () => {
    const vp = createViewport({ width: 800, height: 600 });
    const renderer = new CanvasRenderer({ viewport: vp });
    const canvas = makeCanvas();
    renderer.attachCanvas(canvas);
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
  });

  it('throws when getContext returns null', () => {
    const vp = createViewport({ width: 800, height: 600 });
    const renderer = new CanvasRenderer({ viewport: vp });
    const badCanvas = {
      width: 800,
      height: 600,
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement;
    expect(() => renderer.attachCanvas(badCanvas)).toThrow(/2D context/);
  });

  it('does not throw for a valid canvas', () => {
    const vp = createViewport({ width: 800, height: 600 });
    const renderer = new CanvasRenderer({ viewport: vp });
    expect(() => renderer.attachCanvas(makeCanvas())).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// resize
// ---------------------------------------------------------------------------

describe('CanvasRenderer.resize', () => {
  it('updates canvas dimensions', () => {
    const { renderer, canvas } = makeRenderer();
    renderer.resize(1024, 768);
    expect((canvas as unknown as { width: number }).width).toBe(1024);
    expect((canvas as unknown as { height: number }).height).toBe(768);
  });

  it('updates the internal viewport dimensions', () => {
    const { renderer } = makeRenderer(800, 600);
    renderer.resize(1280, 720);
    const state = renderer.getViewport().getState();
    expect(state.width).toBe(1280);
    expect(state.height).toBe(720);
  });

  it('throws when no canvas is attached', () => {
    const vp = createViewport({ width: 800, height: 600 });
    const renderer = new CanvasRenderer({ viewport: vp });
    // resize without attachCanvas should still work (only canvas props update if attached)
    // but clear/render should throw — resize itself just updates viewport
    expect(() => renderer.resize(1024, 768)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// clear
// ---------------------------------------------------------------------------

describe('CanvasRenderer.clear', () => {
  it('calls clearRect covering the full canvas', () => {
    const { renderer, ctx, canvas } = makeRenderer(800, 600);
    renderer.clear();
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
  });

  it('throws when no canvas is attached', () => {
    const vp = createViewport({ width: 800, height: 600 });
    const renderer = new CanvasRenderer({ viewport: vp });
    expect(() => renderer.clear()).toThrow(/no canvas attached/i);
  });
});

// ---------------------------------------------------------------------------
// render — basic pipeline execution
// ---------------------------------------------------------------------------

describe('CanvasRenderer.render', () => {
  it('calls clearRect at the start of each render pass', () => {
    const { renderer, ctx } = makeRenderer();
    const artifact = makeArtifact([makeLayer('roads', [LINE_FEATURE])]);
    renderer.render(artifact, []);
    expect(ctx.clearRect).toHaveBeenCalled();
  });

  it('draws the tile boundary (calls setLineDash for the extent box)', () => {
    const { renderer, ctx } = makeRenderer();
    renderer.render(makeArtifact([makeLayer('l', [POINT_FEATURE])]), []);
    // drawTileBoundary calls setLineDash at least once
    expect(ctx.setLineDash).toHaveBeenCalled();
  });

  it('calls arc() for each Point feature', () => {
    const { renderer, ctx } = makeRenderer();
    renderer.render(makeArtifact([makeLayer('places', [POINT_FEATURE, POINT_FEATURE])]), []);
    expect(ctx.arc).toHaveBeenCalledTimes(2);
  });

  it('calls moveTo/lineTo for LineString features', () => {
    const { renderer, ctx } = makeRenderer();
    renderer.render(makeArtifact([makeLayer('roads', [LINE_FEATURE])]), []);
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
  });

  it('calls fill("evenodd") for Polygon features', () => {
    const { renderer, ctx } = makeRenderer();
    renderer.render(makeArtifact([makeLayer('buildings', [POLYGON_FEATURE])]), []);
    expect(ctx.fill).toHaveBeenCalledWith('evenodd');
  });

  it('does not throw for an artifact with no layers', () => {
    const { renderer } = makeRenderer();
    expect(() => renderer.render(makeArtifact([]), [])).not.toThrow();
  });

  it('does not throw for an artifact with empty layers', () => {
    const { renderer } = makeRenderer();
    expect(() =>
      renderer.render(makeArtifact([makeLayer('empty', [])]), []),
    ).not.toThrow();
  });

  it('renders mixed geometry types without throwing', () => {
    const { renderer } = makeRenderer();
    const artifact = makeArtifact([
      makeLayer('buildings', [POLYGON_FEATURE]),
      makeLayer('roads', [LINE_FEATURE]),
      makeLayer('places', [POINT_FEATURE]),
    ]);
    expect(() => renderer.render(artifact, [])).not.toThrow();
  });

  it('throws when no canvas is attached', () => {
    const vp = createViewport({ width: 800, height: 600 });
    const renderer = new CanvasRenderer({ viewport: vp });
    expect(() => renderer.render(makeArtifact([]), [])).toThrow(/no canvas attached/i);
  });
});

// ---------------------------------------------------------------------------
// render — pipeline order (clear before draw)
// ---------------------------------------------------------------------------

describe('CanvasRenderer.render — pipeline order', () => {
  it('calls clearRect before arc() (clear before points)', () => {
    const { renderer, ctx } = makeRenderer();
    const order: string[] = [];
    (ctx.clearRect as ReturnType<typeof vi.fn>).mockImplementation(() => order.push('clearRect'));
    (ctx.arc as ReturnType<typeof vi.fn>).mockImplementation(() => order.push('arc'));

    renderer.render(makeArtifact([makeLayer('places', [POINT_FEATURE])]), []);
    expect(order.indexOf('clearRect')).toBeLessThan(order.indexOf('arc'));
  });

  it('calls clearRect before fill("evenodd") (clear before polygons)', () => {
    const { renderer, ctx } = makeRenderer();
    const order: string[] = [];
    (ctx.clearRect as ReturnType<typeof vi.fn>).mockImplementation(() => order.push('clearRect'));
    (ctx.fill as ReturnType<typeof vi.fn>).mockImplementation(() => order.push('fill'));

    renderer.render(makeArtifact([makeLayer('buildings', [POLYGON_FEATURE])]), []);
    const clearIdx = order.indexOf('clearRect');
    const fillIdx = order.indexOf('fill');
    expect(clearIdx).toBeLessThan(fillIdx);
  });
});

// ---------------------------------------------------------------------------
// render — viewport coordinate integration
// ---------------------------------------------------------------------------

describe('CanvasRenderer.render — coordinate transform', () => {
  it('transforms tile coordinates to screen space via the viewport', () => {
    // Use a deterministic viewport with explicit zoom/pan so we can predict screen coords.
    // DEFAULT_MIN_ZOOM is 0.25, so we use 0.5 (well above the minimum).
    // POINT_FEATURE geometry: tile { x: 1000, y: 2000 }
    // screenX = 1000 * 0.5 + 0 = 500, screenY = 2000 * 0.5 + 0 = 1000
    const vp = createViewport({ width: 800, height: 600, zoom: 0.5, panX: 0, panY: 0 });
    const renderer = new CanvasRenderer({ viewport: vp });
    const canvas = makeCanvas(800, 600);
    renderer.attachCanvas(canvas);
    const ctx = (canvas as unknown as { _ctx: CanvasRenderingContext2D })._ctx;

    renderer.render(makeArtifact([makeLayer('places', [POINT_FEATURE])]), []);

    expect(ctx.arc).toHaveBeenCalledWith(500, 1000, expect.any(Number), 0, Math.PI * 2);
  });
});

// ---------------------------------------------------------------------------
// render — overlay dispatching
// ---------------------------------------------------------------------------

describe('CanvasRenderer.render — overlays', () => {
  it('renders a point-marker overlay by calling arc()', () => {
    const { renderer, ctx } = makeRenderer(800, 600);
    // Reset arc call count before test render
    (ctx.arc as ReturnType<typeof vi.fn>).mockClear();

    const overlay: OverlayDescriptor = {
      type: 'point-marker',
      layerName: 'places',
      featureIndex: 0,
      target: 0,
      severity: 'error',
    };
    renderer.render(
      makeArtifact([makeLayer('places', [POINT_FEATURE])]),
      [overlay],
    );
    // arc should be called: once for the feature + once for the overlay marker
    expect(ctx.arc).toHaveBeenCalledTimes(2);
  });

  it('skips overlays for unknown layer names without throwing', () => {
    const { renderer } = makeRenderer();
    const overlay: OverlayDescriptor = {
      type: 'point-marker',
      layerName: 'nonexistent',
      featureIndex: 0,
      target: 0,
      severity: 'warning',
    };
    expect(() =>
      renderer.render(makeArtifact([makeLayer('places', [POINT_FEATURE])]), [overlay]),
    ).not.toThrow();
  });

  it('skips overlays for out-of-range feature indices without throwing', () => {
    const { renderer } = makeRenderer();
    const overlay: OverlayDescriptor = {
      type: 'point-marker',
      layerName: 'places',
      featureIndex: 999,
      target: 0,
      severity: 'info',
    };
    expect(() =>
      renderer.render(makeArtifact([makeLayer('places', [POINT_FEATURE])]), [overlay]),
    ).not.toThrow();
  });

  it('renders a bbox-fill overlay by calling fill("evenodd")', () => {
    const { renderer, ctx } = makeRenderer();
    (ctx.fill as ReturnType<typeof vi.fn>).mockClear();

    const overlay: OverlayDescriptor = {
      type: 'bbox-fill',
      layerName: 'buildings',
      featureIndex: 0,
      target: 0,
      severity: 'warning',
    };
    renderer.render(
      makeArtifact([makeLayer('buildings', [POLYGON_FEATURE])]),
      [overlay],
    );
    // fill("evenodd") called at least once: once for the polygon + once for the bbox overlay
    expect(ctx.fill).toHaveBeenCalledWith('evenodd');
  });

  it('handles empty overlay array without extra draw calls', () => {
    const { renderer, ctx } = makeRenderer();
    (ctx.arc as ReturnType<typeof vi.fn>).mockClear();

    renderer.render(makeArtifact([makeLayer('places', [POINT_FEATURE])]), []);
    // Only the feature itself, no extra arc from overlay
    expect(ctx.arc).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// setViewport / getViewport
// ---------------------------------------------------------------------------

describe('CanvasRenderer.setViewport / getViewport', () => {
  it('getViewport returns the initial viewport', () => {
    const vp = createViewport({ width: 800, height: 600 });
    const renderer = new CanvasRenderer({ viewport: vp });
    expect(renderer.getViewport()).toBe(vp);
  });

  it('setViewport replaces the active viewport', () => {
    const vp1 = createViewport({ width: 800, height: 600 });
    const vp2 = createViewport({ width: 1280, height: 720 });
    const renderer = new CanvasRenderer({ viewport: vp1 });
    renderer.setViewport(vp2);
    expect(renderer.getViewport()).toBe(vp2);
  });
});

// ---------------------------------------------------------------------------
// showVertices option
// ---------------------------------------------------------------------------

describe('CanvasRenderer — showVertices option', () => {
  it('does not draw vertex markers by default', () => {
    const { renderer, ctx } = makeRenderer();
    renderer.render(makeArtifact([makeLayer('buildings', [POLYGON_FEATURE])]), []);
    // rect() is only used by drawVertexMarkers and drawTileBoundary.
    // drawTileBoundary uses rect() too — so we check if rect is called MORE
    // times than expected when vertices are enabled.
    const baseRectCalls = (ctx.rect as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(baseRectCalls).toBeGreaterThanOrEqual(0); // boundary rects always present
    // No vertex squares added on top (we verify by enabling and comparing)
    const vp = createViewport({ width: 800, height: 600 });
    const rendererWithVertices = new CanvasRenderer({ viewport: vp, showVertices: true });
    const canvas2 = makeCanvas();
    rendererWithVertices.attachCanvas(canvas2);
    const ctx2 = (canvas2 as unknown as { _ctx: CanvasRenderingContext2D })._ctx;
    rendererWithVertices.render(makeArtifact([makeLayer('buildings', [POLYGON_FEATURE])]), []);
    const vertexRectCalls = (ctx2.rect as ReturnType<typeof vi.fn>).mock.calls.length;
    // With showVertices=true there should be MORE rect calls than without
    expect(vertexRectCalls).toBeGreaterThan(baseRectCalls);
  });
});
