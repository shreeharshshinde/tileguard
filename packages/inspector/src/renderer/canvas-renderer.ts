/**
 * @tileguard/inspector — Canvas 2D Renderer
 *
 * Concrete implementation of the Renderer interface using the HTML5 Canvas
 * 2D API. Acts as the central **Dispatcher** — it orchestrates the full
 * rendering pipeline by:
 *   1. Clearing the canvas
 *   2. Drawing the tile extent + buffer boundary boxes
 *   3. Walking VectorTileArtifact geometry via walkArtifact (traversal)
 *   4. Dispatching each geometry part to the appropriate drawing helper
 *   5. Drawing overlay markers (single top pass)
 *
 * Responsibility boundaries (ADR-009)
 * ────────────────────────────────────
 * CanvasRenderer:
 *   - owns the rendering pipeline (order of passes)
 *   - owns tile-to-screen coordinate transformation (via Viewport)
 *   - owns geometry dispatch (type → drawing helper)
 *   - owns overlay rendering
 *
 * CanvasRenderer MUST NOT:
 *   - implement geometry traversal (delegated to walkArtifact)
 *   - perform drawing primitives directly (delegated to shapes.ts)
 *   - define OverlayDescriptor (owned by overlay/overlay-adapter.ts)
 *   - expose highlightFeature() — selection is managed via InspectorStore
 *
 * Geometry dispatch
 * ─────────────────
 * There is exactly ONE place in this file where geometry types are
 * interpreted: the visitor passed to walkArtifact inside _collectGeometry.
 * The visitor callbacks (onPolygon, onLineString, onPoint) are the sole
 * dispatcher. No other method switches on feature.type for rendering
 * geometry. The private helpers _firstVertex and _flattenVertices are
 * geometry *accessors* — they extract raw coordinates — but they do not
 * dispatch to drawing helpers.
 *
 * Accumulation rationale (z-order)
 * ─────────────────────────────────
 * AccumulatedGeometry is a TEMPORARY render buffer. It exists for one
 * purpose: enforcing a global z-order across all layers.
 *
 * Without accumulation, a naïve traversal would draw polygons, lines, and
 * points interleaved per layer:
 *   layer A: polygon → line → point
 *   layer B: polygon → line → point
 *
 * This causes roads from layer B to be buried under building polygons from
 * layer A when the layers share the same nominal z-index. The accumulated
 * approach enforces:
 *   All polygons (all layers) → All lines (all layers) → All points (all layers)
 *
 * The buffer is allocated at the start of render(), filled during the
 * traversal pass, drained during the draw passes, and then immediately
 * discarded (garbage collected). It is NEVER stored as instance state.
 *
 * This is intentionally analogous to MapLibre's bucket system, which groups
 * geometry by type before issuing draw calls, though MapLibre uses GPU
 * buffers rather than CPU-side arrays.
 *
 * Public API
 * ──────────
 *   Renderer             — minimal 4-method interface all renderers implement
 *   CanvasRenderer       — Canvas 2D concrete implementation
 *   CanvasRendererOptions
 */

import type {
  VectorTileArtifact,
  VectorTileFeature,
} from '@tileguard/tile-rules';
import type { ScreenPoint } from '../geometry/index.js';
import { walkArtifact } from '../geometry/traversal.js';
import type { OverlayDescriptor } from '../overlay/overlay-adapter.js';
import type { Viewport } from '../viewport/viewport.js';
import {
  BUFFER_BOUNDARY_STYLE,
  LAYER_COLORS,
  LINE_STYLE,
  OVERLAY_COLORS,
  OVERLAY_STYLE,
  POINT_STYLE,
  POLYGON_STYLE,
  TILE_BOUNDARY_STYLE,
  VERTEX_STYLE,
} from './palette.js';
import {
  drawLineString,
  drawPoint,
  drawPolygon,
  drawTileBoundary,
  drawVertexMarkers,
} from './shapes.js';

// ---------------------------------------------------------------------------
// Renderer interface (4-method minimal API)
// ---------------------------------------------------------------------------

/**
 * Renderer — minimal interface all rendering backends implement.
 *
 * `highlightFeature` is intentionally omitted. Selection and highlighting
 * are visual state managed via InspectorStore → Overlay Adapter → render().
 */
export interface Renderer {
  /**
   * Attach a canvas element and acquire its 2D context.
   * Must be called before resize() or render().
   */
  attachCanvas(canvas: HTMLCanvasElement): void;

