/**
 * @tileguard/inspector — ComparisonPage (Milestone 7 — Step 1)
 *
 * Full comparison view layout:
 *
 *   ┌─ Tile A / Tile B drop zone header ──────────────────────────────────┐
 *   ├─ Summary Cards (Added / Removed / Modified / New Diag / Resolved) ─┤
 *   ├─ ComparisonToolbar (nav + filters + search) ────────────────────────┤
 *   ├─ Main body ─────────────────────────────────────────────────────────┤
 *   │  Left:  Feature / Layer / Diagnostics / Statistics sections         │
 *   │  Right: DifferenceExplorer (selected feature detail)                │
 *   └─────────────────────────────────────────────────────────────────────┘
 */

import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle,
  FileCheck,
  Layers,
  MinusCircle,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type {
  FeatureComparison,
  LayerComparison,
  TileComparison,
} from '../../comparison/models.js';
import type { ComparisonFilter } from './ComparisonToolbar.js';
import { ComparisonToolbar } from './ComparisonToolbar.js';
import { DifferenceExplorer } from './DifferenceExplorer.js';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accentClass: string;
  onClick?: () => void;
  active?: boolean;
}

function SummaryCard({
  label,
  value,
  icon,
  accentClass,
  onClick,
  active,
}: SummaryCardProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 cursor-pointer flex-col gap-1 rounded border p-3 text-left transition ${
        active
          ? 'border-[var(--tg-accent)] bg-[var(--tg-bg-hover)]'
          : 'border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] hover:bg-[var(--tg-bg-hover)]'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={accentClass}>{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--tg-text-muted)]">
          {label}
        </span>
      </div>
      <span className={`text-xl font-bold ${accentClass}`}>
        {value.toLocaleString()}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Statistics delta row
// ---------------------------------------------------------------------------

function DeltaRow({
  label,
  before,
  after,
  delta,
}: {
  label: string;
  before: number;
  after: number;
  delta: number;
}): JSX.Element {
  const sign = delta > 0 ? '+' : '';
  const color =
    delta > 0
      ? 'text-[var(--tg-warning)]'
      : delta < 0
        ? 'text-[var(--tg-success)]'
        : 'text-[var(--tg-text-muted)]';

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 py-1 text-xs">
      <span className="text-[var(--tg-text-secondary)]">{label}</span>
      <span className="font-mono text-[var(--tg-text-muted)]">
        {before.toLocaleString()}
      </span>
      <span className="font-mono text-[var(--tg-text-secondary)]">
        {after.toLocaleString()}
      </span>
      <span
        className={`min-w-[3.5rem] text-right font-mono font-semibold ${color}`}
      >
        {delta !== 0 ? `${sign}${delta.toLocaleString()}` : '—'}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layer list
// ---------------------------------------------------------------------------

function LayerRow({ layer }: { layer: LayerComparison }): JSX.Element {
  const kindColor: Record<string, string> = {
    added: 'text-[var(--tg-success)]',
    removed: 'text-[var(--tg-error)]',
    modified: 'text-[var(--tg-warning)]',
    unchanged: 'text-[var(--tg-text-muted)]',
  };

  const kindBg: Record<string, string> = {
    added: 'bg-[var(--tg-success)]/10',
    removed: 'bg-[var(--tg-error)]/10',
    modified: 'bg-[var(--tg-warning)]/10',
    unchanged: '',
  };

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs ${kindBg[layer.kind] ?? ''}`}
    >
      <div className="flex items-center gap-2">
        <Layers className={`h-3.5 w-3.5 ${kindColor[layer.kind] ?? ''}`} />
        <span className="font-mono text-[var(--tg-text-primary)]">
          {layer.name}
        </span>
        <span
          className={`text-[10px] font-semibold uppercase ${kindColor[layer.kind] ?? ''}`}
        >
          {layer.kind}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[var(--tg-text-muted)]">
        <span>
          {layer.featureCountA} → {layer.featureCountB}
        </span>
        {layer.featureCountDelta !== 0 && (
          <span
            className={`font-semibold ${layer.featureCountDelta > 0 ? 'text-[var(--tg-warning)]' : 'text-[var(--tg-success)]'}`}
          >
            {layer.featureCountDelta > 0 ? '+' : ''}
            {layer.featureCountDelta}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature list row
// ---------------------------------------------------------------------------

interface FeatureRowProps {
  fc: FeatureComparison;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
}

function FeatureRow({
  fc,
  index,
  isSelected,
  onSelect,
}: FeatureRowProps): JSX.Element {
  const feature = fc.featureA ?? fc.featureB;
  if (!feature) return <div />;

  const kindColor: Record<string, string> = {
    added: 'text-[var(--tg-success)]',
    removed: 'text-[var(--tg-error)]',
    modified: 'text-[var(--tg-warning)]',
    unchanged: 'text-[var(--tg-text-muted)]',
  };

  const kindBg: Record<string, string> = {
    added: 'bg-[var(--tg-success)]/5',
    removed: 'bg-[var(--tg-error)]/5',
    modified: 'bg-[var(--tg-warning)]/5',
    unchanged: '',
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition ${
        isSelected
          ? 'bg-[var(--tg-accent)]/10 ring-1 ring-[var(--tg-accent)]'
          : (kindBg[fc.kind] ?? '')
      } hover:bg-[var(--tg-bg-hover)]`}
    >
      <span
        className={`w-16 shrink-0 font-semibold ${kindColor[fc.kind] ?? ''}`}
      >
        {fc.kind.charAt(0).toUpperCase() + fc.kind.slice(1)}
      </span>
      <span className="font-mono text-[var(--tg-text-muted)]">
        {feature.layerName}
      </span>
      <span className="font-mono text-[var(--tg-text-secondary)]">
        {feature.id !== undefined
          ? `#${feature.id}`
          : `[${feature.featureIndex}]`}
      </span>
      <span className="ml-auto font-mono text-[10px] text-[var(--tg-text-muted)]">
        {feature.geometryType}
      </span>
      {fc.matchPriority !== null && (
        <span className="rounded bg-[var(--tg-bg-hover)] px-1 text-[9px] text-[var(--tg-text-muted)]">
          P{fc.matchPriority}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// IdenticalState
// ---------------------------------------------------------------------------

function IdenticalState(): JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <CheckCircle className="h-12 w-12 text-[var(--tg-success)]" />
      <h3 className="text-base font-semibold text-[var(--tg-text-primary)]">
        Tiles are identical
      </h3>
      <p className="max-w-xs text-xs text-[var(--tg-text-muted)]">
        No differences were detected between Tile A and Tile B. All features
        match and diagnostics are unchanged.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TileDropZone
// ---------------------------------------------------------------------------

interface TileDropZoneProps {
  label: string;
  filePath: string | null;
  onFileSelected: (file: File) => void;
  accentClass: string;
}

function TileDropZone({
  label,
  filePath,
  onFileSelected,
  accentClass,
}: TileDropZoneProps): JSX.Element {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <label className="flex flex-1 cursor-pointer flex-col items-center gap-1 rounded border-2 border-dashed border-[var(--tg-border)] p-3 text-center transition hover:border-[var(--tg-accent)] hover:bg-[var(--tg-bg-hover)]">
      <span
        className={`text-[10px] font-bold uppercase tracking-wider ${accentClass}`}
      >
        {label}
      </span>
      {filePath ? (
        <span className="max-w-full truncate font-mono text-xs text-[var(--tg-text-secondary)]">
          {filePath.split('/').pop()}
        </span>
      ) : (
        <span className="text-xs text-[var(--tg-text-muted)]">
          Drop .pbf or click
        </span>
      )}
      <input
        type="file"
        accept=".pbf,.mvt"
        className="sr-only"
        onChange={handleChange}
      />
    </label>
  );
}

// ---------------------------------------------------------------------------
// ComparisonPage Props
// ---------------------------------------------------------------------------

export interface ComparisonPageProps {
  comparison: TileComparison | null;
  filePathA: string | null;
  filePathB: string | null;
  isComparing: boolean;
  onFileSelectedA: (file: File) => void;
  onFileSelectedB: (file: File) => void;
  onRunComparison: () => void;
}

// ---------------------------------------------------------------------------
// ComparisonPage
// ---------------------------------------------------------------------------

export function ComparisonPage({
  comparison,
  filePathA,
  filePathB,
  isComparing,
  onFileSelectedA,
  onFileSelectedB,
  onRunComparison,
}: ComparisonPageProps): JSX.Element {
  const [filter, setFilter] = useState<ComparisonFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Filter the feature comparisons
  const filteredComparisons = useMemo(() => {
    if (!comparison) return [];
    let list = comparison.features as FeatureComparison[];

    // Apply kind filter
    if (filter !== 'all') {
      list = list.filter((fc) => fc.kind === filter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((fc) => {
        const f = fc.featureA ?? fc.featureB;
        if (!f) return false;
        if (f.layerName.toLowerCase().includes(q)) return true;
        if (f.id !== undefined && String(f.id).toLowerCase().includes(q))
          return true;
        if (f.geometryType.toLowerCase().includes(q)) return true;
        if (fc.kind.includes(q)) return true;
        // Search in property keys/values
        for (const [k, v] of Object.entries(f.properties)) {
          if (k.toLowerCase().includes(q)) return true;
          if (String(v).toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }

    return list;
  }, [comparison, filter, searchQuery]);

  const selectedComparison =
    selectedIndex >= 0 && selectedIndex < filteredComparisons.length
      ? filteredComparisons[selectedIndex]!
      : null;

  const handlePrevious = useCallback(() => {
    setSelectedIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setSelectedIndex((i) => Math.min(filteredComparisons.length - 1, i + 1));
  }, [filteredComparisons.length]);

  const handleFilterChange = useCallback((f: ComparisonFilter) => {
    setFilter(f);
    setSelectedIndex(-1);
  }, []);

  // Summary card filter shortcuts
  const activateFilter = (f: ComparisonFilter) => {
    setFilter(f);
    setSelectedIndex(-1);
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tile file inputs */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-3 py-2">
        <TileDropZone
          label="Tile A (Before)"
          filePath={filePathA}
          onFileSelected={onFileSelectedA}
          accentClass="text-[var(--tg-accent)]"
        />

        <ArrowLeftRight className="h-4 w-4 shrink-0 text-[var(--tg-text-muted)]" />

        <TileDropZone
          label="Tile B (After)"
          filePath={filePathB}
          onFileSelected={onFileSelectedB}
          accentClass="text-[var(--tg-warning)]"
        />

        <button
          type="button"
          onClick={onRunComparison}
          disabled={!filePathA || !filePathB || isComparing}
          className="flex h-9 items-center gap-1.5 rounded border border-[var(--tg-border)] bg-[var(--tg-bg-primary)] px-3 text-xs font-semibold text-[var(--tg-text-primary)] transition hover:bg-[var(--tg-accent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isComparing ? 'animate-spin' : ''}`}
          />
          {isComparing ? 'Comparing…' : 'Compare'}
        </button>
      </div>

      {/* No comparison yet */}
      {!comparison && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <FileCheck className="h-10 w-10 text-[var(--tg-text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--tg-text-secondary)]">
            Load both tiles and click Compare
          </h3>
          <p className="max-w-xs text-xs text-[var(--tg-text-muted)]">
            Tile A represents the baseline (before). Tile B represents the
            revised version (after). The comparison engine will match features
            and report every change.
          </p>
        </div>
      )}

      {/* Comparison results */}
      {comparison && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Summary cards */}
          <div className="flex shrink-0 items-stretch gap-2 border-b border-[var(--tg-border)] p-3">
            <SummaryCard
              label="Added"
              value={comparison.summary.addedFeatures}
              icon={<PlusCircle className="h-3.5 w-3.5" />}
              accentClass="text-[var(--tg-success)]"
              onClick={() => activateFilter('added')}
              active={filter === 'added'}
            />
            <SummaryCard
              label="Removed"
              value={comparison.summary.removedFeatures}
              icon={<MinusCircle className="h-3.5 w-3.5" />}
              accentClass="text-[var(--tg-error)]"
              onClick={() => activateFilter('removed')}
              active={filter === 'removed'}
            />
            <SummaryCard
              label="Modified"
              value={comparison.summary.modifiedFeatures}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              accentClass="text-[var(--tg-warning)]"
              onClick={() => activateFilter('modified')}
              active={filter === 'modified'}
            />
            <SummaryCard
              label="New Diag."
              value={comparison.summary.newDiagnostics}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              accentClass="text-[var(--tg-error)]"
            />
            <SummaryCard
              label="Resolved"
              value={comparison.summary.resolvedDiagnostics}
              icon={<CheckCircle className="h-3.5 w-3.5" />}
              accentClass="text-[var(--tg-success)]"
            />
          </div>

          {/* Identical tiles short-circuit */}
          {comparison.summary.isIdentical ? (
            <IdenticalState />
          ) : (
            <>
              {/* Toolbar */}
              <ComparisonToolbar
                totalChanges={filteredComparisons.length}
                currentIndex={selectedIndex}
                filter={filter}
                searchQuery={searchQuery}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onFilterChange={handleFilterChange}
                onSearchChange={(q) => {
                  setSearchQuery(q);
                  setSelectedIndex(-1);
                }}
              />

              {/* Main body: left list + right explorer */}
              <div className="flex min-h-0 flex-1 overflow-hidden">
                {/* Left: scrollable lists */}
                <div className="flex w-1/2 shrink-0 flex-col overflow-y-auto border-r border-[var(--tg-border)]">
                  {/* Statistics delta */}
                  <section className="border-b border-[var(--tg-border)] p-3">
                    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--tg-text-muted)]">
                      Statistics Delta
                    </h3>
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-[var(--tg-border)] pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--tg-text-muted)]">
                      <span>Metric</span>
                      <span>Before</span>
                      <span>After</span>
                      <span className="text-right">Δ</span>
                    </div>
                    <DeltaRow
                      label="Layers"
                      before={comparison.statistics.layersA}
                      after={comparison.statistics.layersB}
                      delta={comparison.statistics.layersDelta}
                    />
                    <DeltaRow
                      label="Features"
                      before={comparison.statistics.featuresA}
                      after={comparison.statistics.featuresB}
                      delta={comparison.statistics.featuresDelta}
                    />
                    <DeltaRow
                      label="Vertices"
                      before={comparison.statistics.verticesA}
                      after={comparison.statistics.verticesB}
                      delta={comparison.statistics.verticesDelta}
                    />
                    <DeltaRow
                      label="Diagnostics"
                      before={comparison.statistics.diagnosticsA}
                      after={comparison.statistics.diagnosticsB}
                      delta={comparison.statistics.diagnosticsDelta}
                    />
                  </section>

                  {/* Layer changes */}
                  {comparison.layers.some((l) => l.kind !== 'unchanged') && (
                    <section className="border-b border-[var(--tg-border)] p-3">
                      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--tg-text-muted)]">
                        Layer Changes
                      </h3>
                      <div className="flex flex-col gap-0.5">
                        {comparison.layers
                          .filter((l) => l.kind !== 'unchanged')
                          .map((layer) => (
                            <LayerRow key={layer.name} layer={layer} />
                          ))}
                      </div>
                    </section>
                  )}

                  {/* Diagnostics section */}
                  {(comparison.diagnostics.newDiagnostics.length > 0 ||
                    comparison.diagnostics.resolvedDiagnostics.length > 0) && (
                    <section className="border-b border-[var(--tg-border)] p-3">
                      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--tg-text-muted)]">
                        Diagnostics
                      </h3>
                      <div className="flex gap-4 text-xs">
                        <div>
                          <span className="font-semibold text-[var(--tg-error)]">
                            {comparison.diagnostics.newDiagnostics.length}
                          </span>
                          <span className="ml-1 text-[var(--tg-text-muted)]">
                            new
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-[var(--tg-success)]">
                            {comparison.diagnostics.resolvedDiagnostics.length}
                          </span>
                          <span className="ml-1 text-[var(--tg-text-muted)]">
                            resolved
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-[var(--tg-warning)]">
                            {comparison.diagnostics.errorsDelta > 0 ? '+' : ''}
                            {comparison.diagnostics.errorsDelta}
                          </span>
                          <span className="ml-1 text-[var(--tg-text-muted)]">
                            errors Δ
                          </span>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Feature changes */}
                  <section className="flex flex-1 flex-col p-3">
                    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--tg-text-muted)]">
                      Feature Changes ({filteredComparisons.length})
                    </h3>
                    {filteredComparisons.length === 0 ? (
                      <p className="text-xs text-[var(--tg-text-muted)] italic">
                        No features match the current filter
                      </p>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {filteredComparisons.map((fc, i) => (
                          <FeatureRow
                            key={`${fc.kind}-${(fc.featureA ?? fc.featureB)?.layerName ?? ''}-${(fc.featureA ?? fc.featureB)?.featureIndex ?? i}`}
                            fc={fc}
                            index={i}
                            isSelected={selectedIndex === i}
                            onSelect={setSelectedIndex}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                {/* Right: DifferenceExplorer */}
                <div className="flex w-1/2 flex-col overflow-hidden">
                  <div className="flex shrink-0 items-center border-b border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-3 py-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--tg-text-muted)]">
                      Difference Explorer
                    </span>
                  </div>
                  <DifferenceExplorer comparison={selectedComparison ?? null} />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
