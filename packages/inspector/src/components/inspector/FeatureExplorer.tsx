/**
 * @tileguard/inspector — FeatureExplorer (Milestone 7.5 — Step A)
 *
 * The left panel for the Inspector tab.
 * Answers: "What is inside this tile?"
 *
 * Layout:
 *   ┌─────────────────────────────┐
 *   │  FEATURE EXPLORER           │
 *   ├─────────────────────────────┤
 *   │  [search...]                │
 *   ├─────────────────────────────┤
 *   │  Layers  ─── 8 layers       │
 *   │  ▸ water        2,410 feat  │
 *   │  ▸ building     1,823 feat  │
 *   │  ▸ road           942 feat  │
 *   │  ...                        │
 *   ├─────────────────────────────┤
 *   │  Selection                  │
 *   │  building[42] · Polygon     │
 *   └─────────────────────────────┘
 */

import { Crosshair, Hash, Layers, Search, X } from 'lucide-react';
import { type ChangeEvent, useMemo, useState } from 'react';
import type { Inspector } from '../../create-inspector.js';
import {
  useLayers,
  useLifecycle,
  useSearch,
  useSelectedFeature,
} from '../../hooks/use-store.js';
import type { InspectorStore } from '../../store/inspector-store.js';

interface FeatureExplorerProps {
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

function LayerRow({
  name,
  featureCount,
  isSelected,
  onSelect,
}: LayerRowProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-left text-xs transition-colors hover:bg-[var(--tg-bg-hover)] ${
        isSelected
          ? 'bg-[var(--tg-bg-hover)] text-[var(--tg-accent)]'
          : 'text-[var(--tg-text-secondary)]'
      }`}
      aria-pressed={isSelected}
      aria-label={`Layer: ${name}, ${featureCount} features`}
    >
      <div className="flex items-center gap-[var(--tg-space-sm)] min-w-0">
        <Layers
          className="h-3.5 w-3.5 shrink-0 opacity-60"
          aria-hidden="true"
        />
        <span className="truncate font-medium text-[var(--tg-text-primary)]">
          {name}
        </span>
      </div>
      <span className="ml-[var(--tg-space-sm)] shrink-0 font-mono text-[10px] text-[var(--tg-text-muted)]">
        {featureCount.toLocaleString()}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// SelectionInfo
// ---------------------------------------------------------------------------

interface SelectionInfoProps {
  readonly store: InspectorStore;
  readonly inspector: Inspector | null;
}

function SelectionInfo({
  store,
  inspector,
}: SelectionInfoProps): JSX.Element | null {
  const feature = useSelectedFeature(store);

  if (feature === null) {
    return (
      <div className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-[10px] text-[var(--tg-text-muted)] italic">
        Click a feature on the canvas to select it
      </div>
    );
  }

  return (
    <div className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)]">
      <div className="flex items-center justify-between gap-[var(--tg-space-sm)]">
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-xs font-semibold text-[var(--tg-accent)]">
            <Crosshair className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{feature.layerName}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--tg-text-muted)]">
            <Hash className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
            <span>{feature.id ?? feature.featureIndex}</span>
            <span className="text-[var(--tg-border)]">·</span>
            <span>{feature.geometryType}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            store.select(null, null);
          }}
          className="shrink-0 rounded p-0.5 text-[var(--tg-text-muted)] hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]"
          aria-label="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Property count summary */}
      {Object.keys(feature.properties).length > 0 && (
        <div className="mt-[var(--tg-space-sm)] text-[10px] text-[var(--tg-text-muted)]">
          {Object.keys(feature.properties).length} properties
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FeatureExplorer
// ---------------------------------------------------------------------------

export function FeatureExplorer({
  store,
  inspector,
  searchQuery,
  onSearchChange,
}: FeatureExplorerProps): JSX.Element {
  const lifecycle = useLifecycle(store);
  const layers = useLayers(store);
  const search = useSearch(store);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);

  const loaded = lifecycle.status === 'loaded';

  const totalFeatures = useMemo(
    () => layers.reduce((sum, l) => sum + l.featureCount, 0),
    [layers],
  );

  const handleLayerClick = (name: string) => {
    setSelectedLayer((prev) => (prev === name ? null : name));
  };

  return (
    <section
      className="flex h-full flex-col overflow-hidden"
      aria-label="Feature Explorer"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--tg-border)] px-[var(--tg-space-md)] py-[var(--tg-space-sm)]">
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--tg-accent)]">
          Feature Explorer
        </span>
        {loaded && (
          <span className="font-mono text-[10px] text-[var(--tg-text-muted)]">
            {totalFeatures.toLocaleString()} feat
          </span>
        )}
      </div>

      {/* Search */}
      <div className="shrink-0 border-b border-[var(--tg-border)] p-[var(--tg-space-sm)]">
        <label className="flex items-center gap-[var(--tg-space-sm)] rounded-[var(--tg-border-radius)] bg-[var(--tg-bg-surface)] px-[var(--tg-space-sm)] py-1">
          <Search
            className="h-3.5 w-3.5 shrink-0 text-[var(--tg-text-muted)]"
            aria-hidden="true"
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
          {searchQuery.length > 0 && (
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

      {/* Search results */}
      {search.results.length > 0 && (
        <div className="shrink-0 border-b border-[var(--tg-border)]">
          <div className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-[10px] font-medium text-[var(--tg-text-muted)]">
            {search.results.length} result
            {search.results.length !== 1 ? 's' : ''}
          </div>
          <ul className="max-h-32 overflow-y-auto">
            {search.results.slice(0, 20).map((result, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="flex w-full items-center gap-[var(--tg-space-sm)] px-[var(--tg-space-md)] py-1 text-left text-xs hover:bg-[var(--tg-bg-hover)]"
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
        </div>
      )}

      {/* Layers list */}
      <div className="flex-1 overflow-y-auto">
        {!loaded ? (
          <div className="px-[var(--tg-space-md)] py-[var(--tg-space-xl)] text-center text-xs text-[var(--tg-text-muted)]">
            No tile loaded
          </div>
        ) : layers.length === 0 ? (
          <div className="px-[var(--tg-space-md)] py-[var(--tg-space-xl)] text-center text-xs text-[var(--tg-text-muted)]">
            No layers found
          </div>
        ) : (
          <>
            <div className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-[10px] font-medium uppercase tracking-wider text-[var(--tg-text-muted)]">
              Layers · {layers.length}
            </div>
            {layers.map((layer) => (
              <LayerRow
                key={layer.name}
                name={layer.name}
                featureCount={layer.featureCount}
                isSelected={selectedLayer === layer.name}
                onSelect={() => handleLayerClick(layer.name)}
              />
            ))}
          </>
        )}
      </div>

      {/* Selection */}
      <div className="shrink-0 border-t border-[var(--tg-border)]">
        <div className="px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-[10px] font-medium uppercase tracking-wider text-[var(--tg-text-muted)]">
          Selection
        </div>
        <SelectionInfo store={store} inspector={inspector} />
      </div>
    </section>
  );
}
