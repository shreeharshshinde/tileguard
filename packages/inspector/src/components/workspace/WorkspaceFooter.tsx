/**
 * @tileguard/inspector — WorkspaceFooter (Phase 1 — Step 3)
 *
 * The status bar rendered at the bottom of the Workspace shell.
 *
 * This is an extraction of the existing Footer from InspectorApp.tsx into
 * a dedicated component so the Workspace shell can compose it cleanly.
 * No behaviour has changed — only the component location and name.
 */
import { useInspectorContext } from '../../context/InspectorContext.js';
import { useStatistics } from '../../hooks/use-statistics-settings.js';
import {
  useHover,
  useLifecycle,
  useSelectedFeature,
} from '../../hooks/use-store.js';
import type { ViewportState } from '../../viewport/viewport.js';

export interface WorkspaceFooterProps {
  readonly viewport: ViewportState | null;
  readonly fps: number;
}

export function WorkspaceFooter({
  viewport,
  fps,
}: WorkspaceFooterProps): JSX.Element {
  const { store } = useInspectorContext();
  const lifecycle = useLifecycle(store);
  const stats = useStatistics(store);
  const selected = useSelectedFeature(store);
  const hover = useHover(store);
  const loaded = lifecycle.status === 'loaded';

  return (
    <footer
      className="flex h-[var(--tg-footer-height)] shrink-0 items-center gap-[var(--tg-space-sm)] border-t border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-[var(--tg-space-lg)] text-xs text-[var(--tg-text-secondary)]"
      aria-label="Status bar"
    >
      {/* Status dot */}
      <span
        className={`h-2 w-2 rounded-full ${loaded ? 'bg-[var(--tg-success)]' : 'bg-[var(--tg-text-muted)]'}`}
        aria-hidden="true"
      />

      {/* File name */}
      {loaded ? (
        <span className="max-w-40 truncate" title={lifecycle.filePath}>
          {lifecycle.filePath.split('/').pop() ?? lifecycle.filePath}
        </span>
      ) : (
        <span>No tile loaded</span>
      )}

      {/* Tile stats */}
      {loaded && stats.totalLayers > 0 && (
        <>
          <span className="text-[var(--tg-text-muted)]" aria-hidden="true">·</span>
          <span>
            {stats.totalLayers}{' '}
            {stats.totalLayers === 1 ? 'layer' : 'layers'}
          </span>
          <span className="text-[var(--tg-text-muted)]" aria-hidden="true">·</span>
          <span>{stats.totalFeatures.toLocaleString()} features</span>
          {stats.diagnostics.errors +
            stats.diagnostics.warnings +
            stats.diagnostics.info >
            0 && (
              <>
                <span
                  className="text-[var(--tg-text-muted)]"
                  aria-hidden="true"
                >
                  ·
                </span>
                <span
                  className={
                    stats.diagnostics.errors > 0
                      ? 'text-[var(--tg-error)]'
                      : 'text-[var(--tg-warning)]'
                  }
                >
                  {stats.diagnostics.errors +
                    stats.diagnostics.warnings +
                    stats.diagnostics.info}{' '}
                  diag.
                </span>
              </>
            )}
        </>
      )}

      <span className="flex-1" />

      {/* Hovered feature */}
      {hover.layerName !== null && hover.featureIndex !== null && (
        <>
          <span
            className="hidden text-[var(--tg-text-muted)] xl:inline"
            aria-hidden="true"
          >
            hover:
          </span>
          <span className="hidden text-[var(--tg-text-secondary)] xl:inline">
            {hover.layerName}[{hover.featureIndex}]
          </span>
          <span
            className="hidden text-[var(--tg-text-muted)] xl:inline"
            aria-hidden="true"
          >
            ·
          </span>
        </>
      )}

      {/* Selected feature */}
      {selected !== null && (
        <>
          <span className="text-[var(--tg-accent)]">
            {selected.layerName} #{selected.id ?? selected.featureIndex}
          </span>
          <span className="text-[var(--tg-text-muted)]" aria-hidden="true">·</span>
        </>
      )}

      {/* Zoom */}
      {viewport !== null && <span>{viewport.zoom.toFixed(1)}×</span>}

      {/* FPS — hidden in presentation mode */}
      {fps > 0 && (
        <span data-fps-counter="" className="flex items-center gap-1">
          <span className="text-[var(--tg-text-muted)]" aria-hidden="true">·</span>
          <span
            className={
              fps < 30
                ? 'text-[var(--tg-error)]'
                : fps < 55
                  ? 'text-[var(--tg-warning)]'
                  : 'text-[var(--tg-text-muted)]'
            }
          >
            {fps.toFixed(0)} fps
          </span>
        </span>
      )}
    </footer>
  );
}
