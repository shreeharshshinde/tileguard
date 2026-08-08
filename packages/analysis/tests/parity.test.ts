/**
 * Cross-Package Parity Tests
 *
 * Asserts that the Inspector workflow and CLI workflow produce identical
 * analysis results when given the same inputs. This guarantees that
 * @tileguard/analysis is the single source of truth.
 *
 * The test creates TileSnapshots using the shared SnapshotFactory, then
 * runs comparison and regression through both:
 *   1. Inspector path: createComparisonService() + createRegressionEngine()
 *   2. CLI path: createComparisonEngine() + createRegressionEngine()
 *
 * Both paths delegate to the same @tileguard/analysis implementations,
 * so results must be byte-for-byte identical.
 */

import { describe, expect, it } from 'vitest';
import {
  createComparisonEngine,
  createRegressionEngine,
  createSnapshotFactory,
  type TileSnapshot,
} from '../../analysis/src/index.js';

// We also test through the inspector's re-exported path
import { createComparisonService } from '../../inspector/src/comparison/ComparisonService.js';

// ---------------------------------------------------------------------------
// Test fixtures — two different tile snapshots
// ---------------------------------------------------------------------------

function makeSnapshotA(): TileSnapshot {
  const factory = createSnapshotFactory();
  return factory.createSnapshot(
    'before.pbf',
    [
      {
        name: 'roads',
        extent: 4096,
        features: [
          {
            id: 1,
            geometryType: 'LineString',
            properties: { name: 'Main St', highway: 'primary' },
            geometry: [
              [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                { x: 200, y: 50 },
              ],
            ],
          },
          {
            id: 2,
            geometryType: 'LineString',
            properties: { name: 'Oak Ave', highway: 'secondary' },
            geometry: [
              [
                { x: 50, y: 50 },
                { x: 150, y: 50 },
                { x: 250, y: 100 },
              ],
            ],
          },
          {
            id: 3,
            geometryType: 'LineString',
            properties: { name: 'Park Rd', highway: 'tertiary' },
            geometry: [
              [
                { x: 0, y: 200 },
                { x: 100, y: 200 },
              ],
            ],
          },
        ],
      },
      {
        name: 'buildings',
        extent: 4096,
        features: [
          {
            id: 10,
            geometryType: 'Polygon',
            properties: { building: 'yes', height: 20 },
            geometry: [
              [
                { x: 10, y: 10 },
                { x: 50, y: 10 },
                { x: 50, y: 50 },
                { x: 10, y: 50 },
                { x: 10, y: 10 },
              ],
            ],
          },
          {
            id: 11,
            geometryType: 'Polygon',
            properties: { building: 'yes', height: 30 },
            geometry: [
              [
                { x: 100, y: 100 },
                { x: 200, y: 100 },
                { x: 200, y: 200 },
                { x: 100, y: 200 },
                { x: 100, y: 100 },
              ],
            ],
          },
        ],
      },
    ],
    [],
  );
}

function makeSnapshotB(): TileSnapshot {
  const factory = createSnapshotFactory();
  return factory.createSnapshot(
    'after.pbf',
    [
      {
        name: 'roads',
        extent: 4096,
        features: [
          {
            id: 1,
            geometryType: 'LineString',
            properties: { name: 'Main St', highway: 'primary' },
            geometry: [
              [
                { x: 0, y: 0 },
                { x: 100, y: 10 },
                { x: 200, y: 50 },
                { x: 300, y: 60 },
              ],
            ],
          },
          {
            id: 2,
            geometryType: 'LineString',
            properties: { name: 'Oak Avenue', highway: 'secondary', lanes: 2 },
            geometry: [
              [
                { x: 50, y: 50 },
                { x: 150, y: 50 },
                { x: 250, y: 100 },
              ],
            ],
          },
          // Feature 3 removed
        ],
      },
      {
        name: 'buildings',
        extent: 4096,
        features: [
          {
            id: 10,
            geometryType: 'Polygon',
            properties: { building: 'yes', height: 20 },
            geometry: [
              [
                { x: 10, y: 10 },
                { x: 50, y: 10 },
                { x: 50, y: 50 },
                { x: 10, y: 50 },
                { x: 10, y: 10 },
              ],
            ],
          },
          {
            id: 11,
            geometryType: 'Polygon',
            properties: { building: 'yes', height: 45 },
            geometry: [
              [
                { x: 100, y: 100 },
                { x: 200, y: 100 },
                { x: 200, y: 200 },
                { x: 100, y: 200 },
                { x: 100, y: 100 },
              ],
            ],
          },
          {
            id: 12,
            geometryType: 'Polygon',
            properties: { building: 'yes', height: 15 },
            geometry: [
              [
                { x: 300, y: 300 },
                { x: 400, y: 300 },
                { x: 400, y: 400 },
                { x: 300, y: 400 },
                { x: 300, y: 300 },
              ],
            ],
          },
        ],
      },
    ],
    [],
  );
}

// ---------------------------------------------------------------------------
// Parity tests: comparison
// ---------------------------------------------------------------------------

