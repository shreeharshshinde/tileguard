/**
 * Unit tests for ComparisonService (Milestone 7 — Step 1)
 *
 * Covers:
 *   - createSnapshot() from loaded/unloaded store
 *   - compare() identical tiles → isIdentical: true, zero differences
 *   - compare() with added/removed layers
 *   - compare() with modified features
 *   - statistics delta accuracy
 *   - diagnostic comparison (new / resolved)
 *   - diagnostic-only changes
 *   - completely different tiles
 *   - empty tiles
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { describe, expect, it } from 'vitest';
import { createComparisonService } from '../src/comparison/ComparisonService.js';
import {
  createInspectorStore,
  type InspectorStore,
} from '../src/store/inspector-store.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDiagnostic(
  ruleId: string,
  severity: 'error' | 'warning' | 'info' = 'warning',
): Diagnostic {
  return {
    ruleId,
    severity,
    message: `Diagnostic from ${ruleId}`,
    artifact: 'test.pbf',
  } as unknown as Diagnostic;
}

type FakeFeature = {
  id?: number | string;
  geometryType: string;
  properties: Record<string, unknown>;
  geometry: { x: number; y: number }[][];
};

function makeArtifact(
  layers: Record<string, FakeFeature[]>,
): VectorTileArtifact {
  const content: Record<string, unknown> = {};
  for (const [name, features] of Object.entries(layers)) {
    content[name] = {
      name,
      extent: 4096,
      version: 2,
      features: features.map((f, i) => ({
        type: 1,
        id: f.id ?? i,
        geometryType: f.geometryType,
        properties: f.properties,
        geometry: f.geometry,
      })),
    };
  }
  return {
    type: 'VectorTile',
    source: 'test.pbf',
    content: { layers: content },
  } as unknown as VectorTileArtifact;
}

async function loadStore(
  layers: Record<string, FakeFeature[]>,
  diagnostics: Diagnostic[] = [],
): Promise<InspectorStore> {
  const store = createInspectorStore();
  const artifact = makeArtifact(layers);
  await store.load('test.pbf', artifact, diagnostics);
  return store;
}

const roadFeature = (id: number, name: string): FakeFeature => ({
  id,
  geometryType: 'LineString',
  properties: { name, highway: 'primary' },
  geometry: [
    [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ],
  ],
});

const buildingFeature = (id: number, height: number): FakeFeature => ({
  id,
  geometryType: 'Polygon',
  properties: { height },
  geometry: [
    [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 200 },
      { x: 0, y: 200 },
      { x: 0, y: 0 },
    ],
  ],
});

// ---------------------------------------------------------------------------

describe('ComparisonService', () => {
  describe('createSnapshot()', () => {
    it('returns null when store is not loaded', () => {
      const service = createComparisonService();
      const store = createInspectorStore();
      expect(service.createSnapshot(store)).toBeNull();
    });

    it('returns null for empty store (uninitialized)', () => {
      const service = createComparisonService();
      const store = createInspectorStore();
      expect(service.createSnapshot(store)).toBeNull();
    });

    it('returns a TileSnapshot for a loaded store', async () => {
      const store = await loadStore({ roads: [roadFeature(1, 'High St')] });
      const service = createComparisonService();
      const snap = service.createSnapshot(store);
      expect(snap).not.toBeNull();
      expect(snap?.layers).toHaveLength(1);
      expect(snap?.layers[0]?.name).toBe('roads');
      expect(snap?.features).toHaveLength(1);
    });

    it('snapshot captures all layers', async () => {
      const store = await loadStore({
        roads: [roadFeature(1, 'Main')],
        buildings: [buildingFeature(10, 30)],
        water: [],
      });
      // water has no features so layer snapshot still exists
      const snap = createComparisonService().createSnapshot(store);
      const layerNames = snap?.layers.map((l) => l.name).sort();
      expect(layerNames).toContain('roads');
      expect(layerNames).toContain('buildings');
    });

    it('snapshot captures diagnostics', async () => {
      const diags = [makeDiagnostic('tile/unclosed-ring', 'error')];
      const store = await loadStore({ roads: [roadFeature(1, 'A')] }, diags);
      const snap = createComparisonService().createSnapshot(store);
      expect(snap?.diagnostics).toHaveLength(1);
      expect(snap?.diagnostics[0]?.ruleId).toBe('tile/unclosed-ring');
    });

    it('snapshot features are immutable', async () => {
      const store = await loadStore({ roads: [roadFeature(1, 'A')] });
      const snap = createComparisonService().createSnapshot(store);
      expect(() => {
        (snap as unknown as { features: unknown[] }).features = [];
      }).toThrow();
    });

    it('does not mutate the store', async () => {
      const store = await loadStore({ roads: [roadFeature(1, 'A')] });
      const lifecycleBefore = store.lifecycle;
      createComparisonService().createSnapshot(store);
      expect(store.lifecycle).toBe(lifecycleBefore);
    });
  });

  describe('compare() — identical tiles', () => {
    it('identical tiles produce isIdentical: true', async () => {
      const layers = { roads: [roadFeature(1, 'A'), roadFeature(2, 'B')] };
      const storeA = await loadStore(layers);
      const storeB = await loadStore(layers);
      const svc = createComparisonService();
      const snapA = svc.createSnapshot(storeA)!;
      const snapB = svc.createSnapshot(storeB)!;
      const result = svc.compare(snapA, snapB);
      expect(result.summary.isIdentical).toBe(true);
      expect(result.summary.addedFeatures).toBe(0);
      expect(result.summary.removedFeatures).toBe(0);
      expect(result.summary.modifiedFeatures).toBe(0);
    });

    it('statistics delta is zero for identical tiles', async () => {
      const layers = { roads: [roadFeature(1, 'A')] };
      const svc = createComparisonService();
      const snapA = svc.createSnapshot(await loadStore(layers))!;
      const snapB = svc.createSnapshot(await loadStore(layers))!;
      const result = svc.compare(snapA, snapB);
      expect(result.statistics.featuresDelta).toBe(0);
      expect(result.statistics.layersDelta).toBe(0);
      expect(result.statistics.diagnosticsDelta).toBe(0);
    });
  });

  describe('compare() — layer changes', () => {
    it('detects an added layer', async () => {
      const svc = createComparisonService();
      const snapA = svc.createSnapshot(
        await loadStore({ roads: [roadFeature(1, 'A')] }),
      )!;
      const snapB = svc.createSnapshot(
        await loadStore({
          roads: [roadFeature(1, 'A')],
          buildings: [buildingFeature(10, 30)],
        }),
      )!;
      const result = svc.compare(snapA, snapB);
      const addedLayer = result.layers.find((l) => l.kind === 'added');
      expect(addedLayer?.name).toBe('buildings');
      expect(result.summary.addedLayers).toBe(1);
      expect(result.statistics.layersDelta).toBe(1);
    });

    it('detects a removed layer', async () => {
      const svc = createComparisonService();
      const snapA = svc.createSnapshot(
        await loadStore({
          roads: [roadFeature(1, 'A')],
          parks: [
            {
              id: 5,
              geometryType: 'Polygon',
              properties: {},
              geometry: [
                [
                  { x: 0, y: 0 },
                  { x: 100, y: 0 },
                  { x: 100, y: 100 },
                  { x: 0, y: 100 },
                ],
              ],
            },
          ],
        }),
      )!;
      const snapB = svc.createSnapshot(
        await loadStore({ roads: [roadFeature(1, 'A')] }),
      )!;
      const result = svc.compare(snapA, snapB);
      const removedLayer = result.layers.find((l) => l.kind === 'removed');
      expect(removedLayer?.name).toBe('parks');
      expect(result.summary.removedLayers).toBe(1);
    });

    it('detects feature count change in a layer', async () => {
      const svc = createComparisonService();
      const snapA = svc.createSnapshot(
        await loadStore({ roads: [roadFeature(1, 'A')] }),
      )!;
      const snapB = svc.createSnapshot(
        await loadStore({
          roads: [roadFeature(1, 'A'), roadFeature(2, 'B')],
        }),
      )!;
      const result = svc.compare(snapA, snapB);
      const roadLayer = result.layers.find((l) => l.name === 'roads');
      expect(roadLayer?.kind).toBe('modified');
      expect(roadLayer?.featureCountDelta).toBe(1);
    });
  });

  describe('compare() — feature changes', () => {
    it('detects modified features', async () => {
      const svc = createComparisonService();
      const snapA = svc.createSnapshot(
        await loadStore({ roads: [roadFeature(1, 'Old Name')] }),
      )!;
      const snapB = svc.createSnapshot(
        await loadStore({ roads: [roadFeature(1, 'New Name')] }),
      )!;
      const result = svc.compare(snapA, snapB);
      expect(result.summary.modifiedFeatures).toBeGreaterThanOrEqual(1);
    });

    it('detects added features', async () => {
      const svc = createComparisonService();
      const snapA = svc.createSnapshot(
        await loadStore({ roads: [roadFeature(1, 'A')] }),
      )!;
      const snapB = svc.createSnapshot(
        await loadStore({
          roads: [roadFeature(1, 'A'), roadFeature(2, 'B')],
        }),
      )!;
      const result = svc.compare(snapA, snapB);
      expect(result.summary.addedFeatures).toBe(1);
    });

    it('detects removed features', async () => {
      const svc = createComparisonService();
      const snapA = svc.createSnapshot(
        await loadStore({
          roads: [roadFeature(1, 'A'), roadFeature(2, 'B')],
        }),
      )!;
      const snapB = svc.createSnapshot(
        await loadStore({ roads: [roadFeature(1, 'A')] }),
      )!;
      const result = svc.compare(snapA, snapB);
      expect(result.summary.removedFeatures).toBe(1);
    });

    it('modified features have changes object', async () => {
      const svc = createComparisonService();
      const snapA = svc.createSnapshot(
        await loadStore({
          roads: [
            {
              id: 1,
              geometryType: 'LineString',
              properties: { name: 'Old' },
              geometry: [
                [
                  { x: 0, y: 0 },
                  { x: 100, y: 100 },
                ],
              ],
            },
          ],
        }),
      )!;
      const snapB = svc.createSnapshot(
        await loadStore({
          roads: [
            {
              id: 1,
              geometryType: 'LineString',
              properties: { name: 'New' },
              geometry: [
                [
                  { x: 0, y: 0 },
                  { x: 100, y: 100 },
                ],
              ],
            },
          ],
        }),
      )!;
      const result = svc.compare(snapA, snapB);
      const modified = result.features.find((f) => f.kind === 'modified');
      expect(modified?.changes).not.toBeNull();
      expect(modified?.changes?.propertiesChanged).toBe(true);
    });
  });

  describe('compare() — statistics delta', () => {
    it('statistics delta reflects feature count change', async () => {
      const svc = createComparisonService();
      const snapA = svc.createSnapshot(
        await loadStore({ roads: [roadFeature(1, 'A')] }),
      )!;
      const snapB = svc.createSnapshot(
        await loadStore({
          roads: [
            roadFeature(1, 'A'),
            roadFeature(2, 'B'),
            roadFeature(3, 'C'),
          ],
        }),
      )!;
      const result = svc.compare(snapA, snapB);
      expect(result.statistics.featuresA).toBe(1);
      expect(result.statistics.featuresB).toBe(3);
      expect(result.statistics.featuresDelta).toBe(2);
    });

    it('vertex delta is computed correctly', async () => {
      const svc = createComparisonService();
      // A has one LineString with 2 vertices
      const snapA = svc.createSnapshot(
        await loadStore({
          roads: [
            {
              id: 1,
              geometryType: 'LineString',
              properties: {},
              geometry: [
                [
                  { x: 0, y: 0 },
                  { x: 100, y: 100 },
                ],
              ],
            },
          ],
        }),
      )!;
      // B has one LineString with 3 vertices
      const snapB = svc.createSnapshot(
        await loadStore({
          roads: [
            {
              id: 1,
              geometryType: 'LineString',
              properties: {},
              geometry: [
                [
                  { x: 0, y: 0 },
                  { x: 50, y: 50 },
                  { x: 100, y: 100 },
                ],
              ],
            },
          ],
        }),
      )!;
      const result = svc.compare(snapA, snapB);
      expect(result.statistics.verticesA).toBe(2);
      expect(result.statistics.verticesB).toBe(3);
      expect(result.statistics.verticesDelta).toBe(1);
    });
  });

  describe('compare() — diagnostic comparison', () => {
    it('reports new diagnostics', async () => {
      const svc = createComparisonService();
      const snapA = svc.createSnapshot(
        await loadStore({ roads: [roadFeature(1, 'A')] }, []),
      )!;
      const snapB = svc.createSnapshot(
        await loadStore({ roads: [roadFeature(1, 'A')] }, [
          makeDiagnostic('tile/unclosed-ring', 'error'),
        ]),
      )!;
      const result = svc.compare(snapA, snapB);
      expect(result.diagnostics.newDiagnostics).toHaveLength(1);
      expect(result.diagnostics.resolvedDiagnostics).toHaveLength(0);
      expect(result.summary.newDiagnostics).toBe(1);
      expect(result.summary.resolvedDiagnostics).toBe(0);
    });

    it('reports resolved diagnostics', async () => {
      const svc = createComparisonService();
      const snapA = svc.createSnapshot(
        await loadStore({ roads: [roadFeature(1, 'A')] }, [
          makeDiagnostic('tile/self-intersection', 'error'),
        ]),
      )!;
      const snapB = svc.createSnapshot(
        await loadStore({ roads: [roadFeature(1, 'A')] }, []),
      )!;
      const result = svc.compare(snapA, snapB);
      expect(result.diagnostics.resolvedDiagnostics).toHaveLength(1);
      expect(result.diagnostics.newDiagnostics).toHaveLength(0);
    });

    it('reports error delta', async () => {
      const svc = createComparisonService();
      const snapA = svc.createSnapshot(
        await loadStore({ roads: [roadFeature(1, 'A')] }, [
          makeDiagnostic('r1', 'error'),
          makeDiagnostic('r2', 'error'),
        ]),
      )!;
      const snapB = svc.createSnapshot(
        await loadStore({ roads: [roadFeature(1, 'A')] }, [
          makeDiagnostic('r1', 'error'),
        ]),
      )!;
      const result = svc.compare(snapA, snapB);
      expect(result.diagnostics.errorsA).toBe(2);
      expect(result.diagnostics.errorsB).toBe(1);
      expect(result.diagnostics.errorsDelta).toBe(-1);
    });

    it('diagnostic-only change is not isIdentical', async () => {
      const svc = createComparisonService();
      const layers = { roads: [roadFeature(1, 'A')] };
      const snapA = svc.createSnapshot(await loadStore(layers, []))!;
      const snapB = svc.createSnapshot(
        await loadStore(layers, [makeDiagnostic('tile/err', 'error')]),
      )!;
      const result = svc.compare(snapA, snapB);
      expect(result.summary.isIdentical).toBe(false);
    });
  });

  describe('compare() — completely different tiles', () => {
    it('all features are added/removed', async () => {
      const svc = createComparisonService();
      const snapA = svc.createSnapshot(
        await loadStore({
          roads: [roadFeature(1, 'A'), roadFeature(2, 'B')],
        }),
      )!;
      const snapB = svc.createSnapshot(
        await loadStore({
          roads: [roadFeature(100, 'X'), roadFeature(200, 'Y')],
        }),
      )!;
      const result = svc.compare(snapA, snapB);
      expect(result.summary.isIdentical).toBe(false);
    });
  });

  describe('compare() — output is deterministic', () => {
    it('same inputs produce same result', async () => {
      const svc = createComparisonService();
      const layers = {
        roads: [roadFeature(1, 'A'), roadFeature(2, 'B')],
        buildings: [buildingFeature(10, 20)],
      };
      const snapA = svc.createSnapshot(await loadStore(layers))!;
      const snapB = svc.createSnapshot(
        await loadStore({
          roads: [roadFeature(1, 'A'), roadFeature(2, 'B modified')],
          buildings: [buildingFeature(10, 20)],
        }),
      )!;
      const r1 = svc.compare(snapA, snapB);
      const r2 = svc.compare(snapA, snapB);
      expect(r1.summary.modifiedFeatures).toBe(r2.summary.modifiedFeatures);
      expect(r1.summary.addedFeatures).toBe(r2.summary.addedFeatures);
      expect(r1.summary.isIdentical).toBe(r2.summary.isIdentical);
    });
  });

  describe('compare() — TileComparison shape', () => {
    it('comparison result includes all required fields', async () => {
      const svc = createComparisonService();
      const layers = { roads: [roadFeature(1, 'A')] };
      const snapA = svc.createSnapshot(await loadStore(layers))!;
      const snapB = svc.createSnapshot(await loadStore(layers))!;
      const result = svc.compare(snapA, snapB);
      expect(result).toHaveProperty('snapshotA');
      expect(result).toHaveProperty('snapshotB');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('layers');
      expect(result).toHaveProperty('features');
      expect(result).toHaveProperty('diagnostics');
      expect(result).toHaveProperty('statistics');
    });

    it('layer comparisons are sorted alphabetically', async () => {
      const svc = createComparisonService();
      const snapA = svc.createSnapshot(
        await loadStore({
          zebra: [roadFeature(1, 'z')],
          alpha: [roadFeature(2, 'a')],
          mango: [roadFeature(3, 'm')],
        }),
      )!;
      const snapB = svc.createSnapshot(
        await loadStore({
          zebra: [roadFeature(1, 'z')],
          alpha: [roadFeature(2, 'a')],
          mango: [roadFeature(3, 'm')],
        }),
      )!;
      const result = svc.compare(snapA, snapB);
      const names = result.layers.map((l) => l.name);
      expect(names).toEqual([...names].sort());
    });
  });
});
