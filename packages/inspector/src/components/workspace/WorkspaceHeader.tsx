/**
 * @tileguard/inspector — WorkspaceHeader (Phase 1 — Step 3)
 *
 * The top application bar rendered inside the Workspace shell.
 *
 * This is an extraction of the existing AppHeader from InspectorApp.tsx into
 * a dedicated, named component so the Workspace shell can compose it cleanly.
 *
 * Nothing has changed functionally — only the component has been moved into
 * the workspace/ directory with a spec-compliant name.
 */
import {
  HelpCircle,
  Minus,
  Moon,
  Settings as SettingsIcon,
  Shield,
  Square,
  X,
} from 'lucide-react';
import { getPresentationService } from '../../services/PresentationService.js';
import { PresentationToggle } from '../presentation/PresentationToggle.js';

export interface WorkspaceHeaderProps {
  /** Called when the user clicks the global settings (gear) icon. */
  readonly onOpenSettings?: () => void;
}

export function WorkspaceHeader({ onOpenSettings }: WorkspaceHeaderProps): JSX.Element {
  const iconButton =
    'rounded-[var(--tg-border-radius)] p-1.5 text-[var(--tg-text-secondary)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]';

  const handleThemeToggle = () => {
    // Future: wire to ThemeService when introduced.
  };

  return (
    <header className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-3">
      <div className="flex items-center gap-4">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-[var(--tg-error)]" />
          <span className="h-3 w-3 rounded-full bg-[var(--tg-warning)]" />
          <span className="h-3 w-3 rounded-full bg-[var(--tg-success)]" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--tg-text-primary)]">
          <Shield
            className="h-4 w-4 text-[var(--tg-accent)]"
            aria-hidden="true"
          />
          TileGuard Inspector
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={iconButton}
          aria-label="Toggle theme"
          onClick={handleThemeToggle}
        >
          <Moon className="h-4 w-4" />
        </button>
        <button type="button" className={iconButton} aria-label="Help">
          <HelpCircle className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={iconButton}
          aria-label="Application settings"
          onClick={onOpenSettings}
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
        <PresentationToggle />
        <span
          className="mx-1 h-4 w-px bg-[var(--tg-border)]"
          aria-hidden="true"
        />
        <button
          type="button"
          className={iconButton}
          aria-label="Minimize window"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={iconButton}
          aria-label="Maximize window"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={iconButton} aria-label="Close window">
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
