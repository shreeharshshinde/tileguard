/**
 * @tileguard/inspector — InspectorStore Implementation
 *
 * Concrete implementation of the InspectorStore interface. Isolated in this
 * file so inspector-store.ts stays as a lean public API / factory module.
 *
 * Architecture decisions:
 *
 *   Single-path mutation (_commit)
 *   ─────────────────────────────
 *   Every state change — regardless of which public method triggers it —
 *   flows through the private `_commit()` helper. This guarantees:
 *     - Exactly one notification per logical mutation.
 *     - Consistent frozen snapshots on every read.
 *     - Future enhancements (history, devtools) need one touch-point.
 *
 *   Notification contract
 *   ─────────────────────
 *   Listeners are called synchronously, in registration order (the order
 *   in which subscribe() was called), immediately after `_commit()` updates
 *   the internal state. This ordering guarantee is intentional and stable:
 *   callers may rely on it. Listeners that throw are isolated — their error
 *   is caught, and remaining listeners still fire in order.
 *
 *   Frozen visibleLayers
 *   ─────────────────────
 *   FilterState.visibleLayers is always stored and returned as a frozen Set.
 *   Object.freeze() is applied when a new Set is passed in via setFilters(),
 *   ensuring the runtime guarantee matches the ReadonlySet type annotation.
 *   The initial empty set and every subsequent set are frozen before storage.
 *
 *   Disposal finality
 *   ─────────────────
 *   Once `dispose()` is called the store transitions to 'disposed' and
 *   clears its listener set. No further notifications are emitted; any
 *   subsequent mutation calls are silently ignored (not thrown).
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs.
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import type {
  FeatureRef,
  FilterState,
  InspectorLifecycle,
  InspectorStore,
} from './inspector-store.js';

// ---------------------------------------------------------------------------
// Internal state snapshot
// ---------------------------------------------------------------------------

/**
 * Mutable state snapshot — the single source of truth inside the store.
 * Every field is replaced atomically via _commit(). External readers always
 * receive a frozen or immutable view.
 */
interface StoreState {
  lifecycle: InspectorLifecycle;
  selection: FeatureRef;
  hover: FeatureRef;
  filters: FilterState;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wrap a Set in Object.freeze() and return it as ReadonlySet. */
function frozenSet<T>(s: ReadonlySet<T>): ReadonlySet<T> {
  return Object.freeze(s instanceof Set ? s : new Set(s)) as ReadonlySet<T>;
}

/** Build an initial frozen FilterState with all filters inactive. */
function defaultFilters(): FilterState {
  return {
    visibleLayers: frozenSet(new Set<string>()),
    minSeverity: null,
    ruleId: null,
  };
}

// ---------------------------------------------------------------------------
// InspectorStoreImpl
// ---------------------------------------------------------------------------

export class InspectorStoreImpl implements InspectorStore {
  // ── Internal state ────────────────────────────────────────────────────────

  private _state: StoreState;
  private _listeners: Set<() => void>;
  private _disposed: boolean;

  // ── Constructor ───────────────────────────────────────────────────────────

  constructor() {
    this._listeners = new Set();
    this._disposed = false;
    this._state = {
      lifecycle: Object.freeze({ status: 'uninitialized' }),
      selection: Object.freeze({ layerName: null, featureIndex: null }),
      hover: Object.freeze({ layerName: null, featureIndex: null }),
      filters: Object.freeze(defaultFilters()),
    };
  }

  // ── Public state accessors (immutable snapshots) ──────────────────────────

  get lifecycle(): InspectorLifecycle {
    return this._state.lifecycle;
  }

  get selection(): FeatureRef {
    return this._state.selection;
  }

  get hover(): FeatureRef {
    return this._state.hover;
  }