  /**
   * Update the canvas dimensions.
   * Triggers a Viewport resize; does not trigger a re-render.
   *
   * @param width   New canvas width in CSS pixels.
   * @param height  New canvas height in CSS pixels.
   */
  resize(width: number, height: number): void;

  /**
   * Clear the entire canvas to transparent black.
   * Called automatically at the start of each render() pass.
   */
  clear(): void;

  /**
   * Execute the full rendering pipeline:
   *   boundary → polygons → lines → points → vertices → overlays
   *
   * @param artifact    The decoded VectorTileArtifact to render.
   * @param overlays    Overlay descriptors produced by the OverlayAdapter.
   * @param activeLayer Optional layer name to isolate visually. When set,
   *                    non-active layers render at reduced opacity (dim effect).
   */
  render(
    artifact: VectorTileArtifact,
    overlays: OverlayDescriptor[],
    activeLayer?: string | null,
  ): void;
}

// ---------------------------------------------------------------------------
// CanvasRenderer options
// ---------------------------------------------------------------------------

/** Options for CanvasRenderer construction. */
export interface CanvasRendererOptions {
  /**
   * Viewport to use for tile-to-screen coordinate transforms.
   * The viewport is mutable — callers may replace it via setViewport().
   */
  viewport: Viewport;
  /**
   * Whether to draw vertex markers over all geometry.
   * Defaults to false.
   */
  showVertices?: boolean;
  /** Whether to draw the tile extent rectangle. Defaults to true. */
  showTileBounds?: boolean;
  /** Whether to draw the buffer zone rectangle. Defaults to true. */
  showBufferBounds?: boolean;
  /** Global opacity for diagnostic overlay markers (0.0–1.0). Defaults to 0.9. */
  overlayOpacity?: number;
  /** Line width for selection outlines in screen pixels. Defaults to 2. */
  selectionThickness?: number;
  /** Line width for hover outlines in screen pixels. Defaults to 2. */
  hoverThickness?: number;
}

// ---------------------------------------------------------------------------
// Temporary render buffer
// ---------------------------------------------------------------------------

/**
 * AccumulatedGeometry — temporary render buffer for one render() call.
 *
 * Allocated at the start of render(), populated during _collectGeometry,
 * consumed during the draw passes, then immediately discarded. It is NEVER
 * stored as instance state on CanvasRenderer.
 *
 * Purpose: enforce a global z-order where all polygons are drawn before all
 * lines, and all lines before all points — regardless of the layer order in
 * the artifact. See "Accumulation rationale" in the module header.
 */
interface AccumulatedGeometry {
  /** Screen-space polygon rings collected from all layers, in traversal order. */
  polygons: Array<{
    rings: readonly (readonly ScreenPoint[])[];
    layerName: string;
  }>;
  /** Screen-space line vertices collected from all layers, in traversal order. */
  lines: Array<{ points: readonly ScreenPoint[]; layerName: string }>;
  /** Screen-space point positions collected from all layers, in traversal order. */
  points: Array<{ point: ScreenPoint; layerName: string }>;
  /** All vertices across all geometry types (used for optional vertex markers). */
  vertices: ScreenPoint[];
}

// ---------------------------------------------------------------------------
// CanvasRenderer implementation
// ---------------------------------------------------------------------------

/**
 * CanvasRenderer — Canvas 2D implementation of the Renderer interface.
 *
 * Rendering pipeline (in order):
 *   1. clear()
 *   2. drawBoundary()   — tile extent box + buffer zone box
 *   3. _collectGeometry() — single traversal pass → temporary buffer
 *   4. _drawPolygons()  — all polygon geometry (filled + stroked)
 *   5. _drawLines()     — all linestring geometry
 *   6. _drawPoints()    — all point geometry
 *   7. _drawVertices()  — vertex markers (when showVertices = true)
 *   8. _drawOverlays()  — diagnostic overlay markers (top pass)
 *   [buffer discarded]
 */
export class CanvasRenderer implements Renderer {
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _viewport: Viewport;
  private _showVertices: boolean;
  private _showTileBounds: boolean;
  private _showBufferBounds: boolean;
  private _overlayOpacity: number;
  private _selectionThickness: number;
  private _hoverThickness: number;

