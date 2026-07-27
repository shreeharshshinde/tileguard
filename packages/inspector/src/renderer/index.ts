/**
 * @tileguard/inspector — Renderer Module
 *
 * Public barrel for the renderer subsystem.
 *
 * Import from here rather than from individual renderer files:
 *
 *   import { CanvasRenderer, LAYER_COLORS } from '../renderer/index.js';
 *   import type { Renderer } from '../renderer/index.js';
 *
 * Note: OverlayDescriptor is owned by the Overlay subsystem and is NOT
 * re-exported here. Import it from '../overlay/overlay-adapter.js'.
 */

// Renderer interface and CanvasRenderer implementation
export type { CanvasRendererOptions, Renderer } from './canvas-renderer.js';
export { CanvasRenderer } from './canvas-renderer.js';
export type { LayerColorKey, OverlaySeverity } from './palette.js';
// Design token palette — all as const, no rendering logic
export {
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
export type {
  BoundaryStyle,
  LineStyle,
  PointStyle,
  PolygonStyle,
  VertexStyle,
} from './shapes.js';
// Pure drawing helpers and their style token interfaces
export {
  drawLineString,
  drawPoint,
  drawPolygon,
  drawTileBoundary,
  drawVertexMarkers,
} from './shapes.js';
