/**
 * @tileguard/inspector — LayerStatisticsTable
 *
 * Sortable table of per-layer statistics.
 * Sort state is owned by the parent (StatisticsPanel).
 */
import type { LayerSortKey } from '../../hooks/use-statistics-settings.js';
import type { LayerStatistics } from '../../services/StatisticsService.js';
import './LayerStatisticsTable.css';

export interface LayerStatisticsTableProps {
  readonly layers: readonly LayerStatistics[];
  readonly sortKey: LayerSortKey;
  readonly onSort: (key: LayerSortKey) => void;
}

interface ColDef {
  key: LayerSortKey | null;
  label: string;
  align: 'left' | 'right';
}

const COLUMNS: ColDef[] = [
  { key: 'name',        label: 'Layer',      align: 'left' },
  { key: null,          label: 'Geometry',   align: 'left' },
  { key: 'features',    label: 'Features',   align: 'right' },
  { key: 'diagnostics', label: 'Diag.',      align: 'right' },
];

function geometryLabel(layer: LayerStatistics): string {
  const { point, line, polygon } = layer.geometryCounts;
  const parts: string[] = [];
  if (polygon > 0) parts.push('Polygon');
  if (line > 0)    parts.push('Line');
  if (point > 0)   parts.push('Point');
  return parts.join(', ') || '—';
}

export function LayerStatisticsTable({
  layers,
  sortKey,
  onSort,
}: LayerStatisticsTableProps): JSX.Element {
  if (layers.length === 0) {
    return (
      <div className="layer-stats-table layer-stats-table--empty">
        <span>No layers loaded</span>
      </div>
    );
  }

  return (
    <table className="layer-stats-table" aria-label="Layer statistics">
      <thead>
        <tr>
          {COLUMNS.map((col) => (
            <th
              key={col.label}
              className={`layer-stats-table__th layer-stats-table__th--${col.align}${col.key === sortKey ? ' layer-stats-table__th--sorted' : ''}`}
              onClick={col.key !== null ? () => onSort(col.key!) : undefined}
              role={col.key !== null ? 'button' : undefined}
              tabIndex={col.key !== null ? 0 : undefined}
              onKeyDown={
                col.key !== null
                  ? (e) => { if (e.key === 'Enter' || e.key === ' ') onSort(col.key!); }
                  : undefined
              }
              aria-sort={
                col.key === sortKey ? 'descending' : undefined
              }
            >
              {col.label}
              {col.key !== null && (
                <span className="layer-stats-table__sort-icon" aria-hidden="true">
                  {col.key === sortKey ? ' ▾' : ' ↕'}
                </span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {layers.map((layer) => (
          <tr key={layer.name} className="layer-stats-table__row">
            <td
              className="layer-stats-table__td layer-stats-table__td--name"
              title={layer.name}
            >
              {layer.name}
            </td>
            <td className="layer-stats-table__td layer-stats-table__td--left">
              {geometryLabel(layer)}
            </td>
            <td className="layer-stats-table__td layer-stats-table__td--right">
              {layer.featureCount.toLocaleString()}
            </td>
            <td
              className={`layer-stats-table__td layer-stats-table__td--right${layer.diagnosticCount > 0 ? ' layer-stats-table__td--has-diag' : ''}`}
            >
              {layer.diagnosticCount > 0 ? layer.diagnosticCount : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
