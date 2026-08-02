/**
 * @tileguard/inspector — ComparisonService (Milestone 7 — Step 1)
 *
 * Orchestrates the full tile comparison pipeline:
 *
 *   1. createSnapshot(store)  — extract an immutable TileSnapshot from a loaded
 *                               InspectorStore state.
 *
 *   2. compare(snapshotA, snapshotB)  — run GeometryDiffer, PropertyDiffer, and
 *                               FeatureMatcher to produce a complete TileComparison.
 *
 * The service has no side-effects: it never mutates the store and never
 * triggers any renders. Every result it returns is frozen.
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs.
 */

import type { Diagnostic } from '@tileguard/core';
import type { InspectorStore } from '../store/inspector-store.js';
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
} from './models.js';
import { createPropertyDiffer } from './PropertyDiffer.js';

// ---------------------------------------------------------------------------
// ComparisonService Interface
// ---------------------------------------------------------------------------

export interface ComparisonService {
  /**
   * Capture an immutable snapshot of the currently loaded tile.
   * Returns null if the store is not in the 'loaded' state.
   */
  createSnapshot(store: InspectorStore): TileSnapshot | null;

  /**
   * Compare two tile snapshots and return a complete TileComparison result.
   * This is deterministic: same inputs always produce the same output.
   */
  compare(snapshotA: TileSnapshot, snapshotB: TileSnapshot): TileComparison;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type RingArray = readonly (readonly {
  readonly x: number;
  readonly y: number;
}[])[];

// ---------------------------------------------------------------------------
// Vertex counting helper (needed for StatisticsDelta)
// ---------------------------------------------------------------------------

function countVerticesInFeatures(features: readonly FeatureSnapshot[]): number {
  let total = 0;
  for (const f of features) {
    const geo = f.geometry as RingArray;
    for (const ring of geo) {
      total += ring.length;
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Diagnostic fingerprint (for new/resolved detection)
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

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class ComparisonServiceImpl implements ComparisonService {
  createSnapshot(store: InspectorStore): TileSnapshot | null {
    const { lifecycle } = store;
    if (lifecycle.status !== 'loaded') return null;

    const { artifact, diagnostics, filePath } = lifecycle;

    // Build LayerSnapshots
    const layerSnapshots = Object.entries(artifact.content.layers).map(
      ([, layer]) => {
        const typedLayer = layer as unknown as {
          name: string;
          extent: number;
          features: ReadonlyArray<{ geometryType: string }>;
        };
        const geomCounts = { point: 0, line: 0, polygon: 0 };
        for (const f of typedLayer.features) {
          const t = f.geometryType.toLowerCase();
          if (t === 'point' || t.includes('point')) geomCounts.point++;
          else if (t === 'linestring' || t.includes('line')) geomCounts.line++;
          else geomCounts.polygon++;
        }
        return Object.freeze({
          name: typedLayer.name,
          featureCount: typedLayer.features.length,
          geometryCounts: Object.freeze({ ...geomCounts }),
          extent: typedLayer.extent,
        });
      },
    );

    // Build FeatureSnapshots
    const featureSnapshots: FeatureSnapshot[] = [];
    const allLayers = artifact.content.layers as unknown as Record<
      string,
      {
        name: string;
        extent: number;
        features: Array<{
          id?: number | string;
          geometryType: string;
          properties: Record<string, unknown>;
          geometry: unknown;
        }>;
      }
    >;

    for (const [layerName, layer] of Object.entries(allLayers)) {
      for (let i = 0; i < layer.features.length; i++) {
        const f = layer.features[i]!;
        featureSnapshots.push(
          Object.freeze({
            layerName,
            featureIndex: i,
            id: f.id,
            geometryType: f.geometryType,
            properties: Object.freeze(f.properties as Record<string, unknown>),
            geometry: Object.freeze(
              (f.geometry as RingArray).map((ring) =>
                Object.freeze(
                  ring.map((pt) => Object.freeze({ x: pt.x, y: pt.y })),
                ),
              ),
            ),
          }),
        );
      }
    }

    // Build TileStatistics for the snapshot
    const totalFeatures = featureSnapshots.length;
    let totalPoint = 0;
    let totalLine = 0;
    let totalPolygon = 0;
    let diagErrors = 0;
    let diagWarnings = 0;
    let diagInfo = 0;

    for (const ls of layerSnapshots) {
      totalPoint += ls.geometryCounts.point;
      totalLine += ls.geometryCounts.line;
      totalPolygon += ls.geometryCounts.polygon;
    }

    const diagsByLayer = new Map<string, number>();
    for (const d of diagnostics) {
      const loc = d.location as { layer?: string } | undefined;
      if (loc?.layer) {
        diagsByLayer.set(loc.layer, (diagsByLayer.get(loc.layer) ?? 0) + 1);
      }
      if (d.severity === 'error') diagErrors++;
      else if (d.severity === 'warning') diagWarnings++;
      else diagInfo++;
    }

    const statistics = Object.freeze({
      totalLayers: layerSnapshots.length,
      totalFeatures,
      geometryCounts: Object.freeze({
        point: totalPoint,
        line: totalLine,
        polygon: totalPolygon,
      }),
      diagnostics: Object.freeze({
        errors: diagErrors,
        warnings: diagWarnings,
        info: diagInfo,
      }),
      layers: Object.freeze(
        layerSnapshots.map((ls) =>
          Object.freeze({
            name: ls.name,
            featureCount: ls.featureCount,
            geometryCounts: ls.geometryCounts,
            diagnosticCount: diagsByLayer.get(ls.name) ?? 0,
          }),
        ),
      ),
    });

    return Object.freeze({
      filePath,
      statistics,
      layers: Object.freeze(layerSnapshots),
      diagnostics: Object.freeze([...diagnostics]),
      features: Object.freeze(featureSnapshots),
    });
  }

  compare(snapshotA: TileSnapshot, snapshotB: TileSnapshot): TileComparison {
    const geomDiffer = createGeometryDiffer();
    const propDiffer = createPropertyDiffer();
    const matcher = createFeatureMatcher();

    // ── Feature matching ──────────────────────────────────────────────────
    const { comparisons: rawComparisons } = matcher.match(
      snapshotA.features,
      snapshotB.features,
    );

    // Augment modified comparisons with detailed geometry/property diffs
    // (FeatureMatcher does not call GeometryDiffer/PropertyDiffer internally)
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
          // Per-feature diagnostic correlation is not implemented in Step 1.
          // Tile-level diagnostic comparison is available via TileComparison.diagnostics.
          diagnosticsChanged: false,
        }),
      });
    });

    // ── Layer comparison ──────────────────────────────────────────────────
    const layerComparisons = this._compareLayers(snapshotA, snapshotB);

    // ── Diagnostic comparison ─────────────────────────────────────────────
    const diagnosticComparison = this._compareDiagnostics(
      snapshotA.diagnostics,
      snapshotB.diagnostics,
    );

    // ── Statistics delta ──────────────────────────────────────────────────
    const statisticsDelta = this._computeStatisticsDelta(snapshotA, snapshotB);

    // ── Summary ───────────────────────────────────────────────────────────
    const summary = this._buildSummary(
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
  // Private helpers
  // ---------------------------------------------------------------------------

  private _compareLayers(
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

  private _compareDiagnostics(
    diagsA: readonly Diagnostic[],
    diagsB: readonly Diagnostic[],
  ): DiagnosticComparison {
    let errorsA = 0;
    let errorsB = 0;
    let warningsA = 0;
    let warningsB = 0;
    let infoA = 0;
    let infoB = 0;

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

  private _computeStatisticsDelta(
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

  private _buildSummary(
    comparisons: readonly FeatureComparison[],
    layers: readonly LayerComparison[],
    diagnostics: DiagnosticComparison,
  ): ComparisonSummary {
    let added = 0;
    let removed = 0;
    let modified = 0;
    let unchanged = 0;

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
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a ComparisonService instance.
 *
 * @example
 *   const service = createComparisonService();
 *   const snapshotA = service.createSnapshot(storeA);
 *   const snapshotB = service.createSnapshot(storeB);
 *   if (snapshotA && snapshotB) {
 *     const comparison = service.compare(snapshotA, snapshotB);
 *     console.log(comparison.summary);
 *   }
 */
export function createComparisonService(): ComparisonService {
  return new ComparisonServiceImpl();
}
