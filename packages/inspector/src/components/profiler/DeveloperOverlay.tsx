/**
 * @tileguard/inspector — DeveloperOverlay (Milestone 6 — Step 4)
 *
 * Performance metrics HUD shown in a fixed corner of the canvas.
 * Toggled by Ctrl+Shift+D.
 */

import type { PerformanceMetrics } from '../../performance/PerformanceProfiler.js';
import type { ResolvedFeature } from '../../providers/FeatureProvider.js';
import type { ViewportState } from '../../viewport/viewport.js';

export interface DeveloperOverlayProps {
  readonly metrics: PerformanceMetrics;
  readonly viewport: ViewportState | null;
  readonly hoveredFeature: ResolvedFeature | null;
  readonly selectedFeature: ResolvedFeature | null;
  readonly totalFeatures: number;
  readonly visibleFeatures?: number;
}

function MetricRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[11px] leading-5">
      <span className="text-[var(--tg-text-muted)]">{label}</span>
      <span
        className={
          accent
            ? 'font-mono font-semibold text-[var(--tg-accent)]'
            : 'font-mono text-[var(--tg-text-primary)]'
        }
      >
        {value}
      </span>
    </div>
  );
}

export function DeveloperOverlay({
  metrics,
  viewport,
  hoveredFeature,
  selectedFeature,
  totalFeatures,
  visibleFeatures,
}: DeveloperOverlayProps): JSX.Element {
  const fpsColor =
    metrics.fps >= 55
      ? 'text-[var(--tg-success)]'
      : metrics.fps >= 30
        ? 'text-[var(--tg-warning)]'
        : 'text-[var(--tg-error)]';

  return (
    <div
      className="absolute right-3 top-3 z-50 min-w-[180px] select-none rounded-md border border-[var(--tg-border)] bg-[var(--tg-bg-primary)]/85 px-3 py-2.5 backdrop-blur-sm"
      aria-label="Developer performance overlay"
      role="status"
      aria-live="off"
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--tg-text-muted)]">
          Dev Overlay
        </span>
        <span className={`text-sm font-bold tabular-nums ${fpsColor}`}>
          {metrics.fps.toFixed(0)} fps
        </span>
      </div>

      {/* Divider */}
      <div className="mb-2 h-px bg-[var(--tg-border)]" />

      {/* Metrics */}
      <div className="space-y-0.5">
        <MetricRow
          label="Frame time"
          value={`${metrics.frameTimeMs.toFixed(1)} ms`}
        />
        <MetricRow label="Renders" value={metrics.renderCount} />

        {viewport != null && (
          <>
            <MetricRow label="Zoom" value={`${viewport.zoom.toFixed(2)}×`} />
            <MetricRow
              label="Pan"
              value={`${Math.round(viewport.panX)}, ${Math.round(viewport.panY)}`}
            />
          </>
        )}

        <MetricRow
          label="Total features"
          value={totalFeatures.toLocaleString()}
        />
        {visibleFeatures != null && (
          <MetricRow label="Visible" value={visibleFeatures.toLocaleString()} />
        )}

        {hoveredFeature != null && (
          <MetricRow
            label="Hover"
            value={`${hoveredFeature.layerName}[${hoveredFeature.featureIndex}]`}
            accent
          />
        )}
        {selectedFeature != null && (
          <MetricRow
            label="Selected"
            value={`${selectedFeature.layerName}[${selectedFeature.featureIndex}]`}
            accent
          />
        )}
      </div>

      {/* Toggle hint */}
      <div className="mt-2 border-t border-[var(--tg-border)] pt-1.5 text-[10px] text-[var(--tg-text-muted)]">
        Ctrl+Shift+D to close
      </div>
    </div>
  );
}
