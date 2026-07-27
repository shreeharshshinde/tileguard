/**
 * @tileguard/inspector — Inspector Store (Public API)
 *
 * Single reactive state owner for the Inspector browser application.
 * Manages the application lifecycle as a typed state machine and holds
 * all mutable view state: selection, hover, and diagnostic filters.
 *
 * Lifecycle state machine:
 *
 *   uninitialized ──load()──► loading ──► loaded
 *                                      ├──► empty
 *                                      └──► error
 *   loaded        ──load()──► loading   (re-load allowed)
 *   error         ──load()──► loading   (recovery allowed)
 *   any           ──dispose()──► disposed
 *
 * Responsibilities:
 *   - Lifecycle state machine
 *   - Selection state (selected feature)
 *   - Hover state (hovered feature)
 *   - Filter state (visible layers / severity / rule)
 *   - Listener registration, notification, unsubscription
 *   - Disposal
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs.
 *
 * Public surface (frozen after Milestone 5 sign-off):
 *   - FeatureRef            — nullable pointer to a layer feature (shared by selection & hover)
 *   - InspectorLifecycle    — discriminated union of lifecycle states
 *   - FilterState           — active layer / severity / rule filters
 *   - InspectorStore        — the store interface
 *   - createInspectorStore() — factory
 */

import type { Diagnostic, Severity } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { InspectorStoreImpl } from './store-impl.js';

// ---------------------------------------------------------------------------
// FeatureRef
// ---------------------------------------------------------------------------

/**
 * A nullable reference to a single feature within a specific layer.
 *
 * Used for both `selection` (the clicked feature) and `hover` (the feature
 * currently under the cursor). Both fields are null when the state is inactive.
 *
 * Replaces the old `SelectionState` / `HoverState` pair — the two were
 * structurally identical so a single shared type is cleaner.
 */
export interface FeatureRef {
  readonly layerName: string | null;
  readonly featureIndex: number | null;
}

// ---------------------------------------------------------------------------
// Lifecycle State
// ---------------------------------------------------------------------------

/**
 * Discriminated union representing every possible application lifecycle state.
 *
 * Narrow with `switch (store.lifecycle.status)`.
 */
export type InspectorLifecycle =
  /** Initial state. No file has been requested yet. */
  | { readonly status: 'uninitialized' }

  /** A tile load is in progress. */
  | { readonly status: 'loading'; readonly filePath: string }

  /**
   * Tile loaded and contains at least one feature.
   * `artifact` and `diagnostics` are immutable after this transition.
   */
  | {
      readonly status: 'loaded';
      readonly artifact: VectorTileArtifact;
      readonly diagnostics: readonly Diagnostic[];
      readonly filePath: string;
    }

  /**
   * Tile loaded successfully but contains zero features.
   * The canvas is blank; no overlays can be generated.
   */
  | { readonly status: 'empty'; readonly filePath: string }

  /** Tile load failed. `error` contains the underlying cause. */
  | {
      readonly status: 'error';
      readonly filePath: string;
      readonly error: Error;
    }

  /**
   * Store has been disposed. All listeners have been released.
   * No further state transitions will occur.
   */
  | { readonly status: 'disposed' };

// ---------------------------------------------------------------------------
// Filter State
// ---------------------------------------------------------------------------

/**
 * Active diagnostic and layer filter configuration.
 *
 * Filters are applied by the RenderCoordinator before passing diagnostics
 * to the OverlayAdapter. The store holds them as pure state.
 */
export interface FilterState {
  /**
   * Set of layer names to show overlays for.
   * An empty set means "show all layers" (no layer filter active).
   *
   * Always returned as a frozen ReadonlySet — consumers must not attempt
   * to mutate it.
   */
  readonly visibleLayers: ReadonlySet<string>;

  /**
   * Minimum severity to display.
   * null = show all severities (no severity filter active).
   */
  readonly minSeverity: Severity | null;

  /**
   * Restrict overlays to a single rule ID.
   * null = show all rules (no rule filter active).
   */
  readonly ruleId: string | null;
}

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

/**
 * InspectorStore — reactive state container for the Inspector application.
 *
 * Mutation contract:
 *   - All mutations are synchronous except `load()`.
 *   - Listeners are notified synchronously, in registration order, exactly
 *     once per logical state change.
 *   - No state mutation may occur after `dispose()`.
 *
 * Read contract:
 *   - All state accessors return immutable or frozen snapshots.
 *   - `filters.visibleLayers` is always a frozen `ReadonlySet`.
 */
export interface InspectorStore {
  // ── State accessors ───────────────────────────────────────────────────────

  /** Current lifecycle state. Narrows via `lifecycle.status`. */
  readonly lifecycle: InspectorLifecycle;

  /** Currently selected feature (both fields null = nothing selected). */
  readonly selection: FeatureRef;

  /** Currently hovered feature (both fields null = no active hover). */
  readonly hover: FeatureRef;

  /** Active diagnostic and layer filter configuration. */
  readonly filters: FilterState;

  // ── Lifecycle mutations ───────────────────────────────────────────────────

  /**
   * Begin loading a tile file.
   *
   * Transitions: uninitialized | loaded | empty | error → loading → loaded | empty | error
   *
   * If `artifact` and `diagnostics` are provided, the store transitions
   * synchronously without performing any I/O.
   *
   * @throws If a load is already in progress (status === 'loading').
   */
  load(
    filePath: string,
    artifact?: VectorTileArtifact,
    diagnostics?: readonly Diagnostic[],
  ): Promise<void>;

  // ── Interaction mutations ─────────────────────────────────────────────────

  /**
   * Select a feature by layer name and index.
   * Pass `null` for both fields to clear the selection.
   * No-op if the new value equals the current selection.
   */
  select(layerName: string | null, featureIndex: number | null): void;

  /**
   * Update the hovered feature.
   * Pass `null` for both fields to clear the hover state.
   * No-op if the new value equals the current hover state.
   */
  setHover(layerName: string | null, featureIndex: number | null): void;

  /**
   * Merge partial filter state.
   * Only the supplied fields are updated; others remain unchanged.
   * No-op if the merged result equals the current filters.
   */
  setFilters(partial: Partial<FilterState>): void;

  // ── Disposal ──────────────────────────────────────────────────────────────

  /**
   * Release all resources and transition to 'disposed'.
   * Listeners receive one final notification in registration order, then
   * are released. No further notifications will be emitted.
   * Safe to call multiple times (subsequent calls are no-ops).
   */
  dispose(): void;

  // ── Subscriptions ─────────────────────────────────────────────────────────

  /**
   * Register a state-change listener.
   *
   * Listeners are called synchronously, in registration order, after each
   * state mutation. Returns an unsubscribe callback — safe to call multiple
   * times (idempotent).
   *
   * @throws If the store has already been disposed.
   */
  subscribe(listener: () => void): () => void;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates an InspectorStore instance in the `uninitialized` lifecycle state.
 *
 * @example
 *   const store = createInspectorStore();
 *   const unsub = store.subscribe(() => renderFrame(store));
 *   await store.load('./my-tile.pbf');
 *   // …later…
 *   store.dispose();
 */
export function createInspectorStore(): InspectorStore {
  return new InspectorStoreImpl();
}
