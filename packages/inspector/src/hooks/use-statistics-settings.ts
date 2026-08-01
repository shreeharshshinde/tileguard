/**
 * @tileguard/inspector — Step 3 Hooks
 *
 * useStatistics      — subscribes to tile statistics (recomputed on lifecycle change)
 * useSettings        — subscribes to SettingsService (persisted preferences)
 * useLayerStatistics — per-layer statistics with sortable presentation state
 */

import { useMemo, useState, useSyncExternalStore } from 'react';
import {
  createDiagnosticProvider,
  createFeatureProvider,
  createLayerProvider,
} from '../providers/index.js';
import {
  getSettingsService,
  type InspectorSettings,
} from '../services/SettingsService.js';
import {
  createStatisticsService,
  EMPTY_TILE_STATISTICS,
  type LayerStatistics,
  type TileStatistics,
} from '../services/StatisticsService.js';
import type { InspectorStore } from '../store/inspector-store.js';
import { useLifecycle } from './use-store.js';

// ---------------------------------------------------------------------------
// useStatistics
// ---------------------------------------------------------------------------

/**
 * Returns a full TileStatistics snapshot for the currently loaded tile.
 * Recomputes whenever the tile lifecycle changes (new tile loaded).
 * Returns EMPTY_TILE_STATISTICS when no tile is loaded.
 */
export function useStatistics(store: InspectorStore): TileStatistics {
  const lifecycle = useLifecycle(store);

  return useMemo(() => {
    if (lifecycle.status !== 'loaded') return EMPTY_TILE_STATISTICS;
    const featureProvider = createFeatureProvider(store);
    const diagProvider = createDiagnosticProvider(store);
    const layerProvider = createLayerProvider(store);
    return createStatisticsService(
      featureProvider,
      diagProvider,
      layerProvider,
    ).compute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifecycle]);
}

// ---------------------------------------------------------------------------
// useLayerStatistics
// ---------------------------------------------------------------------------

export type LayerSortKey = 'name' | 'features' | 'diagnostics';

export interface UseLayerStatisticsResult {
  readonly layers: readonly LayerStatistics[];
  readonly sortKey: LayerSortKey;
  readonly setSortKey: (key: LayerSortKey) => void;
}

/**
 * Returns per-layer statistics, sorted by the user-selected column.
 * Sort key is React-owned presentation state (not in InspectorStore).
 */
export function useLayerStatistics(
  store: InspectorStore,
): UseLayerStatisticsResult {
  const stats = useStatistics(store);
  const [sortKey, setSortKey] = useState<LayerSortKey>('features');

  const sorted = useMemo((): readonly LayerStatistics[] => {
    const copy = [...stats.layers];
    copy.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'features':
          return b.featureCount - a.featureCount;
        case 'diagnostics':
          return b.diagnosticCount - a.diagnosticCount;
      }
    });
    return copy;
  }, [stats.layers, sortKey]);

  return { layers: sorted, sortKey, setSortKey };
}

// ---------------------------------------------------------------------------
// useSettings
// ---------------------------------------------------------------------------

/**
 * Subscribes to SettingsService and returns the current settings snapshot.
 * Uses useSyncExternalStore for tear-free reads.
 *
 * Stable subscribe reference means React never re-creates the subscription.
 *
 * @example
 *   const settings = useSettings();
 *   // settings.showVertices, settings.overlayOpacity, etc.
 */
export function useSettings(): InspectorSettings {
  const svc = getSettingsService();
  return useSyncExternalStore(
    svc.subscribe.bind(svc),
    () => svc.getSettings(),
    () => svc.getSettings(),
  );
}
