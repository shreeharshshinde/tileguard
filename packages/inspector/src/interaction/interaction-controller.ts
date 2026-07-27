/**
 * @tileguard/inspector — Interaction Controller
 *
 * Thin orchestration layer. Connects pointer events (in screen space) to the
 * HitTester and InspectorStore without containing any business logic of its own.
 *
 * Pipeline (shared by all three public methods):
 *
 *   ScreenPoint
 *       │
 *       ▼  Viewport.screenToTile()
 *   TilePoint
 *       │
 *       ▼  HitTester.hitTest()
 *   HitResult | undefined
 *       │
 *       ▼  store.setHover() | store.select() | store.setHover(null, null)
 *   Done
 *
 * Responsibilities (only):
 *   - Delegate coordinate conversion to Viewport
 *   - Delegate feature picking to HitTester
 *   - Delegate state mutation to InspectorStore
 *
 * Invariants:
 *   - Zero geometry calculations
 *   - Zero renderer or overlay imports
 *   - Zero mutable state on the controller itself
 *   - Viewport failure → event silently ignored
 *   - HitTester miss (undefined) → clears hover/selection
 *
 * Boundary: Zero imports from renderer/, overlay/, or geometry/ algorithm
 * modules. Only imports the three interface types it coordinates.
 */

import type { HitResult, HitTester } from '../hittest/hit-tester.js';
import type { InspectorStore } from '../store/inspector-store.js';
import type { ScreenPoint, TilePoint, Viewport } from '../viewport/viewport.js';

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

/**
 * Dependencies required to construct an InteractionController.
 *
 * All three are interfaces — the controller never depends on concrete
 * implementations, making it trivially mockable in tests.
 */
export interface InteractionControllerOptions {
  /** The store that owns selection and hover state. */
  readonly store: InspectorStore;
  /** The viewport used to convert screen pixels → tile coordinates. */
  readonly viewport: Viewport;
  /** The hit-tester used to resolve tile coordinates → nearest feature. */
  readonly hitTester: HitTester;
}

/**
 * InteractionController — pure orchestrator for pointer-driven interactions.
 *
 * Callers are responsible for wiring DOM events to these methods. The
 * controller itself has no knowledge of DOM APIs, event listeners, or
 * canvas elements.
 *
 * Public surface (frozen after Milestone 5 Step 3 sign-off):
 *   - handlePointerMove(screenPoint)
 *   - handlePointerLeave()
 *   - handleClick(screenPoint)
 */
export interface InteractionController {
  /**
   * Call when the pointer moves over the canvas.
   *
   * Pipeline: screenPoint → tilePoint → hitTest → store.setHover()
   *
   * If the viewport conversion fails, the event is silently ignored.
   * If no feature is hit, hover is cleared.
   *
   * @param screenPoint  Pointer position in CSS pixel space.
   */
  handlePointerMove(screenPoint: ScreenPoint): void;

  /**
   * Call when the pointer leaves the canvas.
   *
   * Always clears hover state unconditionally — no hit test is needed.
   */
  handlePointerLeave(): void;

  /**
   * Call when the user clicks on the canvas.
   *
   * Pipeline: screenPoint → tilePoint → hitTest → store.select()
   *
   * If the viewport conversion fails, the event is silently ignored.
   * If no feature is hit, selection is cleared.
   *
   * @param screenPoint  Click position in CSS pixel space.
   */
  handleClick(screenPoint: ScreenPoint): void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class InteractionControllerImpl implements InteractionController {
  private readonly _store: InspectorStore;
  private readonly _viewport: Viewport;
  private readonly _hitTester: HitTester;

  constructor({ store, viewport, hitTester }: InteractionControllerOptions) {
    this._store = store;
    this._viewport = viewport;
    this._hitTester = hitTester;
  }

  handlePointerMove(screenPoint: ScreenPoint): void {
    const hit = this._resolve(screenPoint);
    if (hit === null) return; // viewport conversion failed — ignore
    this._store.setHover(hit?.layerName ?? null, hit?.featureIndex ?? null);
  }

  handlePointerLeave(): void {
    this._store.setHover(null, null);
  }

  handleClick(screenPoint: ScreenPoint): void {
    const hit = this._resolve(screenPoint);
    if (hit === null) return; // viewport conversion failed — ignore
    this._store.select(hit?.layerName ?? null, hit?.featureIndex ?? null);
  }

  // ── Private shared pipeline ───────────────────────────────────────────────

  /**
   * Shared coordinate + hit-test pipeline used by move and click.
   *
   * Return values:
   *   `null`      — viewport conversion threw; the caller must ignore the event.
   *   `undefined` — hit test produced no match (miss); caller clears hover/selection.
   *   `HitResult` — a feature was found within the hit radius.
   */
  private _resolve(screenPoint: ScreenPoint): HitResult | undefined | null {
    // Step 1 — coordinate conversion (delegate entirely to Viewport)
    let tilePoint: TilePoint;
    try {
      tilePoint = this._viewport.screenToTile(screenPoint);
    } catch {
      // Viewport conversion failed — silently ignore this event
      return null;
    }

    // Step 2 — obtain artifact from store (only query when loaded)
    const lifecycle = this._store.lifecycle;
    if (lifecycle.status !== 'loaded') {
      // No artifact available — treat as a miss (clear hover/selection)
      return undefined;
    }
    const artifact = lifecycle.artifact;

    // Step 3 — hit test (delegate entirely to HitTester)
    return this._hitTester.hitTest(tilePoint, artifact);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates an InteractionController that orchestrates the three-step
 * Viewport → HitTester → InspectorStore pipeline.
 *
 * @example
 *   const controller = createInteractionController({ store, viewport, hitTester });
 *   canvas.addEventListener('mousemove', (e) => {
 *     controller.handlePointerMove({ x: e.offsetX, y: e.offsetY });
 *   });
 */
export function createInteractionController(
  options: InteractionControllerOptions,
): InteractionController {
  return new InteractionControllerImpl(options);
}
