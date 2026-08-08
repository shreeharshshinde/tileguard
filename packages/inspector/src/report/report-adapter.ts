/**
 * @tileguard/inspector — Report Adapter (Milestone 7 — Step 3)
 *
 * Maps inspector's TileComparison + RegressionAnalysis to the slim
 * ComparisonInput + RegressionInput shapes expected by @tileguard/reporters
 * ReportEngine.
 *
 * Keeps the reporters package free of any inspector dependency.
 * Boundary: imports only from comparison/models and analysis/models/regression.
 */

import type { ComparisonInput, RegressionInput } from '@tileguard/reporters';
import type { RegressionAnalysis } from '../analysis/models/regression.js';
import type { TileComparison } from '../comparison/models.js';

export interface ReportInputs {
  readonly comparisonInput: ComparisonInput;
  readonly regressionInput: RegressionInput;
}

export function buildReportInputs(
  comparison: TileComparison,
  regression: RegressionAnalysis,
): ReportInputs {
  const { summary, diagnostics, statistics, features } = comparison;

  const comparisonInput: ComparisonInput = {
    sourceTile: comparison.snapshotA.filePath,
    targetTile: comparison.snapshotB.filePath,
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
      severity: d.severity as 'error' | 'warning' | 'info',
      message: d.message,
    })),
    resolvedDiagnostics: diagnostics.resolvedDiagnostics.map((d) => ({
      ruleId: d.ruleId,
      severity: d.severity as 'error' | 'warning' | 'info',
      message: d.message,
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

  const regressionInput: RegressionInput = {
    isClean: regression.summary.isClean,
    totalFeatures: regression.summary.totalFeatures,
    totalCandidates: regression.summary.totalCandidates,
    overallConfidence: regression.confidence,
    dominantKind: regression.summary.dominantKind,
    candidates: regression.candidates.map((c) => ({
      layerName:
        c.feature.featureA?.layerName ??
        c.feature.featureB?.layerName ??
        'unknown',
      featureId: c.feature.featureA?.id ?? c.feature.featureB?.id,
      confidence: c.confidence,
      kind: c.kind,
      topReason: c.reasons[0]?.description ?? '',
      evidenceLabels: c.evidence.map((e) => e.label),
      timelineLabels: c.timeline.map(
        (t) => t.label + (t.detail ? ` (${t.detail})` : ''),
      ),
      recommendations: c.recommendations.map((r) => r.action),
    })),
  };

  return { comparisonInput, regressionInput };
}
