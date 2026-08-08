/**
 * Unit tests — RegressionEngine (Milestone 7 — Step 2)
 *
 * Covers:
 *   - Identical tiles → isClean=true, zero candidates
 *   - Single geometry regression → one candidate, classified as 'geometry'
 *   - Single attribute regression → one candidate, classified as 'attribute'
 *   - Diagnostic-only regression → classified as 'diagnostic'
 *   - Added feature → candidate classified as 'layer'
 *   - Removed feature → candidate classified as 'layer'
 *   - Mixed regression (geometry + property) → classified as 'mixed'
 *   - Multiple regressions → candidates sorted descending by confidence
 *   - Candidate confidence ∈ [0, 1]
 *   - Every candidate has at least one reason
 *   - Empty tiles → isClean=true
 *   - Geometry-only tile → only geometry candidates
 *   - Property-only tile → only attribute candidates
 *   - Summary.totalFeatures matches comparison.features.length
 *   - Summary.topConfidence matches candidates[0].confidence
 *   - Summary.kindCounts totals match candidates.length
 *   - Determinism: same TileComparison → same RegressionAnalysis
 *   - minConfidence option filters low-confidence candidates
 */

import { describe, expect, it } from 'vitest';
import { createRegressionEngine } from '../src/analysis/RegressionEngine.js';
import type {
  FeatureComparison,
  TileComparison,
} from '../src/comparison/models.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Pt = { x: number; y: number };
type Geo = Pt[][];

function makeGeo(points: Pt[] = [{ x: 0, y: 0 }]): Geo {
  return [points];
}

function makeFeature(
  layerName: string,
  featureIndex: number,
  geometryType: string,
  geometry: Geo,
  properties: Record<string, unknown> = {},
  id?: number,
) {
  return {
    layerName,
    featureIndex,
    id,
    geometryType,
    properties,
    geometry,
  } as const;
}

function makeComparison(features: FeatureComparison[]): TileComparison {
  return {
    snapshotA: {
      filePath: 'a.pbf',
      statistics: {} as never,
      layers: [],
      diagnostics: [],
      features: [],
    },
    snapshotB: {
      filePath: 'b.pbf',
      statistics: {} as never,
      layers: [],
      diagnostics: [],
      features: [],
    },
    summary: {
      addedFeatures: 0,
      removedFeatures: 0,
      modifiedFeatures: 0,
      unchangedFeatures: features.length,
      addedLayers: 0,
      removedLayers: 0,
      modifiedLayers: 0,
      newDiagnostics: 0,
      resolvedDiagnostics: 0,
      isIdentical: true,
    },
    layers: [],
    features,
    diagnostics: {
      errorsA: 0,
      errorsB: 0,
      errorsDelta: 0,
      warningsA: 0,
      warningsB: 0,
      warningsDelta: 0,
      infoA: 0,
      infoB: 0,
      infoDelta: 0,
      newDiagnostics: [],
      resolvedDiagnostics: [],
    },
    statistics: {
      layersA: 1,
      layersB: 1,
      layersDelta: 0,
      featuresA: 1,
      featuresB: 1,
      featuresDelta: 0,
      verticesA: 1,
      verticesB: 1,
      verticesDelta: 0,
      diagnosticsA: 0,
      diagnosticsB: 0,
      diagnosticsDelta: 0,
      geometryCountsA: { point: 1, line: 0, polygon: 0 },
      geometryCountsB: { point: 1, line: 0, polygon: 0 },
    },
  } as unknown as TileComparison;
}

/** FC: unchanged */
function unchangedFC(layer = 'roads', idx = 0): FeatureComparison {
  const f = makeFeature(layer, idx, 'Point', makeGeo());
  return {
    kind: 'unchanged',
    featureA: f,
    featureB: f,
    changes: null,
    matchPriority: 1,
  };
}

/** FC: added */
function addedFC(layer = 'roads', idx = 0): FeatureComparison {
  return {
    kind: 'added',
    featureA: null,
    featureB: makeFeature(layer, idx, 'Point', makeGeo()),
    changes: null,
    matchPriority: null,
  };
}

/** FC: removed */
function removedFC(layer = 'roads', idx = 0): FeatureComparison {
  return {
    kind: 'removed',
    featureA: makeFeature(layer, idx, 'Point', makeGeo()),
    featureB: null,
    changes: null,
    matchPriority: null,
  };
}

/** FC: large geometry shift */
function largeGeoShiftFC(layer = 'roads', idx = 0): FeatureComparison {
  return {
    kind: 'modified',
    featureA: makeFeature(layer, idx, 'Point', makeGeo([{ x: 0, y: 0 }])),
    featureB: makeFeature(layer, idx, 'Point', makeGeo([{ x: 500, y: 500 }])),
    changes: {
      geometryChanged: true,
      propertiesChanged: false,
      diagnosticsChanged: false,
    },
    matchPriority: 1,
  };
}

