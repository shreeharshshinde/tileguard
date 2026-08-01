import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDiagnosticProvider } from '../src/providers/DiagnosticProvider.js';
import { createFeatureProvider } from '../src/providers/FeatureProvider.js';
import { createLayerProvider } from '../src/providers/LayerProvider.js';
import { createStatisticsService } from '../src/services/StatisticsService.js';
import {
  createInspectorStore,
  type InspectorStore,
} from '../src/store/inspector-store.js';

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
              properties: { highway: 'primary' },
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
              properties: { height: 30 },
              geometry: [
                [
                  { x: 10, y: 10 },
                  { x: 20, y: 10 },
                  { x: 20, y: 20 },
                  { x: 10, y: 10 },
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
  ];
}

describe('StatisticsService', () => {
  let store: InspectorStore;

  beforeEach(() => {
    store = createInspectorStore();
  });

  it('computes empty statistics when no tile is loaded', () => {
    const fp = createFeatureProvider(store);
    const dp = createDiagnosticProvider(store);
    const lp = createLayerProvider(store);
    const service = createStatisticsService(fp, dp, lp);
    const stats = service.compute();

    expect(stats.totalLayers).toBe(0);
    expect(stats.totalFeatures).toBe(0);
    expect(stats.geometryCounts).toEqual({ point: 0, line: 0, polygon: 0 });
    expect(stats.diagnostics).toEqual({ errors: 0, warnings: 0, info: 0 });
  });

  it('computes accurate statistics for a loaded tile', async () => {
    await store.load('test.pbf', makeArtifact(), makeDiagnostics());

    const fp = createFeatureProvider(store);
    const dp = createDiagnosticProvider(store);
    const lp = createLayerProvider(store);
    const service = createStatisticsService(fp, dp, lp);
    const stats = service.compute();

    expect(stats.totalLayers).toBe(2);
    expect(stats.totalFeatures).toBe(3);
    expect(stats.geometryCounts.line).toBe(2);
    expect(stats.geometryCounts.polygon).toBe(1);
    expect(stats.diagnostics.errors).toBe(1);
    expect(stats.diagnostics.warnings).toBe(1);
  });

  it('computes layer-by-layer breakdown correctly', async () => {
    await store.load('test.pbf', makeArtifact(), makeDiagnostics());

    const fp = createFeatureProvider(store);
    const dp = createDiagnosticProvider(store);
    const lp = createLayerProvider(store);
    const service = createStatisticsService(fp, dp, lp);
    const stats = service.compute();

    expect(stats.layers).toHaveLength(2);
    const roads = stats.layers.find((l) => l.name === 'roads');
    expect(roads?.featureCount).toBe(2);
    expect(roads?.geometryCounts.line).toBe(2);
    expect(roads?.diagnosticCount).toBe(1);
  });

  it('updates statistics after loading a different tile', async () => {
    await store.load('test.pbf', makeArtifact(), makeDiagnostics());

    // Build a second artifact with only one layer
    const secondArtifact = {
      type: 'VectorTile',
      source: 'second.pbf',
      content: {
        layers: {
          water: {
            name: 'water',
            extent: 4096,
            version: 2,
            features: [
              {
                type: 3,
                geometryType: 'Polygon',
                id: 100,
                properties: { natural: 'water' },
                geometry: [
                  [
                    { x: 0, y: 0 },
                    { x: 100, y: 0 },
                    { x: 100, y: 100 },
                    { x: 0, y: 0 },
                  ],
                ],
              },
            ],
          },
        },
      },
    } as unknown as VectorTileArtifact;

    await store.load('second.pbf', secondArtifact, []);

    const fp = createFeatureProvider(store);
    const dp = createDiagnosticProvider(store);
    const lp = createLayerProvider(store);
    const service = createStatisticsService(fp, dp, lp);
    const stats = service.compute();

    expect(stats.totalLayers).toBe(1);
    expect(stats.totalFeatures).toBe(1);
    expect(stats.geometryCounts.polygon).toBe(1);
    expect(stats.geometryCounts.line).toBe(0);
    expect(stats.diagnostics.errors).toBe(0);
    expect(stats.diagnostics.warnings).toBe(0);
    expect(stats.diagnostics.info).toBe(0);
  });

  it('computes correct stats for a single-layer tile', async () => {
    const singleLayerArtifact = {
      type: 'VectorTile',
      source: 'single.pbf',
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
              {
                type: 1,
                geometryType: 'Point',
                id: 2,
                properties: { name: 'park' },
                geometry: [{ x: 100, y: 100 }],
              },
            ],
          },
        },
      },
    } as unknown as VectorTileArtifact;

    await store.load('single.pbf', singleLayerArtifact, []);

    const fp = createFeatureProvider(store);
    const dp = createDiagnosticProvider(store);
    const lp = createLayerProvider(store);
    const service = createStatisticsService(fp, dp, lp);
    const stats = service.compute();

    expect(stats.totalLayers).toBe(1);
    expect(stats.totalFeatures).toBe(2);
    expect(stats.geometryCounts.point).toBe(2);
    expect(stats.geometryCounts.line).toBe(0);
    expect(stats.geometryCounts.polygon).toBe(0);
    expect(stats.layers).toHaveLength(1);
    expect(stats.layers[0]!.name).toBe('poi');
  });

  it('reports zero diagnostics when none are present', async () => {
    await store.load('test.pbf', makeArtifact(), []);

    const fp = createFeatureProvider(store);
    const dp = createDiagnosticProvider(store);
    const lp = createLayerProvider(store);
    const service = createStatisticsService(fp, dp, lp);
    const stats = service.compute();

    expect(stats.totalFeatures).toBe(3);
    expect(stats.diagnostics.errors).toBe(0);
    expect(stats.diagnostics.warnings).toBe(0);
    expect(stats.diagnostics.info).toBe(0);
    for (const layer of stats.layers) {
      expect(layer.diagnosticCount).toBe(0);
    }
  });

  it('layer breakdown is sortable by name, features, and diagnostics', async () => {
    await store.load('test.pbf', makeArtifact(), makeDiagnostics());

    const fp = createFeatureProvider(store);
    const dp = createDiagnosticProvider(store);
    const lp = createLayerProvider(store);
    const service = createStatisticsService(fp, dp, lp);
    const stats = service.compute();

    // Sort by name ascending
    const byName = [...stats.layers].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    expect(byName[0]!.name).toBe('buildings');
    expect(byName[1]!.name).toBe('roads');

    // Sort by featureCount descending
    const byFeatures = [...stats.layers].sort(
      (a, b) => b.featureCount - a.featureCount,
    );
    expect(byFeatures[0]!.name).toBe('roads');
    expect(byFeatures[0]!.featureCount).toBe(2);

    // Sort by diagnosticCount descending
    const byDiag = [...stats.layers].sort(
      (a, b) => b.diagnosticCount - a.diagnosticCount,
    );
    expect(byDiag[0]!.diagnosticCount).toBeGreaterThanOrEqual(
      byDiag[1]!.diagnosticCount,
    );
  });
});
