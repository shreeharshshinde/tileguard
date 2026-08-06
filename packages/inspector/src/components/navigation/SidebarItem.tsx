/**
 * @tileguard/inspector — SidebarItem (Phase 2 — Step 2)
 *
 * Individual navigation item inside a SidebarSection.
 * Displays an icon, label, and optional badge.
 * Supports active and hover states using the --tg-* design tokens.
 */
import type { LucideIcon } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

export interface SidebarItemProps {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly isActive?: boolean;
  readonly badge?: string | number;
  /** If true the item is rendered as a muted footer item (e.g. Settings, Help). */
  readonly isUtility?: boolean;
  readonly onClick: () => void;
}

export function SidebarItem({
  label,
  icon: Icon,
  isActive = false,
  badge,
  isUtility = false,
  onClick,
}: SidebarItemProps): JSX.Element {
  return (
    <Tooltip.Root delayDuration={600}>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-current={isActive ? 'page' : undefined}
          className={[
            'group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs font-medium transition-all duration-150 select-none',
            isActive
              ? 'bg-[var(--tg-accent)]/15 text-[var(--tg-accent)]'
              : isUtility
              ? 'text-[var(--tg-text-muted)] hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-secondary)]'
              : 'text-[var(--tg-text-secondary)] hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]',
          ].join(' ')}
        >
          {/* Active indicator bar */}
          {isActive && (
            <span
              className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--tg-accent)]"
              aria-hidden="true"
            />
          )}

          <Icon
            className={[
              'h-4 w-4 shrink-0',
              isActive ? 'text-[var(--tg-accent)]' : 'text-current',
            ].join(' ')}
            aria-hidden="true"
          />
          <span className="truncate">{label}</span>

          {badge !== undefined && (
            <span
              className={[
                'ml-auto shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px]',
                isActive
                  ? 'bg-[var(--tg-accent)]/20 text-[var(--tg-accent)]'
                  : 'bg-[var(--tg-bg-hover)] text-[var(--tg-text-muted)]',
              ].join(' ')}
            >
              {badge}
            </span>
          )}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={8}
          className="z-[100] rounded-md bg-[var(--tg-bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--tg-text-primary)] shadow-[var(--tg-shadow-md)] border border-[var(--tg-border)]"
        >
          {label}
          <Tooltip.Arrow className="fill-[var(--tg-bg-surface)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
