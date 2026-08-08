/**
 * @tileguard/inspector — FeatureInspector (Phase 3 — Explore Workspace)
 *
 * Right panel for the Explore workspace.
 * Displays the fully-resolved selected feature in structured sub-panels:
 *
 *   FeatureSummary    — identity card (layer, ID, type, property count)
 *   PropertyInspector — sortable key/value table
 *   GeometryInspector — type, ring count, vertex count, bounding box
 *   CoordinateViewer  — raw first-ring coordinates (collapsible)
 *
 * Purely presentational — reads from useSelectedFeature(store).
 * No side effects, no store mutations.
 */
import {
  Box,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Hash,
  Layers,
  MapPin,
  ScanSearch,
  Table,
} from 'lucide-react';
import { memo, useState } from 'react';
import type { Inspector } from '../../create-inspector.js';
import { useSelectedFeature } from '../../hooks/use-store.js';
import type { ResolvedFeature } from '../../providers/FeatureProvider.js';
import type { InspectorStore } from '../../store/inspector-store.js';
import {
  EmptyWorkspace,
  PanelDivider,
  PanelHeader,
  PanelSection,
  WorkspaceBadge,
  WorkspacePanel,
} from '../shared/index.js';

// ---------------------------------------------------------------------------
// FeatureSummary
// ---------------------------------------------------------------------------

interface FeatureSummaryProps {
  readonly feature: ResolvedFeature;
}

