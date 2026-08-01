/**
 * @tileguard/inspector — DeveloperOverlay component tests
 *
 * Performance metrics HUD shown in developer mode (toggled by Ctrl+Shift+D).
 * Uses renderToString (React SSR) — no DOM or canvas required.
 */

import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  DeveloperOverlay,
  type DeveloperOverlayProps,
} from '../src/components/profiler/DeveloperOverlay.js';
import { EMPTY_METRICS } from '../src/performance/PerformanceProfiler.js';
import type { ResolvedFeature } from '../src/providers/FeatureProvider.js';
import type { ViewportState } from '../src/viewport/viewport.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeViewport(overrides: Partial<ViewportState> = {}): ViewportState {
  return {
    zoom: 2,
    panX: 50,
    panY: 100,
    extent: 4096,
    width: 800,
    height: 600,
    minZoom: 0.25,
    maxZoom: 64,
    ...overrides,
  };
}

function makeFeature(layerName: string, featureIndex: number): ResolvedFeature {
  return {
    layerName,
    featureIndex,
    properties: {},
    geometryType: 'Point',
    geometry: [[]],
    id: featureIndex,
  } as unknown as ResolvedFeature;
}

function makeProps(
  overrides: Partial<DeveloperOverlayProps> = {},
): DeveloperOverlayProps {
  return {
    metrics: EMPTY_METRICS,
    viewport: null,
    hoveredFeature: null,
    selectedFeature: null,
    totalFeatures: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DeveloperOverlay', () => {
  // ── Rendering ────────────────────────────────────────────────────────

  it('renders without throwing given minimal props', () => {
    expect(() =>
      renderToString(<DeveloperOverlay {...makeProps()} />),
    ).not.toThrow();
  });

  it('renders a "Dev Overlay" label', () => {
    const html = renderToString(<DeveloperOverlay {...makeProps()} />);
    expect(html).toMatch(/dev overlay/i);
  });

  // ── Accessibility ────────────────────────────────────────────────────

  it('has role="status"', () => {
    const html = renderToString(<DeveloperOverlay {...makeProps()} />);
    expect(html).toContain('role="status"');
  });

  it('has aria-label="Developer performance overlay"', () => {
    const html = renderToString(<DeveloperOverlay {...makeProps()} />);
    expect(html).toContain('aria-label="Developer performance overlay"');
  });

  // ── FPS ──────────────────────────────────────────────────────────────

  it('shows "fps" unit label', () => {
    const html = renderToString(<DeveloperOverlay {...makeProps()} />);
    expect(html).toContain('fps');
  });

  it('displays the fps value from metrics', () => {
    const html = renderToString(
      <DeveloperOverlay
        {...makeProps({
          metrics: {
            fps: 58,
            frameTimeMs: 17.2,
            renderCount: 500,
            lastFrameTime: 9000,
          },
        })}
      />,
    );
    expect(html).toContain('58');
  });

  // ── Frame time & render count ─────────────────────────────────────────

  it('shows frame time label and value', () => {
    const html = renderToString(
      <DeveloperOverlay
        {...makeProps({
          metrics: {
            fps: 60,
            frameTimeMs: 16.6,
            renderCount: 10,
            lastFrameTime: 0,
          },
        })}
      />,
    );
    expect(html).toContain('Frame time');
    expect(html).toContain('16.6');
  });

  it('shows render count label and value', () => {
    const html = renderToString(
      <DeveloperOverlay
        {...makeProps({
          metrics: {
            fps: 60,
            frameTimeMs: 16.6,
            renderCount: 42,
            lastFrameTime: 0,
          },
        })}
      />,
    );
    expect(html).toContain('Renders');
    expect(html).toContain('42');
  });

  // ── Viewport ─────────────────────────────────────────────────────────

  it('shows zoom and pan when viewport is provided', () => {
    const html = renderToString(
      <DeveloperOverlay
        {...makeProps({
          viewport: makeViewport({ zoom: 3, panX: 120, panY: 240 }),
        })}
      />,
    );
    expect(html).toContain('Zoom');
    expect(html).toContain('3.00');
    expect(html).toContain('Pan');
    expect(html).toContain('120');
    expect(html).toContain('240');
  });

  it('omits Zoom and Pan rows when viewport is null', () => {
    const html = renderToString(
      <DeveloperOverlay {...makeProps({ viewport: null })} />,
    );
    expect(html).not.toContain('>Zoom<');
    expect(html).not.toContain('>Pan<');
  });

  // ── Feature counts ────────────────────────────────────────────────────

  it('shows total features count with locale formatting', () => {
    const html = renderToString(
      <DeveloperOverlay {...makeProps({ totalFeatures: 1234 })} />,
    );
    expect(html).toContain('Total features');
    expect(html).toContain('1,234');
  });

  it('shows visible features count when provided', () => {
    const html = renderToString(
      <DeveloperOverlay
        {...makeProps({ visibleFeatures: 400, totalFeatures: 1000 })}
      />,
    );
    expect(html).toContain('Visible');
    expect(html).toContain('400');
  });

  it('omits the Visible row when visibleFeatures is not provided', () => {
    const html = renderToString(
      <DeveloperOverlay {...makeProps({ totalFeatures: 1000 })} />,
    );
    expect(html).not.toContain('>Visible<');
  });

  // ── Hovered / selected features ───────────────────────────────────────

  it('shows hovered feature identifier when hoveredFeature is provided', () => {
    const html = renderToString(
      <DeveloperOverlay
        {...makeProps({ hoveredFeature: makeFeature('roads', 7) })}
      />,
    );
    expect(html).toContain('Hover');
    expect(html).toContain('roads[7]');
  });

  it('shows selected feature identifier when selectedFeature is provided', () => {
    const html = renderToString(
      <DeveloperOverlay
        {...makeProps({ selectedFeature: makeFeature('buildings', 3) })}
      />,
    );
    expect(html).toContain('Selected');
    expect(html).toContain('buildings[3]');
  });

  it('omits the Hover row when hoveredFeature is null', () => {
    const html = renderToString(
      <DeveloperOverlay {...makeProps({ hoveredFeature: null })} />,
    );
    expect(html).not.toContain('>Hover<');
  });

  it('omits the Selected row when selectedFeature is null', () => {
    const html = renderToString(
      <DeveloperOverlay {...makeProps({ selectedFeature: null })} />,
    );
    expect(html).not.toContain('>Selected<');
  });

  // ── Toggle hint ───────────────────────────────────────────────────────

  it('shows the Ctrl+Shift+D close hint', () => {
    const html = renderToString(<DeveloperOverlay {...makeProps()} />);
    expect(html).toContain('Ctrl+Shift+D');
  });
});
