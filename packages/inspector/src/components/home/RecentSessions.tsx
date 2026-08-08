/**
 * @tileguard/inspector — RecentSessions
 *
 * Shows the most-recently loaded tile file names from WorkspaceService.
 * Clicking any entry calls onOpenFilePicker so the user can re-load via OS picker.
 *
 * Libraries:
 *   - framer-motion    list entrance stagger + hover highlight
 *   - @radix-ui/react-tooltip   full path tooltip on truncated filename
 *   - sonner           "Copied path" toast on Ctrl+click
 */
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { Clock, File, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { getWorkspaceService } from '../../services/WorkspaceService.js';

export interface RecentSessionsProps {
  /** Called when the user clicks an entry or the "Open File" fallback. */
  readonly onOpenFilePicker: () => void;
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const row = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },
};

// ---------------------------------------------------------------------------
// SessionRow — single file entry
// ---------------------------------------------------------------------------

function SessionRow({
  filePath,
  onOpenFilePicker,
}: {
  filePath: string;
  onOpenFilePicker: () => void;
}): JSX.Element {
  const basename = filePath.split('/').pop() ?? filePath;

  const handleClick = (e: React.MouseEvent) => {
    // Ctrl+click / Meta+click copies the full path to clipboard
    if (e.ctrlKey || e.metaKey) {
      void navigator.clipboard.writeText(filePath).then(() => {
        toast.success('Path copied', { description: filePath, duration: 2500 });
      });
      return;
    }
    onOpenFilePicker();
  };

  return (
    <Tooltip.Root delayDuration={400}>
      <Tooltip.Trigger asChild>
        <motion.li variants={row} className="list-none">
          <button
            type="button"
            onClick={handleClick}
            className="flex w-full items-center gap-3 rounded-[var(--tg-border-radius)] border border-transparent px-3 py-2 text-left text-sm text-[var(--tg-text-secondary)] transition-colors hover:border-[var(--tg-border)] hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)]"
            aria-label={`Reload ${filePath} (Ctrl+click to copy path)`}
          >
            <File
              className="h-4 w-4 shrink-0 text-[var(--tg-text-muted)]"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate font-mono text-xs">
              {basename}
            </span>
            <span className="shrink-0 text-[10px] text-[var(--tg-text-muted)] opacity-0 transition-opacity group-hover:opacity-100">
              open
            </span>
          </button>
        </motion.li>
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={8}
          className="z-50 max-w-[20rem] rounded-lg border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] px-3 py-2 font-mono text-[11px] text-[var(--tg-text-secondary)] shadow-xl"
        >
          <span className="mb-0.5 block text-[10px] font-sans font-semibold uppercase tracking-wider text-[var(--tg-text-muted)]">
            Full path
          </span>
          {filePath}
          <div className="mt-1.5 text-[10px] text-[var(--tg-text-muted)]">
            Ctrl+click to copy
          </div>
          <Tooltip.Arrow className="fill-[var(--tg-border)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// ---------------------------------------------------------------------------
// RecentSessions
// ---------------------------------------------------------------------------

export function RecentSessions({
  onOpenFilePicker,
}: RecentSessionsProps): JSX.Element {
  const layout = getWorkspaceService().getLayout();
  const lastFile = layout.lastFilePath;

  return (
    <Tooltip.Provider>
      <section aria-labelledby="recent-sessions-heading" className="mb-10">
        {/* Section header */}
        <div className="mb-3 flex items-center gap-2">
          <Clock
            className="h-4 w-4 text-[var(--tg-text-muted)]"
            aria-hidden="true"
          />
          <h2
            id="recent-sessions-heading"
            className="text-xs font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]"
          >
            Recent Sessions
          </h2>
        </div>

        {lastFile !== null ? (
          <motion.ul
            variants={list}
            initial="hidden"
            animate="show"
            className="space-y-0.5"
            aria-label="Recent sessions list"
          >
            <SessionRow
              filePath={lastFile}
              onOpenFilePicker={onOpenFilePicker}
            />
          </motion.ul>
        ) : (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-3 rounded-[var(--tg-panel-radius)] border border-dashed border-[var(--tg-border)] py-6 text-center"
          >
            <FolderOpen
              className="h-7 w-7 text-[var(--tg-text-muted)]"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-[var(--tg-text-secondary)]">
                No recent sessions
              </p>
              <p className="mt-0.5 text-xs text-[var(--tg-text-muted)]">
                Load a tile to get started
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenFilePicker}
              className="rounded-md border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--tg-text-secondary)] transition hover:border-[var(--tg-accent)]/60 hover:text-[var(--tg-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)]"
            >
              Open File…
            </button>
          </motion.div>
        )}
      </section>
    </Tooltip.Provider>
  );
}
