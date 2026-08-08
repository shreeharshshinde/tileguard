/**
 * @tileguard/inspector — LayerExplorer (Phase 3 — Explore Workspace)
 *
 * Left panel for the Explore workspace.
 * Answers: "What is inside this tile?"
 *
 * Layout:
 *   ┌─ LAYER EXPLORER ─────────────────────┐
 *   │  [search features…]                  │
 *   │  ── Filters ──────────────────────── │
 *   │  □ Points  □ Lines  □ Polygons        │
 *   │  ── Layers ── 8 ──────────────────── │
 *   │  ▸ water        2,410  ⬤ ⬤            │
 *   │  ▸ building     1,823                 │
 *   │  ── Selection History ────────────── │
 *   │  building[42] · Polygon              │
 *   └──────────────────────────────────────┘
 */
import {
  Circle,
  Filter,
  Hexagon,
  Layers,
  Minus,
  Search,
  X,
} from 'lucide-react';
import { type ChangeEvent, memo, useMemo, useState } from 'react';
import type { Inspector } from '../../create-inspector.js';
import {
  useLayers,
  useLifecycle,
  useSearch,
  useSelectedFeature,
} from '../../hooks/use-store.js';
import type { InspectorStore } from '../../store/inspector-store.js';
import {
  EmptyWorkspace,
  PanelDivider,
  PanelHeader,
  PanelSection,
  WorkspacePanel,
} from '../shared/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GeometryFilter = 'point' | 'line' | 'polygon';

export interface LayerExplorerProps {
  readonly store: InspectorStore;
  readonly inspector: Inspector | null;
  readonly searchQuery: string;
  readonly onSearchChange: (q: string) => void;
}

// ---------------------------------------------------------------------------
// LayerRow
// ---------------------------------------------------------------------------

interface LayerRowProps {
  readonly name: string;
  readonly featureCount: number;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}

const LayerRow = memo(function LayerRow({
  name,
  featureCount,
  isSelected,
  onSelect,
}: LayerRowProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex w-full items-center justify-between px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-left text-xs transition-colors',
        'hover:bg-[var(--tg-bg-hover)]',
        isSelected
          ? 'bg-[var(--tg-bg-hover)] text-[var(--tg-accent)]'
          : 'text-[var(--tg-text-secondary)]',
      ].join(' ')}
      aria-pressed={isSelected}
      aria-label={`Layer: ${name}, ${featureCount} features`}
    >
      <div className="flex items-center gap-[var(--tg-space-sm)] min-w-0">
        <Layers className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
        <span className="truncate font-medium text-[var(--tg-text-primary)]">
          {name}
        </span>
      </div>
      <span className="ml-2 shrink-0 font-mono text-[10px] text-[var(--tg-text-muted)]">
        {featureCount.toLocaleString()}
      </span>
    </button>
  );
});

// ---------------------------------------------------------------------------
// GeometryFilterPill
// ---------------------------------------------------------------------------

interface GeometryFilterPillProps {
  readonly label: string;
  readonly icon: React.ElementType;
  readonly active: boolean;
  readonly onToggle: () => void;
}

