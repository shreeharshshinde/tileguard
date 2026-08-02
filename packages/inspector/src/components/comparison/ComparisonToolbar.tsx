/**
 * @tileguard/inspector — ComparisonToolbar (Milestone 7 — Step 1)
 *
 * Navigation and filter toolbar for the Comparison view.
 * Provides:
 *   - Previous / Next change navigation
 *   - Filter toggle buttons (Modified / Added / Removed / All)
 *   - Search within differences
 */

import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import type { FeatureChangeKind } from '../../comparison/models.js';

export type ComparisonFilter = 'all' | FeatureChangeKind;

export interface ComparisonToolbarProps {
  /** Total number of changes (added + removed + modified). */
  readonly totalChanges: number;
  /** Index of currently focused change (0-based), or -1 for none. */
  readonly currentIndex: number;
  /** Active filter. */
  readonly filter: ComparisonFilter;
  /** Current search query. */
  readonly searchQuery: string;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onFilterChange: (filter: ComparisonFilter) => void;
  readonly onSearchChange: (query: string) => void;
}

const FILTER_LABELS: { id: ComparisonFilter; label: string; color: string }[] =
  [
    { id: 'all', label: 'All', color: 'text-[var(--tg-text-secondary)]' },
    {
      id: 'modified',
      label: 'Modified',
      color: 'text-[var(--tg-warning)]',
    },
    { id: 'added', label: 'Added', color: 'text-[var(--tg-success)]' },
    { id: 'removed', label: 'Removed', color: 'text-[var(--tg-error)]' },
    {
      id: 'unchanged',
      label: 'Unchanged',
      color: 'text-[var(--tg-text-muted)]',
    },
  ];

export function ComparisonToolbar({
  totalChanges,
  currentIndex,
  filter,
  searchQuery,
  onPrevious,
  onNext,
  onFilterChange,
  onSearchChange,
}: ComparisonToolbarProps): JSX.Element {
  const hasChanges = totalChanges > 0;
  const position = hasChanges ? currentIndex + 1 : 0;

  const navBtn =
    'flex h-7 w-7 items-center justify-center rounded border border-[var(--tg-border)] bg-[var(--tg-bg-primary)] text-[var(--tg-text-secondary)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)] disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-3 py-2">
      {/* Navigation */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={navBtn}
          aria-label="Previous change"
          onClick={onPrevious}
          disabled={!hasChanges || currentIndex <= 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="min-w-[4rem] text-center text-xs text-[var(--tg-text-secondary)]">
          {hasChanges ? `${position} / ${totalChanges}` : '—'}
        </span>

        <button
          type="button"
          className={navBtn}
          aria-label="Next change"
          onClick={onNext}
          disabled={!hasChanges || currentIndex >= totalChanges - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Divider */}
      <span className="h-4 w-px bg-[var(--tg-border)]" aria-hidden="true" />

      {/* Filter buttons */}
      <div
        className="flex items-center gap-1"
        role="group"
        aria-label="Filter changes by kind"
      >
        {FILTER_LABELS.map(({ id, label, color }) => (
          <button
            key={id}
            type="button"
            onClick={() => onFilterChange(id)}
            className={`rounded px-2 py-0.5 text-xs font-medium transition ${
              filter === id
                ? `bg-[var(--tg-bg-hover)] ${color}`
                : 'text-[var(--tg-text-muted)] hover:text-[var(--tg-text-secondary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <span className="flex-1" aria-hidden="true" />

      {/* Search */}
      <div className="relative flex items-center">
        <Search
          className="absolute left-2 h-3.5 w-3.5 text-[var(--tg-text-muted)]"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Search differences…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-7 w-52 rounded border border-[var(--tg-border)] bg-[var(--tg-bg-primary)] pl-7 pr-6 text-xs text-[var(--tg-text-primary)] placeholder:text-[var(--tg-text-muted)] focus:border-[var(--tg-accent)] focus:outline-none"
          aria-label="Search within differences"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-1.5 text-[var(--tg-text-muted)] hover:text-[var(--tg-text-primary)]"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