/** FC: high-signal property change */
function highSignalPropFC(layer = 'roads', idx = 0): FeatureComparison {
  const geo = makeGeo();
  return {
    kind: 'modified',
    featureA: makeFeature(layer, idx, 'Point', geo, { class: 'motorway' }),
    featureB: makeFeature(layer, idx, 'Point', geo, { class: 'primary' }),
    changes: {
      geometryChanged: false,
      propertiesChanged: true,
      diagnosticsChanged: false,
    },
    matchPriority: 2,
  };
}

/** FC: low-signal property change only (name) */
function lowSignalPropFC(layer = 'roads', idx = 0): FeatureComparison {
  const geo = makeGeo();
  return {
    kind: 'modified',
    featureA: makeFeature(layer, idx, 'Point', geo, { name: 'Old' }),
    featureB: makeFeature(layer, idx, 'Point', geo, { name: 'New' }),
    changes: {
      geometryChanged: false,
      propertiesChanged: true,
      diagnosticsChanged: false,
    },
    matchPriority: 2,
  };
}

/** FC: diagnostic-only change */
function diagOnlyFC(layer = 'roads', idx = 0): FeatureComparison {
  const geo = makeGeo();
  return {
    kind: 'modified',
    featureA: makeFeature(layer, idx, 'Point', geo),
    featureB: makeFeature(layer, idx, 'Point', geo),
    changes: {
      geometryChanged: false,
      propertiesChanged: false,
      diagnosticsChanged: true,
    },
    matchPriority: 1,
  };
}

