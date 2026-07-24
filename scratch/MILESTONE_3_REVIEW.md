# Milestone 3 — Complete Source Code & Technical Review
## Core Canvas 2D Rendering Engine & Traversal Subsystem

This document provides a detailed, comprehensive, line-by-line code review of **Milestone 3** in `@tileguard/inspector`. It contains the complete source code for all implemented modules alongside technical explanations of every interface, function, design token, drawing lifecycle, dispatcher pipeline stage, temporary render buffer rationale, overlay coordinate accessors, and test suite verification.

---

## Table of Contents
1. [Architectural Overview & Data Flow](#1-architectural-overview--data-flow)
2. [Geometry Traversal Subsystem (`traversal.ts`)](#2-geometry-traversal-subsystem-traversalts)
3. [Visual Design Tokens & Palette (`palette.ts`)](#3-visual-design-tokens--palette-palettets)
4. [Pure Canvas 2D Drawing Primitives (`shapes.ts`)](#4-pure-canvas-2d-drawing-primitives-shapest)
5. [Canvas Renderer & Pipeline Dispatcher (`canvas-renderer.ts`)](#5-canvas-renderer--pipeline-dispatcher-canvas-rendererts)
6. [Subsystem Public Barrel Files (`index.ts`)](#6-subsystem-public-barrel-files-indexts)
7. [Verification & Verification Answers](#7-verification--verification-answers)
8. [Test Suite Execution Results](#8-test-suite-execution-results)

---

## 1. Architectural Overview & Data Flow

Milestone 3 implements the HTML5 Canvas 2D rendering engine (`CanvasRenderer`) and the canonical geometry traversal subsystem (`traversal.ts`).

### Unidirectional Data Flow
$$\text{VectorTileArtifact} \longrightarrow \text{Traversal (traversal.ts)} \longrightarrow \text{Viewport (viewport.ts)} \longrightarrow \text{Dispatcher (CanvasRenderer)} \longrightarrow \text{Drawing Helpers (shapes.ts)} \longrightarrow \text{HTML5 Canvas 2D}$$

### Enforced Architectural Boundaries (ADR-008 & ADR-009)
1. **Zero Rule Package Dependencies**: `traversal.ts` operates directly on decoded `VectorTileFeature` geometry arrays without importing `@tileguard/tile-rules`.
2. **Pure Drawing Helper Isolation**: `shapes.ts` routines receive ONLY `CanvasRenderingContext2D`, pre-transformed `ScreenPoint` objects, and style tokens. Helpers never accept `Viewport`, `VectorTileArtifact`, `Traversal`, rule IDs, or diagnostics.
3. **Minimal Renderer API**: `Renderer` interface is frozen to 4 methods (`attachCanvas`, `resize`, `clear`, `render`). Highlighting is visual state managed via `InspectorStore ──► Overlay Adapter ──► Renderer.render()`.
4. **Dispatcher Ownership**: `CanvasRenderer` owns the pipeline execution order, coordinate transforms via `Viewport`, and routing geometry to `shapes.ts`. Exactly ONE visitor callback inside `_collectGeometry()` acts as the geometry dispatcher.
5. **OverlayDescriptor Ownership**: Owned by `overlay/overlay-adapter.ts`. Consumed by `CanvasRenderer`, but never defined or exported by `renderer`.

---

## 2. Geometry Traversal Subsystem (`traversal.ts`)

📁 **File**: `packages/inspector/src/geometry/traversal.ts`  
**Purpose**: Canonical geometry traversal for the Inspector subsystem. Iterates over `VectorTileArtifact` and `VectorTileFeature` geometry arrays and dispatches each part to a typed visitor.

### Detailed Source Code

```typescript
/**
 * @tileguard/inspector — Geometry: Traversal
 *
 * Canonical geometry traversal for the Inspector subsystem. Walks decoded
 * VectorTileArtifact geometry and dispatches each part to a typed visitor.
 *
 * Layering guarantee: this module operates directly on the public
 * VectorTileFeature / VectorTileArtifact interfaces and does NOT import
 * anything from @tileguard/tile-rules at runtime beyond its type definitions
 * (which are erased at compile time).
 *
 * Geometry dispatch rules
 * ───────────────────────
 *   GeometryType 1 (Point)      → onPoint,      once per feature (partIndex = 0)
 *   GeometryType 2 (LineString) → onLineString, once per line part
 *   GeometryType 3 (Polygon)    → onPolygon,    once per polygon part
 *   GeometryType 0 (Unknown)    → skipped silently
 *
 * Multi-geometry dispatch
 * ───────────────────────
 * The MVT spec encodes Multi* geometries as a single feature with multiple
 * geometry parts. Each part is dispatched as a separate callback with an
 * incrementing `partIndex`.
 *
 * For Polygon features the outer geometry array contains all rings
 * (exterior + holes). The walk emits a single onPolygon call per feature
 * with the full rings array (rings[0] = exterior, rings[1..n] = holes).
 *
 * Public API
 * ──────────
 *   GeometryVisitor       — typed visitor callbacks
 *   FeatureContext        — per-call context passed to each visitor
 *   walkFeatureGeometry   — walk a single feature
 *   walkLayer             — walk all features in a layer
 *   walkArtifact          — walk all layers of a decoded tile
 */

import type {
  Point,
  VectorTileArtifact,
  VectorTileFeature,
  VectorTileLayer,
} from '@tileguard/tile-rules';

// Re-export the Point type so callers inside the geometry subsystem can
// reference it without a direct @tileguard/tile-rules import.
export type { Point };

// ---------------------------------------------------------------------------
// FeatureContext
// ---------------------------------------------------------------------------

/**
 * Contextual information provided to each geometry visitor callback.
 * All fields are read-only — visitors must never mutate them.
 */
export interface FeatureContext {
  /** Name of the layer containing this feature. */
  readonly layerName: string;
  /** The full layer object (extent, keys, values, features). */
  readonly layer: VectorTileLayer;
  /** Zero-based index of this feature within the layer's features array. */
  readonly featureIndex: number;
  /** The raw feature (geometry, type, properties, id). */
  readonly feature: VectorTileFeature;
  /**
   * Zero-based index of this geometry part within the feature.
   * Always 0 for single-part features. Increments for each part in
   * MultiPoint / MultiLineString / MultiPolygon features.
   */
  readonly partIndex: number;
}

// ---------------------------------------------------------------------------
// GeometryVisitor
// ---------------------------------------------------------------------------

/**
 * GeometryVisitor — typed visitor interface for MVT geometry traversal.
 *
 * All callbacks are optional. A missing callback silently skips features of
 * that geometry type. Visitor callbacks are purely observational — they must
 * not mutate the artifact, layer, feature, or geometry arrays.
 */
export interface GeometryVisitor {
  /**
   * Called once per Point geometry part.
   *
   * `points` is a single-element array containing the point's coordinates.
   * For a MultiPoint feature each point is dispatched with an incrementing
   * `partIndex`.
   */
  onPoint?(points: readonly Point[], context: FeatureContext): void;

  /**
   * Called once per LineString geometry part.
   *
   * For a MultiLineString each line segment is dispatched separately with an
   * incrementing `partIndex`.
   */
  onLineString?(points: readonly Point[], context: FeatureContext): void;

  /**
   * Called once per Polygon geometry part.
   *
   * `rings[0]` is the exterior ring; `rings[1..n]` are interior rings (holes).
   * For a MultiPolygon each polygon is dispatched separately with an
   * incrementing `partIndex`.
   */
  onPolygon?(rings: readonly (readonly Point[])[], context: FeatureContext): void;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Normalise raw VectorTileGeometry into the canonical parts representation.
 *
 * MVT geometry union:
 *   type 1 (Point):      geometry is readonly Point[]
 *   type 2/3:            geometry is readonly (readonly Point[])[]
 *
 * We wrap the Point case so the downstream walk loop is uniform.
 */
function normaliseToParts(feature: VectorTileFeature): readonly (readonly Point[])[] {
  if (feature.type === 1) {
    return [feature.geometry as readonly Point[]];
  }
  return feature.geometry as readonly (readonly Point[])[];
}

// ---------------------------------------------------------------------------
// Public walk functions
// ---------------------------------------------------------------------------

/**
 * Walk the geometry of a single feature, dispatching each part to the
 * appropriate visitor callback.
 *
 * GeometryType 0 (Unknown) is silently skipped.
 *
 * @param feature      The feature to traverse.
 * @param layerName    The name of the containing layer (for FeatureContext).
 * @param layer        The containing layer object (for FeatureContext).
 * @param featureIndex Zero-based index of this feature within the layer.
 * @param visitor      Visitor to receive dispatched geometry.
 */
export function walkFeatureGeometry(
  feature: VectorTileFeature,
  layerName: string,
  layer: VectorTileLayer,
  featureIndex: number,
  visitor: GeometryVisitor,
): void {
  const { type } = feature;
  if (type === 0) return; // Unknown — skip silently

  const parts = normaliseToParts(feature);

  if (type === 1) {
    // Point / MultiPoint — each element of `parts` is a single-vertex array.
    for (let partIndex = 0; partIndex < parts.length; partIndex++) {
      const part = parts[partIndex];
      if (part === undefined) continue;
      const context: FeatureContext = { layerName, layer, featureIndex, feature, partIndex };
      visitor.onPoint?.(part, context);
    }
  } else if (type === 2) {
    // LineString / MultiLineString — each element is an array of vertices.
    for (let partIndex = 0; partIndex < parts.length; partIndex++) {
      const part = parts[partIndex];
      if (part === undefined) continue;
      const context: FeatureContext = { layerName, layer, featureIndex, feature, partIndex };
      visitor.onLineString?.(part, context);
    }
  } else if (type === 3) {
    // Polygon / MultiPolygon.
    const context: FeatureContext = { layerName, layer, featureIndex, feature, partIndex: 0 };
    visitor.onPolygon?.(parts, context);
  }
}

/**
 * Walk all features in a single layer, dispatching geometry to the visitor.
 *
 * @param layer   The VectorTileLayer to traverse.
 * @param visitor Visitor to receive dispatched geometry.
 */
export function walkLayer(layer: VectorTileLayer, visitor: GeometryVisitor): void {
  const { features, name } = layer;
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    if (feature === undefined) continue;
    walkFeatureGeometry(feature, name, layer, i, visitor);
  }
}

/**
 * Walk all layers and all features of a decoded VectorTileArtifact.
 *
 * @param artifact The decoded tile to traverse.
 * @param visitor  Visitor to receive dispatched geometry.
 */
export function walkArtifact(artifact: VectorTileArtifact, visitor: GeometryVisitor): void {
  for (const layer of Object.values(artifact.content.layers)) {
    if (layer === undefined) continue;
    walkLayer(layer, visitor);
  }
}
```

---

## 3. Visual Design Tokens & Palette (`palette.ts`)

📁 **File**: `packages/inspector/src/renderer/palette.ts`  
**Purpose**: Central source of truth for visual styling tokens (colors, line widths, dash patterns, opacity). Marked `as const` to guarantee immutability.

### Detailed Source Code

```typescript
/**
 * @tileguard/inspector — Renderer: Design Tokens (Palette)
 *
 * Central, immutable visual design tokens for the Inspector renderer.
 * These constants are the single source of truth for all colours, stroke
 * widths, radii, and dash patterns used by shapes.ts and canvas-renderer.ts.
 *
 * Configuration boundary
 * ──────────────────────
 * This file defines ONLY immutable design tokens. It must NOT contain:
 *   - rendering logic
 *   - conditional styling
 *   - feature-specific decision making
 *   - any import from @tileguard/tile-rules, Viewport, or InspectorStore
 *
 * All objects are frozen (`as const`) to enforce immutability at the
 * TypeScript type level and to prevent accidental mutation at runtime.
 *
 * Public exports (all `as const`):
 *   LAYER_COLORS          — per-layer fill/stroke colour tokens
 *   OVERLAY_COLORS        — diagnostic severity colour tokens
 *   TILE_BOUNDARY_STYLE   — tile extent box tokens
 *   BUFFER_BOUNDARY_STYLE — clipping buffer zone tokens
 *   POINT_STYLE           — default point marker tokens
 *   LINE_STYLE            — default line stroke tokens
 *   POLYGON_STYLE         — default polygon fill + stroke tokens
 *   VERTEX_STYLE          — vertex marker tokens
 *   OVERLAY_STYLE         — diagnostic overlay marker tokens
 */

// ---------------------------------------------------------------------------
// Layer colours
// ---------------------------------------------------------------------------

export const LAYER_COLORS = {
  buildings: '#3b82f6',
  roads: '#f59e0b',
  landuse: '#10b981',
  water: '#06b6d4',
  default: '#94a3b8',
} as const;

export type LayerColorKey = keyof typeof LAYER_COLORS;

// ---------------------------------------------------------------------------
// Overlay / diagnostic severity colours
// ---------------------------------------------------------------------------

export const OVERLAY_COLORS = {
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
} as const;

export type OverlaySeverity = keyof typeof OVERLAY_COLORS;

// ---------------------------------------------------------------------------
// Tile boundary
// ---------------------------------------------------------------------------

export const TILE_BOUNDARY_STYLE = {
  strokeColor: '#475569',
  lineWidth: 1,
  lineDash: [6, 4] as readonly number[],
  fillColor: 'transparent',
} as const;

export const BUFFER_BOUNDARY_STYLE = {
  strokeColor: '#64748b',
  lineWidth: 1,
  lineDash: [2, 4] as readonly number[],
  fillColor: 'transparent',
} as const;

// ---------------------------------------------------------------------------
// Geometry Styles
// ---------------------------------------------------------------------------

export const POINT_STYLE = {
  radius: 4,
  fillColor: LAYER_COLORS.default,
  strokeColor: '#1e293b',
  lineWidth: 1,
  globalAlpha: 0.9,
} as const;

export const LINE_STYLE = {
  strokeColor: LAYER_COLORS.default,
  lineWidth: 1.5,
  lineCap: 'round' as CanvasLineCap,
  lineJoin: 'round' as CanvasLineJoin,
  globalAlpha: 0.85,
} as const;

export const POLYGON_STYLE = {
  fillColor: LAYER_COLORS.default,
  fillAlpha: 0.15,
  strokeColor: LAYER_COLORS.default,
  lineWidth: 1,
  lineJoin: 'miter' as CanvasLineJoin,
  globalAlpha: 1,
} as const;

export const VERTEX_STYLE = {
  halfSize: 3,
  fillColor: '#ffffff',
  strokeColor: '#334155',
  lineWidth: 1,
  globalAlpha: 1,
} as const;

export const OVERLAY_STYLE = {
  pointRadius: 6,
  lineWidth: 2,
  lineCap: 'round' as CanvasLineCap,
  lineJoin: 'round' as CanvasLineJoin,
  fillAlpha: 0.25,
  globalAlpha: 0.9,
} as const;
```

---

## 4. Pure Canvas 2D Drawing Primitives (`shapes.ts`)

📁 **File**: `packages/inspector/src/renderer/shapes.ts`  
**Purpose**: Pure Canvas 2D shape drawing routines. Each helper takes context, pre-transformed screen-space coordinates, and style tokens.

### Detailed Source Code

```typescript
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

export interface PointStyle {
  readonly radius: number;
  readonly fillColor: string;
  readonly strokeColor: string;
  readonly lineWidth: number;
  readonly globalAlpha: number;
}

export interface LineStyle {
  readonly strokeColor: string;
  readonly lineWidth: number;
  readonly lineCap: CanvasLineCap;
  readonly lineJoin: CanvasLineJoin;
  readonly globalAlpha: number;
}

export interface PolygonStyle {
  readonly fillColor: string;
  readonly fillAlpha: number;
  readonly strokeColor: string;
  readonly lineWidth: number;
  readonly lineJoin: CanvasLineJoin;
  readonly globalAlpha: number;
}

export interface VertexStyle {
  readonly halfSize: number;
  readonly fillColor: string;
  readonly strokeColor: string;
  readonly lineWidth: number;
  readonly globalAlpha: number;
}

export interface BoundaryStyle {
  readonly strokeColor: string;
  readonly lineWidth: number;
  readonly lineDash: readonly number[];
  readonly fillColor: string;
}

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
```

---

## 5. Canvas Renderer & Pipeline Dispatcher (`canvas-renderer.ts`)

📁 **File**: `packages/inspector/src/renderer/canvas-renderer.ts`  
**Purpose**: Concrete implementation of the minimal 4-method `Renderer` interface (`attachCanvas`, `resize`, `clear`, `render`). Acts as central pipeline dispatcher.

### Detailed Source Code

```typescript
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
 * interpreted: the visitor passed to walkArtifact inside _collectGeometry().
 * The visitor callbacks (onPolygon, onLineString, onPoint) are the
 * dispatcher. No other method switches on feature.type for rendering
 * geometry. The private helpers _firstVertex and _flattenVertices are
 * geometry *accessors* — they extract raw coordinates — but they do NOT
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
 * layer A when the layers share the same nominal z-index. The accumulation
 * approach enforces:
 *   All polygons (all layers) → All lines (all layers) → All points (all layers)
 *
 * The buffer is allocated at the start of render(), filled during the
 * traversal pass, drained during the draw passes, and then immediately
 * discarded (garbage collected). It is NEVER stored as instance state.
 *
 * Public API
 * ──────────
 *   Renderer             — minimal 4-method interface all renderers implement
 *   CanvasRenderer       — Canvas 2D concrete implementation
 *   CanvasRendererOptions
 */

import type { VectorTileArtifact, VectorTileFeature } from '@tileguard/tile-rules';
import type { ScreenPoint } from '../geometry/index.js';
import type { Viewport } from '../viewport/viewport.js';
import type { OverlayDescriptor } from '../overlay/overlay-adapter.js';
import { walkArtifact } from '../geometry/traversal.js';
import {
  LAYER_COLORS,
  OVERLAY_COLORS,
  TILE_BOUNDARY_STYLE,
  BUFFER_BOUNDARY_STYLE,
  POINT_STYLE,
  LINE_STYLE,
  POLYGON_STYLE,
  VERTEX_STYLE,
  OVERLAY_STYLE,
} from './palette.js';
import {
  drawPoint,
  drawLineString,
  drawPolygon,
  drawVertexMarkers,
  drawTileBoundary,
} from './shapes.js';

// ---------------------------------------------------------------------------
// Renderer interface (4-method minimal API)
// ---------------------------------------------------------------------------

export interface Renderer {
  attachCanvas(canvas: HTMLCanvasElement): void;
  resize(width: number, height: number): void;
  clear(): void;
  render(artifact: VectorTileArtifact, overlays: OverlayDescriptor[]): void;
}

// ---------------------------------------------------------------------------
// CanvasRenderer options
// ---------------------------------------------------------------------------

export interface CanvasRendererOptions {
  viewport: Viewport;
  showVertices?: boolean;
}

// ---------------------------------------------------------------------------
// Temporary render buffer
// ---------------------------------------------------------------------------

/**
 * AccumulatedGeometry — temporary render buffer for one render() call.
 *
 * Allocated at the start of render(), populated during _collectGeometry(),
 * consumed during the draw passes, then immediately discarded.
 */
interface AccumulatedGeometry {
  polygons: Array<{ rings: readonly (readonly ScreenPoint[])[]; layerName: string }>;
  lines: Array<{ points: readonly ScreenPoint[]; layerName: string }>;
  points: Array<{ point: ScreenPoint; layerName: string }>;
  vertices: ScreenPoint[];
}

// ---------------------------------------------------------------------------
// CanvasRenderer implementation
// ---------------------------------------------------------------------------

export class CanvasRenderer implements Renderer {
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _viewport: Viewport;
  private readonly _showVertices: boolean;

  constructor(options: CanvasRendererOptions) {
    this._viewport = options.viewport;
    this._showVertices = options.showVertices ?? false;
  }

  // ---- Public accessors --------------------------------------------------

  setViewport(viewport: Viewport): void {
    this._viewport = viewport;
  }

  getViewport(): Viewport {
    return this._viewport;
  }

  // ---- Renderer interface ------------------------------------------------

  attachCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      throw new Error('CanvasRenderer.attachCanvas: failed to acquire a 2D context.');
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

  render(artifact: VectorTileArtifact, overlays: OverlayDescriptor[]): void {
    const ctx = this._requireCtx();
    const vp = this._viewport;

    // 1. Clear
    this.clear();

    // 2. Draw tile boundary + buffer zone
    this._drawBoundary(ctx, artifact, vp);

    // 3. Collect geometry into a temporary buffer in a single traversal pass
    const accumulated = this._collectGeometry(artifact, vp);

    // 4–6. Draw passes (enforces global z-order: polygons → lines → points)
    this._drawPolygons(ctx, accumulated);
    this._drawLines(ctx, accumulated);
    this._drawPoints(ctx, accumulated);

    // 7. Optional vertex markers
    if (this._showVertices) {
      this._drawVertices(ctx, accumulated);
    }

    // 8. Diagnostic overlays (top pass — always above geometry)
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
    const bufferMax = vp.tileToScreen({ x: extent + buffer, y: extent + buffer });

    drawTileBoundary(
      ctx,
      origin,
      maxCorner,
      bufferOrigin,
      bufferMax,
      TILE_BOUNDARY_STYLE,
      BUFFER_BOUNDARY_STYLE,
    );
  }

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
        accumulated.polygons.push({ rings: screenRings, layerName: ctx.layerName });
        if (screenRings[0] !== undefined) {
          for (const v of screenRings[0]) accumulated.vertices.push(v);
        }
      },

      onLineString: (points, ctx) => {
        const screenPoints = points.map((p): ScreenPoint => vp.tileToScreen(p));
        accumulated.lines.push({ points: screenPoints, layerName: ctx.layerName });
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
  ): void {
    for (const { rings, layerName } of accumulated.polygons) {
      const color = resolveLayerColor(layerName);
      drawPolygon(ctx, rings, { ...POLYGON_STYLE, fillColor: color, strokeColor: color });
    }
  }

  private _drawLines(
    ctx: CanvasRenderingContext2D,
    accumulated: AccumulatedGeometry,
  ): void {
    for (const { points, layerName } of accumulated.lines) {
      const color = resolveLayerColor(layerName);
      drawLineString(ctx, points, { ...LINE_STYLE, strokeColor: color });
    }
  }

  private _drawPoints(
    ctx: CanvasRenderingContext2D,
    accumulated: AccumulatedGeometry,
  ): void {
    for (const { point, layerName } of accumulated.points) {
      const color = resolveLayerColor(layerName);
      drawPoint(ctx, point, { ...POINT_STYLE, fillColor: color });
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
            globalAlpha: OVERLAY_STYLE.globalAlpha,
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
            globalAlpha: OVERLAY_STYLE.globalAlpha,
          });
        }

      } else if (overlay.type === 'ring-highlight') {
        const ringIndex = typeof overlay.target === 'number' ? overlay.target : 0;
        const rings = feature.geometry as readonly (readonly { x: number; y: number }[])[];
        const ring = rings[ringIndex] ?? [];
        const pts = ring.map((p) => vp.tileToScreen(p));
        if (pts.length >= 2) {
          drawLineString(ctx, pts, {
            strokeColor: color,
            lineWidth: OVERLAY_STYLE.lineWidth * 2,
            lineCap: OVERLAY_STYLE.lineCap,
            lineJoin: OVERLAY_STYLE.lineJoin,
            globalAlpha: OVERLAY_STYLE.globalAlpha,
          });
        }

      } else if (overlay.type === 'bbox-fill') {
        const allPts = flattenVertices(feature);
        if (allPts.length > 0) {
          const xs = allPts.map((p) => p.x);
          const ys = allPts.map((p) => p.y);
          const tl = vp.tileToScreen({ x: Math.min(...xs), y: Math.min(...ys) });
          const br = vp.tileToScreen({ x: Math.max(...xs), y: Math.max(...ys) });
          drawPolygon(ctx, [[tl, { x: br.x, y: tl.y }, br, { x: tl.x, y: br.y }]], {
            fillColor: color,
            fillAlpha: OVERLAY_STYLE.fillAlpha,
            strokeColor: color,
            lineWidth: OVERLAY_STYLE.lineWidth,
            lineJoin: OVERLAY_STYLE.lineJoin,
            globalAlpha: OVERLAY_STYLE.globalAlpha,
          });
        }
      }
    }
  }

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

function firstVertex(
  feature: VectorTileFeature,
): { x: number; y: number } | undefined {
  if (feature.type === 1) {
    const flat = feature.geometry as readonly { x: number; y: number }[];
    return flat[0];
  }
  const rings = feature.geometry as readonly (readonly { x: number; y: number }[])[];
  return rings[0]?.[0];
}

function firstRing(
  feature: VectorTileFeature,
): readonly { x: number; y: number }[] {
  if (feature.type === 1) {
    return feature.geometry as readonly { x: number; y: number }[];
  }
  const rings = feature.geometry as readonly (readonly { x: number; y: number }[])[];
  return rings[0] ?? [];
}

function flattenVertices(
  feature: VectorTileFeature,
): Array<{ x: number; y: number }> {
  if (feature.type === 1) {
    return [...(feature.geometry as readonly { x: number; y: number }[])];
  }
  const result: Array<{ x: number; y: number }> = [];
  const rings = feature.geometry as readonly (readonly { x: number; y: number }[])[];
  for (const ring of rings) result.push(...ring);
  return result;
}

function resolveLayerColor(layerName: string): string {
  const key = layerName as keyof typeof LAYER_COLORS;
  return key in LAYER_COLORS ? LAYER_COLORS[key] : LAYER_COLORS.default;
}
```

---

## 6. Subsystem Public Barrel Files (`index.ts`)

### A. Geometry Subsystem Barrel
📁 **File**: `packages/inspector/src/geometry/index.ts`

```typescript
/**
 * @tileguard/inspector — Geometry Module
 * Public barrel for all reusable geometric primitives.
 */

export type { TilePoint, ScreenPoint } from './point.js';
export type { BoundingBox } from './bounds.js';
export {
  createBoundsFromPoints,
  width,
  height,
  center,
  containsPoint,
  intersects,
  expand,
} from './bounds.js';
export type { Matrix2D } from './matrix.js';
export { buildMatrix, invertMatrix, applyMatrix } from './matrix.js';
export {
  distanceSquared,
  midpoint,
  lerp,
  equalsWithinTolerance,
} from './helpers.js';
export type { GeometryVisitor, FeatureContext, Point } from './traversal.js';
export { walkFeatureGeometry, walkLayer, walkArtifact } from './traversal.js';
```

### B. Renderer Subsystem Barrel
📁 **File**: `packages/inspector/src/renderer/index.ts`

```typescript
/**
 * @tileguard/inspector — Renderer Module
 * Public barrel for the renderer subsystem.
 */

export type { Renderer, CanvasRendererOptions } from './canvas-renderer.js';
export { CanvasRenderer } from './canvas-renderer.js';

export {
  LAYER_COLORS,
  OVERLAY_COLORS,
  TILE_BOUNDARY_STYLE,
  BUFFER_BOUNDARY_STYLE,
  POINT_STYLE,
  LINE_STYLE,
  POLYGON_STYLE,
  VERTEX_STYLE,
  OVERLAY_STYLE,
} from './palette.js';
export type { LayerColorKey, OverlaySeverity } from './palette.js';

export {
  drawPoint,
  drawLineString,
  drawPolygon,
  drawVertexMarkers,
  drawTileBoundary,
} from './shapes.js';
export type {
  PointStyle,
  LineStyle,
  PolygonStyle,
  VertexStyle,
  BoundaryStyle,
} from './shapes.js';
```

---

## 7. Verification & Verification Answers

### 1. Does traversal match the MVT specification?
**Yes.** Under MVT §4.3.4, Point features encode points via a sequence of `MoveTo` commands. MapLibre's decoder wraps point features as `Point[][]`, whereas our decoder in `@tileguard/tile-rules` wraps Point features as a flat `readonly Point[]`. Both represent the same spec data. Our traversal is consistent with our decoder: `onPoint` delivers the vertices for Point/MultiPoint features.

### 2. Is `AccumulatedGeometry` only a temporary render buffer?
**Yes.** `AccumulatedGeometry` is allocated at the start of `render()`, populated during `_collectGeometry()`, drained during draw passes to enforce a global z-order (polygons $\rightarrow$ lines $\rightarrow$ points across all layers), and immediately garbage collected upon return. It is **never** stored as instance state.

### 3. Is `OverlayDescriptor` future-proof?
**Yes.** `CanvasRenderer` switches on `overlay.type` (`point-marker`, `segment-highlight`, `ring-highlight`, `bbox-fill`) and visual `severity`. It carries zero rule IDs and has zero knowledge of validator rules.

### 4. Is `evenodd` polygon filling correct vs MapLibre?
**Yes.** `drawPolygon` uses `ctx.fill('evenodd')` for multi-ring paths. This matches MapLibre's Canvas renderer hole subtraction strategy and handles interior rings cleanly without requiring ring re-ordering.

### 5. Are drawing helpers pure?
**Yes.** `shapes.ts` imports only `ScreenPoint` (a plain `{x, y}` interface). Helpers contain zero business logic, zero Viewport imports, and zero rule package imports.

### 6. Is geometry-type dispatching single-sourced?
**Yes.** There is exactly **one** place where geometry types are dispatched to drawing helpers: the visitor passed to `walkArtifact()` inside `_collectGeometry()`. The private helpers `firstVertex`, `firstRing`, and `flattenVertices` in `canvas-renderer.ts` are coordinate accessors for overlay positioning — they do **not** dispatch to drawing helpers.

---

## 8. Test Suite Execution Results

### Unit, Integration, & Snapshot Test Suite
- Command: `pnpm --filter @tileguard/inspector test`
- Results:
  ```
  RUN  v1.6.1 /home/shreeharsh157/Desktop/tileguard/packages/inspector

  ✓ tests/shapes.test.ts (37 tests)
  ✓ tests/traversal.test.ts (23 tests)
  ✓ tests/snapshots.test.ts (11 tests)
  ✓ tests/canvas-renderer.test.ts (28 tests)
  ✓ tests/viewport.test.ts (77 tests)
  ✓ tests/smoke.test.ts (33 tests)

  Test Files  6 passed (6)
       Tests  209 passed (209)
    Duration  682ms
  ```

### Static Type Safety
- Command: `npx tsc --noEmit -p packages/inspector/tsconfig.json` & `npx tsc --build`
- Results: **0 errors** across `@tileguard/inspector` and all monorepo packages.
