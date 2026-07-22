/**
 * @tileguard/inspector — Canvas 2D Renderer Implementation
 *
 * Renders decoded MVT geometry and diagnostic overlays using the HTML5 Canvas
 * 2D API. All drawing is driven by the Viewport transform — this renderer does
 * not manage pan, zoom, or coordinate transforms itself.
 *
 * Implemented in Milestone 3.
 *
 * Public surface:
 *   - Renderer           — interface all renderers implement
 *   - CanvasRenderer     — concrete Canvas 2D implementation
 *   - OverlayDescriptor  — visual marker emitted by the OverlayAdapter
 */

import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { Viewport } from '../viewport/viewport.ts';

// ---------------------------------------------------------------------------
// Overlay Descriptors — implemented in Milestone 4
// ---------------------------------------------------------------------------

/** Describes a visual marker for a single diagnostic. */
export interface OverlayDescriptor {
  /** Type of marker to render. */
  readonly type: 'point-marker' | 'segment-highlight' | 'ring-highlight' | 'bbox-fill';
  /** Layer name to locate the feature. */
  readonly layerName: string;
  /** Feature index within that layer. */
  readonly featureIndex: number;
  /** Ring index (for polygons), segment indices, or vertex indices (type-dependent). */
  readonly target: number | [number, number] | number[];
  /** Visual emphasis level (style guide implemented in Milestone 3). */
  readonly severity: 'error' | 'warning' | 'info';
}

// ---------------------------------------------------------------------------
// Renderer Interface — implemented in Milestone 3
// ---------------------------------------------------------------------------

/**
 * Renderer — abstraction for drawing geometry and overlays.
 *
 * Future implementations: SVGRenderer (vector export), WebGLRenderer (high-density).
 * Implemented in Milestone 3 (CanvasRenderer only).
 */
export interface Renderer {
  /**
   * Render the full tile: tile boundary, all layers, all features.
   * `overlays` is produced by the OverlayAdapter in Milestone 4.
   */
  render(artifact: VectorTileArtifact, overlays: OverlayDescriptor[]): void;

  /**
   * Clear the canvas. Called before each render pass.
   */
  clear(): void;

  /**
   * Highlight a specific feature (on selection). Optional — used by the
   * Inspector's interactive selection flow.
   */
  highlightFeature(layerName: string, featureIndex: number): void;
}

// ---------------------------------------------------------------------------
// Canvas 2D Implementation — implemented in Milestone 3
// ---------------------------------------------------------------------------

/**
 * CanvasRenderer — Canvas 2D concrete implementation of the Renderer interface.
 *
 * Takes a Canvas 2D context and a Viewport; all geometry is transformed by
 * the Viewport before being drawn to the canvas.
 *
 * Full implementation delivered in Milestone 3.
 */
export class CanvasRenderer implements Renderer {
  constructor(
    readonly _ctx: CanvasRenderingContext2D,
    readonly _viewport: Viewport,
  ) {}

  render(_artifact: VectorTileArtifact, _overlays: OverlayDescriptor[]): void {
    throw new Error('CanvasRenderer.render() — implemented in Milestone 3');
  }

  clear(): void {
    throw new Error('CanvasRenderer.clear() — implemented in Milestone 3');
  }

  highlightFeature(_layerName: string, _featureIndex: number): void {
    throw new Error('CanvasRenderer.highlightFeature() — implemented in Milestone 3');
  }
}