function GeometryFilterPill({
  label,
  icon: Icon,
  active,
  onToggle,
}: GeometryFilterPillProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={[
        'flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors',
        active
          ? 'border-[var(--tg-accent)]/40 bg-[var(--tg-accent)]/10 text-[var(--tg-accent)]'
          : 'border-[var(--tg-border)] bg-[var(--tg-bg-surface)] text-[var(--tg-text-muted)] hover:border-[var(--tg-accent)]/30 hover:text-[var(--tg-text-secondary)]',
      ].join(' ')}
    >
      <Icon className="h-2.5 w-2.5" aria-hidden />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// SelectionHistory
// ---------------------------------------------------------------------------

interface SelectionHistoryProps {
  readonly store: InspectorStore;
  readonly inspector: Inspector | null;
}

function SelectionHistory({
  store,
  inspector,
}: SelectionHistoryProps): JSX.Element {
  const feature = useSelectedFeature(store);

  return (
    <div>
      {feature === null ? (
        <p className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-[10px] italic text-[var(--tg-text-muted)]">
          Click a feature on the canvas to select it
        </p>
      ) : (
        <div className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-xs font-semibold text-[var(--tg-accent)]">
                <span className="truncate">{feature.layerName}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-[var(--tg-text-muted)]">
                <span>#{feature.id ?? feature.featureIndex}</span>
                <span>·</span>
                <span>{feature.geometryType}</span>
                <span>·</span>
                <span>{Object.keys(feature.properties).length} props</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => store.select(null, null)}
              className="shrink-0 rounded p-0.5 text-[var(--tg-text-muted)] hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]"
              aria-label="Clear selection"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LayerExplorer
// ---------------------------------------------------------------------------

export function LayerExplorer({
  store,
  inspector,
  searchQuery,
  onSearchChange,
}: LayerExplorerProps): JSX.Element {
  const lifecycle = useLifecycle(store);
  const layers = useLayers(store);
  const search = useSearch(store);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<GeometryFilter>>(
    new Set(['point', 'line', 'polygon']),
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  const loaded = lifecycle.status === 'loaded';

  const totalFeatures = useMemo(
    () => layers.reduce((s, l) => s + l.featureCount, 0),
    [layers],
  );

  const toggleFilter = (f: GeometryFilter) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) {
        if (next.size > 1) next.delete(f); // keep at least one active
      } else {
        next.add(f);
      }
      return next;
    });
  };

  const handleLayerClick = (name: string) => {
    setSelectedLayer((prev) => (prev === name ? null : name));
  };

  if (!loaded) {
    return (
      <EmptyWorkspace
        icon={Layers}
        title="No tile loaded"
        description="Load a vector tile to inspect its features."
      />
    );
  }

  return (
    <WorkspacePanel
      label="Layer Explorer"
      header={
        <PanelHeader
          title="Layer Explorer"
          subtitle={totalFeatures}
          icon={Layers}
          actions={
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={[
                'rounded p-1 text-[var(--tg-text-muted)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]',
                filtersOpen ? 'text-[var(--tg-accent)]' : '',
              ].join(' ')}
              aria-label="Toggle filters"
              aria-expanded={filtersOpen}
            >
              <Filter className="h-3.5 w-3.5" />
            </button>
          }
        />
      }
    >
      {/* Search */}
      <div className="border-b border-[var(--tg-border)] p-[var(--tg-space-sm)]">
        <label className="flex items-center gap-2 rounded bg-[var(--tg-bg-surface)] px-2 py-1">
          <Search
            className="h-3.5 w-3.5 shrink-0 text-[var(--tg-text-muted)]"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search features…"
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onSearchChange(e.target.value)
            }
            className="w-full bg-transparent text-xs text-[var(--tg-text-primary)] placeholder-[var(--tg-text-muted)] outline-none"
            aria-label="Search features"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="text-[var(--tg-text-muted)] hover:text-[var(--tg-text-primary)]"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </label>
      </div>

      {/* Geometry filters */}
      {filtersOpen && (
        <div className="flex flex-wrap gap-1 border-b border-[var(--tg-border)] px-[var(--tg-space-md)] py-[var(--tg-space-sm)]">
          <GeometryFilterPill
            label="Points"
            icon={Circle}
            active={activeFilters.has('point')}
            onToggle={() => toggleFilter('point')}
          />
          <GeometryFilterPill
            label="Lines"
            icon={Minus}
            active={activeFilters.has('line')}
            onToggle={() => toggleFilter('line')}
          />
          <GeometryFilterPill
            label="Polygons"
            icon={Hexagon}
            active={activeFilters.has('polygon')}
            onToggle={() => toggleFilter('polygon')}
          />
        </div>
      )}

      {/* Search results */}
      {search.results.length > 0 && (
        <div className="border-b border-[var(--tg-border)]">
          <PanelSection
            title={`${search.results.length} result${search.results.length !== 1 ? 's' : ''}`}
          >
            <ul className="max-h-32 overflow-y-auto">
              {search.results.slice(0, 20).map((result, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-[var(--tg-space-md)] py-1 text-left text-xs hover:bg-[var(--tg-bg-hover)]"
                    onClick={() => {
                      inspector?.focusFeature(
                        result.feature.layerName,
                        result.feature.featureIndex,
                      );
                      onSearchChange('');
                    }}
                  >
                    <span className="text-[var(--tg-text-secondary)]">
                      {result.feature.layerName}
                    </span>
                    <span className="text-[var(--tg-text-muted)]">
                      #{result.feature.featureIndex}
                    </span>
                    <span className="truncate text-[var(--tg-text-primary)]">
                      {result.matchReason}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </PanelSection>
        </div>
      )}

      {/* Layer list */}
      <div>
        <PanelSection title={`Layers · ${layers.length}`}>
          {layers.map((layer) => (
            <LayerRow
              key={layer.name}
              name={layer.name}
              featureCount={layer.featureCount}
              isSelected={selectedLayer === layer.name}
              onSelect={() => handleLayerClick(layer.name)}
            />
          ))}
        </PanelSection>
      </div>

      {/* Selection history */}
      <PanelDivider />
      <PanelSection title="Selection">
        <SelectionHistory store={store} inspector={inspector} />
      </PanelSection>
    </WorkspacePanel>
  );
}
