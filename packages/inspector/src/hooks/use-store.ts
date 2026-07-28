/**
 * @tileguard/inspector — React Hooks for InspectorStore (Step 1 + Step 2)
 *
 * All hooks use useSyncExternalStore() to subscribe to the InspectorStore.
 * Selectors are module-level constants to ensure stable references and
 * prevent unnecessary re-renders.
 *
 * Step 1 hooks (unchanged):
 *   useLifecycle      — current lifecycle state
 *   useSelection      — currently selected feature ref
 *   useHover          — currently hovered feature ref
 *   useFilters        — active filter state
 *   useDiagnostics    — diagnostics array (empty when not loaded)
 *
 * Step 2 hooks (new):
 *   useSelectedFeature  — fully resolved selected feature (via FeatureProvider)
 *   useSearch           — stateful search with query and results
 *   useDiagnosticFilter — panel-level filter state (React-owned, not store)
 *   usePanelState       — expanded groups + sort order (React-owned)
 */

import type { Diagnostic } from '@tileguard/core';
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createDiagnosticProvider,
  type DiagnosticGroups,
  type DiagnosticSummary,
} from '../providers/DiagnosticProvider.js';
import {
  createFeatureProvider,
  type ResolvedFeature,
} from '../providers/FeatureProvider.js';
import {
  createLayerProvider,
  type LayerInfo,
} from '../providers/LayerProvider.js';
import { createSearchService, type SearchResult } from '../services/SearchService.js';
import type {
  FeatureRef,
  FilterState,
  InspectorLifecycle,
  InspectorStore,
} from '../store/inspector-store.js';

// ---------------------------------------------------------------------------
// Module-level selectors (stable references)
// ---------------------------------------------------------------------------

const EMPTY_DIAGNOSTICS: readonly Diagnostic[] = Object.freeze([]);

const lifecycleSelector = (store: InspectorStore) => store.lifecycle;
const selectionSelector = (store: InspectorStore) => store.selection;
const hoverSelector = (store: InspectorStore) => store.hover;
const filtersSelector = (store: InspectorStore) => store.filters;
const diagnosticsSelector = (store: InspectorStore): readonly Diagnostic[] =>
  store.lifecycle.status === 'loaded'
    ? store.lifecycle.diagnostics
    : EMPTY_DIAGNOSTICS;

// ---------------------------------------------------------------------------
// Base hook
// ---------------------------------------------------------------------------

/** Subscribes React to an immutable InspectorStore snapshot. */
export function useStoreSelector<T>(
  store: InspectorStore,
  selector: (s: InspectorStore) => T,
): T {
  return useSyncExternalStore(
    store.subscribe.bind(store),
    () => selector(store),
    () => selector(store),
  );
}

// ---------------------------------------------------------------------------
// Step 1 hooks (unchanged)
// ---------------------------------------------------------------------------

export const useLifecycle = (store: InspectorStore): InspectorLifecycle =>
  useStoreSelector(store, lifecycleSelector);

export const useSelection = (store: InspectorStore): FeatureRef =>
  useStoreSelector(store, selectionSelector);

export const useHover = (store: InspectorStore): FeatureRef =>
  useStoreSelector(store, hoverSelector);

export const useFilters = (store: InspectorStore): FilterState =>
  useStoreSelector(store, filtersSelector);

export const useDiagnostics = (store: InspectorStore): readonly Diagnostic[] =>
  useStoreSelector(store, diagnosticsSelector);

// ---------------------------------------------------------------------------
// Step 2 hooks
// ---------------------------------------------------------------------------

/**
 * Returns the currently selected feature resolved from the store, or null.
 * Re-renders only when selection changes (not on every store mutation).
 */
export function useSelectedFeature(
  store: InspectorStore,
): ResolvedFeature | null {
  const selection = useSelection(store);
  const lifecycle = useLifecycle(store);

  return useMemo(() => {
    if (
      selection.layerName === null ||
      selection.featureIndex === null ||
      lifecycle.status !== 'loaded'
    ) {
      return null;
    }
    const provider = createFeatureProvider(store);
    return provider.getSelectedFeature();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, lifecycle]);
}

/**
 * Returns all layers from the loaded tile, or empty array.
 * Re-renders when lifecycle changes.
 */
export function useLayers(store: InspectorStore): readonly LayerInfo[] {
  const lifecycle = useLifecycle(store);
  return useMemo(() => {
    if (lifecycle.status !== 'loaded') return [];
    return createLayerProvider(store).getLayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifecycle]);
}

/**
 * Returns diagnostics grouped by severity, respecting active filter state.
 * Re-renders when lifecycle or filters change.
 */
export function useGroupedDiagnostics(
  store: InspectorStore,
): DiagnosticGroups {
  const lifecycle = useLifecycle(store);
  const filters = useFilters(store);

  return useMemo(() => {
    const provider = createDiagnosticProvider(store);
    return provider.getGrouped();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifecycle, filters]);
}

/**
 * Returns diagnostic summary counts (unfiltered), for badge display.
 * Re-renders when lifecycle changes.
 */
export function useDiagnosticSummary(
  store: InspectorStore,
): DiagnosticSummary {
  const lifecycle = useLifecycle(store);

  return useMemo(() => {
    const provider = createDiagnosticProvider(store);
    return provider.getSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifecycle]);
}

