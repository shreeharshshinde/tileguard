/**
 * @tileguard/inspector — Inspector Store (State Machine)
 *
 * Single reactive state owner for the browser application. Manages the
 * application lifecycle as a typed state machine and holds all derived
 * view state.
 *
 * Lifecycle states:
 *   Uninitialized → Loading → Loaded
 *                           → Empty
 *                           → Error
 *   Loaded        → Disposed
 *
 * The decoded VectorTileArtifact and Diagnostic[] are immutable after the
 * Loading → Loaded transition. Selection and filter state are mutable.
 *
 * Implemented in Milestone 5.
 *
 * Public surface:
 *   - InspectorLifecycle   — discriminated union of lifecycle states
 *   - SelectionState       — currently selected feature
 *   - FilterState          — active layer / severity / rule filters
 *   - InspectorStore       — the store interface
 *   - createInspectorStore() — factory
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';

// ---------------------------------------------------------------------------
// State Types — implemented in Milestone 5
// ---------------------------------------------------------------------------

/** Discriminated union representing the application lifecycle. */
export type InspectorLifecycle =
  | { readonly status: 'uninitialized' }
  | { readonly status: 'loading'; readonly filePath: string }
  | {
      readonly status: 'loaded';
      readonly artifact: VectorTileArtifact;
      readonly diagnostics: Diagnostic[];
      readonly filePath: string;
    }
  | { readonly status: 'empty'; readonly filePath: string }
  | { readonly status: 'error'; readonly filePath: string; readonly error: Error }
  | { readonly status: 'disposed' };

/** Currently selected feature (null = nothing selected). */
export interface SelectionState {
  readonly layerName: string | null;
  readonly featureIndex: number | null;
}

/** Active filter configuration. */
export interface FilterState {
  /** Set of layer names to show. Empty set = show all layers. */
  readonly visibleLayers: ReadonlySet<string>;
  /** Minimum severity to show. null = show all. */
  readonly minSeverity: 'error' | 'warning' | 'info' | null;
  /** Rule ID filter. null = show all rules. */
  readonly ruleId: string | null;
}

// ---------------------------------------------------------------------------
// Store Interface — implemented in Milestone 5
// ---------------------------------------------------------------------------

/**
 * InspectorStore — reactive state container.
 *
 * Change notifications are delivered to registered listeners when any part
 * of the store state changes.
 *
 * Implemented in Milestone 5.
 */
export interface InspectorStore {
  /** Current lifecycle state. */
  readonly lifecycle: InspectorLifecycle;

  /** Current feature selection. */
  readonly selection: SelectionState;

  /** Current filter configuration. */
  readonly filters: FilterState;

  /** Load a tile file path — transitions Uninitialized → Loading → Loaded/Empty/Error. */
  load(filePath: string): Promise<void>;

  /** Select a feature by layer name and feature index. */
  select(layerName: string | null, featureIndex: number | null): void;

  /** Update the filter state. Partial updates are merged. */
  setFilters(partial: Partial<FilterState>): void;

  /** Release resources and transition to Disposed. */
  dispose(): void;

  /** Register a change listener. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

// ---------------------------------------------------------------------------
// Factory — implemented in Milestone 5
// ---------------------------------------------------------------------------

/**
 * Creates an InspectorStore in the Uninitialized state.
 * Full implementation delivered in Milestone 5.
 */
export function createInspectorStore(): InspectorStore {
  throw new Error('createInspectorStore() — implemented in Milestone 5');
}
