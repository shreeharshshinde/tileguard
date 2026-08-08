/**
 * @tileguard/inspector — EngineeringConsole (Phase 4 — Step 7)
 *
 * A bottom panel (like Chrome DevTools) that collapses below the main content.
 * Uses react-resizable-panels for adjustable height.
 *
 * Tabs:
 *   - Logs: Application log messages
 *   - Diagnostics: Current tile diagnostics summary
 *   - Timeline: Investigation timeline from InvestigationContext
 *   - Performance: Frame rate, memory, render stats
 *   - Tasks: Active loading/processing tasks
 *
 * Collapsed by default. Toggle with Ctrl+` or a button.
 * Future plugins can register their own tabs here.
 */
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Gauge,
  ListChecks,
  ScrollText,
  X,
} from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useInspectorContext } from '../../context/InspectorContext.js';
import { useInvestigationState } from '../../context/InvestigationContext.js';
import { InvestigationTimeline } from '../investigation/InvestigationTimeline.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConsoleTab =
  | 'logs'
  | 'diagnostics'
  | 'timeline'
  | 'performance'
  | 'tasks';

export interface EngineeringConsoleProps {
  /** Whether the console is expanded. */
  readonly expanded: boolean;
  /** Toggle expanded state. */
  readonly onToggle: () => void;
  /** Currently active tab. */
  readonly activeTab?: ConsoleTab | undefined;
  /** Performance metrics (FPS). */
  readonly fps?: number | undefined;
  /** Active file name. */
  readonly fileName?: string | null | undefined;
}

// ---------------------------------------------------------------------------
// Tab definition
// ---------------------------------------------------------------------------

interface TabDef {
  readonly key: ConsoleTab;
  readonly label: string;
  readonly icon: LucideIcon;
}

const TABS: TabDef[] = [
  { key: 'logs', label: 'Logs', icon: ScrollText },
  { key: 'diagnostics', label: 'Diagnostics', icon: AlertTriangle },
  { key: 'timeline', label: 'Timeline', icon: Clock },
  { key: 'performance', label: 'Performance', icon: Gauge },
  { key: 'tasks', label: 'Tasks', icon: ListChecks },
];

// ---------------------------------------------------------------------------
// Sub-panels
// ---------------------------------------------------------------------------

/** Logs panel — currently a placeholder for future structured logging. */
const LogsPanel = memo(function LogsPanel(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      <ScrollText className="h-6 w-6 text-[var(--tg-text-muted)] opacity-40" />
      <p className="text-xs text-[var(--tg-text-muted)]">
        No log messages. Logs appear when operations complete.
      </p>
    </div>
  );
});

/** Diagnostics summary for the console. */
function DiagnosticsPanel(): JSX.Element {
  const { store } = useInspectorContext();
  const lifecycle = store.lifecycle;

  if (lifecycle.status !== 'loaded') {
    return (
      <div className="px-3 py-4 text-xs text-[var(--tg-text-muted)]">
        No tile loaded. Load a tile to see diagnostics.
      </div>
    );
  }

  const diagnostics = lifecycle.diagnostics;
  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warnCount = diagnostics.filter((d) => d.severity === 'warning').length;
  const infoCount = diagnostics.filter((d) => d.severity === 'info').length;

  return (
    <div className="overflow-y-auto">
      {/* Summary bar */}
      <div className="flex items-center gap-4 border-b border-[var(--tg-border)] px-3 py-2">
        <span className="text-xs">
          <span className="font-medium text-[var(--tg-error)]">
            {errorCount}
          </span>{' '}
          errors
        </span>
        <span className="text-xs">
          <span className="font-medium text-[var(--tg-warning)]">
            {warnCount}
          </span>{' '}
          warnings
        </span>
        <span className="text-xs">
          <span className="font-medium text-[var(--tg-info,var(--tg-accent))]">
            {infoCount}
          </span>{' '}
          info
        </span>
        <span className="ml-auto text-[10px] text-[var(--tg-text-muted)]">
          {diagnostics.length} total
        </span>
      </div>
      {/* Diagnostic list */}
      <div className="max-h-40 overflow-y-auto">
        {diagnostics.slice(0, 20).map((d, i) => (
          <div
            key={`${d.ruleId}-${i}`}
            className="flex items-start gap-2 border-b border-[var(--tg-border)]/30 px-3 py-1.5"
          >
            <span
              className={[
                'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                d.severity === 'error'
                  ? 'bg-[var(--tg-error)]'
                  : d.severity === 'warning'
                    ? 'bg-[var(--tg-warning)]'
                    : 'bg-[var(--tg-accent)]',
              ].join(' ')}
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono text-[var(--tg-text-secondary)]">
                {d.ruleId}
              </span>
              <p className="truncate text-[10px] text-[var(--tg-text-muted)]">
                {d.message}
              </p>
            </div>
          </div>
        ))}
        {diagnostics.length > 20 && (
          <p className="px-3 py-2 text-[10px] text-[var(--tg-text-muted)]">
            …and {diagnostics.length - 20} more
          </p>
        )}
      </div>
    </div>
  );
}

