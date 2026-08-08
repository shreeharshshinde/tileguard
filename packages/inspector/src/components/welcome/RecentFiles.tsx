/**
 * @tileguard/inspector — RecentFiles (Milestone 7.5 — Step C)
 *
 * Displays the last opened file path from WorkspaceService.
 * Useful for returning to a file after a demo without re-navigating.
 *
 * Note: The browser cannot re-open files automatically; this component
 * shows the filename and prompts the user to open it again if needed.
 */

import { Clock, FileCode2 } from 'lucide-react';
import { getWorkspaceService } from '../../services/WorkspaceService.js';

interface RecentFilesProps {
  readonly onOpenFilePicker: () => void;
}

export function RecentFiles({
  onOpenFilePicker,
}: RecentFilesProps): JSX.Element | null {
  const lastFilePath = getWorkspaceService().getLayout().lastFilePath;

  if (lastFilePath === null) return null;

  const fileName = lastFilePath.split('/').pop() ?? lastFilePath;

  return (
    <section
      aria-labelledby="recent-files-heading"
      className="mt-[var(--tg-space-xl)]"
    >
      <div className="mb-[var(--tg-space-sm)] flex items-center gap-[var(--tg-space-sm)]">
        <Clock
          className="h-4 w-4 text-[var(--tg-text-secondary)]"
          aria-hidden="true"
        />
        <h2
          id="recent-files-heading"
          className="text-sm font-semibold text-[var(--tg-text-primary)]"
        >
          Recent
        </h2>
      </div>

      <button
        type="button"
        onClick={onOpenFilePicker}
        className="flex w-full items-center gap-[var(--tg-space-sm)] rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-[var(--tg-space-md)] py-[var(--tg-space-sm)] text-left transition hover:border-[var(--tg-accent)] hover:bg-[var(--tg-bg-hover)]"
        aria-label={`Reopen ${fileName}`}
      >
        <FileCode2
          className="h-4 w-4 shrink-0 text-[var(--tg-text-secondary)]"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p
            className="truncate text-xs font-medium text-[var(--tg-text-primary)]"
            title={lastFilePath}
          >
            {fileName}
          </p>
          <p className="text-[10px] text-[var(--tg-text-muted)]">
            Click to browse for this file again
          </p>
        </div>
      </button>
    </section>
  );
}
