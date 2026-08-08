/**
 * @tileguard/inspector — StatisticsDashboard (Phase 3 — Statistics Workspace)
 *
 * Full-width engineering dashboard for tile statistics.
 * Answers: "How is this tile composed?"
 *
 * Layout:
 *   KPI Cards → Geometry bar → Diagnostic bar → Sortable layer table
 */
import { BarChart2, Box, Layers, Shield } from 'lucide-react';
import { memo } from 'react';
import {
  type LayerSortKey,
  useLayerStatistics,
  useStatistics,
} from '../../hooks/use-statistics-settings.js';
import { useLifecycle } from '../../hooks/use-store.js';
import type { LayerStatistics } from '../../services/StatisticsService.js';
import type { InspectorStore } from '../../store/inspector-store.js';
import {
  EmptyWorkspace,
  PanelDivider,
  WorkspaceBadge,
} from '../shared/index.js';

// ---------------------------------------------------------------------------
// KpiCard
// ---------------------------------------------------------------------------

interface KpiCardProps {
  readonly label: string;
  readonly value: number | string;
  readonly icon: React.ElementType;
  readonly accent?: 'default' | 'error' | 'warning' | 'success';
  readonly sub?: string;
}

const KpiCard = memo(function KpiCard({
  label,
  value,
  icon: Icon,
  accent = 'default',
  sub,
}: KpiCardProps): JSX.Element {
  const color = {
    default: 'text-[var(--tg-accent)]',
    error: 'text-[var(--tg-error)]',
    warning: 'text-[var(--tg-warning)]',
    success: 'text-[var(--tg-success)]',
  }[accent];
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] p-[var(--tg-space-md)]">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} aria-hidden />
        <span className="text-[10px] uppercase tracking-wider text-[var(--tg-text-muted)]">
          {label}
        </span>
      </div>
      <span className={`text-2xl font-bold tabular-nums ${color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      {sub && (
        <span className="text-[10px] text-[var(--tg-text-muted)]">{sub}</span>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// GeometryBar
// ---------------------------------------------------------------------------

function GeometryBar({
  point,
  line,
  polygon,
}: {
  point: number;
  line: number;
  polygon: number;
}): JSX.Element {
  const total = point + line + polygon;
  if (total === 0)
    return <p className="text-xs text-[var(--tg-text-muted)]">No features</p>;
  const segs = [
    { label: 'Points', count: point, color: 'var(--tg-info)' },
    { label: 'Lines', count: line, color: 'var(--tg-success)' },
    { label: 'Polygons', count: polygon, color: 'var(--tg-accent)' },
  ];
  return (
    <div className="space-y-2">
      <div className="flex h-4 w-full overflow-hidden rounded" aria-hidden>
        {segs
          .filter((s) => s.count > 0)
          .map((s) => (
            <div
              key={s.label}
              style={{
                width: `${(s.count / total) * 100}%`,
                background: s.color,
              }}
              title={`${s.label}: ${s.count.toLocaleString()}`}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segs.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: s.color }}
              aria-hidden
            />
            <span className="text-[10px] text-[var(--tg-text-secondary)]">
              {s.label}
            </span>
            <span className="font-mono text-[10px] text-[var(--tg-text-muted)]">
              {s.count > 0 ? `${Math.round((s.count / total) * 100)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DiagnosticBar
// ---------------------------------------------------------------------------

function DiagnosticBar({
  errors,
  warnings,
  info,
}: {
  errors: number;
  warnings: number;
  info: number;
}): JSX.Element {
  const total = errors + warnings + info;
  if (total === 0)
    return (
      <p className="text-xs font-medium text-[var(--tg-success)]">
        ✓ No diagnostics — tile is clean
      </p>
    );
  const segs = [
    { label: 'Errors', count: errors, color: 'var(--tg-error)' },
    { label: 'Warnings', count: warnings, color: 'var(--tg-warning)' },
    { label: 'Info', count: info, color: 'var(--tg-info)' },
  ];
  return (
    <div className="space-y-2">
      <div className="flex h-4 w-full overflow-hidden rounded" aria-hidden>
        {segs
          .filter((s) => s.count > 0)
          .map((s) => (
            <div
              key={s.label}
              style={{
                width: `${(s.count / total) * 100}%`,
                background: s.color,
              }}
              title={`${s.label}: ${s.count}`}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segs.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: s.color }}
              aria-hidden
            />
            <span className="text-[10px] text-[var(--tg-text-secondary)]">
              {s.label}
            </span>
            <span className="font-mono text-[10px] text-[var(--tg-text-muted)]">
              {s.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LayerTable
// ---------------------------------------------------------------------------

function LayerTable({
  layers,
  sortKey,
  onSort,
}: {
  layers: readonly LayerStatistics[];
  sortKey: LayerSortKey;
  onSort: (k: LayerSortKey) => void;
}): JSX.Element {
  const Th = ({ k, label }: { k: LayerSortKey; label: string }) => (
    <th
      scope="col"
      onClick={() => onSort(k)}
      aria-sort={sortKey === k ? 'descending' : 'none'}
      className={`cursor-pointer select-none px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider transition-colors hover:text-[var(--tg-text-primary)] ${sortKey === k ? 'text-[var(--tg-accent)]' : 'text-[var(--tg-text-muted)]'}`}
    >
      {label}
      {sortKey === k ? ' ↓' : ''}
    </th>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" aria-label="Layer statistics">
        <thead className="sticky top-0 bg-[var(--tg-bg-secondary)]">
          <tr className="border-b border-[var(--tg-border)]">
            <Th k="name" label="Layer" />
            <Th k="features" label="Features" />
            <th
              scope="col"
              className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-[var(--tg-text-muted)]"
            >
              Types
            </th>
            <Th k="diagnostics" label="Diag." />
          </tr>
        </thead>
        <tbody>
          {layers.map((layer) => (
            <tr
              key={layer.name}
              className="border-b border-[var(--tg-border)]/50 transition-colors hover:bg-[var(--tg-bg-hover)]"
            >
              <td className="max-w-[120px] truncate px-3 py-1.5 font-medium text-[var(--tg-text-primary)]">
                {layer.name}
              </td>
              <td className="px-3 py-1.5 font-mono text-[var(--tg-text-secondary)]">
                {layer.featureCount.toLocaleString()}
              </td>
              <td className="px-3 py-1.5">
                <div className="flex gap-1">
                  {layer.geometryCounts.point > 0 && (
                    <WorkspaceBadge label="pt" variant="info" />
                  )}
                  {layer.geometryCounts.line > 0 && (
                    <WorkspaceBadge label="ln" variant="success" />
                  )}
                  {layer.geometryCounts.polygon > 0 && (
                    <WorkspaceBadge label="pg" variant="accent" />
                  )}
                </div>
              </td>
              <td className="px-3 py-1.5">
                {layer.diagnosticCount > 0 ? (
                  <WorkspaceBadge
                    label={layer.diagnosticCount}
                    variant="warning"
                  />
                ) : (
                  <span className="text-[10px] text-[var(--tg-text-muted)]">
                    —
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatisticsDashboard
// ---------------------------------------------------------------------------

export interface StatisticsDashboardProps {
  readonly store: InspectorStore;
}

export function StatisticsDashboard({
  store,
}: StatisticsDashboardProps): JSX.Element {
  const lifecycle = useLifecycle(store);
  const stats = useStatistics(store);
  const layerStats = useLayerStatistics(store);

  if (lifecycle.status !== 'loaded') {
    return (
      <EmptyWorkspace
        icon={BarChart2}
        title="No tile loaded"
        description="Load a tile to compute statistics."
      />
    );
  }

  const totalDiag =
    stats.diagnostics.errors +
    stats.diagnostics.warnings +
    stats.diagnostics.info;
  const diagAccent =
    stats.diagnostics.errors > 0
      ? 'error'
      : stats.diagnostics.warnings > 0
        ? 'warning'
        : totalDiag > 0
          ? 'default'
          : 'success';

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-[var(--tg-space-lg)]">
        <section aria-label="Key metrics">
          <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--tg-text-muted)]">
            Key Metrics
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Layers" value={stats.totalLayers} icon={Layers} />
            <KpiCard label="Features" value={stats.totalFeatures} icon={Box} />
            <KpiCard
              label="Geometry"
              value={`${stats.geometryCounts.point}pt / ${stats.geometryCounts.line}ln / ${stats.geometryCounts.polygon}pg`}
              icon={BarChart2}
            />
            <KpiCard
              label="Diagnostics"
              value={totalDiag}
              icon={Shield}
              accent={diagAccent}
              sub={
                totalDiag === 0
                  ? 'Clean'
                  : `${stats.diagnostics.errors}E · ${stats.diagnostics.warnings}W · ${stats.diagnostics.info}I`
              }
            />
          </div>
        </section>

        {stats.totalFeatures > 0 && (
          <>
            <PanelDivider />
            <section aria-label="Geometry distribution">
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--tg-text-muted)]">
                Geometry Distribution
              </h2>
              <GeometryBar
                point={stats.geometryCounts.point}
                line={stats.geometryCounts.line}
                polygon={stats.geometryCounts.polygon}
              />
            </section>
          </>
        )}

        <PanelDivider />
        <section aria-label="Diagnostic distribution">
          <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--tg-text-muted)]">
            Diagnostics
          </h2>
          <DiagnosticBar
            errors={stats.diagnostics.errors}
            warnings={stats.diagnostics.warnings}
            info={stats.diagnostics.info}
          />
        </section>

        {stats.totalLayers > 0 && (
          <>
            <PanelDivider />
            <section aria-label="Layer breakdown">
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--tg-text-muted)]">
                Layers · {stats.totalLayers}
              </h2>
              <div className="overflow-hidden rounded-lg border border-[var(--tg-border)]">
                <LayerTable
                  layers={layerStats.layers}
                  sortKey={layerStats.sortKey}
                  onSort={layerStats.setSortKey}
                />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
