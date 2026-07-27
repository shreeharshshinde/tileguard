/**
 * @tileguard/inspector — Inspector Integration Layer (Milestone 5 — Step 5)
 *
 * Composes the components implemented in Steps 1–4 into a complete inspector
 * interaction and rendering pipeline.
 *
 * Component graph (constructed once, never recreated):
 *
 *   Inspector
 *     owns
 *       InspectorStore          (state machine)
 *       HitTester               (stateless geometry picker)
 *       InteractionController   (pointer → store orchestration)
 *       SelectionProducer       (store → overlay descriptors)
 *       RenderCoordinator       (overlay descriptors → renderer)
 *
 * Data flow:
 *
 *   Pointer Event
 *       │
 *       ▼
 *   InteractionController
 *       │
 *       ▼
 *   HitTester
 *       │
 *       ▼
 *   InspectorStore
 *       │  (listener notification)
 *       ▼
 *   RenderCoordinator
 *       │
 *       ▼
 *   SelectionProducer
 *       │
 *       ▼
 *   CanvasRenderer
 *
 * Responsibilities (only):
 *   1. Construct the component graph.
 *   2. Wire store changes to rendering (store.subscribe → coordinator.render).
 *   3. Expose a simple inspector-facing API.
 *
 * Invariants:
 *   - No new business logic.
 *   - No new rendering algorithms.
 *   - No new geometry.
 *   - No duplicated state — all state lives in InspectorStore.
 *   - InteractionController never references Renderer.
 *   - RenderCoordinator never references InteractionController.
 *   - HitTester remains completely independent.
 *   - Errors propagate unchanged from underlying components.
 *
 * Boundary: The Inspector facade is the package's primary entry point.
 * Internal components are not exposed directly.
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type { ScreenPoint } from './geometry/index.js';
import { createHitTester } from './hittest/hit-tester.js';
import {
  createInteractionController,
  type InteractionController,
} from './interaction/interaction-controller.js';
import { createSelectionProducer } from './overlay/selection-producer.js';
import {
  createRenderCoordinator,
  type RenderCoordinator,
} from './render/render-coordinator.js';
import type { Renderer } from './renderer/canvas-renderer.js';
import {
  createInspectorStore,
  type InspectorStore,
} from './store/inspector-store.js';
import type { Viewport } from './viewport/viewport.js';

// ---------------------------------------------------------------------------
// Public Interface
// ---------------------------------------------------------------------------

/**
 * Inspector — unified facade for the tile inspection pipeline.
 *
 * This is the package's primary entry point. All interaction, rendering, and
 * lifecycle management flows through this interface.
 */
export interface Inspector {
  /**
   * Load a tile file into the inspector.
   *
   * Transitions the store through loading → loaded/empty/error and
   * automatically triggers a render pass on completion.
   *
   * @param filePath     Path or identifier for the tile file.
   * @param artifact     Pre-decoded tile artifact (synchronous load path).
   * @param diagnostics  Pre-computed diagnostics for the tile.
   */
  load(
    filePath: string,
    artifact: VectorTileArtifact,
    diagnostics: readonly Diagnostic[],
  ): Promise<void>;

  /**
   * Handle a pointer move over the canvas.
   *
   * Pipeline: screenPoint → tilePoint → hitTest → store.setHover() → render()
   */
  handlePointerMove(screenPoint: ScreenPoint): void;

  /**
   * Handle the pointer leaving the canvas.
   *
   * Clears hover state and triggers a render pass.
   */
  handlePointerLeave(): void;

  /**
   * Handle a click on the canvas.
   *
   * Pipeline: screenPoint → tilePoint → hitTest → store.select() → render()
   */
  handleClick(screenPoint: ScreenPoint): void;

  /**
   * Execute one rendering pass.
   *
   * Reads store state, produces interaction overlays, and invokes the renderer.
   * Safe to call at any time — returns immediately if no tile is loaded.
   */
  render(): void;

  /**
   * Dispose the inspector and release all resources.
   *
   * Disposes the store, removes the render subscription, and prevents further
   * rendering. Safe to call multiple times.
   */
  dispose(): void;
}

// ---------------------------------------------------------------------------
// Construction Options
// ---------------------------------------------------------------------------

/** Dependencies required to construct an Inspector. */
export interface InspectorOptions {
  /** The viewport used for screen ↔ tile coordinate conversion. */
  readonly viewport: Viewport;
  /** The renderer that draws the tile and overlays to the canvas. */
  readonly renderer: Renderer;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class InspectorImpl implements Inspector {
  private readonly _store: InspectorStore;
  private readonly _interactionController: InteractionController;
  private readonly _renderCoordinator: RenderCoordinator;
  private readonly _unsubscribe: () => void;

  constructor({ viewport, renderer }: InspectorOptions) {
    // ── Step 1: Construct the component graph (once) ──────────────────────

    this._store = createInspectorStore();

    const hitTester = createHitTester();

    this._interactionController = createInteractionController({
      store: this._store,
      viewport,
      hitTester,
    });

    const selectionProducer = createSelectionProducer();

    this._renderCoordinator = createRenderCoordinator({
      store: this._store,
      selectionProducer,
      renderer,
    });

    // ── Step 2: Wire store changes to rendering ──────────────────────────
    // This is the only automatic wiring: store change → render().
    // It ensures that pointer move → store.setHover() → render() and
    // click → store.select() → render() happen without the interaction
    // layer knowing anything about rendering.

    this._unsubscribe = this._store.subscribe(() => {
      this._renderCoordinator.render();
    });
  }

  // ── Public API (delegates only) ─────────────────────────────────────────

  async load(
    filePath: string,
    artifact: VectorTileArtifact,
    diagnostics: readonly Diagnostic[],
  ): Promise<void> {
    await this._store.load(filePath, artifact, diagnostics);
  }

  handlePointerMove(screenPoint: ScreenPoint): void {
    this._interactionController.handlePointerMove(screenPoint);
  }

  handlePointerLeave(): void {
    this._interactionController.handlePointerLeave();
  }

  handleClick(screenPoint: ScreenPoint): void {
    this._interactionController.handleClick(screenPoint);
  }

  render(): void {
    this._renderCoordinator.render();
  }

  dispose(): void {
    this._store.dispose();
    this._unsubscribe();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a fully wired Inspector instance.
 *
 * The returned Inspector owns all internal components. Disposing it releases
 * every subscription and prevents further rendering.
 *
 * @example
 *   const inspector = createInspector({ viewport, renderer });
 *   await inspector.load('./my-tile.pbf', artifact, diagnostics);
 *
 *   canvas.addEventListener('mousemove', (e) => {
 *     inspector.handlePointerMove({ x: e.offsetX, y: e.offsetY });
 *   });
 *   canvas.addEventListener('mouseleave', () => {
 *     inspector.handlePointerLeave();
 *   });
 *   canvas.addEventListener('click', (e) => {
 *     inspector.handleClick({ x: e.offsetX, y: e.offsetY });
 *   });
 *
 *   // …later…
 *   inspector.dispose();
 */
export function createInspector(options: InspectorOptions): Inspector {
  return new InspectorImpl(options);
}
