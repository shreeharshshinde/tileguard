/**
 * @tileguard/inspector — DemoCard (Milestone 7.5 — Step C)
 *
 * A single card in the demo catalog grid. Displays dataset title,
 * description, tags, and a one-click load button.
 */

import { ArrowRight, Layers, Loader2 } from 'lucide-react';
import type { DemoDataset } from '../../services/DemoLoader.js';

// Tag → accent colour mapping for visual distinction
const TAG_COLOURS: Record<string, string> = {
  clean: 'bg-[var(--tg-success)] text-[#0f172a]',
  inspector: 'bg-[var(--tg-accent)] text-[#f8fafc]',
  diagnostics: 'bg-[var(--tg-error)] text-[#f8fafc]',
  broken: 'bg-[var(--tg-error)] text-[#f8fafc]',
  compare: 'bg-[var(--tg-warning)] text-[#0f172a]',
  diff: 'bg-[var(--tg-warning)] text-[#0f172a]',
  regression: 'bg-[#8b5cf6] text-[#f8fafc]',
  investigation: 'bg-[#8b5cf6] text-[#f8fafc]',
  style: 'bg-[#06b6d4] text-[#0f172a]',
  lint: 'bg-[#06b6d4] text-[#0f172a]',
  'real-world': 'bg-[var(--tg-bg-hover)] text-[var(--tg-text-secondary)]',
  geometry: 'bg-[var(--tg-bg-hover)] text-[var(--tg-text-secondary)]',
  properties: 'bg-[var(--tg-bg-hover)] text-[var(--tg-text-secondary)]',
};

// Dataset type → step label style
const STEP_STYLES: Record<string, string> = {
  Inspector: 'border-[var(--tg-accent)] text-[var(--tg-accent)]',
  Diagnostics: 'border-[var(--tg-error)] text-[var(--tg-error)]',
  Compare: 'border-[var(--tg-warning)] text-[var(--tg-warning)]',
  Regression: 'border-[#8b5cf6] text-[#8b5cf6]',
  Style: 'border-[#06b6d4] text-[#06b6d4]',
};

interface DemoCardProps {
  readonly dataset: DemoDataset;
  readonly isLoading: boolean;
  readonly onLoad: (dataset: DemoDataset) => void;
}

export function DemoCard({ dataset, isLoading, onLoad }: DemoCardProps): JSX.Element {
  const stepStyle = STEP_STYLES[dataset.demoStep] ?? 'border-[var(--tg-border)] text-[var(--tg-text-secondary)]';

  return (
    <article
      className="group flex flex-col rounded-[var(--tg-panel-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] p-[var(--tg-space-lg)] transition-all hover:border-[var(--tg-accent)] hover:shadow-[var(--tg-shadow-md)]"
      aria-label={`Demo dataset: ${dataset.title}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-[var(--tg-space-sm)]">
        <div className="flex items-center gap-[var(--tg-space-sm)]">
          <Layers className="h-4 w-4 shrink-0 text-[var(--tg-text-secondary)]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[var(--tg-text-primary)] leading-tight">
            {dataset.title}
          </h3>
        </div>
        {/* Demo step badge */}
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${stepStyle}`}
          title={`Demonstrates: ${dataset.demoStep}`}
        >
          {dataset.demoStep}
        </span>
      </div>

      {/* Description */}
      <p className="mt-[var(--tg-space-sm)] text-xs text-[var(--tg-text-secondary)] leading-relaxed flex-1">
        {dataset.description}
      </p>

      {/* Tags */}
      {dataset.tags.length > 0 && (
        <div className="mt-[var(--tg-space-md)] flex flex-wrap gap-1">
          {dataset.tags.map((tag) => (
            <span
              key={tag}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TAG_COLOURS[tag] ?? 'bg-[var(--tg-bg-hover)] text-[var(--tg-text-muted)]'}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Expected diagnostics summary */}
      {dataset.expectedDiagnostics !== undefined && (
        <div className="mt-[var(--tg-space-sm)] flex gap-3 text-[10px] font-mono text-[var(--tg-text-muted)]">
          <span className={dataset.expectedDiagnostics.errors > 0 ? 'text-[var(--tg-error)]' : ''}>
            {dataset.expectedDiagnostics.errors}E
          </span>
          <span className={dataset.expectedDiagnostics.warnings > 0 ? 'text-[var(--tg-warning)]' : ''}>
            {dataset.expectedDiagnostics.warnings}W
          </span>
          <span className={dataset.expectedDiagnostics.info > 0 ? 'text-[var(--tg-info)]' : ''}>
            {dataset.expectedDiagnostics.info}I
          </span>
        </div>
      )}

      {/* Load button */}
      <button
        type="button"
        onClick={() => onLoad(dataset)}
        disabled={isLoading}
        className="mt-[var(--tg-space-lg)] flex w-full items-center justify-center gap-[var(--tg-space-sm)] rounded-[var(--tg-border-radius)] bg-[var(--tg-accent)] px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-xs font-medium transition hover:bg-[var(--tg-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        aria-busy={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Loading…
          </>
        ) : (
          <>
            Open Demo
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </>
        )}
      </button>
    </article>
  );
}
