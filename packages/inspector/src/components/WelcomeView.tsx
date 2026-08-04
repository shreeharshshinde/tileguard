/**
 * @tileguard/inspector — WelcomeView (Milestone 7.5 — Step C)
 *
 * Redesigned welcome page with one-click demo loading.
 *
 * Layout:
 *   Left column (scrollable): demo catalog grid + file open section
 *   Right sidebar: quick-start guide + keyboard shortcuts
 *
 * Demo flow (Step C):
 *   Click demo card → DemoCatalog fetches file → calls onFileSelected/onComparisonSelected
 *   → InspectorApp loads tile → navigates to correct tab automatically
 */

import { BookOpen, Keyboard, Shield } from 'lucide-react';
import type { DemoDataset } from '../services/DemoLoader.js';
import { DemoCatalog } from './welcome/DemoCatalog.js';
import { RecentFiles } from './welcome/RecentFiles.js';
import { WelcomeActions } from './welcome/WelcomeActions.js';

interface WelcomeViewProps {
  readonly onFileSelected: (file: File) => void;
  readonly onComparisonSelected?: (fileA: File, fileB: File) => void;
}

/** Quick-start guide shown in the right sidebar. */
function QuickStartGuide(): JSX.Element {
  return (
    <section aria-labelledby="quickstart-heading" className="mb-[var(--tg-space-xl)]">
      <div className="mb-[var(--tg-space-md)] flex items-center gap-[var(--tg-space-sm)]">
        <BookOpen className="h-4 w-4 text-[var(--tg-text-secondary)]" aria-hidden="true" />
        <h2
          id="quickstart-heading"
          className="text-sm font-semibold text-[var(--tg-text-primary)]"
        >
          Quick Start
        </h2>
      </div>
      <ol className="space-y-[var(--tg-space-lg)] text-xs text-[var(--tg-text-secondary)]">
        <li>
          <strong className="block text-[var(--tg-text-primary)]">1 · Open a demo</strong>
          Click any demo card on the left for an instant one-click load. No file picker.
        </li>
        <li>
          <strong className="block text-[var(--tg-text-primary)]">2 · Explore the canvas</strong>
          Drag to pan, scroll to zoom, hover to highlight features.
        </li>
        <li>
          <strong className="block text-[var(--tg-text-primary)]">3 · Inspect features</strong>
          Click any feature to open the Feature Inspector on the right panel.
        </li>
        <li>
          <strong className="block text-[var(--tg-text-primary)]">4 · Run diagnostics</strong>
          Switch to the Diagnostics tab to see errors and rule explanations.
        </li>
        <li>
          <strong className="block text-[var(--tg-text-primary)]">5 · Compare tiles</strong>
          Use the Compare tab to diff two tile versions side by side.
        </li>
      </ol>
    </section>
  );
}

/** Keyboard shortcut reference shown in the right sidebar. */
function KeyboardShortcuts(): JSX.Element {
  const shortcuts: readonly [string, string][] = [
    ['Ctrl+1', 'Diagnostics tab'],
    ['Ctrl+2', 'Statistics tab'],
    ['Ctrl+3', 'Settings tab'],
    ['Ctrl+F', 'Focus search'],
    ['Ctrl+H', 'Toggle hover'],
    ['Ctrl+Shift+V', 'Toggle vertices'],
    ['Ctrl+B', 'Toggle tile bounds'],
    ['Ctrl+Shift+D', 'Developer overlay'],
    ['Ctrl+Shift+P', 'Presentation mode'],
    ['F', 'Focus feature'],
    ['R', 'Reset view'],
    ['Esc', 'Clear selection'],
  ];

  return (
    <section aria-labelledby="shortcuts-heading">
      <div className="mb-[var(--tg-space-md)] flex items-center gap-[var(--tg-space-sm)]">
        <Keyboard className="h-4 w-4 text-[var(--tg-text-secondary)]" aria-hidden="true" />
        <h2
          id="shortcuts-heading"
          className="text-sm font-semibold text-[var(--tg-text-primary)]"
        >
          Shortcuts
        </h2>
      </div>
      <dl className="space-y-1">
        {shortcuts.map(([key, desc]) => (
          <div key={key} className="flex items-center justify-between gap-[var(--tg-space-sm)]">
            <kbd className="rounded bg-[var(--tg-bg-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--tg-text-secondary)]">
              {key}
            </kbd>
            <span className="text-right text-[10px] text-[var(--tg-text-muted)]">{desc}</span>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The redesigned welcome page with demo catalog. */
export function WelcomeView({ onFileSelected, onComparisonSelected }: WelcomeViewProps): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLoadSingle = (file: File, _dataset: DemoDataset) => {
    onFileSelected(file);
  };

  const handleLoadComparison = (fileA: File, fileB: File, _dataset: DemoDataset) => {
    if (onComparisonSelected !== undefined) {
      onComparisonSelected(fileA, fileB);
    } else {
      // Fallback: load tile A if comparison handler not wired up
      onFileSelected(fileA);
    }
  };

  return (
    <main className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_22rem] overflow-hidden bg-[var(--tg-bg-primary)]">
      {/* ── Left: scrollable content ────────────────────────────────── */}
      <div className="overflow-y-auto px-[var(--tg-space-2xl)] py-[var(--tg-space-xl)]">
        {/* Hero */}
        <header className="mb-[var(--tg-space-2xl)]">
          <div className="flex items-center gap-[var(--tg-space-sm)]">
            <Shield
              className="h-6 w-6 text-[var(--tg-accent)]"
              aria-hidden="true"
            />
            <h1 className="text-2xl font-semibold text-[var(--tg-text-primary)]">
              TileGuard <span className="text-[var(--tg-accent)]">Inspector</span>
            </h1>
          </div>
          <p className="mt-[var(--tg-space-sm)] text-sm text-[var(--tg-text-secondary)]">
            Automated quality gates for vector tiles and MapLibre styles.
          </p>
        </header>

        {/* Demo catalog */}
        <DemoCatalog
          onLoadSingleDemo={handleLoadSingle}
          onLoadComparisonDemo={handleLoadComparison}
        />

        {/* Divider */}
        <div className="my-[var(--tg-space-2xl)] flex items-center gap-[var(--tg-space-md)]">
          <span className="h-px flex-1 bg-[var(--tg-border)]" aria-hidden="true" />
          <span className="text-xs text-[var(--tg-text-muted)]">or open your own file</span>
          <span className="h-px flex-1 bg-[var(--tg-border)]" aria-hidden="true" />
        </div>

        {/* File open actions */}
        <WelcomeActions onFileSelected={onFileSelected} />

        {/* Recent files */}
        <RecentFiles onOpenFilePicker={() => document.getElementById('__welcome-file-trigger')?.click()} />
      </div>

      {/* ── Right sidebar ───────────────────────────────────────────── */}
      <aside className="overflow-y-auto border-l border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-[var(--tg-space-xl)] py-[var(--tg-space-xl)]">
        <QuickStartGuide />
        <div className="my-[var(--tg-space-xl)] h-px bg-[var(--tg-border)]" aria-hidden="true" />
        <KeyboardShortcuts />
      </aside>
    </main>
  );
}
