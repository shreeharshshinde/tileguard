/**
 * @tileguard/inspector — PageHeader (Phase 2 — Step 3+4)
 *
 * Per-page identity header rendered inside each workspace page.
 * Shows:
 *   - Back button (if history available)
 *   - Breadcrumb path
 *   - Page title + subtitle
 *   - Optional action slot (right-side buttons)
 *
 * This is distinct from WorkspaceHeader (the top application bar) —
 * PageHeader is the page-level identity row, not the window chrome.
 */
import { ArrowLeft } from 'lucide-react';
import { Breadcrumb } from './Breadcrumb.js';

export interface PageHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly breadcrumb?: readonly string[];
  /** If true, renders the back button. */
  readonly canGoBack?: boolean;
  /** Called when the user clicks the back button. */
  readonly onBack?: () => void;
  /** Optional slot for action buttons on the right side. */
  readonly actions?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  canGoBack = false,
  onBack,
  actions,
}: PageHeaderProps): JSX.Element {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {/* Back button */}
        {canGoBack && onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="shrink-0 rounded-md p-1.5 text-[var(--tg-text-secondary)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <div className="min-w-0">
          {/* Breadcrumb */}
          {breadcrumb && breadcrumb.length > 1 && (
            <div className="mb-0.5">
              <Breadcrumb path={breadcrumb} />
            </div>
          )}

          {/* Title */}
          <h1 className="truncate text-sm font-semibold text-[var(--tg-text-primary)]">
            {title}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-[var(--tg-text-secondary)]">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Actions slot */}
      {actions && (
        <div className="ml-4 flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
