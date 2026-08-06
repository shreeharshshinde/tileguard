/**
 * @tileguard/inspector — NextStepBar (Phase 2 — Step 6)
 *
 * Contextual "what to do next" bar rendered at the bottom of every page.
 * Surfaces the recommended next actions from the current page's metadata,
 * giving users a guided workflow path.
 *
 * Example for Explore page:
 *   Next: [ Run Diagnostics ]  [ View Statistics ]
 *
 * The component reads metadata from NavigationService and renders buttons
 * that navigate to the target page.
 */
import {
  AlertTriangle,
  BarChart3,
  Bug,
  Crosshair,
  FileText,
  GitCompare,
  Radar,
  Upload,
  Play,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NextStep, WorkspacePage } from '../../services/NavigationService.js';
import { getNavigationService } from '../../services/NavigationService.js';

// Map icon string names to Lucide icon components
const ICON_MAP: Record<string, LucideIcon> = {
  AlertTriangle,
  BarChart3,
  Bug,
  Crosshair,
  FileText,
  GitCompare,
  Radar,
  Upload,
  Play,
  ChevronRight,
};

export interface NextStepBarProps {
  /** The currently active page. Used to fetch contextual next steps. */
  readonly currentPage: WorkspacePage;
  /** Called when the user clicks a next step that navigates to another page. */
  readonly onNavigate: (page: WorkspacePage) => void;
  /** Optional extra next-step actions from the parent (e.g. load file). */
  readonly extraSteps?: readonly NextStep[];
}

export function NextStepBar({
  currentPage,
  onNavigate,
  extraSteps,
}: NextStepBarProps): JSX.Element {
  const nav = getNavigationService();
  const meta = nav.getPageMeta(currentPage);
  const steps = [...meta.nextSteps, ...(extraSteps ?? [])];

  if (steps.length === 0) return <></>;

  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-4 py-2">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]">
        Next
      </span>
      <span className="h-3 w-px shrink-0 bg-[var(--tg-border)]" aria-hidden="true" />
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {steps.map((step, index) => {
          const IconComponent = step.icon ? ICON_MAP[step.icon] : ChevronRight;
          return (
            <button
              key={`${step.label}-${index}`}
              type="button"
              title={step.description}
              onClick={() => {
                if (step.targetPage) {
                  onNavigate(step.targetPage);
                }
              }}
              className="flex items-center gap-1.5 rounded-md border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] px-2.5 py-1 text-xs font-medium text-[var(--tg-text-secondary)] transition hover:border-[var(--tg-accent)]/40 hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]"
            >
              {IconComponent && (
                <IconComponent
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
              )}
              {step.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
