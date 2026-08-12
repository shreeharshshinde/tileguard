/**
 * @tileguard/inspector — ContextRecommendations (Phase 4 — Step 9)
 *
 * Intelligent recommendations that guide the user to the natural next step.
 * Reads the current investigation state and suggests what to do next:
 *
 *   No diagnostics → "Generate statistics"
 *   After statistics → "Compare with another tile"
 *   After comparison → "Run regression analysis"
 *   After regression → "Generate report"
 *
 * The application guides the user through the full investigation workflow.
 * Renders as a subtle inline bar or card depending on placement.
 */
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BarChart3,
  FileOutput,
  GitCompare,
  Lightbulb,
  Radar,
  Sparkles,
} from 'lucide-react';
import { useMemo } from 'react';
import { useInspectorContext } from '../../context/InspectorContext.js';
import { useInvestigationState } from '../../context/InvestigationContext.js';
import type { WorkspacePage } from '../../services/NavigationService.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Recommendation {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly targetPage: WorkspacePage;
  readonly priority: number; // higher = more prominent
}

export interface ContextRecommendationsProps {
  /** Current active workspace page. */
  readonly activePage: WorkspacePage;
  /** Navigate to a workspace page. */
  readonly onNavigate: (page: WorkspacePage) => void;
  /** Compact mode (inline bar). */
  readonly compact?: boolean | undefined;
  /** Maximum number of recommendations to show. */
  readonly maxItems?: number | undefined;
}

// ---------------------------------------------------------------------------
// Recommendation engine
// ---------------------------------------------------------------------------

function computeRecommendations(
  activePage: WorkspacePage,
  hasFeatures: boolean,
  hasDiagnostics: boolean,
  hasComparison: boolean,
  _hasRegressionSelection: boolean,
  hasSelectedFeature: boolean,
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Phase-based recommendations: guide user through investigation flow

  // On Explore page
  if (activePage === 'inspector') {
    if (hasFeatures && !hasDiagnostics) {
      recs.push({
        id: 'run-diagnostics',
        label: 'Run diagnostics',
        description: 'Check for geometry errors and rule violations',
        icon: Sparkles,
        targetPage: 'diagnostics',
        priority: 90,
      });
    }
    if (hasFeatures) {
      recs.push({
        id: 'view-statistics',
        label: 'View statistics',
        description:
          'See feature counts, layer composition, and property distributions',
        icon: BarChart3,
        targetPage: 'statistics',
        priority: 70,
      });
    }
    if (hasSelectedFeature) {
      recs.push({
        id: 'compare-tile',
        label: 'Compare with another tile',
        description: 'Run a structural diff to detect changes',
        icon: GitCompare,
        targetPage: 'compare',
        priority: 60,
      });
    }
  }

  // On Diagnostics page
  if (activePage === 'diagnostics') {
    recs.push({
      id: 'gen-statistics',
      label: 'Generate statistics',
      description: 'Understand the context of these diagnostics',
      icon: BarChart3,
      targetPage: 'statistics',
      priority: 80,
    });
    if (!hasComparison) {
      recs.push({
        id: 'compare-for-regression',
        label: 'Compare with previous version',
        description: 'Detect whether diagnostics are regressions',
        icon: GitCompare,
        targetPage: 'compare',
        priority: 70,
      });
    }
  }

  // On Statistics page
  if (activePage === 'statistics') {
    recs.push({
      id: 'compare-after-stats',
      label: 'Compare with another tile',
      description: 'See how metrics differ between versions',
      icon: GitCompare,
      targetPage: 'compare',
      priority: 80,
    });
    recs.push({
      id: 'generate-report-stats',
      label: 'Generate report',
      description: 'Export statistics into a shareable report',
      icon: FileOutput,
      targetPage: 'reports',
      priority: 50,
    });
  }

  // On Compare page
  if (activePage === 'compare' && hasComparison) {
    recs.push({
      id: 'run-regression',
      label: 'Run regression analysis',
      description: 'Detect quality regressions from the comparison',
      icon: Radar,
      targetPage: 'regression',
      priority: 90,
    });
    recs.push({
      id: 'generate-report-compare',
      label: 'Generate comparison report',
      description: 'Document the changes and their impact',
      icon: FileOutput,
      targetPage: 'reports',
      priority: 60,
    });
  }

  // On Regression page
  if (activePage === 'regression') {
    recs.push({
      id: 'generate-report-regression',
      label: 'Generate report',
      description: 'Export regression analysis as an engineering report',
      icon: FileOutput,
      targetPage: 'reports',
      priority: 90,
    });
  }

  // On Reports page — nothing more to suggest, journey complete
  if (activePage === 'reports') {
    recs.push({
      id: 'back-to-explore',
      label: 'Start a new investigation',
      description: 'Return to explore to begin a new analysis',
      icon: ArrowRight,
      targetPage: 'inspector',
      priority: 40,
    });
  }

  // Sort by priority (descending)
  return recs.sort((a, b) => b.priority - a.priority);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContextRecommendations({
  activePage,
  onNavigate,
  compact = false,
  maxItems = 2,
}: ContextRecommendationsProps): JSX.Element {
  const { store } = useInspectorContext();
  const investigationState = useInvestigationState();

  const recommendations = useMemo(() => {
    const lifecycle = store.lifecycle;
    const hasFeatures = lifecycle.status === 'loaded';
    const hasDiagnostics =
      lifecycle.status === 'loaded' && lifecycle.diagnostics.length > 0;
    const hasComparison = investigationState.comparison.isActive;
    const hasRegressionSelection =
      investigationState.regressionSelection !== null;
    const hasSelectedFeature = investigationState.selectedFeature !== null;

    return computeRecommendations(
      activePage,
      hasFeatures,
      hasDiagnostics,
      hasComparison,
      hasRegressionSelection,
      hasSelectedFeature,
    ).slice(0, maxItems);
  }, [activePage, store.lifecycle, investigationState, maxItems]);

  if (recommendations.length === 0) return <></>;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5">
        <Lightbulb
          className="h-3 w-3 shrink-0 text-[var(--tg-warning)]"
          aria-hidden="true"
        />
        {recommendations.map((rec) => (
          <button
            key={rec.id}
            type="button"
            onClick={() => onNavigate(rec.targetPage)}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium text-[var(--tg-accent)] hover:bg-[var(--tg-bg-hover)]"
            title={rec.description}
          >
            <rec.icon className="h-2.5 w-2.5" aria-hidden="true" />
            {rec.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="rounded-lg border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] p-3"
    >
      <div className="mb-2 flex items-center gap-1.5">
        <Lightbulb
          className="h-3.5 w-3.5 text-[var(--tg-warning)]"
          aria-hidden="true"
        />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--tg-text-muted)]">
          Suggested Next Steps
        </span>
      </div>
      <div className="space-y-1.5">
        {recommendations.map((rec) => {
          const Icon = rec.icon;
          return (
            <button
              key={rec.id}
              type="button"
              onClick={() => onNavigate(rec.targetPage)}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-[var(--tg-bg-hover)]"
            >
              <Icon
                className="h-4 w-4 shrink-0 text-[var(--tg-accent)]"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-[var(--tg-text-primary)]">
                  {rec.label}
                </span>
                <span className="block text-[10px] text-[var(--tg-text-muted)]">
                  {rec.description}
                </span>
              </div>
              <ArrowRight
                className="h-3 w-3 shrink-0 text-[var(--tg-text-muted)]"
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
