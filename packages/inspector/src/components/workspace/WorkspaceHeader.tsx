/**
 * @tileguard/inspector — WorkspaceHeader (Phase 2 — Step 3+4)
 *
 * Top application bar for the workspace.
 *
 * Phase 2 improvements:
 *   - Shows page identity: title, subtitle, and breadcrumb trail.
 *   - Back button rendered when navigation history is available.
 *   - Actions slot: search toggle, settings, presentation, help.
 *
 * Positioned above the sidebar + content area (full-width).
 * The sidebar renders below it.
 */
import {
  ArrowLeft,
  HelpCircle,
  Moon,
  Settings as SettingsIcon,
  Shield,
} from 'lucide-react';
import type { WorkspacePage } from '../../services/NavigationService.js';
import { getNavigationService } from '../../services/NavigationService.js';
import { InvestigationBreadcrumb } from '../investigation/InvestigationBreadcrumb.js';
import { PresentationToggle } from '../presentation/PresentationToggle.js';

export interface WorkspaceHeaderProps {
  /** The currently active workspace page, used to derive page identity. */
  readonly activePage: WorkspacePage;
  /** Called when the user clicks the global settings icon. */
  readonly onOpenSettings?: (() => void) | undefined;
  /** Called when the user clicks the help icon. */
  readonly onOpenHelp?: (() => void) | undefined;
  /** Called when the user requests to go home. */
  readonly onGoHome?: (() => void) | undefined;
  /** Optional extra actions to render on the right side. */
  readonly actions?: React.ReactNode | undefined;
}

export function WorkspaceHeader({
  activePage,
  onOpenSettings,
  onOpenHelp,
  onGoHome,
  actions,
}: WorkspaceHeaderProps): JSX.Element {
  const nav = getNavigationService();
  const canGoBack = nav.canGoBack();
  const meta = nav.getPageMeta(activePage);

  const iconButton =
    'rounded-[var(--tg-border-radius)] p-1.5 text-[var(--tg-text-secondary)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]';

  const handleBack = () => {
    nav.back();
  };

  return (
    <header className="flex h-12 shrink-0 items-center border-b border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-3">
      {/* Left: brand + back + breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Brand mark */}
        <div
          className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--tg-text-primary)]"
          aria-label="TileGuard Inspector"
        >
          <Shield
            className="h-4 w-4 text-[var(--tg-accent)]"
            aria-hidden="true"
          />
          <span className="hidden text-[var(--tg-text-muted)] sm:inline">
            TileGuard
          </span>
        </div>

        {/* Separator */}
        <span
          className="h-4 w-px shrink-0 bg-[var(--tg-border)]"
          aria-hidden="true"
        />

        {/* Back button */}
        {canGoBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className={iconButton}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        {/* Phase 4: Context-aware investigation breadcrumb */}
        <div className="hidden min-w-0 sm:block">
          <InvestigationBreadcrumb
            activePage={activePage}
            {...(onGoHome !== undefined ? { onGoHome } : {})}
          />
        </div>

        {/* Mobile: show just the title */}
        <span className="truncate text-xs font-semibold text-[var(--tg-text-primary)] sm:hidden">
          {meta.title}
        </span>
      </div>

      {/* Right: subtitle + actions */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Subtitle — visible on wider viewports */}
        {meta.subtitle && (
          <span className="mr-3 hidden max-w-xs truncate text-xs text-[var(--tg-text-muted)] lg:block">
            {meta.subtitle}
          </span>
        )}

        {/* Custom actions from parent */}
        {actions}

        <button
          type="button"
          className={iconButton}
          aria-label="Toggle theme"
          onClick={() => {
            /* Future: wire to ThemeService */
          }}
        >
          <Moon className="h-4 w-4" />
        </button>

        {onOpenHelp && (
          <button
            type="button"
            className={iconButton}
            aria-label="Help"
            onClick={onOpenHelp}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          className={iconButton}
          aria-label="Settings"
          onClick={onOpenSettings}
        >
          <SettingsIcon className="h-4 w-4" />
        </button>

        <PresentationToggle />
      </div>
    </header>
  );
}