  constructor(options: CanvasRendererOptions) {
    this._viewport = options.viewport;
    this._showVertices = options.showVertices ?? false;
    this._showTileBounds = options.showTileBounds ?? true;
    this._showBufferBounds = options.showBufferBounds ?? true;
    this._overlayOpacity = options.overlayOpacity ?? OVERLAY_STYLE.globalAlpha;
    this._selectionThickness =
      options.selectionThickness ?? OVERLAY_STYLE.lineWidth;
    this._hoverThickness = options.hoverThickness ?? OVERLAY_STYLE.lineWidth;
  }

  // ---- Public accessors --------------------------------------------------

  /** Replace the active viewport (e.g. after pan/zoom in the UI). */
  setViewport(viewport: Viewport): void {
    this._viewport = viewport;
  }

  getViewport(): Viewport {
    return this._viewport;
  }

  /**
   * Update renderer options at runtime without reconstructing the renderer.
   * Only the supplied keys are changed; others remain at their current values.
   */
  setOptions(patch: Partial<CanvasRendererOptions>): void {
    if (patch.showVertices !== undefined) {
      this._showVertices = patch.showVertices;
    }
    if (patch.viewport !== undefined) {
      this._viewport = patch.viewport;
    }
    if (patch.showTileBounds !== undefined) {
      this._showTileBounds = patch.showTileBounds;
    }
    if (patch.showBufferBounds !== undefined) {
      this._showBufferBounds = patch.showBufferBounds;
    }
    if (patch.overlayOpacity !== undefined) {
      this._overlayOpacity = patch.overlayOpacity;
    }
    if (patch.selectionThickness !== undefined) {
      this._selectionThickness = patch.selectionThickness;
    }
    if (patch.hoverThickness !== undefined) {
      this._hoverThickness = patch.hoverThickness;
    }
  }

  // ---- Renderer interface ------------------------------------------------

  attachCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      throw new Error(
        'CanvasRenderer.attachCanvas: failed to acquire a 2D context.',
      );
    }
    this._canvas = canvas;
    this._ctx = ctx;
  }

  resize(width: number, height: number): void {
    if (this._canvas !== null) {
      this._canvas.width = width;
      this._canvas.height = height;
    }
    this._viewport = this._viewport.resize(width, height);
  }

  clear(): void {
    const ctx = this._requireCtx();
    const canvas = this._requireCanvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  render(artifact: VectorTileArtifact, overlays: OverlayDescriptor[], activeLayer?: string | null): void {
    const ctx = this._requireCtx();
    const vp = this._viewport;

    // 1. Clear
    this.clear();

    // 2. Draw tile boundary + buffer zone (conditional on settings)
    if (this._showTileBounds || this._showBufferBounds) {
      this._drawBoundary(ctx, artifact, vp);
    }

    // 3. Collect all geometry into a temporary buffer in a single traversal pass.
    //    This buffer is local to this call — it is discarded when render() returns.
    const accumulated = this._collectGeometry(artifact, vp);

    // Resolve active layer: null/undefined means "no isolation" (all layers full opacity)
    const isolatedLayer = activeLayer ?? null;

    // 4–6. Draw passes (enforces global z-order: polygons → lines → points)
    this._drawPolygons(ctx, accumulated, isolatedLayer);
    this._drawLines(ctx, accumulated, isolatedLayer);
    this._drawPoints(ctx, accumulated, isolatedLayer);

    // 7. Optional vertex markers
    if (this._showVertices) {
      this._drawVertices(ctx, accumulated);
    }

    // 8. Diagnostic overlays (top pass — always above geometry, always full opacity)
    this._drawOverlays(ctx, overlays, artifact, vp);

    // accumulated is now eligible for GC — no reference is kept
  }

  // ---- Private pipeline steps --------------------------------------------

  private _drawBoundary(
    ctx: CanvasRenderingContext2D,
    artifact: VectorTileArtifact,
    vp: Viewport,
  ): void {
    const layers = Object.values(artifact.content.layers);
    const extent = layers[0]?.extent ?? 4096;

    const origin = vp.tileToScreen({ x: 0, y: 0 });
    const maxCorner = vp.tileToScreen({ x: extent, y: extent });

    const buffer = Math.round(extent / 16);
    const bufferOrigin = vp.tileToScreen({ x: -buffer, y: -buffer });
    const bufferMax = vp.tileToScreen({
      x: extent + buffer,
      y: extent + buffer,
    });

    drawTileBoundary(
      ctx,
      origin,
      maxCorner,
      bufferOrigin,
      bufferMax,
      this._showTileBounds ? TILE_BOUNDARY_STYLE : null,
      this._showBufferBounds ? BUFFER_BOUNDARY_STYLE : null,
    );
  }

  /**
   * Walk the artifact once and accumulate screen-space geometry into a
   * temporary buffer. This is the ONLY place where geometry types are
   * dispatched to typed buckets (onPolygon / onLineString / onPoint).
   */
  private _collectGeometry(
    artifact: VectorTileArtifact,
    vp: Viewport,
  ): AccumulatedGeometry {
    const accumulated: AccumulatedGeometry = {
      polygons: [],
      lines: [],
      points: [],
      vertices: [],
    };

    walkArtifact(artifact, {
      onPolygon: (rings, ctx) => {
        const screenRings = rings.map((ring) =>
          ring.map((p): ScreenPoint => vp.tileToScreen(p)),
        );
        accumulated.polygons.push({
          rings: screenRings,
          layerName: ctx.layerName,
        });
        if (screenRings[0] !== undefined) {
          for (const v of screenRings[0]) accumulated.vertices.push(v);
        }
      },

      onLineString: (points, ctx) => {
        const screenPoints = points.map((p): ScreenPoint => vp.tileToScreen(p));
        accumulated.lines.push({
          points: screenPoints,
          layerName: ctx.layerName,
        });
        for (const v of screenPoints) accumulated.vertices.push(v);
      },

      onPoint: (points, ctx) => {
        for (const p of points) {
          const sp = vp.tileToScreen(p);
          accumulated.points.push({ point: sp, layerName: ctx.layerName });
          accumulated.vertices.push(sp);
        }
      },
    });

    return accumulated;
  }

  private _drawPolygons(
    ctx: CanvasRenderingContext2D,
    accumulated: AccumulatedGeometry,
    activeLayer: string | null,
  ): void {
    for (const { rings, layerName } of accumulated.polygons) {
      const color = resolveLayerColor(layerName);
      const dimmed = activeLayer !== null && layerName !== activeLayer;
      const alpha = dimmed ? 0.08 : POLYGON_STYLE.globalAlpha;
      drawPolygon(ctx, rings, {
        ...POLYGON_STYLE,
        fillColor: color,
        strokeColor: color,
        globalAlpha: alpha,
      });
    }
  }

  private _drawLines(
    ctx: CanvasRenderingContext2D,
    accumulated: AccumulatedGeometry,
    activeLayer: string | null,
  ): void {
    for (const { points, layerName } of accumulated.lines) {
      const color = resolveLayerColor(layerName);
      const dimmed = activeLayer !== null && layerName !== activeLayer;
      const alpha = dimmed ? 0.1 : LINE_STYLE.globalAlpha;
      drawLineString(ctx, points, {
        ...LINE_STYLE,
        strokeColor: color,
        globalAlpha: alpha,
      });
    }
  }

  private _drawPoints(
    ctx: CanvasRenderingContext2D,
    accumulated: AccumulatedGeometry,
    activeLayer: string | null,
  ): void {
    for (const { point, layerName } of accumulated.points) {
      const color = resolveLayerColor(layerName);
      const dimmed = activeLayer !== null && layerName !== activeLayer;
      const alpha = dimmed ? 0.1 : POINT_STYLE.globalAlpha;
      drawPoint(ctx, point, {
        ...POINT_STYLE,
        fillColor: color,
        globalAlpha: alpha,
      });
    }
  }

  private _drawVertices(
    ctx: CanvasRenderingContext2D,
    accumulated: AccumulatedGeometry,
  ): void {
    drawVertexMarkers(ctx, accumulated.vertices, VERTEX_STYLE);
  }

  private _drawOverlays(
    ctx: CanvasRenderingContext2D,
    overlays: OverlayDescriptor[],
    artifact: VectorTileArtifact,
    vp: Viewport,
  ): void {
    for (const overlay of overlays) {
      const color = OVERLAY_COLORS[overlay.severity];
      const layer = artifact.content.layers[overlay.layerName];
      if (layer === undefined) continue;
      const feature = layer.features[overlay.featureIndex];
      if (feature === undefined) continue;

      if (overlay.type === 'point-marker') {
        const first = firstVertex(feature);
        if (first !== undefined) {
          drawPoint(ctx, vp.tileToScreen(first), {
            radius: OVERLAY_STYLE.pointRadius,
            fillColor: color,
            strokeColor: '#ffffff',
            lineWidth: OVERLAY_STYLE.lineWidth,
            globalAlpha: this._overlayOpacity,
          });
        }
      } else if (overlay.type === 'segment-highlight') {
        const target = overlay.target as [number, number];
        const ring = firstRing(feature);
        const a = ring[target[0]];
        const b = ring[target[1]];
        if (a !== undefined && b !== undefined) {
          drawLineString(ctx, [vp.tileToScreen(a), vp.tileToScreen(b)], {
            strokeColor: color,
            lineWidth: OVERLAY_STYLE.lineWidth * 2,
            lineCap: OVERLAY_STYLE.lineCap,
            lineJoin: OVERLAY_STYLE.lineJoin,
            globalAlpha: this._overlayOpacity,
          });
        }
      } else if (overlay.type === 'ring-highlight') {
        const ringIndex =
          typeof overlay.target === 'number' ? overlay.target : 0;
        const rings = feature.geometry as readonly (readonly {
          x: number;
          y: number;
        }[])[];
        const ring = rings[ringIndex] ?? [];
        const pts = ring.map((p) => vp.tileToScreen(p));
        if (pts.length >= 2) {
          drawLineString(ctx, pts, {
            strokeColor: color,
            lineWidth: OVERLAY_STYLE.lineWidth * 2,
            lineCap: OVERLAY_STYLE.lineCap,
            lineJoin: OVERLAY_STYLE.lineJoin,
            globalAlpha: this._overlayOpacity,
          });
        }
      } else if (overlay.type === 'bbox-fill') {
        const allPts = flattenVertices(feature);
        if (allPts.length > 0) {
          const xs = allPts.map((p) => p.x);
          const ys = allPts.map((p) => p.y);
          const tl = vp.tileToScreen({
            x: Math.min(...xs),
            y: Math.min(...ys),
          });
          const br = vp.tileToScreen({
            x: Math.max(...xs),
            y: Math.max(...ys),
          });
          drawPolygon(
            ctx,
            [[tl, { x: br.x, y: tl.y }, br, { x: tl.x, y: br.y }]],
            {
              fillColor: color,
              fillAlpha: OVERLAY_STYLE.fillAlpha,
              strokeColor: color,
              lineWidth: OVERLAY_STYLE.lineWidth,
              lineJoin: OVERLAY_STYLE.lineJoin,
              globalAlpha: this._overlayOpacity,
            },
          );
        }
      } else if (overlay.type === 'cross-marker') {
        // Cross-marker: compute exact intersection point of two segments
        // target = [segA, segB] — segment indices on the first ring
        const target = overlay.target as [number, number];
        const ring = firstRing(feature);
        const a1 = ring[target[0]];
        const a2 = ring[target[0] + 1];
        const b1 = ring[target[1]];
        const b2 = ring[target[1] + 1];

        if (
          a1 !== undefined &&
          a2 !== undefined &&
          b1 !== undefined &&
          b2 !== undefined
        ) {
          const ix = lineLineIntersection(a1, a2, b1, b2);
          if (ix !== null) {
            const pt = vp.tileToScreen(ix);
            drawCrossMarker(ctx, pt, {
              size: OVERLAY_STYLE.pointRadius * 2,
              strokeColor: color,
              lineWidth: OVERLAY_STYLE.lineWidth * 1.5,
              globalAlpha: this._overlayOpacity,
            });
          }
        }
      }
    }
  }

  // ---- Private utilities -------------------------------------------------

  private _requireCtx(): CanvasRenderingContext2D {
    if (this._ctx === null) {
      throw new Error(
        'CanvasRenderer: no canvas attached. Call attachCanvas() before render().',
      );
    }
    return this._ctx;
  }

  private _requireCanvas(): HTMLCanvasElement {
    if (this._canvas === null) {
      throw new Error(
        'CanvasRenderer: no canvas attached. Call attachCanvas() before resize().',
      );
    }
    return this._canvas;
  }
}

