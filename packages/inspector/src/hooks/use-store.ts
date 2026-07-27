import type { Diagnostic } from '@tileguard/core';
import { useSyncExternalStore } from 'react';
import type {
  FeatureRef,
  FilterState,
  InspectorLifecycle,
  InspectorStore,
} from '../store/inspector-store.js';

const EMPTY_DIAGNOSTICS: readonly Diagnostic[] = Object.freeze([]);
const lifecycleSelector = (store: InspectorStore) => store.lifecycle;
const selectionSelector = (store: InspectorStore) => store.selection;
const hoverSelector = (store: InspectorStore) => store.hover;
const filtersSelector = (store: InspectorStore) => store.filters;
const diagnosticsSelector = (store: InspectorStore): readonly Diagnostic[] =>
  store.lifecycle.status === 'loaded'
    ? store.lifecycle.diagnostics
    : EMPTY_DIAGNOSTICS;

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
