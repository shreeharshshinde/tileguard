/**
 * @tileguard/inspector — SidebarFooter (Phase 2 — Step 2)
 *
 * Footer area at the bottom of the sidebar.
 * Shows the TileGuard brand name, version, and the Presentation Mode toggle.
 */
import { Monitor, Shield } from 'lucide-react';
import { getPresentationService } from '../../services/PresentationService.js';

export function SidebarFooter(): JSX.Element {
  const handlePresentationToggle = () => {
    getPresentationService().toggle();
  };

  return (
    <div className="border-t border-[var(--tg-border)] px-2 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield
            className="h-3.5 w-3.5 text-[var(--tg-accent)]"
            aria-hidden="true"
          />
          <div>
            <p className="text-xs font-bold tracking-tight text-[var(--tg-text-primary)]">
              TileGuard
            </p>
            <p className="font-mono text-[9px] text-[var(--tg-text-muted)]">
              v1.0.0
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handlePresentationToggle}
          aria-label="Toggle presentation mode"
          title="Toggle Presentation Mode (Ctrl+Shift+P)"
          className="rounded p-1.5 text-[var(--tg-text-muted)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-secondary)]"
        >
          <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