// ---------------------------------------------------------------------------
// Module-level geometry accessors (not dispatchers — no drawing side effects)
// ---------------------------------------------------------------------------

/**
 * Return the first vertex of a feature's geometry, regardless of type.
 *
 * Used by the overlay pass to position point-marker overlays without
 * re-entering the traversal system. This is a coordinate accessor, not a
 * geometry dispatcher — it does not route to drawing helpers.
 */
function firstVertex(
  feature: VectorTileFeature,
): { x: number; y: number } | undefined {
  if (feature.type === 1) {
    const flat = feature.geometry as readonly { x: number; y: number }[];
    return flat[0];
  }
  const rings = feature.geometry as readonly (readonly {
    x: number;
    y: number;
  }[])[];
  return rings[0]?.[0];
}

/**
 * Return the first ring of a feature as a flat vertex array.
 *
 * For Point features (type=1) the geometry IS the flat vertex array.
 * For LineString/Polygon (type=2/3) the first ring is rings[0].
 *
 * Used by the overlay pass for segment-highlight positioning.
 */
function firstRing(
  feature: VectorTileFeature,
): readonly { x: number; y: number }[] {
  if (feature.type === 1) {
    return feature.geometry as readonly { x: number; y: number }[];
  }
  const rings = feature.geometry as readonly (readonly {
    x: number;
    y: number;
  }[])[];
  return rings[0] ?? [];
}

