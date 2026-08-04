/**
 * @tileguard/inspector — InspectorPageHeader (Milestone 7.5 — Step A)
 *
 * The identity bar shown at the top of the Inspector workspace.
 * Provides a visual counterpart to the Diagnostics TileHealthHeader.
 *
 * Answers: "What is inside this tile?"
 * Displays: filename, layer count, feature count, loaded status.
 */

import { Crosshair, FileCode2 } from 'lucide-react';
import { useLifecycle } from '../../hooks/use-store.js';
import { useStatistics } from '../../hooks/use-statistics-settings.js';
import type { InspectorStore } from '../../store/inspector-store.js';

interface InspectorPageHeaderProps {
  readonly store: InspectorStore;
}

export function InspectorPageHeader({ store }: InspectorPageHeaderProps): JSX.Element {
  const lifecycle = useLifecycle(store);
  const stats = useStatistics(store);
  const loaded = lifecycle.status === 'loaded';

  return (
    <header
      className="shrink-0 border-b border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-[var(--tg-space-xl)] py-[var(--tg-space-md)]"
      aria-label="Inspector status"
    >
      <div className="flex items-center gap-[var(--tg-space-xl)]">
        {/* Page identity */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--tg-accent)]">
            Inspector
          </h2>
          <p className="mt-0.5 text-[10px] text-[var(--tg-text-muted)]">
            What is inside this tile?
          </p>
        </div>

        {/* File info */}
        {loaded && (
          <div className="flex items-center gap-[var(--tg-space-sm)]">
            <FileCode2 className="h-4 w-4 text-[var(--tg-text-muted)]" aria-hidden="true" />
            <span
              className="max-w-xs truncate text-xs font-medium text-[var(--tg-text-primary)]"
              title={lifecycle.filePath}
            >
              {lifecycle.filePath.split('/').pop() ?? lifecycle.filePath}
            </span>
          </div>
        )}

        {/* Tile stats */}
        {loaded && stats.totalLayers > 0 && (
          <div className="flex items-center gap-[var(--tg-space-lg)] text-xs text-[var(--tg-text-secondary)]">
            <div className="flex items-center gap-1">
              <span className="font-bold text-[var(--tg-accent)] tabular-nums">
                {stats.totalLayers}
              </span>
              <span className="text-[var(--tg-text-muted)]">
                {stats.totalLayers === 1 ? 'layer' : 'layers'}
              </span>
            </div>
            <div className="h-3 w-px bg-[var(--tg-border)]" aria-hidden="true" />
            <div className="flex items-center gap-1">
              <span className="font-bold text-[var(--tg-accent)] tabular-nums">
                {stats.totalFeatures.toLocaleString()}
              </span>
              <span className="text-[var(--tg-text-muted)]">features</span>
            </div>
          </div>
        )}

        {/* Selection indicator */}
        <div className="ml-auto flex items-center gap-[var(--tg-space-sm)]">
          <Crosshair
            className="h-3.5 w-3.5 text-[var(--tg-text-muted)]"
            aria-hidden="true"
          />
          <span className="text-[10px] text-[var(--tg-text-muted)]">
            {loaded ? 'Click a feature to inspect it' : 'No tile loaded'}
          </span>
        </div>
      </div>
    </header>
  );
}
