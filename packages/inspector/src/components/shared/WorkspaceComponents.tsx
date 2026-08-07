/**
 * @tileguard/inspector — Shared Workspace Components (Phase 3)
 *
 * Every engineering workspace reuses these primitives.
 * Zero business logic — pure layout and presentation.
 *
 * Components:
 *   WorkspacePanel    — scrollable panel card with a header slot
 *   PanelHeader       — titled header row with optional action slot
 *   WorkspaceBadge    — small coloured status badge
 *   LoadingWorkspace  — full-panel loading state
 *   ErrorWorkspace    — full-panel error state
 *   EmptyWorkspace    — full-panel empty state with icon + message
 *   WorkspaceToolbar  — contextual toolbar strip (per workspace)
 */

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// WorkspacePanel
// ---------------------------------------------------------------------------

export interface WorkspacePanelProps {
  readonly header?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly className?: string;
  /** aria-label for the section */
  readonly label?: string;
}

/**
 * A full-height panel used as left or right sidebar in a workspace layout.
 * The header is sticky; the body scrolls independently.
 */
export function WorkspacePanel({
  header,
  children,
  className = '',
  label,
}: WorkspacePanelProps): JSX.Element {
  return (
    <section
      aria-label={label}
      className={`flex h-full flex-col overflow-hidden ${className}`}
    >
      {header}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// PanelHeader
// ---------------------------------------------------------------------------

export interface PanelHeaderProps {
  readonly title: string;
  /** Optional sub-text or count badge on the right. */
  readonly subtitle?: string | number;
  /** Optional icon shown left of title. */
  readonly icon?: LucideIcon;
  /** Optional action slot rendered on the far right. */
  readonly actions?: React.ReactNode;
  readonly className?: string;
}

/**
 * Consistent header row used at the top of every workspace panel.
 * Accent-coloured uppercase label with optional count + actions.
 */
export function PanelHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  className = '',
}: PanelHeaderProps): JSX.Element {
  return (
    <div
      className={`flex shrink-0 items-center justify-between border-b border-[var(--tg-border)] px-[var(--tg-space-md)] py-[var(--tg-space-sm)] ${className}`}
    >
      <div className="flex items-center gap-[var(--tg-space-sm)] min-w-0">
        {Icon && (
          <Icon
            className="h-3.5 w-3.5 shrink-0 text-[var(--tg-accent)]"
            aria-hidden="true"
          />
        )}
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--tg-accent)] truncate">
          {title}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-[var(--tg-space-sm)]">
        {subtitle !== undefined && (
          <span className="font-mono text-[10px] text-[var(--tg-text-muted)]">
            {typeof subtitle === 'number' ? subtitle.toLocaleString() : subtitle}
          </span>
        )}
        {actions}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PanelSection
// ---------------------------------------------------------------------------

export interface PanelSectionProps {
  readonly title?: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}