  get filters(): FilterState {
    return this._state.filters;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Load a tile file path. Transitions:
   *   uninitialized | loaded | empty | error → loading → loaded / empty / error
   *
   * If pre-decoded `artifact` and `diagnostics` are supplied the store
   * transitions synchronously without performing any I/O.
   *
   * Guards:
   *   - Already-loading states are rejected with a thrown error.
   *   - Calls after disposal are silently ignored.
   */
  async load(
    filePath: string,
    artifact?: VectorTileArtifact,
    diagnostics?: readonly Diagnostic[],
  ): Promise<void> {
    if (this._disposed) return;

    if (this._state.lifecycle.status === 'loading') {
      throw new Error(
        'InspectorStore.load(): a load is already in progress. ' +
          'Wait for the current load to complete before calling load() again.',
      );
    }

    // Transition to loading
    this._commit({ lifecycle: { status: 'loading', filePath } });

    // ── Synchronous path: pre-decoded artifact provided ──────────────────
    if (artifact !== undefined) {
      const diags = diagnostics ?? [];
      this._transitionLoaded(filePath, artifact, diags);
      return;
    }

    // ── Async path: load from file system / provider ─────────────────────
    try {
      const { tileProvider } = await import('@tileguard/tile-rules');
      const loaded = (await tileProvider.load(filePath)) as VectorTileArtifact;

      const { createEngine } = await import('@tileguard/core');
      const { tilePlugin } = await import('@tileguard/tile-rules');
      const engine = createEngine({ plugins: [tilePlugin] });
      const result = await engine.run([filePath]);

      this._transitionLoaded(filePath, loaded, [...result.diagnostics]);
    } catch (err) {
      if (this._disposed) return;
      const error = err instanceof Error ? err : new Error(String(err));
      this._commit({
        lifecycle: { status: 'error', filePath, error },
        selection: { layerName: null, featureIndex: null },
        hover: { layerName: null, featureIndex: null },
      });
    }
  }

  /**
   * Update the selected feature.
   * No-op if the new value equals the current value.
   * Silently ignored after disposal.
   */
  select(layerName: string | null, featureIndex: number | null): void {
    if (this._disposed) return;
    const s = this._state.selection;
    if (s.layerName === layerName && s.featureIndex === featureIndex) return;
    this._commit({ selection: Object.freeze({ layerName, featureIndex }) });
  }

  /**
   * Update the hovered feature.
   * No-op if the new value equals the current value.
   * Silently ignored after disposal.
   */
  setHover(layerName: string | null, featureIndex: number | null): void {
    if (this._disposed) return;
    const h = this._state.hover;
    if (h.layerName === layerName && h.featureIndex === featureIndex) return;
    this._commit({ hover: Object.freeze({ layerName, featureIndex }) });
  }

  /**
   * Merge partial filter state.
   * No-op if the merged result equals the current filters.
   * Silently ignored after disposal.
   *
   * visibleLayers: any incoming Set is frozen before storage.
   */
  setFilters(partial: Partial<FilterState>): void {
    if (this._disposed) return;
    const current = this._state.filters;

    // Freeze any incoming visibleLayers Set before comparing / storing
    const nextLayers =
      partial.visibleLayers !== undefined
        ? frozenSet(partial.visibleLayers)
        : current.visibleLayers;
    const nextSeverity =
      'minSeverity' in partial
        ? (partial.minSeverity ?? null)
        : current.minSeverity;
    const nextRuleId =
      'ruleId' in partial ? (partial.ruleId ?? null) : current.ruleId;

    // Shallow equality check — avoid spurious notifications.
    // visibleLayers uses reference equality (frozenSet returns the same
    // object when the incoming set was already the stored one).
    if (
      nextLayers === current.visibleLayers &&
      nextSeverity === current.minSeverity &&
      nextRuleId === current.ruleId
    ) {
      return;
    }

    this._commit({
      filters: Object.freeze({
        visibleLayers: nextLayers,
        minSeverity: nextSeverity,
        ruleId: nextRuleId,
      }),
    });
  }

  /**
   * Release all resources and transition to 'disposed'.
   * Listeners receive one final notification in registration order,
   * then are cleared. Subsequent mutations are silently ignored.
   * Calling dispose() on an already-disposed store is a no-op.
   */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    // Notify listeners one final time before clearing them.
    this._commitRaw({
      lifecycle: { status: 'disposed' },
      selection: { layerName: null, featureIndex: null },
      hover: { layerName: null, featureIndex: null },
      filters: this._state.filters,
    });
    this._listeners.clear();
  }

  /**
   * Register a state-change listener.
   *
   * Listeners are notified in registration order. Returns an unsubscribe
   * function (idempotent; safe to call multiple times).
   *
   * @throws If called after disposal.
   */
  subscribe(listener: () => void): () => void {
    if (this._disposed) {
      throw new Error(
        'InspectorStore.subscribe(): cannot subscribe to a disposed store.',
      );
    }
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * The single mutation gateway.
   *
   * Merges `patch` into the current state, then notifies all listeners
   * synchronously in registration order. Every public mutation method
   * routes through here.
   *
   * Listeners that throw are isolated — their error is caught and remaining
   * listeners still fire in order.
   */
  private _commit(patch: Partial<StoreState>): void {
    if (this._disposed) return;
    this._commitRaw({ ...this._state, ...patch });
  }

  /** Internal commit that also runs during disposal (before listener clear). */
  private _commitRaw(next: StoreState): void {
    this._state = next;
    for (const listener of this._listeners) {
      try {
        listener();
      } catch {
        // Listener errors must not break the notification chain.
      }
    }
  }

  /**
   * Completes the loading path — transitions to 'loaded' or 'empty'
   * depending on whether the tile has any features.
   */
  private _transitionLoaded(
    filePath: string,
    artifact: VectorTileArtifact,
    diagnostics: readonly Diagnostic[],
  ): void {
    if (this._disposed) return;

    const hasFeatures = Object.values(artifact.content.layers).some(
      (l) => l.features.length > 0,
    );

    if (hasFeatures) {
      this._commit({
        lifecycle: { status: 'loaded', artifact, diagnostics, filePath },
        selection: Object.freeze({ layerName: null, featureIndex: null }),
        hover: Object.freeze({ layerName: null, featureIndex: null }),
      });
    } else {
      this._commit({
        lifecycle: { status: 'empty', filePath },
        selection: Object.freeze({ layerName: null, featureIndex: null }),
        hover: Object.freeze({ layerName: null, featureIndex: null }),
      });
    }
  }
}
