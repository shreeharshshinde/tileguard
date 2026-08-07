/**
 * @tileguard/inspector — DiagnosticExplorer (Phase 3 — Diagnose Workspace)
 *
 * Left panel for the Diagnose workspace — the Tile Health Center.
 * Answers: "What is wrong with this tile?"
 *
 * Features:
 *   - Severity filter tabs (All / Error / Warning / Info) with counts
 *   - Rule-ID / message text search
 *   - Grouped, scrollable diagnostic list with inline severity icons
 */
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { type ChangeEvent, useMemo, useState } from 'react';
import type { Diagnostic } from '@tileguard/core';
import type { Inspector } from '../../create-inspector.js';
import { useDiagnostics, useLifecycle } from '../../hooks/use-store.js';
import type { InspectorStore } from '../../store/inspector-store.js';
import {
  EmptyWorkspace,
  PanelHeader,
  PanelSection,
  WorkspacePanel,
} from '../shared/index.js';

type SeverityFilter = 'all' | 'error' | 'warning' | 'info';

export interface DiagnosticExplorerProps {
  readonly store: InspectorStore;
  readonly inspector: Inspector | null;
  readonly onDiagnosticSelected: (index: number) => void;
}

// ---------------------------------------------------------------------------
// SeverityTab
// ---------------------------------------------------------------------------

function SeverityTab({
  severity,
  count,
  active,
  onSelect,
}: {
  severity: SeverityFilter;
  count: number;
  active: boolean;
  onSelect: () => void;
}): JSX.Element {
  const colorMap: Record<SeverityFilter, string> = {
    all:     'text-[var(--tg-text-secondary)]',
    error:   'text-[var(--tg-error)]',
    warning: 'text-[var(--tg-warning)]',
    info:    'text-[var(--tg-info)]',
  };
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={[
        'flex items-center gap-1 px-2 py-1.5 text-xs transition-colors hover:text-[var(--tg-text-primary)]',
        colorMap[severity],
        active ? 'border-b-2 border-current font-semibold' : 'opacity-60',
      ].join(' ')}
    >
      {severity === 'all' ? 'All' : severity.charAt(0).toUpperCase() + severity.slice(1)}
      {count > 0 && (
        <span className="font-mono text-[9px]">({count})</span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// DiagnosticRow
// ---------------------------------------------------------------------------

function DiagnosticRow({
  diagnostic,
  globalIndex,
  isSelected,
  onSelect,
}: {
  diagnostic: Diagnostic;
  globalIndex: number;
  isSelected: boolean;
  onSelect: () => void;
}): JSX.Element {
  const sev = diagnostic.severity;
  const Icon = sev === 'error' ? AlertCircle : sev === 'warning' ? AlertTriangle : Info;
  const iconColor =
    sev === 'error' ? 'text-[var(--tg-error)]'
    : sev === 'warning' ? 'text-[var(--tg-warning)]'
    : 'text-[var(--tg-info)]';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={[
        'flex w-full items-start gap-2 px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-left transition-colors hover:bg-[var(--tg-bg-hover)]',
        isSelected ? 'bg-[var(--tg-bg-hover)]' : '',
      ].join(' ')}
    >
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${iconColor}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <code className="truncate text-[10px] font-mono text-[var(--tg-text-secondary)]">
            {diagnostic.ruleId}
          </code>
          <span className="shrink-0 font-mono text-[9px] text-[var(--tg-text-muted)]">
            #{globalIndex}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-[var(--tg-text-primary)] line-clamp-2">
          {diagnostic.message}
        </p>
        {diagnostic.location && (diagnostic.location.layer ?? diagnostic.location.featureIndex !== undefined) && (
          <p className="mt-0.5 font-mono text-[9px] text-[var(--tg-text-muted)]">
            {diagnostic.location.layer ?? ''}
            {diagnostic.location.featureIndex !== undefined ? ` #${diagnostic.location.featureIndex}` : ''}
          </p>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// DiagnosticExplorer
// ---------------------------------------------------------------------------

export function DiagnosticExplorer({
  store,
  inspector: _inspector,
  onDiagnosticSelected,
}: DiagnosticExplorerProps): JSX.Element {
  const lifecycle = useLifecycle(store);
  const diagnostics = useDiagnostics(store);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const loaded = lifecycle.status === 'loaded';

  const counts = useMemo(() => ({
    error:   diagnostics.filter(d => d.severity === 'error').length,
    warning: diagnostics.filter(d => d.severity === 'warning').length,
    info:    diagnostics.filter(d => d.severity === 'info').length,
  }), [diagnostics]);

  const filtered = useMemo(() =>
    diagnostics.reduce<Array<{ diag: Diagnostic; globalIndex: number }>>((acc, d, i) => {
      if (severityFilter !== 'all' && d.severity !== severityFilter) return acc;
      const q = searchQuery.toLowerCase();
      if (q && !d.ruleId.toLowerCase().includes(q) && !d.message.toLowerCase().includes(q)) return acc;
      acc.push({ diag: d, globalIndex: i });
      return acc;
    }, []),
  [diagnostics, severityFilter, searchQuery]);

  if (!loaded) {
    return (
      <EmptyWorkspace
        icon={ShieldAlert}
        title="No tile loaded"
        description="Run diagnostics to inspect tile health."
      />
    );
  }

  return (
    <WorkspacePanel
      label="Diagnostic Explorer"
      header={<PanelHeader title="Diagnostic Explorer" subtitle={diagnostics.length} icon={ShieldAlert} />}
    >
      {/* Severity tabs */}
      <div className="flex border-b border-[var(--tg-border)] px-1">
        {(['all', 'error', 'warning', 'info'] as SeverityFilter[]).map(s => (
          <SeverityTab
            key={s}
            severity={s}
            count={s === 'all' ? diagnostics.length : counts[s]}
            active={severityFilter === s}
            onSelect={() => setSeverityFilter(s)}
          />
        ))}
      </div>

      {/* Search */}
      <div className="border-b border-[var(--tg-border)] p-[var(--tg-space-sm)]">
        <label className="flex items-center gap-2 rounded bg-[var(--tg-bg-surface)] px-2 py-1">
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--tg-text-muted)]" aria-hidden />
          <input
            type="search"
            placeholder="Filter by rule or message…"
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-[var(--tg-text-primary)] placeholder-[var(--tg-text-muted)] outline-none"
            aria-label="Filter diagnostics"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear filter">
              <X className="h-3 w-3 text-[var(--tg-text-muted)]" />
            </button>
          )}
        </label>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        diagnostics.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <CheckCircle className="h-8 w-8 text-[var(--tg-success)]" aria-hidden />
            <p className="text-xs font-medium text-[var(--tg-success)]">Tile is clean — no diagnostics</p>
          </div>
        ) : (
          <p className="px-[var(--tg-space-md)] py-[var(--tg-space-md)] text-xs text-[var(--tg-text-muted)]">
            No diagnostics match the current filter.
          </p>
        )
      ) : (
        <PanelSection title={`${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}>
          {filtered.map(({ diag, globalIndex }) => (
            <DiagnosticRow
              key={globalIndex}
              diagnostic={diag}
              globalIndex={globalIndex}
              isSelected={selectedIndex === globalIndex}
              onSelect={() => {
                setSelectedIndex(globalIndex);
                onDiagnosticSelected(globalIndex);
              }}
            />
          ))}
        </PanelSection>
      )}
    </WorkspacePanel>
  );
}
