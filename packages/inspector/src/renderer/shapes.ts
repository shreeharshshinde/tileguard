/**
 * @tileguard/inspector — Renderer: Pure Drawing Routines
 *
 * Pure Canvas 2D drawing primitives. Each function:
 *   - accepts a CanvasRenderingContext2D, pre-transformed ScreenPoint(s), and
 *     style tokens from palette.ts
 *   - issues the minimal Canvas 2D path commands to draw the geometry
 *   - follows the save() → configure → beginPath() → path → fill/stroke → restore()
 *     lifecycle to guarantee full state isolation between calls
 *   - is stateless and side-effect-free except for drawing to `ctx`
 *
 * Architectural guardrails (ADR-009)
 * ──────────────────────────────────
 * Drawing helpers MUST NOT:
 *   - accept VectorTileArtifact, VectorTileFeature, Viewport, or traversal APIs
 *   - perform tile-to-screen coordinate transformation
 *   - perform feature dispatch or geometry-type switching
 *   - cache geometry or canvas state between calls
 *   - import @tileguard/tile-rules, InspectorStore, or overlay subsystem
 *   - contain business logic, hit testing, or validation
 *
 * Callers (CanvasRenderer) are responsible for coordinate transformation and
 * dispatching the correct helper for each geometry type.
 *
 * Polygon holes
 * ─────────────
 * `drawPolygon` uses `ctx.fill('evenodd')` so that interior rings correctly
 * subtract from exterior rings, matching MVT winding semantics.
 *
 * Exported functions
 * ──────────────────
 *   drawPoint          — filled circle + optional outline
 *   drawLineString     — stroked polyline
 *   drawPolygon        — multi-ring path with evenodd hole subtraction
 *   drawVertexMarkers  — small square markers at vertex coordinates
 *   drawTileBoundary   — tile extent box + optional buffer zone guide box
 */

import type { ScreenPoint } from '../geometry/index.js';

// ---------------------------------------------------------------------------
// Style token interfaces
// ---------------------------------------------------------------------------

/** Style tokens accepted by drawPoint. */
export interface PointStyle {
  readonly radius: number;
  readonly fillColor: string;
  readonly strokeColor: string;
  readonly lineWidth: number;
  readonly globalAlpha: number;
}

/** Style tokens accepted by drawLineString. */
export interface LineStyle {
  readonly strokeColor: string;
  readonly lineWidth: number;
  readonly lineCap: CanvasLineCap;
  readonly lineJoin: CanvasLineJoin;
  readonly globalAlpha: number;
}

/** Style tokens accepted by drawPolygon. */
export interface PolygonStyle {
  readonly fillColor: string;
  readonly fillAlpha: number;
  readonly strokeColor: string;
  readonly lineWidth: number;
  readonly lineJoin: CanvasLineJoin;
  readonly globalAlpha: number;
}

/** Style tokens accepted by drawVertexMarkers. */
export interface VertexStyle {
  readonly halfSize: number;
  readonly fillColor: string;
  readonly strokeColor: string;
  readonly lineWidth: number;
  readonly globalAlpha: number;
}

/** Style tokens accepted by drawTileBoundary. */
export interface BoundaryStyle {
  readonly strokeColor: string;
  readonly lineWidth: number;
  readonly lineDash: readonly number[];
  readonly fillColor: string;
}

// ---------------------------------------------------------------------------
// drawPoint
// ---------------------------------------------------------------------------

/**
 * Draw a Point geometry as a filled circle with an outline stroke.
 *
 * @param ctx    Canvas 2D rendering context.
 * @param point  Pre-transformed screen-space coordinates of the point.
 * @param style  Visual style tokens (radius, colours, alpha).
 */
