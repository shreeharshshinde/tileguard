/**
 * @tileguard/inspector — InvestigationTimeline (Phase 4 — Step 3)
 *
 * Displays a chronological timeline of investigation events, read from
 * InvestigationContext. Each event shows a timestamp, an action label,
 * detail text, and an icon.
 *
 * Features:
 *   - Auto-scrolls to the newest event
 *   - Groups events by relative time
 *   - Allows replay (future: click to restore state)
 *   - Useful for debugging and future export
 *
 * Used in the bottom Engineering Console and right-panel tabs.
 */
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BarChart3,
  Clock,
  Crosshair,
  GitCompare,
  Layers,
  Palette,
  TrendingDown,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import {
  useInvestigationState,
  type TimelineEvent,
} from '../../context/InvestigationContext.js';

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  crosshair: Crosshair,
  layers: Layers,
  'alert-triangle': AlertTriangle,
  palette: Palette,
  'git-compare': GitCompare,
  'trending-down': TrendingDown,
  'bar-chart': BarChart3,
  zap: Zap,
};

function getIcon(name?: string): LucideIcon {
  if (!name) return Clock;
  return ICON_MAP[name] ?? Clock;
}

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InvestigationTimelineProps {
  /** Maximum height in pixels (optional, for embedded use). */
  readonly maxHeight?: number | undefined;
  /** If true, shows a compact single-line view. */
  readonly compact?: boolean | undefined;
  /** Optional: only show events from a specific workspace. */
  readonly filterWorkspace?: string | undefined;
}

// ---------------------------------------------------------------------------
// Timeline Event Item
// ---------------------------------------------------------------------------

function TimelineItem({
  event,
  compact,
}: {
  event: TimelineEvent;
  compact?: boolean;
}): JSX.Element {
  const Icon = getIcon(event.icon);

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 text-xs">
        <Icon
          className="h-3 w-3 shrink-0 text-[var(--tg-accent)]"
          aria-hidden="true"
        />
        <span className="text-[var(--tg-text-muted)]">{formatTime(event.timestamp)}</span>
        <span className="truncate text-[var(--tg-text-primary)]">{event.action}</span>
        <span className="truncate text-[var(--tg-text-secondary)]">{event.detail}</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="group relative flex gap-3 py-2 pl-3 pr-2"
    >
      {/* Vertical connector line */}
      <div className="relative flex flex-col items-center">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--tg-border)] bg-[var(--tg-bg-surface)]">
          <Icon
            className="h-3 w-3 text-[var(--tg-accent)]"
            aria-hidden="true"
          />
        </div>
        <div className="absolute top-6 h-full w-px bg-[var(--tg-border)] opacity-30" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-[var(--tg-text-primary)]">
            {event.action}
          </span>
          <span className="text-[10px] text-[var(--tg-text-muted)]">
            {formatTime(event.timestamp)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-[var(--tg-text-secondary)]">
          {event.detail}
        </p>
        {event.workspace && (
          <span className="mt-1 inline-block rounded-sm bg-[var(--tg-bg-hover)] px-1 py-0.5 text-[10px] text-[var(--tg-text-muted)]">
            {event.workspace}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvestigationTimeline({
  maxHeight,
  compact = false,
  filterWorkspace,
}: InvestigationTimelineProps): JSX.Element {
  const { timeline } = useInvestigationState();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [timeline.length]);

  const filteredEvents = filterWorkspace
    ? timeline.filter(
        (ev) => ev.workspace === filterWorkspace || ev.workspace === undefined,
      )
    : timeline;

  if (filteredEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <Clock className="h-8 w-8 text-[var(--tg-text-muted)] opacity-40" />
        <p className="text-xs text-[var(--tg-text-muted)]">
          No investigation events yet.
        </p>
        <p className="text-[10px] text-[var(--tg-text-muted)] opacity-60">
          Events will appear as you explore features, run diagnostics, and compare tiles.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto overflow-x-hidden"
      style={maxHeight ? { maxHeight } : undefined}
    >
      {compact ? (
        <div className="divide-y divide-[var(--tg-border)] divide-opacity-30">
          {filteredEvents.map((event) => (
            <TimelineItem key={event.id} event={event} compact />
          ))}
        </div>
      ) : (
        <div className="space-y-0">
          {filteredEvents.map((event) => (
            <TimelineItem key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Summary footer */}
      <div className="sticky bottom-0 border-t border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-3 py-1.5">
        <span className="text-[10px] text-[var(--tg-text-muted)]">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} ·{' '}
          {formatRelativeTime(filteredEvents[0]!.timestamp)} – now
        </span>
      </div>
    </div>
  );
}