/** Performance stats panel. */
function PerformancePanel({ fps }: { fps?: number | undefined }): JSX.Element {
  return (
    <div className="px-3 py-3">
      <div className="grid grid-cols-4 gap-4">
        <div>
          <p className="text-[10px] text-[var(--tg-text-muted)]">FPS</p>
          <p className="text-sm font-mono font-medium text-[var(--tg-text-primary)]">
            {fps?.toFixed(0) ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--tg-text-muted)]">Memory</p>
          <p className="text-sm font-mono font-medium text-[var(--tg-text-primary)]">
            {typeof performance !== 'undefined' && 'memory' in performance
              ? `${Math.round(
                  ((performance as any).memory?.usedJSHeapSize ?? 0) / 1048576,
                )}MB`
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--tg-text-muted)]">Renderer</p>
          <p className="text-sm font-mono font-medium text-[var(--tg-text-primary)]">
            Canvas 2D
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--tg-text-muted)]">Status</p>
          <p className="text-sm font-mono font-medium text-[var(--tg-success)]">
            Active
          </p>
        </div>
      </div>
    </div>
  );
}

/** Tasks panel — shows active operations. */
function TasksPanel(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      <ListChecks className="h-6 w-6 text-[var(--tg-text-muted)] opacity-40" />
      <p className="text-xs text-[var(--tg-text-muted)]">
        No active tasks. Tasks appear during tile loading, comparison, and
        analysis.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function EngineeringConsole({
  expanded,
  onToggle,
  activeTab: initialTab,
  fps,
  fileName,
}: EngineeringConsoleProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<ConsoleTab>(
    initialTab ?? 'diagnostics',
  );
  const { timeline } = useInvestigationState();

  // Collapsed bar
  if (!expanded) {
    return (
      <div className="flex h-7 shrink-0 items-center border-t border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 text-[10px] text-[var(--tg-text-muted)] hover:text-[var(--tg-text-primary)]"
          aria-label="Expand console"
        >
          <ChevronUp className="h-3 w-3" />
          <span>Console</span>
        </button>
        <div className="ml-4 flex items-center gap-3">
          {timeline.length > 0 && (
            <span className="text-[10px] text-[var(--tg-text-muted)]">
              {timeline.length} events
            </span>
          )}
          {fps !== undefined && (
            <span className="text-[10px] font-mono text-[var(--tg-text-muted)]">
              {fps.toFixed(0)} fps
            </span>
          )}
        </div>
        {fileName && (
          <span className="ml-auto truncate text-[10px] text-[var(--tg-text-muted)]">
            {fileName}
          </span>
        )}
      </div>
    );
  }

  // Expanded panel
  return (
    <motion.div
      initial={{ height: 0 }}
      animate={{ height: 200 }}
      exit={{ height: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="flex shrink-0 flex-col overflow-hidden border-t border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]"
      style={{ height: 200 }}
    >
      {/* Tab bar */}
      <div className="flex items-center border-b border-[var(--tg-border)] px-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={[
              'flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium transition-colors border-b-2',
              activeTab === key
                ? 'border-[var(--tg-accent)] text-[var(--tg-text-primary)]'
                : 'border-transparent text-[var(--tg-text-muted)] hover:text-[var(--tg-text-secondary)]',
            ].join(' ')}
            role="tab"
            aria-selected={activeTab === key}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            {label}
          </button>
        ))}

        {/* Close/collapse button */}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onToggle}
            className="rounded p-1 text-[var(--tg-text-muted)] hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]"
            aria-label="Collapse console"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden" role="tabpanel">
        {activeTab === 'logs' && <LogsPanel />}
        {activeTab === 'diagnostics' && <DiagnosticsPanel />}
        {activeTab === 'timeline' && (
          <InvestigationTimeline compact maxHeight={160} />
        )}
        {activeTab === 'performance' && <PerformancePanel fps={fps} />}
        {activeTab === 'tasks' && <TasksPanel />}
      </div>
    </motion.div>
  );
}
