/**
 * @tileguard/inspector — Step 3 Integration Tests (Milestone 6 — Step 3)
 *
 * Tests the Inspector facade's Step 3 API surface:
 *   - getTileStatistics() — full tile statistics
 *   - getSettings()       — current settings via SettingsService
 *   - updateSettings()    — partial update + renderer propagation
 *   - resetSettings()     — restore defaults + renderer propagation
 *
 * Also verifies Step 1 and Step 2 compatibility is preserved under Step 3.
 *
 * Uses a mock Renderer that records setOptions() calls so we can assert
 * that settings changes are forwarded to the renderer correctly.
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInspector, type Inspector } from '../src/create-inspector.js';
import type {
  CanvasRenderer,
  Renderer,
} from '../src/renderer/canvas-renderer.js';
import {
  DEFAULT_SETTINGS,
  resetSettingsServiceInstance,
} from '../src/services/SettingsService.js';
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

function makePointArtifact(): VectorTileArtifact {
  return {
    type: 'VectorTile',
    source: 'points.pbf',
    content: {
      layers: {
        poi: {
          name: 'poi',
          extent: 4096,
          version: 2,
          features: [
            {
              type: 1,
              geometryType: 'Point',
              id: 1,
              properties: { name: 'cafe' },
              geometry: [{ x: 50, y: 50 }],
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

// ---------------------------------------------------------------------------
// Mock renderer — records setOptions() calls
// ---------------------------------------------------------------------------

type SetOptionsCall = Parameters<CanvasRenderer['setOptions']>[0];

function makeMockRenderer(): Renderer & {
  setOptionsCalls: SetOptionsCall[];
} {
  const setOptionsCalls: SetOptionsCall[] = [];
  return {
    attachCanvas: vi.fn(),
    resize: vi.fn(),
    clear: vi.fn(),
    // render() is required by the Renderer interface — called by RenderCoordinator
    render: vi.fn(),
    // Step 3 — CanvasRenderer.setOptions() extension point
    setOptions: vi.fn((opts: SetOptionsCall) => {
      setOptionsCalls.push(opts);
    }),
    setOptionsCalls,
  } as unknown as Renderer & { setOptionsCalls: SetOptionsCall[] };
}

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

function makeViewport(): Viewport {
  return createViewport({ width: 800, height: 600 });
}

async function makeLoadedInspector(): Promise<{
  inspector: Inspector;
  renderer: Renderer & { setOptionsCalls: SetOptionsCall[] };
}> {
  const renderer = makeMockRenderer();
  const inspector = createInspector({ viewport: makeViewport(), renderer });
  await inspector.load('test.pbf', makeArtifact(), makeDiagnostics());
  return { inspector, renderer };
}

// ---------------------------------------------------------------------------
// Reset SettingsService singleton between tests to avoid state leakage
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetSettingsServiceInstance();
});

// ---------------------------------------------------------------------------
// getTileStatistics()
// ---------------------------------------------------------------------------

describe('Inspector.getTileStatistics()', () => {
  it('returns EMPTY_TILE_STATISTICS when no tile is loaded', () => {
    const inspector = createInspector({
      viewport: makeViewport(),
      renderer: makeMockRenderer(),
    });
    const stats = inspector.getTileStatistics();
    expect(stats.totalLayers).toBe(0);
    expect(stats.totalFeatures).toBe(0);
    expect(stats.geometryCounts).toEqual({ point: 0, line: 0, polygon: 0 });
    expect(stats.diagnostics).toEqual({ errors: 0, warnings: 0, info: 0 });
    expect(stats.layers).toHaveLength(0);
    inspector.dispose();
  });

  it('returns correct totals for a loaded tile', async () => {
    const { inspector } = await makeLoadedInspector();
    const stats = inspector.getTileStatistics();

    expect(stats.totalLayers).toBe(2);
    expect(stats.totalFeatures).toBe(3);
    expect(stats.geometryCounts.line).toBe(2);
    expect(stats.geometryCounts.polygon).toBe(1);
    expect(stats.geometryCounts.point).toBe(0);
    inspector.dispose();
  });

  it('returns correct diagnostic totals', async () => {
    const { inspector } = await makeLoadedInspector();
    const stats = inspector.getTileStatistics();

    expect(stats.diagnostics.errors).toBe(1);
    expect(stats.diagnostics.warnings).toBe(1);
    expect(stats.diagnostics.info).toBe(1);
    inspector.dispose();
  });

  it('returns correct per-layer breakdown', async () => {
    const { inspector } = await makeLoadedInspector();
    const stats = inspector.getTileStatistics();

    const roads = stats.layers.find((l) => l.name === 'roads');
    expect(roads).toBeDefined();
    expect(roads!.featureCount).toBe(2);
    expect(roads!.geometryCounts.line).toBe(2);
    expect(roads!.diagnosticCount).toBe(1);

    const buildings = stats.layers.find((l) => l.name === 'buildings');
    expect(buildings).toBeDefined();
    expect(buildings!.featureCount).toBe(1);
    expect(buildings!.geometryCounts.polygon).toBe(1);
    expect(buildings!.diagnosticCount).toBe(1);
    inspector.dispose();
  });

  it('updates statistics after loading a second tile', async () => {
    const { inspector } = await makeLoadedInspector();
    await inspector.load('points.pbf', makePointArtifact(), []);

    const stats = inspector.getTileStatistics();
    expect(stats.totalLayers).toBe(1);
    expect(stats.totalFeatures).toBe(1);
    expect(stats.geometryCounts.point).toBe(1);
    expect(stats.geometryCounts.line).toBe(0);
    expect(stats.diagnostics.errors).toBe(0);
    inspector.dispose();
  });

  it('returns an immutable stats object', async () => {
    const { inspector } = await makeLoadedInspector();
    const stats = inspector.getTileStatistics();
    expect(Object.isFrozen(stats)).toBe(true);
    expect(Object.isFrozen(stats.geometryCounts)).toBe(true);
    expect(Object.isFrozen(stats.diagnostics)).toBe(true);
    inspector.dispose();
  });
});

// ---------------------------------------------------------------------------
// getSettings()
// ---------------------------------------------------------------------------

describe('Inspector.getSettings()', () => {
  it('returns the default settings before any update', () => {
    const inspector = createInspector({
      viewport: makeViewport(),
      renderer: makeMockRenderer(),
    });
    expect(inspector.getSettings()).toEqual(DEFAULT_SETTINGS);
    inspector.dispose();
  });

  it('returns current settings after updateSettings()', async () => {
    const { inspector } = await makeLoadedInspector();
    inspector.updateSettings({ showVertices: true });
    expect(inspector.getSettings().showVertices).toBe(true);
    inspector.dispose();
  });

  it('returns default settings after resetSettings()', async () => {
    const { inspector } = await makeLoadedInspector();
    inspector.updateSettings({ showVertices: true, smoothZoom: false });
    inspector.resetSettings();
    expect(inspector.getSettings()).toEqual(DEFAULT_SETTINGS);
    inspector.dispose();
  });
});

// ---------------------------------------------------------------------------
// updateSettings() → renderer propagation
// ---------------------------------------------------------------------------

describe('Inspector.updateSettings() → renderer propagation', () => {
  it('calls renderer.setOptions() with the updated settings', async () => {
    const { inspector, renderer } = await makeLoadedInspector();
    inspector.updateSettings({ showVertices: true });

    const calls = renderer.setOptionsCalls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1]!;
    expect(lastCall.showVertices).toBe(true);
    inspector.dispose();
  });

  it('forwards showTileBounds to renderer', async () => {
    const { inspector, renderer } = await makeLoadedInspector();
    inspector.updateSettings({ showTileBounds: false });

    const lastCall =
      renderer.setOptionsCalls[renderer.setOptionsCalls.length - 1]!;
    expect(lastCall.showTileBounds).toBe(false);
    inspector.dispose();
  });

  it('forwards showBufferBounds to renderer', async () => {
    const { inspector, renderer } = await makeLoadedInspector();
    inspector.updateSettings({ showBufferBounds: false });

    const lastCall =
      renderer.setOptionsCalls[renderer.setOptionsCalls.length - 1]!;
    expect(lastCall.showBufferBounds).toBe(false);
    inspector.dispose();
  });

  it('forwards overlayOpacity to renderer', async () => {
    const { inspector, renderer } = await makeLoadedInspector();
    inspector.updateSettings({ overlayOpacity: 0.5 });

    const lastCall =
      renderer.setOptionsCalls[renderer.setOptionsCalls.length - 1]!;
    expect(lastCall.overlayOpacity).toBe(0.5);
    inspector.dispose();
  });

  it('forwards selectionThickness to renderer', async () => {
    const { inspector, renderer } = await makeLoadedInspector();
    inspector.updateSettings({ selectionThickness: 4 });

    const lastCall =
      renderer.setOptionsCalls[renderer.setOptionsCalls.length - 1]!;
    expect(lastCall.selectionThickness).toBe(4);
    inspector.dispose();
  });

  it('forwards hoverThickness to renderer', async () => {
    const { inspector, renderer } = await makeLoadedInspector();
    inspector.updateSettings({ hoverThickness: 3 });

    const lastCall =
      renderer.setOptionsCalls[renderer.setOptionsCalls.length - 1]!;
    expect(lastCall.hoverThickness).toBe(3);
    inspector.dispose();
  });

  it('does not throw when renderer does not expose setOptions()', () => {
    // Renderer without setOptions — e.g. a minimal mock from Step 1 tests
    const minimalRenderer: Renderer = {
      attachCanvas: vi.fn(),
      resize: vi.fn(),
      clear: vi.fn(),
      render: vi.fn(),
    } as unknown as Renderer;

    const inspector = createInspector({
      viewport: makeViewport(),
      renderer: minimalRenderer,
    });

    expect(() =>
      inspector.updateSettings({ showVertices: true }),
    ).not.toThrow();
    inspector.dispose();
  });
});

// ---------------------------------------------------------------------------
// resetSettings() → renderer propagation
// ---------------------------------------------------------------------------

describe('Inspector.resetSettings() → renderer propagation', () => {
  it('calls renderer.setOptions() with default values on reset', async () => {
    const { inspector, renderer } = await makeLoadedInspector();
    // First change something
    inspector.updateSettings({ showVertices: true });
    const callsBeforeReset = renderer.setOptionsCalls.length;

    inspector.resetSettings();
    expect(renderer.setOptionsCalls.length).toBeGreaterThan(callsBeforeReset);

    const lastCall =
      renderer.setOptionsCalls[renderer.setOptionsCalls.length - 1]!;
    expect(lastCall.showVertices).toBe(DEFAULT_SETTINGS.showVertices);
    inspector.dispose();
  });
});

// ---------------------------------------------------------------------------
// Step 1 compatibility (load, render, handlePointerMove, dispose)
// ---------------------------------------------------------------------------

describe('Step 1 API compatibility under Step 3', () => {
  it('load() still works and does not affect settings', async () => {
    const { inspector } = await makeLoadedInspector();
    const settings = inspector.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    inspector.dispose();
  });

  it('render() does not throw after updateSettings()', async () => {
    const { inspector } = await makeLoadedInspector();
    inspector.updateSettings({ showVertices: true });
    expect(() => inspector.render()).not.toThrow();
    inspector.dispose();
  });

  it('dispose() does not throw when called after Step 3 API usage', async () => {
    const { inspector } = await makeLoadedInspector();
    inspector.getTileStatistics();
    inspector.updateSettings({ showVertices: true });
    inspector.resetSettings();
    expect(() => inspector.dispose()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Step 2 API compatibility under Step 3
// ---------------------------------------------------------------------------

describe('Step 2 API compatibility under Step 3', () => {
  it('getStatistics() (deprecated DiagnosticSummary) still works', async () => {
    const { inspector } = await makeLoadedInspector();
    const summary = inspector.getStatistics();
    expect(summary.errorCount).toBe(1);
    expect(summary.warningCount).toBe(1);
    expect(summary.infoCount).toBe(1);
    expect(summary.total).toBe(3);
    inspector.dispose();
  });

  it('selectDiagnostic() still works after calling getTileStatistics()', async () => {
    const { inspector } = await makeLoadedInspector();
    inspector.getTileStatistics(); // invoke Step 3
    inspector.selectDiagnostic(0); // Step 2
    const selected = inspector.getSelectedFeature();
    expect(selected).not.toBeNull();
    expect(selected!.layerName).toBe('buildings');
    inspector.dispose();
  });

  it('search() still returns correct results after updateSettings()', async () => {
    const { inspector } = await makeLoadedInspector();
    inspector.updateSettings({ showVertices: true });
    const results = inspector.search('roads');
    expect(results.length).toBeGreaterThan(0);
    inspector.dispose();
  });

  it('getDiagnostic() still returns correct diagnostic after resetSettings()', async () => {
    const { inspector } = await makeLoadedInspector();
    inspector.resetSettings();
    const d = inspector.getDiagnostic(0);
    expect(d).not.toBeNull();
    expect(d!.ruleId).toBe('tile/unclosed-ring');
    inspector.dispose();
  });
});

// ---------------------------------------------------------------------------
// Settings shared across inspector instances (singleton behaviour)
// ---------------------------------------------------------------------------

describe('SettingsService singleton across Inspector instances', () => {
  it('settings change on one inspector is visible on another', () => {
    const r1 = makeMockRenderer();
    const r2 = makeMockRenderer();
    const i1 = createInspector({ viewport: makeViewport(), renderer: r1 });
    const i2 = createInspector({ viewport: makeViewport(), renderer: r2 });

    i1.updateSettings({ showVertices: true });

    // Both inspectors share the same SettingsService singleton
    expect(i2.getSettings().showVertices).toBe(true);

    i1.dispose();
    i2.dispose();
  });
});
