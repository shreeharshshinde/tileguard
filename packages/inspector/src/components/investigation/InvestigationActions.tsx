/**
 * @tileguard/inspector — InvestigationActions (Phase 4 — Step 8)
 *
 * Contextual action buttons that appear alongside diagnostics, features,
 * and comparison results. Ensures no dead ends — every panel exposes
 * clear next-step actions:
 *
 *   Diagnostic → Jump to Feature → Highlight Geometry → Compare → Report → Copy
 *
 * Usage:
 *   <InvestigationActions
 *     actions={[
 *       { id: 'jump', label: 'Jump to Feature', icon: Crosshair, action: () => {...} },
 *       { id: 'copy', label: 'Copy JSON', icon: Clipboard, action: () => {...} },
 *     ]}
 *   />
 *
 * Also exports preset action builders for common workflows.
 */

import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BarChart3,
  Clipboard,
  Copy,
  Crosshair,
  Eye,
  FileOutput,
  GitCompare,
} from 'lucide-react';
import type { WorkspacePage } from '../../services/NavigationService.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActionItem {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly action: () => void;
  readonly variant?: 'default' | 'primary' | 'subtle' | undefined;
}

export interface InvestigationActionsProps {
  /** List of actions to display. */
  readonly actions: readonly ActionItem[];
  /** Layout direction. */
  readonly direction?: 'horizontal' | 'vertical' | undefined;
  /** Compact mode (smaller buttons). */
  readonly compact?: boolean | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvestigationActions({
  actions,
  direction = 'horizontal',
  compact = false,
}: InvestigationActionsProps): JSX.Element {
  if (actions.length === 0) return <></>;

  const containerClass =
    direction === 'vertical'
      ? 'flex flex-col gap-1'
      : 'flex flex-wrap items-center gap-1';

  return (
    <div
      className={containerClass}
      role="toolbar"
      aria-label="Investigation actions"
    >
      {actions.map((item) => {
        const Icon = item.icon;
        const variant = item.variant ?? 'default';

        const buttonClass = compact
          ? [
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors',
              variant === 'primary'
                ? 'bg-[var(--tg-accent)] text-white hover:bg-[var(--tg-accent)]/90'
                : variant === 'subtle'
                  ? 'text-[var(--tg-text-muted)] hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]'
                  : 'bg-[var(--tg-bg-hover)] text-[var(--tg-text-secondary)] hover:bg-[var(--tg-bg-surface)] hover:text-[var(--tg-text-primary)]',
            ].join(' ')
          : [
              'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
              variant === 'primary'
                ? 'bg-[var(--tg-accent)] text-white hover:bg-[var(--tg-accent)]/90'
                : variant === 'subtle'
                  ? 'text-[var(--tg-text-muted)] hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]'
                  : 'bg-[var(--tg-bg-hover)] text-[var(--tg-text-secondary)] hover:bg-[var(--tg-bg-surface)] hover:text-[var(--tg-text-primary)]',
            ].join(' ');

        return (
          <button
            key={item.id}
            type="button"
            onClick={item.action}
            className={buttonClass}
            title={item.label}
          >
            <Icon
              className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'}
              aria-hidden="true"
            />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preset action builders
// ---------------------------------------------------------------------------

/**
 * Build actions for a diagnostic item.
 * Provides: Jump to Feature, Open in Compare, Generate Report, Copy Rule ID.
 */
export function buildDiagnosticActions(options: {
  ruleId: string;
  layerName?: string | undefined;
  featureIndex?: number | undefined;
  onNavigate?: ((page: WorkspacePage) => void) | undefined;
  onSelectFeature?: (() => void) | undefined;
}): ActionItem[] {
  const items: ActionItem[] = [];

  if (
    options.layerName !== undefined &&
    options.featureIndex !== undefined &&
    options.onSelectFeature
  ) {
    items.push({
      id: 'jump-feature',
      label: 'Jump to Feature',
      icon: Crosshair,
      variant: 'primary',
      action: options.onSelectFeature,
    });
  }

  if (options.onNavigate) {
    items.push({
      id: 'open-statistics',
      label: 'View Statistics',
      icon: BarChart3,
      action: () => options.onNavigate!('statistics'),
    });
    items.push({
      id: 'generate-report',
      label: 'Generate Report',
      icon: FileOutput,
      action: () => options.onNavigate!('reports'),
    });
  }

  items.push({
    id: 'copy-rule',
    label: 'Copy Rule ID',
    icon: Copy,
    variant: 'subtle',
    action: () => {
      void navigator.clipboard.writeText(options.ruleId);
    },
  });

  return items;
}

/**
 * Build actions for a selected feature.
 * Provides: Highlight, Compare, Copy JSON, Copy Coordinates.
 */
export function buildFeatureActions(options: {
  feature: {
    layerName: string;
    featureIndex: number;
    properties: Record<string, unknown>;
  };
  onNavigate?: ((page: WorkspacePage) => void) | undefined;
  onHighlight?: (() => void) | undefined;
}): ActionItem[] {
  const items: ActionItem[] = [];

  if (options.onHighlight) {
    items.push({
      id: 'highlight',
      label: 'Highlight',
      icon: Eye,
      variant: 'primary',
      action: options.onHighlight,
    });
  }

  if (options.onNavigate) {
    items.push({
      id: 'compare',
      label: 'Compare',
      icon: GitCompare,
      action: () => options.onNavigate!('compare'),
    });
    items.push({
      id: 'report',
      label: 'Report',
      icon: FileOutput,
      action: () => options.onNavigate!('reports'),
    });
  }

  items.push({
    id: 'copy-json',
    label: 'Copy JSON',
    icon: Clipboard,
    variant: 'subtle',
    action: () => {
      void navigator.clipboard.writeText(
        JSON.stringify(options.feature.properties, null, 2),
      );
    },
  });

  return items;
}

/**
 * Build actions for a comparison result.
 * Provides: Open Regression, Generate Report, View Details.
 */
export function buildComparisonActions(options: {
  onNavigate?: ((page: WorkspacePage) => void) | undefined;
}): ActionItem[] {
  if (!options.onNavigate) return [];

  return [
    {
      id: 'regression',
      label: 'Run Regression',
      icon: ArrowRight,
      variant: 'primary',
      action: () => options.onNavigate!('regression'),
    },
    {
      id: 'report',
      label: 'Generate Report',
      icon: FileOutput,
      action: () => options.onNavigate!('reports'),
    },
  ];
}
