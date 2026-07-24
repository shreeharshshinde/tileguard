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
export type { Renderer, CanvasRendererOptions } from './canvas-renderer.js';
export { CanvasRenderer } from './canvas-renderer.js';

// Design token palette — all as const, no rendering logic
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

// Pure drawing helpers and their style token interfaces
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
