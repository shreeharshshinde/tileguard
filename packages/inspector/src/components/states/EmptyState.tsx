/**
 * @tileguard/inspector — EmptyState (Phase 2 — Step 12)
 *
 * Rendered when a page has no data to display.
 * Provides a clear description and one or two call-to-action buttons.
 *
 * Usage:
 *   <EmptyState
 *     icon={GitCompare}
 *     title="No comparison loaded"
 *     description="Load a baseline tile and a candidate tile to begin."
 *     actions={[
 *       { label: 'Load Tile', onClick: handleLoad },
 *       { label: 'Open Demo', onClick: handleDemo, variant: 'secondary' },
 *     ]}
 *   />
 */
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateAction {
  readonly label: string;
  readonly onClick: () => void;
  readonly variant?: 'primary' | 'secondary';
}

export interface EmptyStateProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description?: string;
  readonly actions?: readonly EmptyStateAction[];
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
}: EmptyStateProps): JSX.Element {
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
        <h2 className="text-sm font-semibold text-[var(--tg-text-primary)]">{title}</h2>
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