// ---------------------------------------------------------------------------
// useSearch — stateful search hook (React-owned state)
// ---------------------------------------------------------------------------

export interface UseSearchResult {
  /** Current search query text. */
  query: string;
  /** Current search results (empty when query is blank). */
  results: readonly SearchResult[];
  /** Update the query and re-execute the search. */
  setQuery: (q: string) => void;
  /** Clear the query and results. */
  clearSearch: () => void;
}

/**
 * Manages search query state and executes searches against the loaded tile.
 *
 * This hook owns its query string in React state. Results are recomputed
 * whenever the query changes or the tile lifecycle changes.
 *
 * All search logic flows through FeatureProvider → SearchService, never
 * directly through InspectorStore.
 */
export function useSearch(store: InspectorStore): UseSearchResult {
  const [query, setQueryRaw] = useState('');
  const lifecycle = useLifecycle(store);

  const results = useMemo(() => {
    if (query.trim() === '' || lifecycle.status !== 'loaded') return [];
    const provider = createFeatureProvider(store);
    const service = createSearchService(provider);
    return service.search(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, lifecycle]);

  const setQuery = useCallback((q: string) => {
    setQueryRaw(q);
  }, []);

  const clearSearch = useCallback(() => {
    setQueryRaw('');
  }, []);

  return { query, results, setQuery, clearSearch };
}

// ---------------------------------------------------------------------------
// useDiagnosticFilter — panel-level severity + layer filter (React-owned)
// ---------------------------------------------------------------------------

export interface SeverityFilter {
  error: boolean;
  warning: boolean;
  info: boolean;
}

export interface DiagnosticFilterState {
  severity: SeverityFilter;
  layers: ReadonlySet<string>;
  geometryTypes: ReadonlySet<string>;
}

export interface UseDiagnosticFilterResult {
  filters: DiagnosticFilterState;
  toggleSeverity: (key: keyof SeverityFilter) => void;
  toggleLayer: (layerName: string) => void;
  toggleGeometryType: (type: string) => void;
  resetFilters: () => void;
  /** Apply the panel's filter state back to the InspectorStore. */
  applyToStore: () => void;
}

const defaultSeverityFilter = (): SeverityFilter => ({
  error: true,
  warning: true,
  info: true,
});

/**
 * Manages the panel-level filter checkboxes.
 *
 * This state is React-owned and separate from InspectorStore.
 * Filters never mutate the store directly; `applyToStore` commits them.
 *
 * Filtering is derived — the diagnostic list is filtered during render,
 * not by pre-mutating the store.
 */
export function useDiagnosticFilter(
  store: InspectorStore,
): UseDiagnosticFilterResult {
  const [severity, setSeverity] = useState<SeverityFilter>(defaultSeverityFilter);
  const [layers, setLayers] = useState<ReadonlySet<string>>(new Set());
  const [geometryTypes, setGeometryTypes] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const toggleSeverity = useCallback((key: keyof SeverityFilter) => {
    setSeverity((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleLayer = useCallback((layerName: string) => {
    setLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerName)) next.delete(layerName);
      else next.add(layerName);
      return next;
    });
  }, []);

  const toggleGeometryType = useCallback((type: string) => {
    setGeometryTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setSeverity(defaultSeverityFilter());
    setLayers(new Set());
    setGeometryTypes(new Set());
  }, []);

  const applyToStore = useCallback(() => {
    // Map panel severity checkboxes to the store's minSeverity field.
    // If all are checked (or none are unchecked), clear the filter.
    // If only errors are checked, set minSeverity = 'error', etc.
    const { error, warning, info } = severity;
    let minSeverity: 'error' | 'warning' | 'info' | null = null;
    if (error && !warning && !info) minSeverity = 'error';
    else if ((error || warning) && !info) minSeverity = 'warning';

    store.setFilters({
      visibleLayers: new Set(layers),
      minSeverity,
      ruleId: null,
    });
  }, [store, severity, layers]);

  return {
    filters: { severity, layers, geometryTypes },
    toggleSeverity,
    toggleLayer,
    toggleGeometryType,
    resetFilters,
    applyToStore,
  };
}

// ---------------------------------------------------------------------------
// usePanelState — expanded group state + sort order (React-owned)
// ---------------------------------------------------------------------------

export type DiagnosticSortOrder = 'severity' | 'layer' | 'rule';

export interface PanelState {
  expandedGroups: ReadonlySet<string>;
  sortOrder: DiagnosticSortOrder;
}

export interface UsePanelStateResult {
  panelState: PanelState;
  toggleGroup: (groupId: string) => void;
  setSortOrder: (order: DiagnosticSortOrder) => void;
}

/**
 * Manages which diagnostic groups are expanded and the sort order.
 * This is purely presentation state — it lives in React, not the store.
 */
export function usePanelState(): UsePanelStateResult {
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(
    new Set(['error', 'warning', 'info']), // default: all expanded
  );
  const [sortOrder, setSortOrderRaw] = useState<DiagnosticSortOrder>('severity');

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const setSortOrder = useCallback((order: DiagnosticSortOrder) => {
    setSortOrderRaw(order);
  }, []);

  return {
    panelState: { expandedGroups, sortOrder },
    toggleGroup,
    setSortOrder,
  };
}