export function drawPoint(
  ctx: CanvasRenderingContext2D,
  point: ScreenPoint,
  style: PointStyle,
): void {
  ctx.save();
  ctx.globalAlpha = style.globalAlpha;
  ctx.beginPath();
  ctx.arc(point.x, point.y, style.radius, 0, Math.PI * 2);
  ctx.fillStyle = style.fillColor;
  ctx.fill();
  ctx.strokeStyle = style.strokeColor;
  ctx.lineWidth = style.lineWidth;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// drawLineString
// ---------------------------------------------------------------------------

/**
 * Draw a LineString geometry as a stroked polyline.
 *
 * Does nothing if `points` is empty or has fewer than 2 vertices
 * (degenerate linestrings produce no visible output).
 *
 * @param ctx    Canvas 2D rendering context.
 * @param points Pre-transformed screen-space vertices.
 * @param style  Visual style tokens (stroke, width, caps, alpha).
 */
export function drawLineString(
  ctx: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  style: LineStyle,
): void {
  if (points.length < 2) return;

  const first = points[0];
  if (first === undefined) return;

  ctx.save();
  ctx.globalAlpha = style.globalAlpha;
  ctx.strokeStyle = style.strokeColor;
  ctx.lineWidth = style.lineWidth;
  ctx.lineCap = style.lineCap;
  ctx.lineJoin = style.lineJoin;

  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p === undefined) continue;
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// drawPolygon
// ---------------------------------------------------------------------------

/**
 * Draw a Polygon geometry as a multi-ring path.
 *
 * `rings[0]` is the exterior ring; `rings[1..n]` are interior rings (holes).
 * Interior rings are subtracted from the exterior using the `evenodd` fill
 * rule, which correctly handles arbitrary nesting depth.
 *
 * Each ring is closed automatically — callers do not need to repeat the first
 * vertex.
 *
 * Does nothing if `rings` is empty.
 *
 * @param ctx   Canvas 2D rendering context.
 * @param rings Pre-transformed screen-space rings. rings[0] = exterior.
 * @param style Visual style tokens (fill, stroke, alpha).
 */
export function drawPolygon(
  ctx: CanvasRenderingContext2D,
  rings: readonly (readonly ScreenPoint[])[],
  style: PolygonStyle,
): void {
  if (rings.length === 0) return;

  ctx.save();
  ctx.globalAlpha = style.globalAlpha;
  ctx.beginPath();

  for (const ring of rings) {
    if (ring.length === 0) continue;
    const first = ring[0];
    if (first === undefined) continue;
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < ring.length; i++) {
      const p = ring[i];
      if (p === undefined) continue;
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
  }

  // Fill with evenodd rule so interior rings become holes
  ctx.fillStyle = style.fillColor;
  ctx.globalAlpha = style.fillAlpha;
  ctx.fill('evenodd');

  // Stroke at full opacity relative to the parent globalAlpha
  ctx.globalAlpha = style.globalAlpha;
  ctx.strokeStyle = style.strokeColor;
  ctx.lineWidth = style.lineWidth;
  ctx.lineJoin = style.lineJoin;
  ctx.stroke();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// drawVertexMarkers
// ---------------------------------------------------------------------------

/**
 * Draw small square markers at each vertex in `points`.
 *
 * Used to display individual vertices during feature inspection. Squares are
 * axis-aligned and centred on each vertex.
 *
 * Does nothing if `points` is empty.
 *
 * @param ctx    Canvas 2D rendering context.
 * @param points Pre-transformed screen-space vertex positions.
 * @param style  Visual style tokens (size, colours, alpha).
 */
export function drawVertexMarkers(
  ctx: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  style: VertexStyle,
): void {
  if (points.length === 0) return;

  ctx.save();
  ctx.globalAlpha = style.globalAlpha;

  for (const p of points) {
    const x = p.x - style.halfSize;
    const y = p.y - style.halfSize;
    const size = style.halfSize * 2;

    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.fillStyle = style.fillColor;
    ctx.fill();
    ctx.strokeStyle = style.strokeColor;
    ctx.lineWidth = style.lineWidth;
    ctx.stroke();
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// drawTileBoundary
// ---------------------------------------------------------------------------

/**
 * Draw the tile extent boundary box and an optional clipping buffer zone box.
 *
 * The tile boundary is drawn from `origin` to `maxCorner` using the tile
 * boundary style. If both `bufferOrigin` and `bufferMaxCorner` are provided,
 * a second (typically dotted) box is drawn for the buffer zone using the
 * buffer style.
 *
 * @param ctx             Canvas 2D rendering context.
 * @param origin          Top-left corner of the tile extent in screen pixels.
 * @param maxCorner       Bottom-right corner of the tile extent in screen pixels.
 * @param bufferOrigin    Top-left corner of the buffer zone (optional).
 * @param bufferMaxCorner Bottom-right corner of the buffer zone (optional).
 * @param tileStyle       Style tokens for the tile extent box.
 * @param bufferStyle     Style tokens for the buffer zone box (optional).
 */
export function drawTileBoundary(
  ctx: CanvasRenderingContext2D,
  origin: ScreenPoint,
  maxCorner: ScreenPoint,
  bufferOrigin: ScreenPoint | null,
  bufferMaxCorner: ScreenPoint | null,
  tileStyle: BoundaryStyle,
  bufferStyle?: BoundaryStyle,
): void {
  // --- Draw tile extent box ---
  ctx.save();
  ctx.strokeStyle = tileStyle.strokeColor;
  ctx.lineWidth = tileStyle.lineWidth;
  ctx.setLineDash(tileStyle.lineDash.slice());

  ctx.beginPath();
  ctx.rect(
    origin.x,
    origin.y,
    maxCorner.x - origin.x,
    maxCorner.y - origin.y,
  );
  ctx.stroke();
  ctx.restore();

  // --- Draw buffer zone box (optional) ---
  if (
    bufferOrigin !== null &&
    bufferMaxCorner !== null &&
    bufferStyle !== undefined
  ) {
    ctx.save();
    ctx.strokeStyle = bufferStyle.strokeColor;
    ctx.lineWidth = bufferStyle.lineWidth;
    ctx.setLineDash(bufferStyle.lineDash.slice());

    ctx.beginPath();
    ctx.rect(
      bufferOrigin.x,
      bufferOrigin.y,
      bufferMaxCorner.x - bufferOrigin.x,
      bufferMaxCorner.y - bufferOrigin.y,
    );
    ctx.stroke();
    ctx.restore();
  }
}
