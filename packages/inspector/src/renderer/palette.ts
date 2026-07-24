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

/**
 * Per-layer fill/stroke colour tokens.
 *
 * Keys are canonical MVT layer names used across common tile datasets.
 * `default` is the fallback for any layer not explicitly listed.
 */
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

/**
 * Visual colour tokens for diagnostic overlay severity levels.
 * Maps directly to the `severity` field on OverlayDescriptor.
 */
export const OVERLAY_COLORS = {
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
} as const;

export type OverlaySeverity = keyof typeof OVERLAY_COLORS;

// ---------------------------------------------------------------------------
// Tile boundary
// ---------------------------------------------------------------------------

/**
 * Tile extent boundary box (outer edge of the 0–4096 tile grid).
 * Rendered as a dashed stroke with no fill.
 */
export const TILE_BOUNDARY_STYLE = {
  strokeColor: '#475569',
  lineWidth: 1,
  /** Dash pattern: 6px on, 4px off. */
  lineDash: [6, 4] as readonly number[],
  fillColor: 'transparent',
} as const;

/**
 * Clipping buffer zone box (the region outside the tile extent but inside
 * the overscanned buffer, typically ±256 units for a 4096-extent tile).
 * Rendered as a dotted stroke with no fill.
 */
export const BUFFER_BOUNDARY_STYLE = {
  strokeColor: '#64748b',
  lineWidth: 1,
  /** Dot pattern: 2px on, 4px off. */
  lineDash: [2, 4] as readonly number[],
  fillColor: 'transparent',
} as const;

// ---------------------------------------------------------------------------
// Point geometry style
// ---------------------------------------------------------------------------

/** Default style tokens for Point geometry markers (filled circles). */
export const POINT_STYLE = {
  radius: 4,
  fillColor: LAYER_COLORS.default,
  strokeColor: '#1e293b',
  lineWidth: 1,
  globalAlpha: 0.9,
} as const;

// ---------------------------------------------------------------------------
// LineString geometry style
// ---------------------------------------------------------------------------

/** Default style tokens for LineString geometry (stroked polylines). */
export const LINE_STYLE = {
  strokeColor: LAYER_COLORS.default,
  lineWidth: 1.5,
  lineCap: 'round' as CanvasLineCap,
  lineJoin: 'round' as CanvasLineJoin,
  globalAlpha: 0.85,
} as const;

// ---------------------------------------------------------------------------
// Polygon geometry style
// ---------------------------------------------------------------------------

/** Default style tokens for Polygon geometry (filled + stroked multi-ring paths). */
export const POLYGON_STYLE = {
  fillColor: LAYER_COLORS.default,
  fillAlpha: 0.15,
  strokeColor: LAYER_COLORS.default,
  lineWidth: 1,
  lineJoin: 'miter' as CanvasLineJoin,
  globalAlpha: 1,
} as const;

// ---------------------------------------------------------------------------
// Vertex marker style
// ---------------------------------------------------------------------------

/** Style tokens for vertex marker squares rendered during feature inspection. */
export const VERTEX_STYLE = {
  /** Half-width of the square marker in screen pixels. */
  halfSize: 3,
  fillColor: '#ffffff',
  strokeColor: '#334155',
  lineWidth: 1,
  globalAlpha: 1,
} as const;

// ---------------------------------------------------------------------------
// Overlay marker style
// ---------------------------------------------------------------------------

/**
 * Style tokens for diagnostic overlay markers.
 * Actual colour is looked up from OVERLAY_COLORS at draw time.
 */
export const OVERLAY_STYLE = {
  /** Radius for point overlay markers in screen pixels. */
  pointRadius: 6,
  lineWidth: 2,
  lineCap: 'round' as CanvasLineCap,
  lineJoin: 'round' as CanvasLineJoin,
  /** Fill alpha for overlay fills (e.g. bbox-fill). */
  fillAlpha: 0.25,
  globalAlpha: 0.9,
} as const;
