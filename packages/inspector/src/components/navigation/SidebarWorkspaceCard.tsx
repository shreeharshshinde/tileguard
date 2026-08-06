/**
 * @tileguard/inspector — SidebarWorkspaceCard (Phase 2 — Step 2)
 *
 * Compact card displayed at the top of the sidebar that shows the current
 * workspace context: active file name and a quick-action button to load a
 * new file.
 *
 * Shows "No tile loaded" when no session is active.
 */
import { FileBox, FolderOpen } from 'lucide-react';

export interface SidebarWorkspaceCardProps {
  /** The name of the currently loaded tile file, or null if none. */
  readonly currentFile: string | null;
  /** Called when the user clicks the "Open file" action. */
  readonly onOpenFile?: (() => void) | undefined;
}

export function SidebarWorkspaceCard({
  currentFile,
  onOpenFile,
}: SidebarWorkspaceCardProps): JSX.Element {
  return (
    <div className="mx-2 mb-2 mt-3 rounded-md border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] p-2.5">
      <div className="flex items-center gap-2">
        <FileBox
          className="h-4 w-4 shrink-0 text-[var(--tg-accent)]"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--tg-text-muted)]">
            Active Tile
          </p>
          <p
            className={[
              'truncate text-xs font-medium',
              currentFile
                ? 'text-[var(--tg-text-primary)]'
                : 'text-[var(--tg-text-muted)]',
            ].join(' ')}
            title={currentFile ?? undefined}
          >
            {currentFile ?? 'No tile loaded'}
          </p>
        </div>
        {onOpenFile && (
          <button
            type="button"
            onClick={onOpenFile}
            aria-label="Open a tile file"
            className="shrink-0 rounded p-1 text-[var(--tg-text-muted)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]"
          >
            <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
