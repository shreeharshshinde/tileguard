/**
 * @tileguard/inspector — InvestigationBreadcrumb (Phase 4 — Step 2)
 *
 * Context-aware breadcrumb that reads from InvestigationContext and
 * NavigationService to show the full investigation path:
 *
 *   Home > Tokyo Demo > Explore > Buildings > Feature #241
 *
 * Each segment is clickable (except the current/last one) to allow
 * quick navigation back up the hierarchy.
 *
 * Benefits:
 *   - User never gets lost
 *   - Conference audience immediately understands context
 *   - Investigation state is always visible
 */
import { ChevronRight, Home } from 'lucide-react';
import { useMemo } from 'react';
import { useInvestigationState } from '../../context/InvestigationContext.js';
import type { WorkspacePage } from '../../services/NavigationService.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BreadcrumbSegment {
  readonly label: string;
  readonly action?: (() => void) | undefined;
  readonly icon?: 'home' | undefined;
}

export interface InvestigationBreadcrumbProps {
  /** Current active workspace page (tab). */
  readonly activePage: WorkspacePage;
  /** Navigate to another workspace page. */
  readonly onNavigate?: ((page: WorkspacePage) => void) | undefined;
  /** Navigate to home. */
  readonly onGoHome?: (() => void) | undefined;
}

// ---------------------------------------------------------------------------
// Page labels
// ---------------------------------------------------------------------------

const PAGE_LABELS: Record<WorkspacePage, string> = {
  welcome: 'Home',
  inspector: 'Explore',
  diagnostics: 'Diagnose',
  statistics: 'Statistics',
  'style-explorer': 'Style',
  compare: 'Compare',
  regression: 'Regression',
  reports: 'Reports',
  settings: 'Settings',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvestigationBreadcrumb({
  activePage,
  onNavigate,
  onGoHome,
}: InvestigationBreadcrumbProps): JSX.Element {
  const state = useInvestigationState();

  const segments = useMemo<BreadcrumbSegment[]>(() => {
    const result: BreadcrumbSegment[] = [];

    // 1. Home (always first)
    result.push({
      label: 'Home',
      ...(onGoHome ? { action: onGoHome } : {}),
      icon: 'home',
    });

    // 2. Dataset name (if loaded)
    if (state.datasetName) {
      result.push({ label: state.datasetName });
    }

    // 3. Current workspace page
    const pageLabel = PAGE_LABELS[activePage] ?? activePage;
    result.push({ label: pageLabel });

    // 4. Active layer (if any)
    if (state.activeLayer) {
      result.push({ label: state.activeLayer });
    }

    // 5. Selected feature (if any)
    if (state.selectedFeature) {
      result.push({
        label: `Feature #${state.selectedFeature.featureIndex}`,
      });
    }

    // 6. Active diagnostic (if on diagnostics page)
    if (activePage === 'diagnostics' && state.activeDiagnostic) {
      result.push({ label: state.activeDiagnostic.ruleId });
    }

    // 7. Selected style layer (if on style page)
    if (activePage === 'style-explorer' && state.selectedStyleLayer) {
      result.push({ label: state.selectedStyleLayer });
    }

    return result;
  }, [
    state.datasetName,
    state.activeLayer,
    state.selectedFeature,
    state.activeDiagnostic,
    state.selectedStyleLayer,
    activePage,
    onGoHome,
  ]);

  if (segments.length === 0) return <></>;

  return (
    <nav aria-label="Investigation breadcrumb" className="flex items-center">
      <ol className="flex items-center gap-0.5">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const isClickable = segment.action !== undefined && !isLast;

          return (
            <li
              key={`${segment.label}-${index}`}
              className="flex items-center gap-0.5"
            >
              {isClickable ? (
                <button
                  type="button"
                  onClick={segment.action}
                  className="flex items-center gap-1 rounded px-1 py-0.5 text-xs text-[var(--tg-text-muted)] transition-colors hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]"
                >
                  {segment.icon === 'home' && (
                    <Home className="h-3 w-3" aria-hidden="true" />
                  )}
                  <span>{segment.label}</span>
                </button>
              ) : (
                <span
                  className={[
                    'flex items-center gap-1 px-1 py-0.5 text-xs',
                    isLast
                      ? 'font-medium text-[var(--tg-text-primary)]'
                      : 'text-[var(--tg-text-muted)]',
                  ].join(' ')}
                >
                  {segment.icon === 'home' && (
                    <Home className="h-3 w-3" aria-hidden="true" />
                  )}
                  <span>{segment.label}</span>
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  className="h-3 w-3 shrink-0 text-[var(--tg-text-muted)] opacity-50"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
