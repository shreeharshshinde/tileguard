/**
 * @tileguard/inspector — DifferenceExplorer (Milestone 7 — Step 1)
 *
 * Side-by-side before/after/diff viewer for a selected FeatureComparison.
 * Shows:
 *   - Feature header (layer, ID, type)
 *   - Three-column view: Before | After | Diff
 *   - Property diff table with coloured added/removed/modified rows
 *   - Geometry diff summary (vertex count, ring count, centroid shift, bounds)
 */

import { createGeometryDiffer } from '../../comparison/GeometryDiffer.js';
import type {
  FeatureComparison,
  PropertyDiff,
  PropertyDiffEntry,
} from '../../comparison/models.js';
import { createPropertyDiffer } from '../../comparison/PropertyDiffer.js';

interface DifferenceExplorerProps {
  readonly comparison: FeatureComparison | null;
}

// ---------------------------------------------------------------------------
// Property diff row
// ---------------------------------------------------------------------------

function PropertyRow({ entry }: { entry: PropertyDiffEntry }): JSX.Element {
  const rowBase =
    'grid grid-cols-[1fr_1fr_1fr] gap-px text-xs font-mono leading-relaxed';

  if (entry.kind === 'added') {
    return (
      <div className={`${rowBase} bg-[var(--tg-success)]/10`}>
        <span className="px-2 py-0.5 text-[var(--tg-text-muted)]">
          {entry.key}
        </span>
        <span className="px-2 py-0.5 text-[var(--tg-text-muted)] italic">
          —
        </span>
        <span className="px-2 py-0.5 text-[var(--tg-success)]">
          {JSON.stringify(entry.valueB)}
        </span>
      </div>
    );
  }

  if (entry.kind === 'removed') {
    return (
      <div className={`${rowBase} bg-[var(--tg-error)]/10`}>
        <span className="px-2 py-0.5 text-[var(--tg-text-muted)]">
          {entry.key}
        </span>
        <span className="px-2 py-0.5 text-[var(--tg-error)]">
          {JSON.stringify(entry.valueA)}
        </span>
        <span className="px-2 py-0.5 text-[var(--tg-text-muted)] italic">
          —
        </span>
      </div>
    );
  }

  // modified
  return (
    <div className={`${rowBase} bg-[var(--tg-warning)]/10`}>
      <span className="px-2 py-0.5 text-[var(--tg-text-muted)]">
        {entry.key}
      </span>
      <span className="px-2 py-0.5 text-[var(--tg-error)] line-through opacity-70">
        {JSON.stringify(entry.valueA)}
      </span>
      <span className="px-2 py-0.5 text-[var(--tg-success)]">
        {JSON.stringify(entry.valueB)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unchanged property row
// ---------------------------------------------------------------------------

function UnchangedPropertyRow({
  k,
  v,
}: {
  k: string;
  v: unknown;
}): JSX.Element {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-px text-xs font-mono leading-relaxed text-[var(--tg-text-secondary)]">
      <span className="px-2 py-0.5">{k}</span>
      <span className="px-2 py-0.5">{JSON.stringify(v)}</span>
      <span className="px-2 py-0.5">{JSON.stringify(v)}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Property section
// ---------------------------------------------------------------------------

function PropertySection({ diff }: { diff: PropertyDiff }): JSX.Element {
  const changedKeys = new Set(diff.entries.map((e) => e.key));

  return (
    <div>
      <h4 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--tg-text-muted)]">
        Properties
      </h4>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-px border-b border-[var(--tg-border)] bg-[var(--tg-bg-hover)] text-[10px] font-semibold uppercase tracking-wider text-[var(--tg-text-muted)]">
        <span className="px-2 py-1">Key</span>
        <span className="px-2 py-1">Before</span>
        <span className="px-2 py-1">After</span>
      </div>

      {/* Changed entries first */}
      {diff.entries.map((entry) => (
        <PropertyRow key={`${entry.kind}-${entry.key}`} entry={entry} />
      ))}

      {diff.entries.length === 0 && (
        <p className="px-2 py-2 text-xs text-[var(--tg-text-muted)] italic">
          No property changes
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Geometry section
// ---------------------------------------------------------------------------

function GeometrySection({
  comparison,
}: {
  comparison: FeatureComparison;
}): JSX.Element | null {
  if (comparison.featureA === null || comparison.featureB === null) return null;

  const differ = createGeometryDiffer();
  const diff = differ.diff(comparison.featureA, comparison.featureB);

  const row = (
    label: string,
    before: string,
    after: string,
    changed: boolean,
  ) => (
    <div
      key={label}
      className={`grid grid-cols-[1fr_1fr_1fr] gap-px text-xs font-mono leading-relaxed ${changed ? 'bg-[var(--tg-warning)]/10' : ''}`}
    >
      <span className="px-2 py-0.5 text-[var(--tg-text-muted)]">{label}</span>
      <span
        className={`px-2 py-0.5 ${changed ? 'text-[var(--tg-error)] line-through opacity-70' : 'text-[var(--tg-text-secondary)]'}`}
      >
        {before}
      </span>
      <span
        className={`px-2 py-0.5 ${changed ? 'text-[var(--tg-success)]' : 'text-[var(--tg-text-secondary)]'}`}
      >
        {after}
      </span>
    </div>
  );

  return (
    <div>
      <h4 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--tg-text-muted)]">
        Geometry
      </h4>

      <div className="grid grid-cols-[1fr_1fr_1fr] gap-px border-b border-[var(--tg-border)] bg-[var(--tg-bg-hover)] text-[10px] font-semibold uppercase tracking-wider text-[var(--tg-text-muted)]">
        <span className="px-2 py-1">Metric</span>
        <span className="px-2 py-1">Before</span>
        <span className="px-2 py-1">After</span>
      </div>

      {row('Type', diff.typeA, diff.typeB, diff.typeChanged)}
      {row(
        'Vertices',
        String(diff.vertexCountA),
        `${diff.vertexCountB}${diff.vertexCountDelta !== 0 ? ` (${diff.vertexCountDelta > 0 ? '+' : ''}${diff.vertexCountDelta})` : ''}`,
        diff.vertexCountDelta !== 0,
      )}
      {row(
        'Rings',
        String(diff.ringCountA),
        `${diff.ringCountB}${diff.ringCountDelta !== 0 ? ` (${diff.ringCountDelta > 0 ? '+' : ''}${diff.ringCountDelta})` : ''}`,
        diff.ringCountDelta !== 0,
      )}
      {row(
        'Bounds W',
        `${(diff.boundsA.maxX - diff.boundsA.minX).toFixed(0)}`,
        `${(diff.boundsB.maxX - diff.boundsB.minX).toFixed(0)}`,
        diff.boundsChanged,
      )}
      {row(
        'Bounds H',
        `${(diff.boundsA.maxY - diff.boundsA.minY).toFixed(0)}`,
        `${(diff.boundsB.maxY - diff.boundsB.minY).toFixed(0)}`,
        diff.boundsChanged,
      )}
      {row(
        'Centroid',
        `(${diff.centroidA.x.toFixed(0)}, ${diff.centroidA.y.toFixed(0)})`,
        `(${diff.centroidB.x.toFixed(0)}, ${diff.centroidB.y.toFixed(0)})`,
        diff.centroidShift > 1,
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DifferenceExplorer
// ---------------------------------------------------------------------------

export function DifferenceExplorer({
  comparison,
}: DifferenceExplorerProps): JSX.Element {
  if (comparison === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div>
          <p className="text-sm text-[var(--tg-text-muted)]">
            Select a change to inspect it
          </p>
          <p className="mt-1 text-xs text-[var(--tg-text-muted)] opacity-60">
            Use the Previous / Next buttons or click a row in the feature list
          </p>
        </div>
      </div>
    );
  }

  const feature = comparison.featureA ?? comparison.featureB;
  if (!feature) return <div />;

  const kindLabel: Record<string, string> = {
    added: 'Added',
    removed: 'Removed',
    modified: 'Modified',
    unchanged: 'Unchanged',
  };

  const kindColor: Record<string, string> = {
    added: 'text-[var(--tg-success)]',
    removed: 'text-[var(--tg-error)]',
    modified: 'text-[var(--tg-warning)]',
    unchanged: 'text-[var(--tg-text-muted)]',
  };

  // Compute property diff for modified features
  const propDiff =
    comparison.kind === 'modified' &&
    comparison.featureA !== null &&
    comparison.featureB !== null
      ? createPropertyDiffer().diff(comparison.featureA, comparison.featureB)
      : null;

  return (
    <div className="flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--tg-border)] px-3 py-2">
        <span
          className={`text-xs font-semibold ${kindColor[comparison.kind] ?? ''}`}
        >
          {kindLabel[comparison.kind]}
        </span>
        <span className="text-xs text-[var(--tg-text-secondary)]">
          {feature.layerName}
        </span>
        {feature.id !== undefined && (
          <>
            <span className="text-[var(--tg-text-muted)]">#</span>
            <span className="font-mono text-xs text-[var(--tg-text-secondary)]">
              {feature.id}
            </span>
          </>
        )}
        <span className="ml-auto font-mono text-xs text-[var(--tg-text-muted)]">
          {feature.geometryType}
        </span>
        {comparison.matchPriority !== null && (
          <span className="rounded bg-[var(--tg-bg-hover)] px-1.5 py-0.5 text-[9px] text-[var(--tg-text-muted)]">
            P{comparison.matchPriority}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-4 p-3">
        {/* Geometry diff */}
        {comparison.kind === 'modified' && (
          <GeometrySection comparison={comparison} />
        )}

        {/* Property diff */}
        {propDiff !== null && <PropertySection diff={propDiff} />}

        {/* Added feature: show all properties as added */}
        {comparison.kind === 'added' && comparison.featureB !== null && (
          <div>
            <h4 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--tg-text-muted)]">
              Properties (New)
            </h4>
            {Object.entries(comparison.featureB.properties).map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-2 gap-px bg-[var(--tg-success)]/10 text-xs font-mono leading-relaxed"
              >
                <span className="px-2 py-0.5 text-[var(--tg-text-muted)]">
                  {k}
                </span>
                <span className="px-2 py-0.5 text-[var(--tg-success)]">
                  {JSON.stringify(v)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Removed feature: show all properties as removed */}
        {comparison.kind === 'removed' && comparison.featureA !== null && (
          <div>
            <h4 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--tg-text-muted)]">
              Properties (Removed)
            </h4>
            {Object.entries(comparison.featureA.properties).map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-2 gap-px bg-[var(--tg-error)]/10 text-xs font-mono leading-relaxed"
              >
                <span className="px-2 py-0.5 text-[var(--tg-text-muted)]">
                  {k}
                </span>
                <span className="px-2 py-0.5 text-[var(--tg-error)]">
                  {JSON.stringify(v)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
