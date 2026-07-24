/**
 * @tileguard/inspector — shapes.ts Unit Tests
 *
 * Unit tests for all pure Canvas 2D drawing helpers. Uses a mock
 * CanvasRenderingContext2D to verify that each helper:
 *   - calls ctx.save() and ctx.restore() exactly once (state isolation)
 *   - calls ctx.beginPath() before path commands
 *   - issues the correct path/style commands with the supplied arguments
 *   - handles edge cases (empty arrays, single points) without throwing
 *
 * No DOM, no real canvas. Pure TypeScript, Vitest node environment.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ScreenPoint } from '../src/geometry/index';
import type { BoundaryStyle, LineStyle, PointStyle, PolygonStyle, VertexStyle } from '../src/renderer/shapes';
import {
  drawLineString,
  drawPoint,
  drawPolygon,
  drawTileBoundary,
  drawVertexMarkers,
} from '../src/renderer/shapes';

// ---------------------------------------------------------------------------
// Canvas 2D context mock
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
    setLineDash: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

// ---------------------------------------------------------------------------
// Style fixtures
// ---------------------------------------------------------------------------

const POINT_STYLE: PointStyle = {
  radius: 5,
  fillColor: '#3b82f6',
  strokeColor: '#1e293b',
  lineWidth: 1,
  globalAlpha: 0.9,
};

const LINE_STYLE: LineStyle = {
  strokeColor: '#f59e0b',
  lineWidth: 2,
  lineCap: 'round',
  lineJoin: 'round',
  globalAlpha: 0.85,
};

const POLYGON_STYLE: PolygonStyle = {
  fillColor: '#10b981',
  fillAlpha: 0.15,
  strokeColor: '#10b981',
  lineWidth: 1,
  lineJoin: 'miter',
  globalAlpha: 1,
};

const VERTEX_STYLE: VertexStyle = {
  halfSize: 3,
  fillColor: '#ffffff',
  strokeColor: '#334155',
  lineWidth: 1,
  globalAlpha: 1,
};

const TILE_STYLE: BoundaryStyle = {
  strokeColor: '#475569',
  lineWidth: 1,
  lineDash: [6, 4],
  fillColor: 'transparent',
};

const BUFFER_STYLE: BoundaryStyle = {
  strokeColor: '#64748b',
  lineWidth: 1,
  lineDash: [2, 4],
  fillColor: 'transparent',
};

// ---------------------------------------------------------------------------
// drawPoint
// ---------------------------------------------------------------------------

describe('drawPoint', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => { ctx = makeCtx(); });

  it('calls save() and restore() exactly once', () => {
    drawPoint(ctx, { x: 50, y: 100 }, POINT_STYLE);
    expect(ctx.save).toHaveBeenCalledOnce();
    expect(ctx.restore).toHaveBeenCalledOnce();
  });

  it('calls beginPath() before arc()', () => {
    const order: string[] = [];
    (ctx.beginPath as ReturnType<typeof vi.fn>).mockImplementation(() => order.push('beginPath'));
    (ctx.arc as ReturnType<typeof vi.fn>).mockImplementation(() => order.push('arc'));
    drawPoint(ctx, { x: 50, y: 100 }, POINT_STYLE);
    expect(order.indexOf('beginPath')).toBeLessThan(order.indexOf('arc'));
  });

  it('calls ctx.arc with the correct coordinates and radius', () => {
    drawPoint(ctx, { x: 50, y: 100 }, POINT_STYLE);
    expect(ctx.arc).toHaveBeenCalledWith(50, 100, POINT_STYLE.radius, 0, Math.PI * 2);
  });

  it('calls both fill() and stroke()', () => {
    drawPoint(ctx, { x: 50, y: 100 }, POINT_STYLE);
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('sets globalAlpha from style', () => {
    drawPoint(ctx, { x: 0, y: 0 }, POINT_STYLE);
    expect((ctx as unknown as Record<string, unknown>)['globalAlpha']).toBe(POINT_STYLE.globalAlpha);
  });

  it('does not throw for origin coordinates (0, 0)', () => {
    expect(() => drawPoint(ctx, { x: 0, y: 0 }, POINT_STYLE)).not.toThrow();
  });

  it('does not throw for large coordinates', () => {
    expect(() => drawPoint(ctx, { x: 99999, y: 99999 }, POINT_STYLE)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// drawLineString
// ---------------------------------------------------------------------------

describe('drawLineString', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => { ctx = makeCtx(); });

  it('calls save() and restore() exactly once for a valid line', () => {
    drawLineString(ctx, [{ x: 0, y: 0 }, { x: 100, y: 100 }], LINE_STYLE);
    expect(ctx.save).toHaveBeenCalledOnce();
    expect(ctx.restore).toHaveBeenCalledOnce();
  });

  it('calls moveTo for the first point and lineTo for subsequent points', () => {
    const pts: ScreenPoint[] = [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 0 }];
    drawLineString(ctx, pts, LINE_STYLE);
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(ctx.lineTo).toHaveBeenCalledWith(50, 50);
    expect(ctx.lineTo).toHaveBeenCalledWith(100, 0);
  });

  it('calls stroke() once', () => {
    drawLineString(ctx, [{ x: 0, y: 0 }, { x: 100, y: 0 }], LINE_STYLE);
    expect(ctx.stroke).toHaveBeenCalledOnce();
  });

  it('does NOT draw anything for an empty array', () => {
    drawLineString(ctx, [], LINE_STYLE);
    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });

  it('does NOT draw anything for a single-point array (degenerate)', () => {
    drawLineString(ctx, [{ x: 10, y: 10 }], LINE_STYLE);
    expect(ctx.save).not.toHaveBeenCalled();
  });

  it('does NOT call fill()', () => {
    drawLineString(ctx, [{ x: 0, y: 0 }, { x: 100, y: 0 }], LINE_STYLE);
    expect(ctx.fill).not.toHaveBeenCalled();
  });

  it('calls beginPath() before moveTo()', () => {
    const order: string[] = [];
    (ctx.beginPath as ReturnType<typeof vi.fn>).mockImplementation(() => order.push('beginPath'));
    (ctx.moveTo as ReturnType<typeof vi.fn>).mockImplementation(() => order.push('moveTo'));
    drawLineString(ctx, [{ x: 0, y: 0 }, { x: 10, y: 10 }], LINE_STYLE);
    expect(order.indexOf('beginPath')).toBeLessThan(order.indexOf('moveTo'));
  });
});

// ---------------------------------------------------------------------------
// drawPolygon
// ---------------------------------------------------------------------------

describe('drawPolygon', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => { ctx = makeCtx(); });

  const exterior: ScreenPoint[] = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
  ];
  const hole: ScreenPoint[] = [
    { x: 20, y: 20 }, { x: 80, y: 20 }, { x: 80, y: 80 }, { x: 20, y: 80 },
  ];

  it('calls save() and restore() exactly once', () => {
    drawPolygon(ctx, [exterior], POLYGON_STYLE);
    expect(ctx.save).toHaveBeenCalledOnce();
    expect(ctx.restore).toHaveBeenCalledOnce();
  });

  it('calls beginPath() once', () => {
    drawPolygon(ctx, [exterior], POLYGON_STYLE);
    expect(ctx.beginPath).toHaveBeenCalledOnce();
  });

  it('calls closePath() once per ring', () => {
    drawPolygon(ctx, [exterior, hole], POLYGON_STYLE);
    expect(ctx.closePath).toHaveBeenCalledTimes(2);
  });

  it('calls fill() with evenodd rule', () => {
    drawPolygon(ctx, [exterior], POLYGON_STYLE);
    expect(ctx.fill).toHaveBeenCalledWith('evenodd');
  });

  it('calls stroke() once', () => {
    drawPolygon(ctx, [exterior], POLYGON_STYLE);
    expect(ctx.stroke).toHaveBeenCalledOnce();
  });

  it('does nothing for an empty rings array', () => {
    drawPolygon(ctx, [], POLYGON_STYLE);
    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });

  it('calls moveTo for the first vertex of each ring', () => {
    drawPolygon(ctx, [exterior, hole], POLYGON_STYLE);
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(ctx.moveTo).toHaveBeenCalledWith(20, 20);
  });

  it('does not throw for a polygon with no interior rings', () => {
    expect(() => drawPolygon(ctx, [exterior], POLYGON_STYLE)).not.toThrow();
  });

  it('does not throw for a polygon with multiple interior rings', () => {
    expect(() => drawPolygon(ctx, [exterior, hole, hole], POLYGON_STYLE)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// drawVertexMarkers
// ---------------------------------------------------------------------------

describe('drawVertexMarkers', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => { ctx = makeCtx(); });

  const pts: ScreenPoint[] = [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 60 }];

  it('calls save() and restore() exactly once', () => {
    drawVertexMarkers(ctx, pts, VERTEX_STYLE);
    expect(ctx.save).toHaveBeenCalledOnce();
    expect(ctx.restore).toHaveBeenCalledOnce();
  });

  it('draws one rect per vertex', () => {
    drawVertexMarkers(ctx, pts, VERTEX_STYLE);
    expect(ctx.rect).toHaveBeenCalledTimes(3);
  });

  it('calls beginPath() once per vertex', () => {
    drawVertexMarkers(ctx, pts, VERTEX_STYLE);
    expect(ctx.beginPath).toHaveBeenCalledTimes(3);
  });

  it('positions each rect correctly (centred on vertex)', () => {
    drawVertexMarkers(ctx, [{ x: 10, y: 20 }], VERTEX_STYLE);
    const size = VERTEX_STYLE.halfSize * 2;
    expect(ctx.rect).toHaveBeenCalledWith(
      10 - VERTEX_STYLE.halfSize,
      20 - VERTEX_STYLE.halfSize,
      size,
      size,
    );
  });

  it('calls fill() and stroke() per vertex', () => {
    drawVertexMarkers(ctx, pts, VERTEX_STYLE);
    expect(ctx.fill).toHaveBeenCalledTimes(3);
    expect(ctx.stroke).toHaveBeenCalledTimes(3);
  });

  it('does nothing for an empty points array', () => {
    drawVertexMarkers(ctx, [], VERTEX_STYLE);
    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.rect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// drawTileBoundary
// ---------------------------------------------------------------------------

describe('drawTileBoundary', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => { ctx = makeCtx(); });

  const origin: ScreenPoint = { x: 10, y: 10 };
  const maxCorner: ScreenPoint = { x: 210, y: 210 };
  const bufOrigin: ScreenPoint = { x: 0, y: 0 };
  const bufMax: ScreenPoint = { x: 220, y: 220 };

  it('draws the tile boundary rect with the correct dimensions', () => {
    drawTileBoundary(ctx, origin, maxCorner, null, null, TILE_STYLE);
    expect(ctx.rect).toHaveBeenCalledWith(
      origin.x, origin.y,
      maxCorner.x - origin.x,
      maxCorner.y - origin.y,
    );
  });

  it('calls setLineDash with the tile style dash pattern', () => {
    drawTileBoundary(ctx, origin, maxCorner, null, null, TILE_STYLE);
    expect(ctx.setLineDash).toHaveBeenCalledWith([6, 4]);
  });

  it('calls stroke() once when no buffer is provided', () => {
    drawTileBoundary(ctx, origin, maxCorner, null, null, TILE_STYLE);
    expect(ctx.stroke).toHaveBeenCalledOnce();
  });

  it('draws both tile and buffer boxes when buffer corners are provided', () => {
    drawTileBoundary(ctx, origin, maxCorner, bufOrigin, bufMax, TILE_STYLE, BUFFER_STYLE);
    expect(ctx.rect).toHaveBeenCalledTimes(2);
    expect(ctx.stroke).toHaveBeenCalledTimes(2);
  });

  it('calls setLineDash twice with different patterns for tile and buffer', () => {
    drawTileBoundary(ctx, origin, maxCorner, bufOrigin, bufMax, TILE_STYLE, BUFFER_STYLE);
    expect(ctx.setLineDash).toHaveBeenCalledWith([6, 4]);
    expect(ctx.setLineDash).toHaveBeenCalledWith([2, 4]);
  });

  it('calls save() and restore() for the tile box', () => {
    drawTileBoundary(ctx, origin, maxCorner, null, null, TILE_STYLE);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('does NOT draw buffer box when bufferStyle is undefined', () => {
    drawTileBoundary(ctx, origin, maxCorner, bufOrigin, bufMax, TILE_STYLE);
    expect(ctx.rect).toHaveBeenCalledOnce();
  });

  it('does NOT draw buffer box when buffer corners are null', () => {
    drawTileBoundary(ctx, origin, maxCorner, null, null, TILE_STYLE, BUFFER_STYLE);
    expect(ctx.rect).toHaveBeenCalledOnce();
  });
});