/** A titled subsection inside a panel, e.g. "Properties", "Geometry". */
export function PanelSection({
  title,
  children,
  className = '',
}: PanelSectionProps): JSX.Element {
  return (
    <div className={`${className}`}>
      {title && (
        <div className="px-[var(--tg-space-md)] py-[var(--tg-space-xs)] text-[10px] font-medium uppercase tracking-wider text-[var(--tg-text-muted)]">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PanelDivider
// ---------------------------------------------------------------------------

/** Thin horizontal rule between panel sections. */
export function PanelDivider(): JSX.Element {
  return <div className="mx-[var(--tg-space-md)] border-t border-[var(--tg-border)]" />;
}

// ---------------------------------------------------------------------------
// WorkspaceBadge
// ---------------------------------------------------------------------------

export type BadgeVariant = 'error' | 'warning' | 'info' | 'success' | 'neutral' | 'accent';

export interface WorkspaceBadgeProps {
  readonly label: string | number;
  readonly variant?: BadgeVariant;
  readonly className?: string;
}

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  error:   'bg-[var(--tg-error)]/15 text-[var(--tg-error)] border-[var(--tg-error)]/30',
  warning: 'bg-[var(--tg-warning)]/15 text-[var(--tg-warning)] border-[var(--tg-warning)]/30',
  info:    'bg-[var(--tg-info)]/15 text-[var(--tg-info)] border-[var(--tg-info)]/30',
  success: 'bg-[var(--tg-success)]/15 text-[var(--tg-success)] border-[var(--tg-success)]/30',
  neutral: 'bg-[var(--tg-bg-surface)] text-[var(--tg-text-muted)] border-[var(--tg-border)]',
  accent:  'bg-[var(--tg-accent)]/15 text-[var(--tg-accent)] border-[var(--tg-accent)]/30',
};

/** Small inline badge for severity, counts, and status. */
export function WorkspaceBadge({
  label,
  variant = 'neutral',
  className = '',
}: WorkspaceBadgeProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded border px-1 py-0.5 font-mono text-[10px] font-semibold ${BADGE_CLASSES[variant]} ${className}`}
    >
      {typeof label === 'number' ? label.toLocaleString() : label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// LoadingWorkspace
// ---------------------------------------------------------------------------

export interface LoadingWorkspaceProps {
  readonly message?: string;
}

/** Full-panel loading skeleton with spinner. */
export function LoadingWorkspace({
  message = 'Loading…',
}: LoadingWorkspaceProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
    >
      <Loader2
        className="h-8 w-8 animate-spin text-[var(--tg-accent)]"
        aria-hidden="true"
      />
      <p className="text-sm text-[var(--tg-text-muted)]">{message}</p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ErrorWorkspace
// ---------------------------------------------------------------------------

export interface ErrorWorkspaceProps {
  readonly title?: string;
  readonly message: string;
  readonly onRetry?: () => void;
}

/** Full-panel error state with optional retry. */
export function ErrorWorkspace({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorWorkspaceProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--tg-error)]/10">
        <AlertTriangle
          className="h-7 w-7 text-[var(--tg-error)]"
          aria-hidden="true"
        />
      </div>
      <div className="max-w-sm">
        <h2 className="text-sm font-semibold text-[var(--tg-text-primary)]">{title}</h2>
        <p className="mt-1.5 text-xs text-[var(--tg-text-secondary)]">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-[var(--tg-accent)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--tg-accent-hover)]"
        >
          Retry
        </button>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// EmptyWorkspace
// ---------------------------------------------------------------------------

export interface EmptyWorkspaceAction {
  readonly label: string;
  readonly onClick: () => void;
  readonly variant?: 'primary' | 'secondary';
}

export interface EmptyWorkspaceProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description?: string;
  readonly actions?: readonly EmptyWorkspaceAction[];
}

/** Full-panel empty state — each workspace has its own message. */
export function EmptyWorkspace({
  icon: Icon,
  title,
  description,
  actions,
}: EmptyWorkspaceProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--tg-bg-surface)]">
        <Icon
          className="h-7 w-7 text-[var(--tg-text-muted)]"
          aria-hidden="true"
        />
      </div>
      <div className="max-w-sm">
        <h2 className="text-sm font-semibold text-[var(--tg-text-primary)]">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-xs text-[var(--tg-text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={[
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                action.variant === 'secondary'
                  ? 'border border-[var(--tg-border)] text-[var(--tg-text-secondary)] hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]'
                  : 'bg-[var(--tg-accent)] text-white hover:bg-[var(--tg-accent-hover)]',
              ].join(' ')}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// WorkspaceToolbar
// ---------------------------------------------------------------------------

export interface WorkspaceToolbarAction {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly onClick: () => void;
  readonly active?: boolean;
  readonly disabled?: boolean;
  readonly variant?: 'default' | 'danger';
}

export interface WorkspaceToolbarProps {
  readonly actions: readonly WorkspaceToolbarAction[];
  readonly children?: React.ReactNode;
  /** Optional right-aligned slot for search, selects, etc. */
  readonly rightSlot?: React.ReactNode;
  readonly className?: string;
}

/**
 * Horizontal toolbar strip with icon+label actions.
 * Content changes per workspace — passed in as `actions`.
 */
export function WorkspaceToolbar({
  actions,
  children,
  rightSlot,
  className = '',
}: WorkspaceToolbarProps): JSX.Element {
  return (
    <div
      role="toolbar"
      aria-label="Workspace toolbar"
      className={`flex h-9 shrink-0 items-center gap-1 border-b border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-[var(--tg-space-sm)] ${className}`}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        const base =
          'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors';
        const cls =
          action.active
            ? `${base} bg-[var(--tg-accent)]/20 text-[var(--tg-accent)]`
            : action.variant === 'danger'
            ? `${base} text-[var(--tg-error)] hover:bg-[var(--tg-error)]/10`
            : `${base} text-[var(--tg-text-secondary)] hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]`;

        return (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={`${cls} disabled:pointer-events-none disabled:opacity-40`}
            aria-label={action.label}
            aria-pressed={action.active}
            title={action.label}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        );
      })}
      {children}
      {rightSlot && (
        <div className="ml-auto flex items-center gap-1">{rightSlot}</div>
      )}
    </div>
  );
}
