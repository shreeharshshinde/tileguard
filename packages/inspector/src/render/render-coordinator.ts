/**
 * @tileguard/inspector — Render Coordinator
 *
 * Pure orchestration layer. Observes the InspectorStore, asks the
 * SelectionProducer for interaction overlays, and invokes the Renderer.
 *
 * Pipeline:
 *
 *   InspectorStore
 *       │  (read selection, hover, lifecycle)
 *       ▼
 *   SelectionProducer.toOverlays()
 *       │  (interaction OverlayDescriptor[])
 *       ▼
 *   Renderer.render(artifact, overlays)
 *       │
 *       ▼
 *   Done
 *
 * Responsibilities (only):
 *   1. Read the current store snapshot.
 *   2. Ask SelectionProducer for interaction overlays.
 *   3. Pass artifact + overlays to the renderer.
 *   4. Expose a single `render()` entry point.
 *
 * Invariants:
 *   - Zero rendering logic (no canvas, no draw calls, no geometry).
 *   - Zero interaction logic (no hit testing, no event handling).
 *   - Zero mutable state (no caches, no dirty flags, no render queues).
 *   - Renderer called exactly once per render().
 *   - SelectionProducer called exactly once per render().
 *   - If lifecycle is not 'loaded', render() returns immediately
 *     without calling the renderer or producer. The canvas retains
 *     whatever state it held from the previous render pass.
 *
 * Error handling:
 *   - If renderer.render() throws, the error propagates to the caller.
 *     The coordinator does not swallow renderer failures.
 *
 * Boundary: Zero imports from hittest/, interaction/, viewport/, or DOM APIs.
 */

import type { OverlayDescriptor } from '../overlay/overlay-adapter.js';
import type { SelectionProducer } from '../overlay/selection-producer.js';
import type { Renderer } from '../renderer/canvas-renderer.js';
import type { InspectorStore } from '../store/inspector-store.js';

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

/** Dependencies for the RenderCoordinator. */
export interface RenderCoordinatorOptions {
  /** The store that supplies lifecycle state, selection, and hover. */
  readonly store: InspectorStore;
  /** Converts selection/hover FeatureRefs into OverlayDescriptors. */
  readonly selectionProducer: SelectionProducer;
  /** The renderer that draws the artifact and overlays to the canvas. */
  readonly renderer: Renderer;
}

/**
 * RenderCoordinator — single entry point for the rendering pipeline.
 *
 * Call `render()` whenever state has changed and the canvas should be updated.
 * The coordinator is stateless: every render() call reads a fresh store snapshot.
 */
export interface RenderCoordinator {
  /**
   * Execute one complete rendering pass.
   *
   * Reads the current store state, produces interaction overlays, and
   * calls renderer.render(). If the store lifecycle is not 'loaded',
   * returns immediately without touching the renderer.
   */
  render(): void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class RenderCoordinatorImpl implements RenderCoordinator {
  private readonly _store: InspectorStore;
  private readonly _selectionProducer: SelectionProducer;
  private readonly _renderer: Renderer;

  constructor({
    store,
    selectionProducer,
    renderer,
  }: RenderCoordinatorOptions) {
    this._store = store;
    this._selectionProducer = selectionProducer;
    this._renderer = renderer;
  }

  render(): void {
    // Step 1 — read store snapshot
    const lifecycle = this._store.lifecycle;

    // Guard: only render when a tile is fully loaded
    if (lifecycle.status !== 'loaded') return;

    const { artifact } = lifecycle;
    const selection = this._store.selection;
    const hover = this._store.hover;

    // Step 2 — produce interaction overlays
    const overlays: OverlayDescriptor[] = this._selectionProducer.toOverlays(
      selection,
      hover,
      artifact,
    );

    // Step 3 — determine active layer for isolation/dim effect
    // When selection has a layerName but no featureIndex, it's a layer-level selection
    const activeLayer =
      selection.layerName !== null && selection.featureIndex === null
        ? selection.layerName
        : null;

    // Step 4 — invoke renderer (errors propagate to caller)
    this._renderer.render(artifact, overlays, activeLayer);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a RenderCoordinator that orchestrates the three-step
 * Store → SelectionProducer → Renderer pipeline.
 *
 * @example
 *   const coordinator = createRenderCoordinator({ store, selectionProducer, renderer });
 *   store.subscribe(() => coordinator.render());
 */
export function createRenderCoordinator(
  options: RenderCoordinatorOptions,
): RenderCoordinator {
  return new RenderCoordinatorImpl(options);
}