const FeatureSummary = memo(function FeatureSummary({
  feature,
}: FeatureSummaryProps): JSX.Element {
  const propCount = Object.keys(feature.properties).length;
  const ringCount = feature.geometry.length;
  const vertexCount = feature.geometry.reduce((s, r) => s + r.length, 0);

  return (
    <div className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)]">
      {/* Layer + ID */}
      <div className="flex items-center gap-2 mb-[var(--tg-space-sm)]">
        <Layers
          className="h-3.5 w-3.5 shrink-0 text-[var(--tg-accent)]"
          aria-hidden
        />
        <span className="text-xs font-semibold text-[var(--tg-text-primary)] truncate">
          {feature.layerName}
        </span>
        <WorkspaceBadge
          label={`#${feature.id ?? feature.featureIndex}`}
          variant="accent"
        />
      </div>
      {/* Type + counts grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
        <div className="flex items-center gap-1 text-[var(--tg-text-muted)]">
          <Hash className="h-3 w-3 shrink-0" aria-hidden />
          <span>Type</span>
        </div>
        <span className="font-mono text-[var(--tg-text-secondary)]">
          {feature.geometryType}
        </span>

        <div className="flex items-center gap-1 text-[var(--tg-text-muted)]">
          <Table className="h-3 w-3 shrink-0" aria-hidden />
          <span>Properties</span>
        </div>
        <span className="font-mono text-[var(--tg-text-secondary)]">
          {propCount}
        </span>

        <div className="flex items-center gap-1 text-[var(--tg-text-muted)]">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          <span>Vertices</span>
        </div>
        <span className="font-mono text-[var(--tg-text-secondary)]">
          {vertexCount.toLocaleString()}
        </span>

        <div className="flex items-center gap-1 text-[var(--tg-text-muted)]">
          <Box className="h-3 w-3 shrink-0" aria-hidden />
          <span>Rings</span>
        </div>
        <span className="font-mono text-[var(--tg-text-secondary)]">
          {ringCount}
        </span>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// PropertyInspector
// ---------------------------------------------------------------------------

type PropSortKey = 'key' | 'value';

interface PropertyInspectorProps {
  readonly properties: Readonly<Record<string, unknown>>;
}

const PropertyInspector = memo(function PropertyInspector({
  properties,
}: PropertyInspectorProps): JSX.Element {
  const [sortKey, setSortKey] = useState<PropSortKey>('key');
  const [filterQuery, setFilterQuery] = useState('');

  const entries = Object.entries(properties);
  const filtered = filterQuery
    ? entries.filter(
        ([k, v]) =>
          k.toLowerCase().includes(filterQuery.toLowerCase()) ||
          String(v).toLowerCase().includes(filterQuery.toLowerCase()),
      )
    : entries;

  const sorted = [...filtered].sort(([a], [b]) =>
    sortKey === 'key' ? a.localeCompare(b) : String(a).localeCompare(String(b)),
  );

  if (entries.length === 0) {
    return (
      <p className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-[10px] italic text-[var(--tg-text-muted)]">
        No properties
      </p>
    );
  }

  return (
    <div>
      {/* Filter + sort row */}
      <div className="flex items-center gap-1 border-b border-[var(--tg-border)] px-[var(--tg-space-md)] py-[var(--tg-space-xs)]">
        <input
          type="search"
          placeholder="Filter properties…"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="flex-1 bg-transparent text-[10px] text-[var(--tg-text-primary)] placeholder-[var(--tg-text-muted)] outline-none"
          aria-label="Filter properties"
        />
        <button
          type="button"
          onClick={() => setSortKey((k) => (k === 'key' ? 'value' : 'key'))}
          className="shrink-0 rounded px-1 py-0.5 text-[9px] text-[var(--tg-text-muted)] hover:bg-[var(--tg-bg-hover)]"
          aria-label={`Sort by ${sortKey === 'key' ? 'value' : 'key'}`}
        >
          ↕ {sortKey}
        </button>
      </div>
      {/* Table */}
      <table className="w-full text-[10px]" aria-label="Feature properties">
        <thead className="sr-only">
          <tr>
            <th scope="col">Key</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(([key, value]) => (
            <tr
              key={key}
              className="border-b border-[var(--tg-border)]/50 hover:bg-[var(--tg-bg-hover)]"
            >
              <td className="py-1 pl-[var(--tg-space-md)] pr-2 font-mono text-[var(--tg-text-secondary)] w-1/2">
                <span className="truncate block max-w-[120px]" title={key}>
                  {key}
                </span>
              </td>
              <td className="py-1 pr-[var(--tg-space-md)] font-mono text-[var(--tg-text-primary)] w-1/2">
                <span
                  className="truncate block max-w-[120px]"
                  title={String(value)}
                >
                  {value === null
                    ? 'null'
                    : value === undefined
                      ? 'undefined'
                      : typeof value === 'string'
                        ? `"${value}"`
                        : String(value)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length < entries.length && (
        <p className="px-[var(--tg-space-md)] py-[var(--tg-space-xs)] text-[9px] text-[var(--tg-text-muted)]">
          Showing {filtered.length} of {entries.length}
        </p>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// GeometryInspector
// ---------------------------------------------------------------------------

interface GeometryInspectorProps {
  readonly feature: ResolvedFeature;
}

const GeometryInspector = memo(function GeometryInspector({
  feature,
}: GeometryInspectorProps): JSX.Element {
  const rings = feature.geometry;
  const totalVertices = rings.reduce((s, r) => s + r.length, 0);

  const allX = rings.flatMap((r) => r.map((p) => p.x));
  const allY = rings.flatMap((r) => r.map((p) => p.y));

  const minX = allX.length ? Math.min(...allX) : 0;
  const maxX = allX.length ? Math.max(...allX) : 0;
  const minY = allY.length ? Math.min(...allY) : 0;
  const maxY = allY.length ? Math.max(...allY) : 0;

  const cx = ((minX + maxX) / 2).toFixed(1);
  const cy = ((minY + maxY) / 2).toFixed(1);

  return (
    <div className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)]">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
        <span className="text-[var(--tg-text-muted)]">Type</span>
        <span className="font-mono text-[var(--tg-text-secondary)]">
          {feature.geometryType}
        </span>

        <span className="text-[var(--tg-text-muted)]">Rings</span>
        <span className="font-mono text-[var(--tg-text-secondary)]">
          {rings.length}
        </span>

        <span className="text-[var(--tg-text-muted)]">Vertices</span>
        <span className="font-mono text-[var(--tg-text-secondary)]">
          {totalVertices.toLocaleString()}
        </span>

        <span className="text-[var(--tg-text-muted)]">Centroid</span>
        <span className="font-mono text-[var(--tg-text-secondary)]">
          ({cx}, {cy})
        </span>

        <span className="text-[var(--tg-text-muted)]">Bounds X</span>
        <span className="font-mono text-[var(--tg-text-secondary)]">
          {minX.toFixed(0)} – {maxX.toFixed(0)}
        </span>

        <span className="text-[var(--tg-text-muted)]">Bounds Y</span>
        <span className="font-mono text-[var(--tg-text-secondary)]">
          {minY.toFixed(0)} – {maxY.toFixed(0)}
        </span>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// CoordinateViewer
// ---------------------------------------------------------------------------

interface CoordinateViewerProps {
  readonly geometry: ResolvedFeature['geometry'];
}

function CoordinateViewer({ geometry }: CoordinateViewerProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const firstRing = geometry[0] ?? [];
  const preview = firstRing.slice(0, 8);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1 px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-[10px] text-[var(--tg-text-muted)] hover:bg-[var(--tg-bg-hover)]"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
        )}
        <span className="font-medium">Raw Coordinates</span>
        <span className="ml-1 text-[9px]">
          (ring[0]: {firstRing.length} pts)
        </span>
      </button>
      {expanded && (
        <div className="max-h-32 overflow-y-auto border-t border-[var(--tg-border)] bg-[var(--tg-bg-surface)]">
          <table
            className="w-full text-[9px] font-mono"
            aria-label="Coordinates"
          >
            <thead>
              <tr className="text-[var(--tg-text-muted)]">
                <th className="py-0.5 pl-[var(--tg-space-md)] text-left font-medium">
                  #
                </th>
                <th className="py-0.5 text-left font-medium">X</th>
                <th className="py-0.5 text-left font-medium">Y</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((pt, i) => (
                <tr key={i} className="border-t border-[var(--tg-border)]/30">
                  <td className="py-0.5 pl-[var(--tg-space-md)] text-[var(--tg-text-muted)]">
                    {i}
                  </td>
                  <td className="py-0.5 text-[var(--tg-text-secondary)]">
                    {pt.x.toFixed(2)}
                  </td>
                  <td className="py-0.5 pr-[var(--tg-space-md)] text-[var(--tg-text-secondary)]">
                    {pt.y.toFixed(2)}
                  </td>
                </tr>
              ))}
              {firstRing.length > 8 && (
                <tr>
                  <td
                    colSpan={3}
                    className="py-0.5 pl-[var(--tg-space-md)] text-[var(--tg-text-muted)] italic"
                  >
                    …and {firstRing.length - 8} more
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FeatureInspector (root)
// ---------------------------------------------------------------------------

export interface FeatureInspectorProps {
  readonly store: InspectorStore;
  readonly inspector: Inspector | null;
}

type InspectorTab =
  | 'summary'
  | 'properties'
  | 'geometry'
  | 'coordinates'
  | 'json';

const TAB_LABELS: { key: InspectorTab; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'properties', label: 'Properties' },
  { key: 'geometry', label: 'Geometry' },
  { key: 'coordinates', label: 'Coords' },
  { key: 'json', label: 'JSON' },
];

export function FeatureInspector({
  store,
  inspector: _inspector,
}: FeatureInspectorProps): JSX.Element {
  const feature = useSelectedFeature(store);
  const [activeTab, setActiveTab] = useState<InspectorTab>('summary');

  if (feature === null) {
    return (
      <EmptyWorkspace
        icon={ScanSearch}
        title="No feature selected"
        description="Click any feature on the canvas to inspect its properties, geometry, and coordinates."
      />
    );
  }

  return (
    <WorkspacePanel
      label="Feature Inspector"
      header={
        <PanelHeader
          title="Feature Inspector"
          icon={Crosshair}
          subtitle={feature.layerName}
        />
      }
    >
      {/* Tab navigation */}
      <div className="flex border-b border-[var(--tg-border)] px-1">
        {TAB_LABELS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={[
              'px-2 py-1.5 text-[10px] font-medium transition-colors border-b-2',
              activeTab === key
                ? 'border-[var(--tg-accent)] text-[var(--tg-text-primary)]'
                : 'border-transparent text-[var(--tg-text-muted)] hover:text-[var(--tg-text-secondary)]',
            ].join(' ')}
            aria-selected={activeTab === key}
            role="tab"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto" role="tabpanel">
        {activeTab === 'summary' && (
          <>
            <FeatureSummary feature={feature} />
            <PanelDivider />
            <PanelSection title="Geometry">
              <GeometryInspector feature={feature} />
            </PanelSection>
          </>
        )}

        {activeTab === 'properties' && (
          <PropertyInspector properties={feature.properties} />
        )}

        {activeTab === 'geometry' && <GeometryInspector feature={feature} />}

        {activeTab === 'coordinates' && (
          <CoordinateViewer geometry={feature.geometry} />
        )}

        {activeTab === 'json' && (
          <div className="p-[var(--tg-space-md)]">
            <pre className="max-h-96 overflow-auto rounded bg-[var(--tg-bg-surface)] p-2 text-[9px] font-mono text-[var(--tg-text-secondary)]">
              {JSON.stringify(
                {
                  id: feature.id,
                  layerName: feature.layerName,
                  featureIndex: feature.featureIndex,
                  geometryType: feature.geometryType,
                  properties: feature.properties,
                  geometry: feature.geometry,
                },
                null,
                2,
              )}
            </pre>
          </div>
        )}
      </div>
    </WorkspacePanel>
  );
}
