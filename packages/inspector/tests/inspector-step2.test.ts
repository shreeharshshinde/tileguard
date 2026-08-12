/**
 * @tileguard/inspector — Inspector Step 2 API Tests (Milestone 6 — Step 2)
 *
 * Tests the new facade methods: selectDiagnostic, focusFeature, search,
 * clearSearch, getSelectedFeature, getDiagnostic, getStatistics.
 *
 * Uses mock Renderer + real Viewport + real InspectorStore (integration style).
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { describe, expect, it, vi } from 'vitest';
import { createInspector, type Inspector } from '../src/create-inspector.js';
import type { Renderer } from '../src/renderer/canvas-renderer.js';
import { createViewport, type Viewport } from '../src/viewport/viewport.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeArtifact(): VectorTileArtifact {
  return {
    type: 'VectorTile',
    source: 'test.pbf',
    content: {
      layers: {
        roads: {
          name: 'roads',
          extent: 4096,
          version: 2,
          features: [
            {
              type: 2,
              geometryType: 'LineString',
              id: 10,
              properties: { highway: 'primary', name: 'Main Street' },
              geometry: [
                [
                  { x: 0, y: 0 },
                  { x: 100, y: 100 },
                ],
              ],
            },
            {
              type: 2,
              geometryType: 'LineString',
              id: 11,
              properties: { highway: 'secondary' },
              geometry: [
                [
                  { x: 50, y: 50 },
                  { x: 200, y: 200 },
                ],
              ],
            },
          ],
        },
        buildings: {
          name: 'buildings',
          extent: 4096,
          version: 2,
          features: [
            {
              type: 3,
              geometryType: 'Polygon',
              id: 20,
              properties: { type: 'civic', height: 30 },
              geometry: [
                [
                  [
                    { x: 10, y: 10 },
                    { x: 20, y: 10 },
                    { x: 20, y: 20 },
                    { x: 10, y: 10 },
                  ],
                ],
              ],
            },
          ],
        },
      },
    },
  } as unknown as VectorTileArtifact;
}

function makeDiagnostics(): Diagnostic[] {
  return [
    {
      ruleId: 'tile/unclosed-ring',
      severity: 'error',
      message: 'Polygon not closed',
      artifact: {} as never,
      location: { layer: 'buildings', featureIndex: 0 },
    },
    {
      ruleId: 'tile/coordinate-range',
      severity: 'warning',
      message: 'Coordinate out of range',
      artifact: {} as never,
      location: { layer: 'roads', featureIndex: 1 },
    },
    {
      ruleId: 'tile/no-empty',
      severity: 'info',
      message: 'Layer is empty',
      artifact: {} as never,
      location: {},
    },
  ];
}

function makeMockRenderer(): Renderer {
  return {
    attachCanvas: vi.fn(),
    setViewport: vi.fn(),
    resize: vi.fn(),
    clear: vi.fn(),
    drawTile: vi.fn(),
    drawOverlay: vi.fn(),
    drawHoverHighlight: vi.fn(),
    drawSelectionHighlight: vi.fn(),
  } as unknown as Renderer;
}

async function makeInspector(): Promise<{
  inspector: Inspector;
  viewport: Viewport;
}> {
  const viewport = createViewport({ width: 800, height: 600 });
  const renderer = makeMockRenderer();
  const inspector = createInspector({ viewport, renderer });
  await inspector.load('test.pbf', makeArtifact(), makeDiagnostics());
  return { inspector, viewport };
}

// ---------------------------------------------------------------------------
// getStatistics
// ---------------------------------------------------------------------------

describe('Inspector.getStatistics()', () => {
  it('returns correct counts when tile loaded', async () => {
    const { inspector } = await makeInspector();
    const stats = inspector.getStatistics();
    expect(stats.errorCount).toBe(1);
    expect(stats.warningCount).toBe(1);
    expect(stats.infoCount).toBe(1);
    expect(stats.total).toBe(3);
    inspector.dispose();
  });

  it('returns zero counts when no tile loaded', () => {
    const viewport = createViewport({ width: 800, height: 600 });
    const inspector = createInspector({
      viewport,
      renderer: makeMockRenderer(),
    });
    const stats = inspector.getStatistics();
    expect(stats.total).toBe(0);
    inspector.dispose();
  });
});

// ---------------------------------------------------------------------------
// getDiagnostic
// ---------------------------------------------------------------------------

describe('Inspector.getDiagnostic()', () => {
  it('returns diagnostic by index', async () => {
    const { inspector } = await makeInspector();
    const d = inspector.getDiagnostic(0);
    expect(d).not.toBeNull();
    expect(d!.ruleId).toBe('tile/unclosed-ring');
    inspector.dispose();
  });

  it('returns null for out-of-range index', async () => {
    const { inspector } = await makeInspector();
    expect(inspector.getDiagnostic(99)).toBeNull();
    inspector.dispose();
  });
});

// ---------------------------------------------------------------------------
// selectDiagnostic
// ---------------------------------------------------------------------------

describe('Inspector.selectDiagnostic()', () => {
  it('selects the associated feature in the store', async () => {
    const { inspector } = await makeInspector();
    inspector.selectDiagnostic(0); // buildings/0
    const selected = inspector.getSelectedFeature();
    expect(selected).not.toBeNull();
    expect(selected!.layerName).toBe('buildings');
    expect(selected!.featureIndex).toBe(0);
    inspector.dispose();
  });

  it('selects roads/1 from the second diagnostic', async () => {
    const { inspector } = await makeInspector();
    inspector.selectDiagnostic(1); // roads/1
    const selected = inspector.getSelectedFeature();
    expect(selected).not.toBeNull();
    expect(selected!.layerName).toBe('roads');
    expect(selected!.featureIndex).toBe(1);
    inspector.dispose();
  });

  it('is a no-op for a diagnostic with no feature reference', async () => {
    const { inspector } = await makeInspector();
    // diagnostic index 2 has location: {} — no layer/featureIndex
    inspector.selectDiagnostic(2);
    const selected = inspector.getSelectedFeature();
    // selection should remain null (was null before)
    expect(selected).toBeNull();
    inspector.dispose();
  });

  it('is a no-op for out-of-range index', async () => {
    const { inspector } = await makeInspector();
    expect(() => inspector.selectDiagnostic(99)).not.toThrow();
    inspector.dispose();
  });

  it('is a no-op when no tile loaded', () => {
    const viewport = createViewport({ width: 800, height: 600 });
    const inspector = createInspector({
      viewport,
      renderer: makeMockRenderer(),
    });
    expect(() => inspector.selectDiagnostic(0)).not.toThrow();
    inspector.dispose();
  });
});

// ---------------------------------------------------------------------------
// focusFeature
// ---------------------------------------------------------------------------

describe('Inspector.focusFeature()', () => {
  it('selects the specified feature', async () => {
    const { inspector } = await makeInspector();
    inspector.focusFeature('roads', 0);
    const selected = inspector.getSelectedFeature();
    expect(selected).not.toBeNull();
    expect(selected!.layerName).toBe('roads');
    expect(selected!.featureIndex).toBe(0);
    inspector.dispose();
  });

  it('replaces an existing selection', async () => {
    const { inspector } = await makeInspector();
    inspector.focusFeature('roads', 0);
    inspector.focusFeature('buildings', 0);
    const selected = inspector.getSelectedFeature();
    expect(selected!.layerName).toBe('buildings');
    inspector.dispose();
  });
});

// ---------------------------------------------------------------------------
// getSelectedFeature
// ---------------------------------------------------------------------------

describe('Inspector.getSelectedFeature()', () => {
  it('returns null before any selection', async () => {
    const { inspector } = await makeInspector();
    expect(inspector.getSelectedFeature()).toBeNull();
    inspector.dispose();
  });

  it('returns the feature after focusFeature()', async () => {
    const { inspector } = await makeInspector();
    inspector.focusFeature('roads', 1);
    const f = inspector.getSelectedFeature();
    expect(f!.properties).toMatchObject({ highway: 'secondary' });
    inspector.dispose();
  });
});

// ---------------------------------------------------------------------------
// search
// ---------------------------------------------------------------------------

describe('Inspector.search()', () => {
  it('returns results for a layer name query', async () => {
    const { inspector } = await makeInspector();
    const results = inspector.search('roads');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.feature.layerName === 'roads')).toBe(true);
    inspector.dispose();
  });

  it('returns results for a feature:ID query', async () => {
    const { inspector } = await makeInspector();
    const results = inspector.search('feature:20');
    expect(results).toHaveLength(1);
    const [first] = results;
    expect(first?.feature.id).toBe(20);
    inspector.dispose();
  });

  it('returns results for key=value query', async () => {
    const { inspector } = await makeInspector();
    const results = inspector.search('highway=primary');
    expect(results).toHaveLength(1);
    inspector.dispose();
  });

  it('returns empty results for blank query', async () => {
    const { inspector } = await makeInspector();
    expect(inspector.search('')).toHaveLength(0);
    inspector.dispose();
  });

  it('returns empty results for no-match query', async () => {
    const { inspector } = await makeInspector();
    expect(inspector.search('xyzzy_nonexistent')).toHaveLength(0);
    inspector.dispose();
  });
});

// ---------------------------------------------------------------------------
// clearSearch
// ---------------------------------------------------------------------------

describe('Inspector.clearSearch()', () => {
  it('does not throw when called with no active search', async () => {
    const { inspector } = await makeInspector();
    expect(() => inspector.clearSearch()).not.toThrow();
    inspector.dispose();
  });

  it('does not throw when called after a search', async () => {
    const { inspector } = await makeInspector();
    inspector.search('roads');
    expect(() => inspector.clearSearch()).not.toThrow();
    inspector.dispose();
  });
});