/**
 * Flatten all vertices of a feature into a single array.
 *
 * Used by the overlay pass to compute a feature's bounding box for
 * bbox-fill overlays.
 */
function flattenVertices(
  feature: VectorTileFeature,
): Array<{ x: number; y: number }> {
  if (feature.type === 1) {
    return [...(feature.geometry as readonly { x: number; y: number }[])];
  }
  const result: Array<{ x: number; y: number }> = [];
  const rings = feature.geometry as readonly (readonly {
    x: number;
    y: number;
  }[])[];
  for (const ring of rings) result.push(...ring);
  return result;
}

// ---------------------------------------------------------------------------
// Palette helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a layer name to its display colour token.
 * Falls back to LAYER_COLORS.default for unrecognised layer names.
 */
function resolveLayerColor(layerName: string): string {
  const key = layerName as keyof typeof LAYER_COLORS;
  return key in LAYER_COLORS ? LAYER_COLORS[key] : LAYER_COLORS.default;
}

// ---------------------------------------------------------------------------
// Geometry math helpers (overlay-only)
// ---------------------------------------------------------------------------

/**
 * Compute the intersection point of two line segments using parametric form.
 *
 * Returns the intersection point if the segments actually cross (0 ≤ t,u ≤ 1),
 * or null if they are parallel or do not cross within their extents.
 *
 * Uses the standard 2D line-line intersection formula:
 *   t = ((x3-x1)(y3-y4) - (y3-y1)(x3-x4)) / ((x1-x2)(y3-y4) - (y1-y2)(x3-x4))
 *   u = ((x1-x2)(y3-y1) - (y1-y2)(x3-x1)) / ((x1-x2)(y3-y4) - (y1-y2)(x3-x4))
 */
function lineLineIntersection(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number },
): { x: number; y: number } | null {
  const dx1 = a1.x - a2.x;
  const dy1 = a1.y - a2.y;
  const dx2 = b1.x - b2.x;
  const dy2 = b1.y - b2.y;

  const denom = dx1 * dy2 - dy1 * dx2;

  // Parallel or coincident — no single intersection point
  if (Math.abs(denom) < 1e-10) return null;

  const dx3 = b1.x - a1.x;
  const dy3 = b1.y - a1.y;

  const t = (dx3 * dy2 - dy3 * dx2) / denom;
  const u = (dx3 * dy1 - dy3 * dx1) / denom;

  // Check that intersection lies within both segment extents
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;

  return {
    x: a1.x + t * (a2.x - a1.x),
    y: a1.y + t * (a2.y - a1.y),
  };
}

// ---------------------------------------------------------------------------
// Cross-marker drawing helper (overlay-only)
// ---------------------------------------------------------------------------

interface CrossMarkerStyle {
  size: number;
  strokeColor: string;
  lineWidth: number;
  globalAlpha: number;
}

/**
 * Draw an ✕ (cross) marker at a screen position.
 *
 * The cross is drawn as two diagonal lines centred on the given point,
 * with a half-arm length of `size / 2`.
 */
function drawCrossMarker(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  style: CrossMarkerStyle,
): void {
  const half = style.size / 2;

  ctx.save();
  ctx.globalAlpha = style.globalAlpha;
  ctx.strokeStyle = style.strokeColor;
  ctx.lineWidth = style.lineWidth;
  ctx.lineCap = 'round';

  ctx.beginPath();
  // Top-left to bottom-right
  ctx.moveTo(center.x - half, center.y - half);
  ctx.lineTo(center.x + half, center.y + half);
  // Top-right to bottom-left
  ctx.moveTo(center.x + half, center.y - half);
  ctx.lineTo(center.x - half, center.y + half);
  ctx.stroke();

  ctx.restore();
}
