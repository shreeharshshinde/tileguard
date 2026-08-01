/**
 * @tileguard/inspector — StatisticsPanel (Milestone 6 — Step 3)
 *
 * Full-width tile overview panel shown when the Statistics tab is active.
 * Consumes useStatistics and useLayerStatistics hooks.
 *
 * Layout:
 *   ┌─ Summary cards (Layers / Features / Diagnostics) ─────────────────┐
 *   ├─ Geometry distribution (donut chart) ──────────────────────────────┤
 *   ├─ Diagnostic distribution (bar chart) ──────────────────────────────┤
 *   └─ Layer table (sortable) ────────────────────────────────────────────┘
 */

import {
  useLayerStatistics,
  useStatistics,
} from '../../hooks/use-statistics-settings.js';
import type { InspectorStore } from '../../store/inspector-store.js';
import './StatisticsPanel.css';
import { DiagnosticChart } from './DiagnosticChart.js';
import { GeometryChart } from './GeometryChart.js';
import { LayerStatisticsTable } from './LayerStatisticsTable.js';
import { StatisticsCard } from './StatisticsCard.js';

export interface StatisticsPanelProps {
  readonly store: InspectorStore;
}

export function StatisticsPanel({ store }: StatisticsPanelProps): JSX.Element {
  const stats = useStatistics(store);
  const layers = useLayerStatistics(store);

  const totalDiag =
    stats.diagnostics.errors +
    stats.diagnostics.warnings +
    stats.diagnostics.info;

  return (
    <div className="statistics-panel" aria-label="Statistics panel">
      <div className="statistics-panel__header">
        <span className="statistics-panel__title">Statistics</span>
      </div>

      <div className="statistics-panel__body">
        {/* Summary cards */}
        <section className="statistics-panel__section" aria-label="Summary">
          <div className="statistics-panel__cards">
            <StatisticsCard label="Layers" value={stats.totalLayers} />
            <StatisticsCard label="Features" value={stats.totalFeatures} />
            <StatisticsCard
              label="Diagnostics"
              value={totalDiag}
              accent={
                stats.diagnostics.errors > 0
                  ? 'error'
                  : stats.diagnostics.warnings > 0
                    ? 'warning'
                    : totalDiag > 0
                      ? 'info'
                      : 'success'
              }
            />
          </div>
        </section>

        {/* Geometry distribution */}
        {stats.totalFeatures > 0 && (
          <section
            className="statistics-panel__section"
            aria-label="Geometry distribution"
          >
            <div className="statistics-panel__section-title">Geometry</div>
            <GeometryChart
              point={stats.geometryCounts.point}
              line={stats.geometryCounts.line}
              polygon={stats.geometryCounts.polygon}
            />
          </section>
        )}

        {/* Diagnostic distribution */}
        <section
          className="statistics-panel__section"
          aria-label="Diagnostic distribution"
        >
          <div className="statistics-panel__section-title">Diagnostics</div>
          <DiagnosticChart
            errors={stats.diagnostics.errors}
            warnings={stats.diagnostics.warnings}
            info={stats.diagnostics.info}
          />
        </section>

        {/* Layer table */}
        {stats.totalLayers > 0 && (
          <section
            className="statistics-panel__section"
            aria-label="Layer breakdown"
          >
            <div className="statistics-panel__section-title">Layers</div>
            <LayerStatisticsTable
              layers={layers.layers}
              sortKey={layers.sortKey}
              onSort={layers.setSortKey}
            />
          </section>
        )}

        {/* Empty state */}
        {stats.totalLayers === 0 && (
          <div className="statistics-panel__empty">
            <span className="statistics-panel__empty-icon" aria-hidden="true">
              📊
            </span>
            <span className="statistics-panel__empty-text">
              Load a tile to see statistics
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
