/**
 * @tileguard/inspector — TileHealthHeader (Milestone 7.5 — Step A)
 *
 * The distinctive Tile Health summary bar at the top of the Diagnostics page.
 * Shows error/warning/info counts with large, high-contrast badges.
 *
 * This header visually distinguishes the Diagnostics page from Inspector.
 * At a glance, the audience sees the health status of the tile.
 */

import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { InspectorStore } from '../../store/inspector-store.js';
import { useGroupedDiagnostics, useLifecycle } from '../../hooks/use-store.js';

interface TileHealthHeaderProps {
  readonly store: InspectorStore;
}

interface HealthBadgeProps {
  readonly count: number;
  readonly label: string;
  readonly colourClass: string;
  readonly bgClass: string;
  readonly icon: JSX.Element;
}

function HealthBadge({ count, label, colourClass, bgClass, icon }: HealthBadgeProps): JSX.Element {
  return (
    <div
      className={`flex items-center gap-[var(--tg-space-sm)] rounded-[var(--tg-border-radius)] px-[var(--tg-space-md)] py-[var(--tg-space-sm)] ${bgClass}`}
      role="status"
      aria-label={`${count} ${label}`}
    >
      {icon}
      <div>
        <span className={`text-lg font-bold tabular-nums ${colourClass}`}>
          {count}
        </span>
        <span className={`ml-1.5 text-xs ${colourClass} opacity-80`}>
          {label}
        </span>
      </div>
    </div>
  );
}

export function TileHealthHeader({ store }: TileHealthHeaderProps): JSX.Element {
  const lifecycle = useLifecycle(store);
  const grouped = useGroupedDiagnostics(store);

  const errors = grouped.errors.length;
  const warnings = grouped.warnings.length;
  const infos = grouped.infos.length;
  const total = errors + warnings + infos;
  const loaded = lifecycle.status === 'loaded';

  const isHealthy = loaded && total === 0;
  const isError = errors > 0;

  return (
    <header
      className="shrink-0 border-b border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-[var(--tg-space-xl)] py-[var(--tg-space-md)]"
      aria-label="Tile health status"
    >
      <div className="flex items-center justify-between gap-[var(--tg-space-xl)]">
        {/* Page identity */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--tg-error)]">
            Diagnostics
          </h2>
          <p className="mt-0.5 text-[10px] text-[var(--tg-text-muted)]">
            What is wrong with this tile?
          </p>
        </div>

        {/* Health badges */}
        <div className="flex items-center gap-[var(--tg-space-sm)]">
          {!loaded ? (
            <div className="flex items-center gap-[var(--tg-space-sm)] rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] px-[var(--tg-space-md)] py-[var(--tg-space-sm)]">
              <span className="text-xs text-[var(--tg-text-muted)]">
                Load a tile to see diagnostics
              </span>
            </div>
          ) : isHealthy ? (
            <div className="flex items-center gap-[var(--tg-space-sm)] rounded-[var(--tg-border-radius)] bg-[var(--tg-success)]/10 px-[var(--tg-space-md)] py-[var(--tg-space-sm)]">
              <CheckCircle2
                className="h-5 w-5 text-[var(--tg-success)]"
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-[var(--tg-success)]">
                Tile is clean
              </span>
            </div>
          ) : (
            <>
              {errors > 0 && (
                <HealthBadge
                  count={errors}
                  label={errors === 1 ? 'Error' : 'Errors'}
                  colourClass="text-[var(--tg-error)]"
                  bgClass="bg-[var(--tg-error)]/10"
                  icon={
                    <XCircle
                      className="h-5 w-5 text-[var(--tg-error)]"
                      aria-hidden="true"
                    />
                  }
                />
              )}
              {warnings > 0 && (
                <HealthBadge
                  count={warnings}
                  label={warnings === 1 ? 'Warning' : 'Warnings'}
                  colourClass="text-[var(--tg-warning)]"
                  bgClass="bg-[var(--tg-warning)]/10"
                  icon={
                    <AlertTriangle
                      className="h-5 w-5 text-[var(--tg-warning)]"
                      aria-hidden="true"
                    />
                  }
                />
              )}
              {infos > 0 && (
                <HealthBadge
                  count={infos}
                  label={infos === 1 ? 'Info' : 'Infos'}
                  colourClass="text-[var(--tg-info)]"
                  bgClass="bg-[var(--tg-info)]/10"
                  icon={
                    <Info
                      className="h-5 w-5 text-[var(--tg-info)]"
                      aria-hidden="true"
                    />
                  }
                />
              )}
            </>
          )}
        </div>

        {/* Overall verdict */}
        {loaded && !isHealthy && (
          <div className={`text-right text-xs ${isError ? 'text-[var(--tg-error)]' : 'text-[var(--tg-warning)]'}`}>
            <p className="font-semibold">{isError ? '✗ Not passing' : '⚠ Warnings'}</p>
            <p className="text-[10px] opacity-70">{total} total finding{total !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>
    </header>
  );
}