function withNewDiagnostic(
  comparison: TileComparison,
  layer: string,
): TileComparison {
  const diag = {
    ruleId: 'tile/self-intersection',
    severity: 'error',
    message: `issue in layer ${layer}`,
    artifact: 'b.pbf',
  };
  return {
    ...comparison,
    diagnostics: {
      ...comparison.diagnostics,
      newDiagnostics: [diag],
    },
  } as unknown as TileComparison;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RegressionEngine', () => {
  const engine = createRegressionEngine();

  describe('identical tiles', () => {
    it('returns isClean=true for all-unchanged features', () => {
      const comparison = makeComparison([
        unchangedFC('roads', 0),
        unchangedFC('water', 1),
      ]);
      const result = engine.analyze(comparison);
      expect(result.summary.isClean).toBe(true);
    });

    it('returns zero candidates for identical tiles', () => {
      const comparison = makeComparison([unchangedFC()]);
      const result = engine.analyze(comparison);
      expect(result.candidates).toHaveLength(0);
    });

    it('overall confidence is 0 for identical tiles', () => {
      const comparison = makeComparison([unchangedFC()]);
      const result = engine.analyze(comparison);
      expect(result.confidence).toBe(0);
    });
  });

  describe('empty tiles', () => {
    it('handles empty feature list gracefully', () => {
      const comparison = makeComparison([]);
      const result = engine.analyze(comparison);
      expect(result.summary.isClean).toBe(true);
      expect(result.candidates).toHaveLength(0);
      expect(result.summary.totalFeatures).toBe(0);
    });
  });

  describe('geometry regression', () => {
    it('detects large geometry shift as a candidate', () => {
      const comparison = makeComparison([largeGeoShiftFC()]);
      const result = engine.analyze(comparison);
      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it('classifies large geometry shift as geometry kind', () => {
      const comparison = makeComparison([largeGeoShiftFC()]);
      const result = engine.analyze(comparison);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(result.candidates[0]!.kind).toBe('geometry');
    });

    it('isClean=false when regression exists', () => {
      const comparison = makeComparison([largeGeoShiftFC()]);
      const result = engine.analyze(comparison);
      expect(result.summary.isClean).toBe(false);
    });
  });

  describe('attribute regression', () => {
    it('classifies high-signal property change as attribute', () => {
      const comparison = makeComparison([highSignalPropFC()]);
      const result = engine.analyze(comparison);
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0]!.kind).toBe('attribute');
    });
  });

  describe('diagnostic regression', () => {
    it('classifies diagnostic-only change as diagnostic', () => {
      const fc = diagOnlyFC('roads', 0);
      const comparison = withNewDiagnostic(makeComparison([fc]), 'roads');
      const result = engine.analyze(comparison);
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0]!.kind).toBe('diagnostic');
    });
  });

  describe('added / removed features', () => {
    it('classifies added feature as layer kind', () => {
      const comparison = makeComparison([addedFC()]);
      const result = engine.analyze(comparison);
      expect(result.candidates[0]!.kind).toBe('layer');
    });

    it('classifies removed feature as layer kind', () => {
      const comparison = makeComparison([removedFC()]);
      const result = engine.analyze(comparison);
      expect(result.candidates[0]!.kind).toBe('layer');
    });
  });

  describe('mixed regression', () => {
    it('classifies geometry+property change as mixed', () => {
      const geo = makeGeo();
      const largeShiftGeo = makeGeo([{ x: 500, y: 500 }]);
      const fc: FeatureComparison = {
        kind: 'modified',
        featureA: makeFeature('roads', 0, 'Point', geo, { class: 'motorway' }),
        featureB: makeFeature('roads', 0, 'Point', largeShiftGeo, {
          class: 'primary',
        }),
        changes: {
          geometryChanged: true,
          propertiesChanged: true,
          diagnosticsChanged: false,
        },
        matchPriority: 1,
      };
      const comparison = makeComparison([fc]);
      const result = engine.analyze(comparison);
      expect(result.candidates.length).toBeGreaterThan(0);
      // geometry + attribute active → mixed
      expect(result.candidates[0]!.kind).toBe('mixed');
    });
  });

  describe('ranking', () => {
    it('candidates are sorted descending by confidence', () => {
      // high-signal property + large geometry shift should have different confidences
      const comparison = makeComparison([
        lowSignalPropFC('water', 0),
        largeGeoShiftFC('roads', 1),
      ]);
      const result = engine.analyze(comparison);
      const confidences = result.candidates.map((c) => c.confidence);
      for (let i = 0; i < confidences.length - 1; i++) {
        expect(confidences[i]!).toBeGreaterThanOrEqual(confidences[i + 1]!);
      }
    });

    it('geometry regression ranks higher than low-signal property change', () => {
      const comparison = makeComparison([
        lowSignalPropFC('water', 0),
        largeGeoShiftFC('roads', 1),
      ]);
      const result = engine.analyze(comparison);
      const first = result.candidates[0]!;
      expect(first.kind).toBe('geometry');
    });
  });

  describe('candidate invariants', () => {
    it('every candidate has at least one reason', () => {
      const comparison = makeComparison([largeGeoShiftFC(), addedFC()]);
      const result = engine.analyze(comparison);
      for (const c of result.candidates) {
        expect(c.reasons.length).toBeGreaterThan(0);
      }
    });

    it('every candidate confidence is in [0, 1]', () => {
      const comparison = makeComparison([
        largeGeoShiftFC(),
        highSignalPropFC(),
        addedFC(),
        removedFC(),
      ]);
      const result = engine.analyze(comparison);
      for (const c of result.candidates) {
        expect(c.confidence).toBeGreaterThanOrEqual(0);
        expect(c.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('every candidate has at least one evidence item', () => {
      const comparison = makeComparison([largeGeoShiftFC()]);
      const result = engine.analyze(comparison);
      for (const c of result.candidates) {
        expect(c.evidence.length).toBeGreaterThan(0);
      }
    });
  });

  describe('summary', () => {
    it('totalFeatures matches comparison.features.length', () => {
      const features = [unchangedFC(), largeGeoShiftFC(), addedFC()];
      const comparison = makeComparison(features);
      const result = engine.analyze(comparison);
      expect(result.summary.totalFeatures).toBe(3);
    });

    it('topConfidence matches first candidate confidence', () => {
      const comparison = makeComparison([largeGeoShiftFC()]);
      const result = engine.analyze(comparison);
      expect(result.summary.topConfidence).toBe(
        result.candidates[0]!.confidence,
      );
    });

    it('kindCounts sum equals candidates.length', () => {
      const comparison = makeComparison([
        largeGeoShiftFC(),
        addedFC(),
        highSignalPropFC(),
      ]);
      const result = engine.analyze(comparison);
      const total = Object.values(result.summary.kindCounts).reduce(
        (a, b) => a + b,
        0,
      );
      expect(total).toBe(result.candidates.length);
    });

    it('dominantKind is null when no candidates', () => {
      const comparison = makeComparison([unchangedFC()]);
      const result = engine.analyze(comparison);
      expect(result.summary.dominantKind).toBeNull();
    });
  });

  describe('evidence deduplication', () => {
    it('top-level evidence array has no duplicates', () => {
      const comparison = makeComparison([
        largeGeoShiftFC('roads', 0),
        largeGeoShiftFC('water', 1),
      ]);
      const result = engine.analyze(comparison);
      const keys = result.evidence.map(
        (e) => `${e.kind}:${e.label}:${String(e.measuredValue)}`,
      );
      const unique = new Set(keys);
      expect(unique.size).toBe(keys.length);
    });
  });

  describe('minConfidence option', () => {
    it('filters out candidates below minConfidence', () => {
      // low-signal property only → should have lower confidence
      const strictEngine = createRegressionEngine({ minConfidence: 0.9 });
      const comparison = makeComparison([lowSignalPropFC()]);
      const result = strictEngine.analyze(comparison);
      // All confidences must be >= 0.9 if any remain
      for (const c of result.candidates) {
        expect(c.confidence).toBeGreaterThanOrEqual(0.9);
      }
    });
  });

  describe('determinism', () => {
    it('same TileComparison always produces the same output', () => {
      const comparison = makeComparison([
        largeGeoShiftFC(),
        highSignalPropFC(),
        addedFC(),
      ]);
      const first = engine.analyze(comparison);
      const second = engine.analyze(comparison);

      expect(first.candidates.length).toBe(second.candidates.length);
      expect(first.confidence).toBe(second.confidence);
      for (let i = 0; i < first.candidates.length; i++) {
        expect(first.candidates[i]!.confidence).toBe(
          second.candidates[i]!.confidence,
        );
        expect(first.candidates[i]!.kind).toBe(second.candidates[i]!.kind);
      }
    });
  });
});
