/**
 * @tileguard/analysis — ComparisonEngine
 *
 * Pure comparison logic extracted from ComparisonService.
 * Takes two TileSnapshots and produces a TileComparison.
 * No InspectorStore dependency, no DOM, no UI.
 */

import type { Diagnostic } from '@tileguard/core';
import { createFeatureMatcher } from './FeatureMatcher.js';
import { createGeometryDiffer } from './GeometryDiffer.js';
import type {
  ComparisonSummary,
  DiagnosticComparison,
  FeatureComparison,
  FeatureSnapshot,
  LayerComparison,
  StatisticsDelta,
  TileComparison,
  TileSnapshot,
} from './models/comparison.js';
import { createPropertyDiffer } from './PropertyDiffer.js';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface ComparisonEngine {
  compare(snapshotA: TileSnapshot, snapshotB: TileSnapshot): TileComparison;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createComparisonEngine(): ComparisonEngine {
  return { compare };
}

// ---------------------------------------------------------------------------
// Compare implementation
// ---------------------------------------------------------------------------

function compare(
  snapshotA: TileSnapshot,
  snapshotB: TileSnapshot,
): TileComparison {
  const geomDiffer = createGeometryDiffer();
  const propDiffer = createPropertyDiffer();
  const matcher = createFeatureMatcher();

  // Feature matching
  const { comparisons: rawComparisons } = matcher.match(
    snapshotA.features,
    snapshotB.features,
  );

  // Augment modified comparisons with detailed geometry/property diffs
  const comparisons: FeatureComparison[] = rawComparisons.map((fc) => {
    if (
      fc.kind !== 'modified' ||
      fc.featureA === null ||
      fc.featureB === null
    ) {
      return fc;
    }

    const geoDiff = geomDiffer.diff(fc.featureA, fc.featureB);
    const propDiff = propDiffer.diff(fc.featureA, fc.featureB);

    return Object.freeze({
      ...fc,
      changes: Object.freeze({
        geometryChanged: geoDiff.changed,
        propertiesChanged: propDiff.changed,
        diagnosticsChanged: false,
      }),
    });
  });

  // Layer comparison
  const layerComparisons = compareLayers(snapshotA, snapshotB);

  // Diagnostic comparison
  const diagnosticComparison = compareDiagnostics(
    snapshotA.diagnostics,
    snapshotB.diagnostics,
  );

  // Statistics delta
  const statisticsDelta = computeStatisticsDelta(snapshotA, snapshotB);

  // Summary
  const summary = buildSummary(
    comparisons,
    layerComparisons,
    diagnosticComparison,
  );

  return Object.freeze({
    snapshotA,
    snapshotB,
    summary,
    layers: Object.freeze(layerComparisons),
    features: Object.freeze(comparisons),
    diagnostics: diagnosticComparison,
    statistics: statisticsDelta,
  });
}

// ---------------------------------------------------------------------------
// Layer comparison
// ---------------------------------------------------------------------------

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: multi-layer comparison algorithm with inherent branching
function compareLayers(
  snapshotA: TileSnapshot,
  snapshotB: TileSnapshot,
): LayerComparison[] {
  const layersA = new Map(snapshotA.layers.map((l) => [l.name, l]));
  const layersB = new Map(snapshotB.layers.map((l) => [l.name, l]));
  const allNames = new Set([...layersA.keys(), ...layersB.keys()]);

  const diagCountA = new Map<string, number>();
  const diagCountB = new Map<string, number>();
  for (const d of snapshotA.diagnostics) {
    const loc = d.location as { layer?: string } | undefined;
    if (loc?.layer) {
      diagCountA.set(loc.layer, (diagCountA.get(loc.layer) ?? 0) + 1);
    }
  }
  for (const d of snapshotB.diagnostics) {
    const loc = d.location as { layer?: string } | undefined;
    if (loc?.layer) {
      diagCountB.set(loc.layer, (diagCountB.get(loc.layer) ?? 0) + 1);
    }
  }

  const result: LayerComparison[] = [];

  for (const name of [...allNames].sort()) {
    const lA = layersA.get(name);
    const lB = layersB.get(name);

    if (lA && !lB) {
      result.push(
        Object.freeze({
          name,
          kind: 'removed' as const,
          featureCountA: lA.featureCount,
          featureCountB: 0,
          featureCountDelta: -lA.featureCount,
          diagnosticCountA: diagCountA.get(name) ?? 0,
          diagnosticCountB: 0,
          geometryCountsA: { ...lA.geometryCounts },
          geometryCountsB: { point: 0, line: 0, polygon: 0 },
        }),
      );
    } else if (!lA && lB) {
      result.push(
        Object.freeze({
          name,
          kind: 'added' as const,
          featureCountA: 0,
          featureCountB: lB.featureCount,
          featureCountDelta: lB.featureCount,
          diagnosticCountA: 0,
          diagnosticCountB: diagCountB.get(name) ?? 0,
          geometryCountsA: { point: 0, line: 0, polygon: 0 },
          geometryCountsB: { ...lB.geometryCounts },
        }),
      );
    } else if (lA && lB) {
      const featureDelta = lB.featureCount - lA.featureCount;
      const dA = diagCountA.get(name) ?? 0;
      const dB = diagCountB.get(name) ?? 0;
      const changed =
        featureDelta !== 0 ||
        dA !== dB ||
        lA.geometryCounts.point !== lB.geometryCounts.point ||
        lA.geometryCounts.line !== lB.geometryCounts.line ||
        lA.geometryCounts.polygon !== lB.geometryCounts.polygon;

      result.push(
        Object.freeze({
          name,
          kind: changed ? ('modified' as const) : ('unchanged' as const),
          featureCountA: lA.featureCount,
          featureCountB: lB.featureCount,
          featureCountDelta: featureDelta,
          diagnosticCountA: dA,
          diagnosticCountB: dB,
          geometryCountsA: { ...lA.geometryCounts },
          geometryCountsB: { ...lB.geometryCounts },
        }),
      );
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Diagnostic comparison
// ---------------------------------------------------------------------------

function diagnosticFingerprint(d: Diagnostic): string {
  try {
    return JSON.stringify({
      ruleId: d.ruleId,
      message: d.message,
      severity: d.severity,
      location: d.location,
    });
  } catch {
    return `${d.ruleId}:${d.message}:${d.severity}`;
  }
}

function compareDiagnostics(
  diagsA: readonly Diagnostic[],
  diagsB: readonly Diagnostic[],
): DiagnosticComparison {
  let errorsA = 0,
    errorsB = 0;
  let warningsA = 0,
    warningsB = 0;
  let infoA = 0,
    infoB = 0;

  for (const d of diagsA) {
    if (d.severity === 'error') errorsA++;
    else if (d.severity === 'warning') warningsA++;
    else infoA++;
  }
  for (const d of diagsB) {
    if (d.severity === 'error') errorsB++;
    else if (d.severity === 'warning') warningsB++;
    else infoB++;
  }

  const fpA = new Set(diagsA.map(diagnosticFingerprint));
  const fpB = new Set(diagsB.map(diagnosticFingerprint));

  const newDiagnostics = diagsB.filter(
    (d) => !fpA.has(diagnosticFingerprint(d)),
  );
  const resolvedDiagnostics = diagsA.filter(
    (d) => !fpB.has(diagnosticFingerprint(d)),
  );

  return Object.freeze({
    errorsA,
    errorsB,
    errorsDelta: errorsB - errorsA,
    warningsA,
    warningsB,
    warningsDelta: warningsB - warningsA,
    infoA,
    infoB,
    infoDelta: infoB - infoA,
    newDiagnostics: Object.freeze(newDiagnostics),
    resolvedDiagnostics: Object.freeze(resolvedDiagnostics),
  });
}

// ---------------------------------------------------------------------------
// Statistics delta
// ---------------------------------------------------------------------------

function countVerticesInFeatures(features: readonly FeatureSnapshot[]): number {
  let total = 0;
  for (const f of features) {
    for (const ring of f.geometry) {
      total += ring.length;
    }
  }
  return total;
}

function computeStatisticsDelta(
  snapshotA: TileSnapshot,
  snapshotB: TileSnapshot,
): StatisticsDelta {
  const sA = snapshotA.statistics;
  const sB = snapshotB.statistics;

  const verticesA = countVerticesInFeatures(snapshotA.features);
  const verticesB = countVerticesInFeatures(snapshotB.features);
  const totalDiagsA =
    sA.diagnostics.errors + sA.diagnostics.warnings + sA.diagnostics.info;
  const totalDiagsB =
    sB.diagnostics.errors + sB.diagnostics.warnings + sB.diagnostics.info;

  return Object.freeze({
    layersA: sA.totalLayers,
    layersB: sB.totalLayers,
    layersDelta: sB.totalLayers - sA.totalLayers,
    featuresA: sA.totalFeatures,
    featuresB: sB.totalFeatures,
    featuresDelta: sB.totalFeatures - sA.totalFeatures,
    verticesA,
    verticesB,
    verticesDelta: verticesB - verticesA,
    diagnosticsA: totalDiagsA,
    diagnosticsB: totalDiagsB,
    diagnosticsDelta: totalDiagsB - totalDiagsA,
    geometryCountsA: { ...sA.geometryCounts },
    geometryCountsB: { ...sB.geometryCounts },
  });
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function buildSummary(
  comparisons: readonly FeatureComparison[],
  layers: readonly LayerComparison[],
  diagnostics: DiagnosticComparison,
): ComparisonSummary {
  let added = 0,
    removed = 0,
    modified = 0,
    unchanged = 0;

  for (const fc of comparisons) {
    if (fc.kind === 'added') added++;
    else if (fc.kind === 'removed') removed++;
    else if (fc.kind === 'modified') modified++;
    else unchanged++;
  }

  const addedLayers = layers.filter((l) => l.kind === 'added').length;
  const removedLayers = layers.filter((l) => l.kind === 'removed').length;
  const modifiedLayers = layers.filter((l) => l.kind === 'modified').length;

  const isIdentical =
    added === 0 &&
    removed === 0 &&
    modified === 0 &&
    addedLayers === 0 &&
    removedLayers === 0 &&
    diagnostics.newDiagnostics.length === 0 &&
    diagnostics.resolvedDiagnostics.length === 0;

  return Object.freeze({
    addedFeatures: added,
    removedFeatures: removed,
    modifiedFeatures: modified,
    unchangedFeatures: unchanged,
    addedLayers,
    removedLayers,
    modifiedLayers,
    newDiagnostics: diagnostics.newDiagnostics.length,
    resolvedDiagnostics: diagnostics.resolvedDiagnostics.length,
    isIdentical,
  });
}