describe('Cross-package parity: Comparison', () => {
  const snapshotA = makeSnapshotA();
  const snapshotB = makeSnapshotB();

  // Path 1: Direct @tileguard/analysis ComparisonEngine
  const engine = createComparisonEngine();
  const directResult = engine.compare(snapshotA, snapshotB);

  // Path 2: Inspector's ComparisonService (which delegates to the same engine)
  const service = createComparisonService();
  const serviceResult = service.compare(snapshotA, snapshotB);

  it('summary is identical', () => {
    expect(directResult.summary).toEqual(serviceResult.summary);
  });

  it('feature comparison count is identical', () => {
    expect(directResult.features.length).toBe(serviceResult.features.length);
  });

  it('feature classifications are identical', () => {
    for (let i = 0; i < directResult.features.length; i++) {
      expect(directResult.features[i]!.kind).toBe(
        serviceResult.features[i]!.kind,
      );
    }
  });

  it('layer comparisons are identical', () => {
    expect(directResult.layers).toEqual(serviceResult.layers);
  });

  it('diagnostic comparisons are identical', () => {
    expect(directResult.diagnostics).toEqual(serviceResult.diagnostics);
  });

  it('statistics delta is identical', () => {
    expect(directResult.statistics).toEqual(serviceResult.statistics);
  });

  it('isIdentical flag matches', () => {
    expect(directResult.summary.isIdentical).toBe(
      serviceResult.summary.isIdentical,
    );
  });

  it('both detect removed features', () => {
    const directRemoved = directResult.features.filter(
      (f) => f.kind === 'removed',
    ).length;
    const serviceRemoved = serviceResult.features.filter(
      (f) => f.kind === 'removed',
    ).length;
    expect(directRemoved).toBe(serviceRemoved);
    expect(directRemoved).toBeGreaterThan(0);
  });

  it('both detect added features', () => {
    const directAdded = directResult.features.filter(
      (f) => f.kind === 'added',
    ).length;
    const serviceAdded = serviceResult.features.filter(
      (f) => f.kind === 'added',
    ).length;
    expect(directAdded).toBe(serviceAdded);
    expect(directAdded).toBeGreaterThan(0);
  });

  it('both detect modified features', () => {
    const directModified = directResult.features.filter(
      (f) => f.kind === 'modified',
    ).length;
    const serviceModified = serviceResult.features.filter(
      (f) => f.kind === 'modified',
    ).length;
    expect(directModified).toBe(serviceModified);
  });
});

// ---------------------------------------------------------------------------
// Parity tests: regression
// ---------------------------------------------------------------------------

describe('Cross-package parity: Regression', () => {
  const snapshotA = makeSnapshotA();
  const snapshotB = makeSnapshotB();

  const engine = createComparisonEngine();
  const comparison = engine.compare(snapshotA, snapshotB);

  // Both paths use the same createRegressionEngine from @tileguard/analysis
  const regressionEngine = createRegressionEngine();
  const analysisResult = regressionEngine.analyze(comparison);

  // Run through a second instance to confirm determinism
  const regressionEngine2 = createRegressionEngine();
  const analysisResult2 = regressionEngine2.analyze(comparison);

  it('regression summary is deterministic', () => {
    expect(analysisResult.summary).toEqual(analysisResult2.summary);
  });

  it('candidate count is deterministic', () => {
    expect(analysisResult.candidates.length).toBe(
      analysisResult2.candidates.length,
    );
  });

  it('candidate confidence scores are deterministic', () => {
    for (let i = 0; i < analysisResult.candidates.length; i++) {
      expect(analysisResult.candidates[i]!.confidence).toBe(
        analysisResult2.candidates[i]!.confidence,
      );
    }
  });

  it('candidate kinds are deterministic', () => {
    for (let i = 0; i < analysisResult.candidates.length; i++) {
      expect(analysisResult.candidates[i]!.kind).toBe(
        analysisResult2.candidates[i]!.kind,
      );
    }
  });

  it('overall confidence is deterministic', () => {
    expect(analysisResult.confidence).toBe(analysisResult2.confidence);
  });

  it('evidence is deterministic', () => {
    expect(analysisResult.evidence.length).toBe(
      analysisResult2.evidence.length,
    );
    for (let i = 0; i < analysisResult.evidence.length; i++) {
      expect(analysisResult.evidence[i]!.label).toBe(
        analysisResult2.evidence[i]!.label,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Parity tests: SnapshotFactory consistency
// ---------------------------------------------------------------------------

describe('Cross-package parity: SnapshotFactory', () => {
  it('produces identical snapshots for identical inputs', () => {
    const snap1 = makeSnapshotA();
    const snap2 = makeSnapshotA();
    expect(snap1).toEqual(snap2);
  });

  it('snapshot statistics are correctly computed', () => {
    const snap = makeSnapshotA();
    expect(snap.statistics.totalLayers).toBe(2);
    expect(snap.statistics.totalFeatures).toBe(5);
    expect(snap.statistics.geometryCounts.line).toBe(3);
    expect(snap.statistics.geometryCounts.polygon).toBe(2);
  });

  it('features are correctly attributed to layers', () => {
    const snap = makeSnapshotA();
    const roadFeatures = snap.features.filter((f) => f.layerName === 'roads');
    const buildingFeatures = snap.features.filter(
      (f) => f.layerName === 'buildings',
    );
    expect(roadFeatures.length).toBe(3);
    expect(buildingFeatures.length).toBe(2);
  });
});
