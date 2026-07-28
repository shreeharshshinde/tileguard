/**
 * @tileguard/inspector — Provider Tests (Milestone 6 — Step 2)
 *
 * Tests for FeatureProvider, DiagnosticProvider, and LayerProvider.
 * Uses real InspectorStore instances with pre-loaded test artifacts.
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDiagnosticProvider,
  createFeatureProvider,
  createLayerProvider,
} from '../src/providers/index.js';
import { createInspectorStore, type InspectorStore } from '../src/store/inspector-store.js';

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
              geometry: [[{ x: 0, y: 0 }, { x: 100, y: 100 }]],
            },
            {
              type: 2,
              geometryType: 'LineString',
              id: 11,
              properties: { highway: 'secondary', bridge: 'yes' },
              geometry: [[{ x: 50, y: 50 }, { x: 200, y: 200 }]],
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
              properties: { height: 15, name: 'City Hall' },
              geometry: [[[{ x: 10, y: 10 }, { x: 20, y: 10 }, { x: 20, y: 20 }, { x: 10, y: 10 }]]],
            },
          ],
        },
        water: {
          name: 'water',
          extent: 4096,
          version: 2,
          features: [],
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
      message: 'Polygon ring not closed',
      artifact: { type: 'VectorTile', source: 'test.pbf' } as never,
      location: { layer: 'buildings', featureIndex: 0 },
    },
    {
      ruleId: 'tile/self-intersection',
      severity: 'warning',
      message: 'Self-intersecting geometry',
      artifact: { type: 'VectorTile', source: 'test.pbf' } as never,
      location: { layer: 'roads', featureIndex: 1 },
    },
    {
      ruleId: 'tile/no-empty',
      severity: 'info',
      message: 'Empty layer',
      artifact: { type: 'VectorTile', source: 'test.pbf' } as never,
      location: { layer: 'water' },
    },
  ];
}

async function loadedStore(): Promise<InspectorStore> {
  const store = createInspectorStore();
  await store.load('test.pbf', makeArtifact(), makeDiagnostics());
  return store;
}

// ---------------------------------------------------------------------------
// FeatureProvider
// ---------------------------------------------------------------------------

describe('FeatureProvider', () => {
  let store: InspectorStore;

  beforeEach(async () => {
    store = await loadedStore();
  });

  it('returns all features across all layers', () => {
    const provider = createFeatureProvider(store);
    const features = provider.getAllFeatures();
    // roads(2) + buildings(1) + water(0) = 3
    expect(features).toHaveLength(3);
  });

  it('includes correct layer names on each feature', () => {
    const provider = createFeatureProvider(store);
    const features = provider.getAllFeatures();
    const layerNames = features.map((f) => f.layerName);
    expect(layerNames).toContain('roads');
    expect(layerNames).toContain('buildings');
  });

  it('includes featureIndex in declaration order per layer', () => {
    const provider = createFeatureProvider(store);
    const roads = provider.getAllFeatures().filter((f) => f.layerName === 'roads');
    const [first, second] = roads;
    expect(first?.featureIndex).toBe(0);
    expect(second?.featureIndex).toBe(1);
  });

  it('includes properties on each feature', () => {
    const provider = createFeatureProvider(store);
    const roads = provider.getAllFeatures().filter((f) => f.layerName === 'roads');
    const [first] = roads;
    expect(first?.properties).toMatchObject({ highway: 'primary' });
  });

  it('returns empty array when no tile loaded', () => {
    const empty = createInspectorStore();
    const provider = createFeatureProvider(empty);
    expect(provider.getAllFeatures()).toHaveLength(0);
  });

  it('getFeatureAt returns the correct feature', () => {
    const provider = createFeatureProvider(store);
    const f = provider.getFeatureAt('roads', 1);
    expect(f).not.toBeNull();
    expect(f!.properties).toMatchObject({ highway: 'secondary' });
  });

  it('getFeatureAt returns null for unknown layer', () => {
    const provider = createFeatureProvider(store);
    expect(provider.getFeatureAt('unknown', 0)).toBeNull();
  });

  it('getFeatureAt returns null for out-of-range index', () => {
    const provider = createFeatureProvider(store);
    expect(provider.getFeatureAt('roads', 99)).toBeNull();
  });

  it('getSelectedFeature returns null when nothing selected', () => {
    const provider = createFeatureProvider(store);
    expect(provider.getSelectedFeature()).toBeNull();
  });

  it('getSelectedFeature returns the feature after selection', () => {
    store.select('buildings', 0);
    const provider = createFeatureProvider(store);
    const f = provider.getSelectedFeature();
    expect(f).not.toBeNull();
    expect(f!.layerName).toBe('buildings');
    expect(f!.featureIndex).toBe(0);
  });

  it('getSelectedFeature returns null when selection is cleared', () => {
    store.select('roads', 0);
    store.select(null, null);
    const provider = createFeatureProvider(store);
    expect(provider.getSelectedFeature()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// DiagnosticProvider
// ---------------------------------------------------------------------------

describe('DiagnosticProvider', () => {
  let store: InspectorStore;

  beforeEach(async () => {
    store = await loadedStore();
  });

  it('getAllDiagnostics returns all 3 diagnostics', () => {
    const provider = createDiagnosticProvider(store);
    expect(provider.getAllDiagnostics()).toHaveLength(3);
  });

  it('returns empty array when no tile loaded', () => {
    const empty = createInspectorStore();
    const provider = createDiagnosticProvider(empty);
    expect(provider.getAllDiagnostics()).toHaveLength(0);
  });

  it('getGrouped splits by severity correctly', () => {
    const provider = createDiagnosticProvider(store);
    const grouped = provider.getGrouped();
    expect(grouped.errors).toHaveLength(1);
    expect(grouped.warnings).toHaveLength(1);
    expect(grouped.infos).toHaveLength(1);
    const [firstError] = grouped.errors;
    expect(firstError?.ruleId).toBe('tile/unclosed-ring');
  });

  it('getSummary returns correct counts', () => {
    const provider = createDiagnosticProvider(store);
    const summary = provider.getSummary();
    expect(summary.errorCount).toBe(1);
    expect(summary.warningCount).toBe(1);
    expect(summary.infoCount).toBe(1);
    expect(summary.total).toBe(3);
  });

  it('getDiagnosticAt returns the correct diagnostic', () => {
    const provider = createDiagnosticProvider(store);
    const d = provider.getDiagnosticAt(0);
    expect(d).not.toBeNull();
    expect(d!.ruleId).toBe('tile/unclosed-ring');
  });

  it('getDiagnosticAt returns null for out-of-range index', () => {
    const provider = createDiagnosticProvider(store);
    expect(provider.getDiagnosticAt(99)).toBeNull();
  });

  it('getFilteredDiagnostics applies minSeverity filter', () => {
    store.setFilters({ minSeverity: 'error' });
    const provider = createDiagnosticProvider(store);
    const filtered = provider.getFilteredDiagnostics();
    expect(filtered).toHaveLength(1);
    const [first] = filtered;
    expect(first?.severity).toBe('error');
  });

  it('getFilteredDiagnostics applies layer filter', () => {
    store.setFilters({ visibleLayers: new Set(['roads']) });
    const provider = createDiagnosticProvider(store);
    const filtered = provider.getFilteredDiagnostics();
    expect(filtered).toHaveLength(1);
    const [first] = filtered;
    expect((first?.location as { layer: string } | undefined)?.layer).toBe('roads');
  });

  it('getFilteredDiagnostics with empty visibleLayers returns all', () => {
    store.setFilters({ visibleLayers: new Set() });
    const provider = createDiagnosticProvider(store);
    expect(provider.getFilteredDiagnostics()).toHaveLength(3);
  });

  it('getFilteredDiagnostics applies ruleId filter', () => {
    store.setFilters({ ruleId: 'tile/self-intersection' });
    const provider = createDiagnosticProvider(store);
    const filtered = provider.getFilteredDiagnostics();
    expect(filtered).toHaveLength(1);
    const [first] = filtered;
    expect(first?.ruleId).toBe('tile/self-intersection');
  });
});

// ---------------------------------------------------------------------------
// LayerProvider
// ---------------------------------------------------------------------------

describe('LayerProvider', () => {
  let store: InspectorStore;

  beforeEach(async () => {
    store = await loadedStore();
  });

  it('getLayers returns all three layers', () => {
    const provider = createLayerProvider(store);
    const layers = provider.getLayers();
    expect(layers).toHaveLength(3);
  });

  it('includes correct featureCount per layer', () => {
    const provider = createLayerProvider(store);
    const roads = provider.getLayers().find((l) => l.name === 'roads');
    expect(roads).toBeDefined();
    expect(roads!.featureCount).toBe(2);
  });

  it('water layer has 0 features', () => {
    const provider = createLayerProvider(store);
    const water = provider.getLayers().find((l) => l.name === 'water');
    expect(water!.featureCount).toBe(0);
  });

  it('includes correct geometry types per layer', () => {
    const provider = createLayerProvider(store);
    const roads = provider.getLayers().find((l) => l.name === 'roads');
    expect(roads!.geometryTypes.has('LineString')).toBe(true);
  });

  it('getLayerNames returns just the names', () => {
    const provider = createLayerProvider(store);
    const names = provider.getLayerNames();
    expect(names).toContain('roads');
    expect(names).toContain('buildings');
    expect(names).toContain('water');
  });

  it('getLayer returns correct info by name', () => {
    const provider = createLayerProvider(store);
    const layer = provider.getLayer('buildings');
    expect(layer).not.toBeNull();
    expect(layer!.featureCount).toBe(1);
  });

  it('getLayer returns null for unknown name', () => {
    const provider = createLayerProvider(store);
    expect(provider.getLayer('nonexistent')).toBeNull();
  });

  it('returns empty arrays when no tile loaded', () => {
    const empty = createInspectorStore();
    const provider = createLayerProvider(empty);
    expect(provider.getLayers()).toHaveLength(0);
    expect(provider.getLayerNames()).toHaveLength(0);
  });
});
