/**
 * @tileguard/inspector — DiagnosticPanel
 *
 * The left sidebar panel. Replaces the Step 1 "Coming in Step 2" placeholder.
 *
 * Responsibilities:
 *   - Subscribe to diagnostics and layer data via hooks (store-backed)
 *   - Own panel UI state: expanded groups, sort order, filters (React state)
 *   - Render DiagnosticToolbar + DiagnosticList
 *   - Delegate diagnostic selection to Inspector.selectDiagnostic()
 *   - Never touch the renderer or viewport directly
 *
 * Event flow:
 *   User click on DiagnosticItem
 *     → onSelectDiagnostic(globalIndex)
 *     → Inspector.selectDiagnostic(index)  [passed in as prop]
 *     → InspectorStore.select()
 *     → RenderCoordinator → CanvasRenderer
 *     → FeaturePanel updates via hooks
 */

import type { Diagnostic } from '@tileguard/core';
import { useMemo, useState } from 'react';
import type { Inspector } from '../../create-inspector.js';
import {
  useDiagnosticFilter,
  useGroupedDiagnostics,
  useLayers,
  usePanelState,
} from '../../hooks/use-store.js';
import type { InspectorStore } from '../../store/inspector-store.js';
import './DiagnosticPanel.css';
import { DiagnosticList } from './DiagnosticList.js';
import { DiagnosticToolbar } from './DiagnosticToolbar.js';

export interface DiagnosticPanelProps {
  readonly store: InspectorStore;
  readonly inspector: Inspector | null;
}

function shouldShowDiagnostic(
  diag: Diagnostic,
  activeLayerFilter: ReadonlySet<string>,
  activeGeometryFilter: ReadonlySet<string>,
  artifactLayers: Readonly<
    Record<string, { features?: readonly { geometryType?: string }[] }>
  > | null,
): boolean {
  const loc = diag.location as
    | {
        layer?: string;
        featureIndex?: number;
      }
    | undefined;
  const diagLayer = loc?.layer ?? null;

  if (activeLayerFilter.size > 0 && diagLayer !== null) {
    if (!activeLayerFilter.has(diagLayer)) return false;
  }

  if (activeGeometryFilter.size === 0) return true;

  const featureIndex = loc?.featureIndex ?? null;
  if (diagLayer === null || featureIndex === null || artifactLayers === null) {
    return false;
  }

  const layerDefinition = artifactLayers[diagLayer];
  const feature = layerDefinition?.features?.[featureIndex];
  const geometryType = feature?.geometryType ?? null;

  return geometryType !== null && activeGeometryFilter.has(geometryType);
}

export function DiagnosticPanel({
  store,
  inspector,
}: DiagnosticPanelProps): JSX.Element {
  const grouped = useGroupedDiagnostics(store);
  const layers = useLayers(store);
  const {
    filters,
    toggleSeverity,
    toggleLayer,
    toggleGeometryType,
    resetFilters,
  } = useDiagnosticFilter(store);
  const { panelState, toggleGroup, setSortOrder } = usePanelState();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const geometryTypes = useMemo(() => {
    const all = new Set<string>();
    for (const layer of layers) {
      for (const geometryType of layer.geometryTypes) {
        all.add(geometryType);
      }
    }
    return Array.from(all).sort();
  }, [layers]);

  // Apply severity, layer, and geometry filters to the grouped diagnostics (pure derivation)
  const filteredGrouped = useMemo(() => {
    const {
      error: showError,
      warning: showWarning,
      info: showInfo,
    } = filters.severity;
    const activeLayerFilter = filters.layers;
    const activeGeometryFilter = filters.geometryTypes;
    const artifactLayers =
      store.lifecycle.status === 'loaded'
        ? store.lifecycle.artifact.content.layers
        : null;

    const shouldShow = (diag: Diagnostic): boolean =>
      shouldShowDiagnostic(
        diag,
        activeLayerFilter,
        activeGeometryFilter,
        artifactLayers,
      );

    return {
      errors: showError ? grouped.errors.filter(shouldShow) : [],
      warnings: showWarning ? grouped.warnings.filter(shouldShow) : [],
      infos: showInfo ? grouped.infos.filter(shouldShow) : [],
    };
  }, [grouped, filters, store.lifecycle]);

  // Compute global index offsets so DiagnosticItem can report the correct index
  // back to Inspector.selectDiagnostic() against the full unfiltered array.
  // We keep the original (full) grouped arrays for offset computation.
  const errorOffset = 0;
  const warningOffset = grouped.errors.length;
  const infoOffset = grouped.errors.length + grouped.warnings.length;

  const handleSelectDiagnostic = (globalIndex: number) => {
    setSelectedIndex(globalIndex);
    inspector?.selectDiagnostic(globalIndex);
  };

  const totalFiltered =
    filteredGrouped.errors.length +
    filteredGrouped.warnings.length +
    filteredGrouped.infos.length;

  const totalAll =
    grouped.errors.length + grouped.warnings.length + grouped.infos.length;

  return (
    <section className="diagnostic-panel" aria-label="Diagnostics panel">
      <div className="diagnostic-panel__header">
        <span className="diagnostic-panel__title">Diagnostics</span>
        {totalAll > 0 && (
          <span className="diagnostic-panel__count">
            {totalFiltered === totalAll
              ? totalAll
              : `${totalFiltered} / ${totalAll}`}
          </span>
        )}
      </div>

      <DiagnosticToolbar
        severity={filters.severity}
        activeLayers={filters.layers}
        activeGeometryTypes={filters.geometryTypes}
        layers={layers}
        geometryTypes={geometryTypes}
        sortOrder={panelState.sortOrder}
        onToggleSeverity={toggleSeverity}
        onToggleLayer={toggleLayer}
        onToggleGeometryType={toggleGeometryType}
        onSetSortOrder={setSortOrder}
        onReset={resetFilters}
      />

      <div className="diagnostic-panel__list-container">
        {totalAll === 0 ? (
          <div className="diagnostic-panel__empty">
            <span className="diagnostic-panel__empty-icon">✓</span>
            <span className="diagnostic-panel__empty-text">
              No diagnostics — tile is clean
            </span>
          </div>
        ) : (
          <DiagnosticList
            errors={filteredGrouped.errors}
            warnings={filteredGrouped.warnings}
            infos={filteredGrouped.infos}
            errorOffset={errorOffset}
            warningOffset={warningOffset}
            infoOffset={infoOffset}
            selectedIndex={selectedIndex}
            expandedGroups={panelState.expandedGroups}
            onSelectDiagnostic={handleSelectDiagnostic}
            onToggleGroup={toggleGroup}
          />
        )}
      </div>
    </section>
  );
}
