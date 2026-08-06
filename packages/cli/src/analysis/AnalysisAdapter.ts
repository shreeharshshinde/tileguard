/**
 * @tileguard/cli — Analysis Adapter
 *
 * Thin orchestration layer that:
 *   1. Loads tile snapshots from .pbf files
 *   2. Delegates comparison to @tileguard/analysis ComparisonEngine
 *   3. Delegates regression to @tileguard/analysis RegressionEngine
 *   4. Adapts results into @tileguard/reporters input shapes
 *
 * Zero duplicated algorithms — all comparison/regression logic lives in
 * @tileguard/analysis (the single source of truth).
 */

import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { basename } from 'node:path';
import { createEngine } from '@tileguard/core';
import type { Diagnostic } from '@tileguard/core';
import { decodeMvt } from '@tileguard/tile-rules';
import type { Point } from '@tileguard/tile-rules';
import {
  createComparisonEngine,
  createRegressionEngine,
  createSnapshotFactory,
  type RegressionAnalysis,
  type TileComparison,
  type TileSnapshot,
} from '@tileguard/analysis';
import type {
  ComparisonInput,
  RegressionCandidateInput,
  RegressionInput,
} from '@tileguard/reporters';

// ---------------------------------------------------------------------------
// Re-export shared types for CLI consumers
// ---------------------------------------------------------------------------

export type { TileSnapshot, TileComparison, RegressionAnalysis };

// ---------------------------------------------------------------------------
// Snapshot model (slim CLI-specific view for stats/output formatting)
// ---------------------------------------------------------------------------

export type CliTileSnapshot = TileSnapshot;

export interface CliTileStats {
  readonly layerCount: number;
  readonly featureCount: number;
  readonly vertexCount: number;
  readonly diagnosticCount: number;
}

// ---------------------------------------------------------------------------
// Comparison Result (wraps TileComparison + report input)
// ---------------------------------------------------------------------------

export interface CliComparisonResult {
  readonly comparison: TileComparison;
  readonly isIdentical: boolean;
  readonly features: { added: number; removed: number; modified: number; unchanged: number };
  readonly layers: { added: number; removed: number; modified: number };
  readonly asReportInput: ComparisonInput;
}

// ---------------------------------------------------------------------------
// Regression Result (wraps RegressionAnalysis + report input)
// ---------------------------------------------------------------------------

export interface CliRegressionResult {
  readonly analysis: RegressionAnalysis;
  readonly isClean: boolean;
  readonly totalCandidates: number;
  readonly overallConfidence: number;
  readonly dominantKind: string | null;
  readonly candidates: readonly {
    readonly layerName: string;
    readonly featureId: number | string | undefined;
    readonly kind: string;
    readonly confidence: number;
    readonly reason: string;
    readonly evidence: readonly string[];
  }[];
  readonly asReportInput: RegressionInput;
}

// ---------------------------------------------------------------------------
// Analysis options
// ---------------------------------------------------------------------------

export interface AnalysisOptions {
  readonly stableProperties?: readonly string[];
  readonly minConfidence?: number;
}

// ---------------------------------------------------------------------------
// 1. Load a tile snapshot
// ---------------------------------------------------------------------------

export async function loadTileSnapshot(filePath: string): Promise<TileSnapshot> {
  const buffer = readFileSync(filePath);
  const rawBytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const gzipped = rawBytes.length >= 2 && rawBytes[0] === 0x1f && rawBytes[1] === 0x8b;
  const bytes = gzipped ? gunzipSync(rawBytes) : rawBytes;
  const tile = decodeMvt(bytes);

  // Run diagnostics via the check engine
  const engine = createEngine({});
  const result = await engine.run([filePath]);

  // Convert tile layers to the RawLayerData format expected by SnapshotFactory
  const factory = createSnapshotFactory();
  const layers = Object.values(tile.layers).map((layer) => ({
    name: layer.name,
    extent: layer.extent,
    features: layer.features.map((f) => ({
      ...(f.id !== undefined ? { id: f.id } : {}),
      geometryType: f.geometryType,
      properties: f.properties as Record<string, unknown>,
      geometry: normalizeGeometry(f.geometry, f.type),
    })),
  }));

  return factory.createSnapshot(filePath, layers, result.diagnostics);
}

/** Get simple stats from a snapshot. */
export function getSnapshotStats(snapshot: TileSnapshot): CliTileStats {
  let vertexCount = 0;
  for (const f of snapshot.features) {
    for (const ring of f.geometry) {
      vertexCount += ring.length;
    }
  }
  return {
    layerCount: snapshot.statistics.totalLayers,
    featureCount: snapshot.statistics.totalFeatures,
    vertexCount,
    diagnosticCount: snapshot.diagnostics.length,
  };
}

// ---------------------------------------------------------------------------
// 2. Compare two snapshots
// ---------------------------------------------------------------------------

