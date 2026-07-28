/**
 * @tileguard/inspector — Panel Behavior Tests (Milestone 6 — Step 2)
 *
 * Tests panel-level behaviors that can be verified without a DOM:
 *   - DiagnosticProvider filtering + grouping (drives DiagnosticPanel)
 *   - FeatureProvider selection resolution (drives FeaturePanel)
 *   - Severity ordering in DiagnosticProvider
 *   - Full event flow: selectDiagnostic → store.select → getSelectedFeature
 *
 * These are integration-style tests exercising the data layer that the panels
 * consume, without mounting React components.
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDiagnosticProvider,
  createFeatureProvider,
} from '../src/providers/index.js';
import { createInspectorStore, type InspectorStore } from '../src/store/inspector-store.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMixedArtifact(): VectorTileArtifact {
  return {
    type: 'VectorTile',
    source: 'test.pbf',
    content: {
      layers: {
        roads: {
          name: 'roads',
          extent: 4096,
          version: 2,
          features: Array.from({ length: 5 }, (_, i) => ({
            type: 2,
            geometryType: 'LineString',
            id: i + 1,
            properties: { highway: i % 2 === 0 ? 'primary' : 'secondary' },
            geometry: [[{ x: i * 10, y: i * 10 }, { x: i * 10 + 5, y: i * 10 + 5 }]],
          })),
        },
        buildings: {
          name: 'buildings',
          extent: 4096,
          version: 2,
          features: [
            {
              type: 3,
              geometryType: 'Polygon',
              id: 100,
              properties: { type: 'residential' },
              geometry: [[[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 0 }]]],
            },
          ],
        },
      },
    },
  } as unknown as VectorTileArtifact;
}

function makeMixedDiagnostics(): Diagnostic[] {
  const diags: Diagnostic[] = [];
  // 3 errors
  for (let i = 0; i < 3; i++) {
    diags.push({
      ruleId: 'tile/unclosed-ring',
      severity: 'error',
      message: `Error ${i}`,
      artifact: {} as never,
      location: { layer: 'buildings', featureIndex: 0 },
    });
  }
  // 5 warnings
  for (let i = 0; i < 5; i++) {
    diags.push({
      ruleId: 'tile/coordinate-range',
      severity: 'warning',
      message: `Warning ${i}`,
      artifact: {} as never,
      location: { layer: 'roads', featureIndex: i % 5 },
    });
  }
  // 2 infos
  for (let i = 0; i < 2; i++) {
    diags.push({
      ruleId: 'tile/no-empty',
      severity: 'info',
      message: `Info ${i}`,
      artifact: {} as never,
      location: { layer: 'roads' },
    });
  }
  return diags;
}

async function loadedStore(): Promise<InspectorStore> {
  const store = createInspectorStore();
  await store.load('test.pbf', makeMixedArtifact(), makeMixedDiagnostics());
  return store;
}

// ---------------------------------------------------------------------------
// Panel: diagnostic grouping drives DiagnosticPanel rendering
// ---------------------------------------------------------------------------

describe('DiagnosticPanel data layer', () => {
  it('getGrouped returns correct error / warning / info counts', async () => {
    const store = await loadedStore();
    const provider = createDiagnosticProvider(store);
    const { errors, warnings, infos } = provider.getGrouped();
    expect(errors).toHaveLength(3);
    expect(warnings).toHaveLength(5);
    expect(infos).toHaveLength(2);
  });

  it('getSummary total equals sum of grouped counts', async () => {
    const store = await loadedStore();
    const provider = createDiagnosticProvider(store);
    const summary = provider.getSummary();
    const grouped = provider.getGrouped();
    expect(summary.total).toBe(
      grouped.errors.length + grouped.warnings.length + grouped.infos.length,
    );
  });

  it('filtering by error severity hides warnings and infos', async () => {
    const store = await loadedStore();
    store.setFilters({ minSeverity: 'error' });
    const provider = createDiagnosticProvider(store);
    const filtered = provider.getFilteredDiagnostics();
    expect(filtered.every((d) => d.severity === 'error')).toBe(true);
    expect(filtered).toHaveLength(3);
  });

  it('filtering by warning severity shows errors and warnings', async () => {
    const store = await loadedStore();
    store.setFilters({ minSeverity: 'warning' });
    const provider = createDiagnosticProvider(store);
    const filtered = provider.getFilteredDiagnostics();
    const severities = new Set(filtered.map((d) => d.severity));
    expect(severities.has('error')).toBe(true);
    expect(severities.has('warning')).toBe(true);
    expect(severities.has('info')).toBe(false);
  });

  it('filtering by layer only shows diagnostics from that layer', async () => {
    const store = await loadedStore();
    store.setFilters({ visibleLayers: new Set(['roads']) });
    const provider = createDiagnosticProvider(store);
    const filtered = provider.getFilteredDiagnostics();
    // All filtered diagnostics should have location.layer = 'roads'
    for (const d of filtered) {
      const loc = d.location as { layer?: string };
      expect(loc.layer).toBe('roads');
    }
  });

  it('filtering never mutates the underlying diagnostics array', async () => {
    const store = await loadedStore();
    const provider = createDiagnosticProvider(store);
    const all = provider.getAllDiagnostics();
    store.setFilters({ minSeverity: 'error' });
    const allAfter = provider.getAllDiagnostics();
    // getAllDiagnostics always returns the full unfiltered set
    expect(allAfter).toHaveLength(all.length);
  });

  it('resetting filters (empty set, null) restores all diagnostics', async () => {
    const store = await loadedStore();
    store.setFilters({ minSeverity: 'error' });
    store.setFilters({ minSeverity: null, visibleLayers: new Set() });
    const provider = createDiagnosticProvider(store);
    expect(provider.getFilteredDiagnostics()).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// Panel: feature selection drives FeaturePanel rendering
// ---------------------------------------------------------------------------

describe('FeaturePanel data layer', () => {
  it('getSelectedFeature returns null before selection', async () => {
    const store = await loadedStore();
    const provider = createFeatureProvider(store);
    expect(provider.getSelectedFeature()).toBeNull();
  });

  it('getSelectedFeature returns feature after store.select()', async () => {
    const store = await loadedStore();
    store.select('roads', 2);
    const provider = createFeatureProvider(store);
    const f = provider.getSelectedFeature();
    expect(f).not.toBeNull();
    expect(f!.layerName).toBe('roads');
    expect(f!.featureIndex).toBe(2);
  });

  it('FeaturePanel updates when selection changes (store subscriber)', async () => {
    const store = await loadedStore();
    const notifications: string[] = [];
    const unsub = store.subscribe(() => {
      const provider = createFeatureProvider(store);
      const f = provider.getSelectedFeature();
      notifications.push(f?.layerName ?? 'none');
    });

    store.select('roads', 0);
    store.select('buildings', 0);
    store.select(null, null);
    unsub();

    expect(notifications).toEqual(['roads', 'buildings', 'none']);
  });

  it('getFeatureAt handles all features across layers', async () => {
    const store = await loadedStore();
    const provider = createFeatureProvider(store);
    for (let i = 0; i < 5; i++) {
      const f = provider.getFeatureAt('roads', i);
      expect(f).not.toBeNull();
      expect(f!.featureIndex).toBe(i);
    }
    const b = provider.getFeatureAt('buildings', 0);
    expect(b).not.toBeNull();
    expect(b!.geometryType).toBe('Polygon');
  });
});

// ---------------------------------------------------------------------------
// End-to-end event flow: selectDiagnostic → store → panel
// ---------------------------------------------------------------------------

describe('Event flow: selectDiagnostic → FeaturePanel', () => {
  it('selecting a diagnostic with a layer+featureIndex reference updates selection', async () => {
    const store = await loadedStore();
    const diags = makeMixedDiagnostics();
    const featureProvider = createFeatureProvider(store);
    const diagProvider = createDiagnosticProvider(store);

    // Simulate Inspector.selectDiagnostic(0) — first error, buildings/0
    const d = diagProvider.getDiagnosticAt(0)!;
    const loc = d.location as { layer?: string; featureIndex?: number };
    if (loc.layer !== undefined && loc.featureIndex !== undefined) {
      store.select(loc.layer, loc.featureIndex);
    }

    const selected = featureProvider.getSelectedFeature();
    expect(selected).not.toBeNull();
    expect(selected!.layerName).toBe('buildings');
    expect(selected!.featureIndex).toBe(0);
  });

  it('selecting different diagnostics updates the panel to each associated feature', async () => {
    const store = await loadedStore();
    const featureProvider = createFeatureProvider(store);
    const diagProvider = createDiagnosticProvider(store);

    // First diagnostic: buildings/0
    const d0 = diagProvider.getDiagnosticAt(0)!;
    const loc0 = d0.location as { layer?: string; featureIndex?: number };
    store.select(loc0.layer ?? null, loc0.featureIndex ?? null);
    expect(featureProvider.getSelectedFeature()?.layerName).toBe('buildings');

    // Fourth diagnostic: roads/3
    const d3 = diagProvider.getDiagnosticAt(3)!;
    const loc3 = d3.location as { layer?: string; featureIndex?: number };
    store.select(loc3.layer ?? null, loc3.featureIndex ?? null);
    expect(featureProvider.getSelectedFeature()?.layerName).toBe('roads');
  });
});
