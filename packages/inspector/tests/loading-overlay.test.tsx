/**
 * @tileguard/inspector — LoadingOverlay component tests
 *
 * Multi-step tile-loading progress display.
 * Uses renderToString (React SSR) — no DOM or canvas required.
 */

import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LoadingOverlay } from '../src/components/loading/LoadingOverlay.js';

describe('LoadingOverlay', () => {
  // ── Step list rendering ──────────────────────────────────────────────

  it('renders all 5 loading steps by label', () => {
    const html = renderToString(<LoadingOverlay currentStep="loading" />);
    expect(html).toContain('Reading PBF');
    expect(html).toContain('Decoding geometry');
    expect(html).toContain('Computing statistics');
    expect(html).toContain('Running diagnostics');
    expect(html).toContain('Workspace ready');
  });

  it('renders an ordered list element (ol) for the step list', () => {
    const html = renderToString(<LoadingOverlay currentStep="loading" />);
    expect(html).toContain('<ol');
  });

  // ── Accessibility ────────────────────────────────────────────────────

  it('has role="status" for accessibility', () => {
    const html = renderToString(<LoadingOverlay currentStep="loading" />);
    expect(html).toContain('role="status"');
  });

  it('has aria-label="Loading tile"', () => {
    const html = renderToString(<LoadingOverlay currentStep="loading" />);
    expect(html).toContain('aria-label="Loading tile"');
  });

  it('marks the active step with aria-current="step"', () => {
    const html = renderToString(<LoadingOverlay currentStep="parsing" />);
    expect(html).toContain('aria-current="step"');
  });

  // ── Active step ──────────────────────────────────────────────────────

  it('shows the "Preparing Workspace" heading when no error is present', () => {
    const html = renderToString(<LoadingOverlay currentStep="loading" />);
    expect(html).toContain('Preparing Workspace');
  });

  it('marks "Computing statistics" as current when currentStep=statistics', () => {
    const html = renderToString(<LoadingOverlay currentStep="statistics" />);
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('Computing statistics');
  });

  it('marks "Ready" as current when currentStep=ready', () => {
    const html = renderToString(<LoadingOverlay currentStep="ready" />);
    expect(html).toContain('aria-current="step"');
  });

  it('renders without throwing for every valid step value', () => {
    for (const step of [
      'loading',
      'parsing',
      'statistics',
      'diagnostics',
      'ready',
    ] as const) {
      expect(() =>
        renderToString(<LoadingOverlay currentStep={step} />),
      ).not.toThrow();
    }
  });

  // ── File name display ────────────────────────────────────────────────

  it('shows fileName when provided', () => {
    const html = renderToString(
      <LoadingOverlay currentStep="loading" fileName="my-tile.pbf" />,
    );
    expect(html).toContain('my-tile.pbf');
  });

  it('omits the fileName element when fileName is not provided', () => {
    const html = renderToString(<LoadingOverlay currentStep="loading" />);
    expect(html).not.toContain('.pbf');
  });

  // ── Error state ──────────────────────────────────────────────────────

  it('shows "Load failed" heading when error is provided', () => {
    const html = renderToString(
      <LoadingOverlay currentStep="loading" error="File not found" />,
    );
    expect(html).toContain('Load failed');
  });

  it('renders the error message text', () => {
    const html = renderToString(
      <LoadingOverlay currentStep="loading" error="Unexpected tile format" />,
    );
    expect(html).toContain('Unexpected tile format');
  });

  it('hides the step list when an error is provided', () => {
    const html = renderToString(
      <LoadingOverlay currentStep="loading" error="Something went wrong" />,
    );
    expect(html).not.toContain('<ol');
  });

  it('does not show "Load failed" when there is no error', () => {
    const html = renderToString(<LoadingOverlay currentStep="loading" />);
    expect(html).not.toContain('Load failed');
  });
});