export function compareTiles(
  snapshotA: TileSnapshot,
  snapshotB: TileSnapshot,
  _options: AnalysisOptions = {},
): CliComparisonResult {
  const engine = createComparisonEngine();
  const comparison = engine.compare(snapshotA, snapshotB);

  const { summary, statistics, diagnostics } = comparison;

  const asReportInput: ComparisonInput = {
    sourceTile: basename(snapshotA.filePath),
    targetTile: basename(snapshotB.filePath),
    isIdentical: summary.isIdentical,
    features: {
      added: summary.addedFeatures,
      removed: summary.removedFeatures,
      modified: summary.modifiedFeatures,
      unchanged: summary.unchangedFeatures,
    },
    layers: {
      added: summary.addedLayers,
      removed: summary.removedLayers,
      modified: summary.modifiedLayers,
    },
    diagnosticsA: {
      errors: diagnostics.errorsA,
      warnings: diagnostics.warningsA,
      info: diagnostics.infoA,
    },
    diagnosticsB: {
      errors: diagnostics.errorsB,
      warnings: diagnostics.warningsB,
      info: diagnostics.infoB,
    },
    newDiagnostics: diagnostics.newDiagnostics.map((d) => ({
      ruleId: d.ruleId,
      severity: d.severity,
      message: d.message,
      ...(d.location?.layer ? { layer: d.location.layer } : {}),
    })),
    resolvedDiagnostics: diagnostics.resolvedDiagnostics.map((d) => ({
      ruleId: d.ruleId,
      severity: d.severity,
      message: d.message,
      ...(d.location?.layer ? { layer: d.location.layer } : {}),
    })),
    stats: {
      layersA: statistics.layersA,
      layersB: statistics.layersB,
      featuresA: statistics.featuresA,
      featuresB: statistics.featuresB,
      verticesA: statistics.verticesA,
      verticesB: statistics.verticesB,
      diagnosticsA: statistics.diagnosticsA,
      diagnosticsB: statistics.diagnosticsB,
    },
  };

  return {
    comparison,
    isIdentical: summary.isIdentical,
    features: asReportInput.features,
    layers: asReportInput.layers,
    asReportInput,
  };
}

// ---------------------------------------------------------------------------
// 3. Regression analysis
// ---------------------------------------------------------------------------

export function analyzeRegression(
  comparisonResult: CliComparisonResult,
  _options: AnalysisOptions = {},
): CliRegressionResult {
  const engine = createRegressionEngine();
  const analysis = engine.analyze(comparisonResult.comparison);

  const { summary, candidates, confidence } = analysis;

  const asReportInput: RegressionInput = {
    isClean: summary.isClean,
    totalFeatures: summary.totalFeatures,
    totalCandidates: summary.totalCandidates,
    overallConfidence: confidence,
    dominantKind: summary.dominantKind,
    candidates: candidates.map((c): RegressionCandidateInput => ({
      layerName: c.feature.featureA?.layerName ?? c.feature.featureB?.layerName ?? 'unknown',
      featureId: c.feature.featureA?.id ?? c.feature.featureB?.id,
      confidence: c.confidence,
      kind: c.kind,
      topReason: c.reasons[0]?.description ?? 'Feature changed',
      evidenceLabels: c.evidence.map((e) => e.label),
      timelineLabels: c.timeline.map((t) => t.label),
      recommendations: c.recommendations.map((r) => r.action),
    })),
  };

  return {
    analysis,
    isClean: summary.isClean,
    totalCandidates: summary.totalCandidates,
    overallConfidence: confidence,
    dominantKind: summary.dominantKind,
    candidates: candidates.map((c) => ({
      layerName: c.feature.featureA?.layerName ?? c.feature.featureB?.layerName ?? 'unknown',
      featureId: c.feature.featureA?.id ?? c.feature.featureB?.id,
      kind: c.kind,
      confidence: c.confidence,
      reason: c.reasons[0]?.description ?? 'Feature changed',
      evidence: c.evidence.map((e) => e.label),
    })),
    asReportInput,
  };
}

// ---------------------------------------------------------------------------
// Geometry normalisation helper
// ---------------------------------------------------------------------------

/**
 * Normalize MVT geometry to the format expected by SnapshotFactory:
 * readonly (readonly { x, y }[])[]
 */
function normalizeGeometry(
  geometry: readonly Point[] | readonly (readonly Point[])[],
  type: number,
): readonly (readonly { x: number; y: number }[])[] {
  if (geometry.length === 0) return [];

  // Type 1 = Point: geometry is Point[] (flat array of points)
  if (type === 1) {
    const points = geometry as readonly Point[];
    return [points.map((p) => ({ x: p.x, y: p.y }))];
  }

  // Type 2/3 = LineString/Polygon: geometry is Point[][] (array of rings/lines)
  const first = geometry[0];
  if (first && 'x' in first && 'y' in first) {
    // It's already a flat Point[] — wrap in one ring
    return [(geometry as readonly Point[]).map((p) => ({ x: p.x, y: p.y }))];
  }

  // Nested: Point[][]
  return (geometry as readonly (readonly Point[])[]).map((ring) =>
    ring.map((p) => ({ x: p.x, y: p.y })),
  );
}
