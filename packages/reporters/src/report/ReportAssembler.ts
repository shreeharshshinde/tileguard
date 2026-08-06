/**
 * @tileguard/reporters — ReportAssembler (Milestone 7.3 — Engineering Report UX)
 *
 * Builds all new UX-oriented sections of the EngineeringReport from the raw
 * ComparisonInput and RegressionInput supplied by the caller.
 *
 * Section builders:
 *   buildExecutiveSummary   — status card + quick metrics
 *   buildKeyFindings        — top 5–7 auto-derived findings
 *   buildLayerImpact        — per-layer change table
 *   buildRegressionHighlights — top-N candidates + remaining for appendix
 *   buildDiagnosticsSummary — new/resolved/persistent + top-rules
 *   buildStatisticsDashboard — before/after/delta table
 *   buildPrioritizedRecs    — evidence-linked prioritised recommendations
 *   buildAppendix           — full detail deferred here
 *
 * Pure functions — no side effects, no I/O, deterministic.
 */

import type {
  AppendixFeatureGroup,
  ComparisonInput,
  DiagnosticsSummarySection,
  ExecutiveSummary,
  FindingSeverity,
  KeyFinding,
  LayerImpactEntry,
  LayerStatInput,
  NewDiagnosticEntry,
  PrioritizedRecommendation,
  RegressionCandidateInput,
  RegressionHighlight,
  RegressionHighlightSection,
  RegressionInput,
  RegressionRisk,
  ReportAppendix,
  ReportStatus,
  StatisticsDashboard,
  TopDiagnosticRule,
} from './models/EngineeringReport.js';

/** How many regression candidates appear inline before the appendix. */
const TOP_CANDIDATES_LIMIT = 10;

// ---------------------------------------------------------------------------
// Executive Summary
// ---------------------------------------------------------------------------

export function buildExecutiveSummary(
  comparison: ComparisonInput,
  regression: RegressionInput,
  durationMs: number,
  generatedAt: string,
): ExecutiveSummary {
  const status = deriveStatus(comparison, regression);
  const regressionRisk = deriveRisk(regression);

  return {
    status,
    regressionRisk,
    durationMs,
    sourceTile: comparison.sourceTile,
    targetTile: comparison.targetTile,
    generatedAt,
    metrics: {
      layersChanged: comparison.layers.added + comparison.layers.removed + comparison.layers.modified,
      featuresAdded: comparison.features.added,
      featuresModified: comparison.features.modified,
      featuresRemoved: comparison.features.removed,
      regressionCandidates: regression.totalCandidates,
      newDiagnostics: comparison.newDiagnostics.length,
      overallConfidencePct: regression.totalCandidates > 0
        ? Math.round(regression.overallConfidence * 100)
        : 0,
    },
  };
}

function deriveStatus(c: ComparisonInput, r: RegressionInput): ReportStatus {
  if (c.isIdentical) return 'identical';
  if (r.totalCandidates > 0) return 'regressions-found';
  if (!c.isIdentical) return 'changes-detected';
  return 'clean';
}

function deriveRisk(r: RegressionInput): RegressionRisk {
  if (r.totalCandidates === 0) return 'none';
  const pct = r.overallConfidence * 100;
  if (pct >= 85) return 'critical';
  if (pct >= 70) return 'high';
  if (pct >= 50) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Key Findings
// ---------------------------------------------------------------------------

export function buildKeyFindings(
  comparison: ComparisonInput,
  regression: RegressionInput,
): KeyFinding[] {
  const findings: KeyFinding[] = [];

  // Finding: large feature additions
  const addedTotal = comparison.features.added;
  if (addedTotal > 100) {
    findings.push({
      rank: findings.length + 1,
      severity: 'info',
      title: `Large increase in features (+${addedTotal.toLocaleString()})`,
      description: `${addedTotal.toLocaleString()} features were added. Verify this is expected.`,
      references: [],
    });
  } else if (addedTotal > 0) {
    findings.push({
      rank: findings.length + 1,
      severity: 'info',
      title: `${addedTotal} feature(s) added`,
      description: `${addedTotal} new feature(s) introduced in this build.`,
      references: [],
    });
  }

  // Finding: feature removals
  if (comparison.features.removed > 0) {
    findings.push({
      rank: findings.length + 1,
      severity: comparison.features.removed > 10 ? 'high' : 'medium',
      title: `${comparison.features.removed} feature(s) removed`,
      description: `${comparison.features.removed} feature(s) are no longer present in the target tile.`,
      references: [],
    });
  }

  // Finding: layer count change
  const layerDelta = comparison.stats.layersB - comparison.stats.layersA;
  if (layerDelta !== 0) {
    findings.push({
      rank: findings.length + 1,
      severity: 'medium',
      title: `Layer count changed: ${comparison.stats.layersA} → ${comparison.stats.layersB} (${layerDelta > 0 ? '+' : ''}${layerDelta})`,
      description: `${Math.abs(layerDelta)} layer(s) were ${layerDelta > 0 ? 'added' : 'removed'}.`,
      references: [],
    });
  }

  // Finding: top regression candidate
  if (regression.candidates.length > 0) {
    const top = regression.candidates[0]!;
    const pct = Math.round(top.confidence * 100);
    const sev: FindingSeverity = pct >= 80 ? 'critical' : pct >= 60 ? 'high' : 'medium';
    findings.push({
      rank: findings.length + 1,
      severity: sev,
      title: `${top.layerName} geometry/data regression (${pct}% confidence)`,
      description: top.topReason,
      references: [top.layerName],
    });
  }

  // Finding: modified features with geometry shift
  if (comparison.features.modified > 0) {
    const topKind = regression.dominantKind;
    const desc = topKind
      ? `${comparison.features.modified} modified feature(s), dominant pattern: ${topKind}`
      : `${comparison.features.modified} modified feature(s) detected`;
    findings.push({
      rank: findings.length + 1,
      severity: comparison.features.modified > 20 ? 'high' : 'medium',
      title: `${comparison.features.modified} feature(s) modified`,
      description: desc,
      references: [],
    });
  }

  // Finding: new diagnostics
  if (comparison.newDiagnostics.length > 0) {
    const hasErrors = comparison.newDiagnostics.some(d => d.severity === 'error');
    findings.push({
      rank: findings.length + 1,
      severity: hasErrors ? 'critical' : 'high',
      title: `${comparison.newDiagnostics.length} new diagnostic(s) introduced`,
      description: comparison.newDiagnostics
        .slice(0, 3)
        .map(d => `${d.ruleId}: ${d.message}`)
        .join('; '),
      references: comparison.newDiagnostics.map(d => d.ruleId),
    });
  }

  // Finding: resolved diagnostics (positive)
  if (comparison.resolvedDiagnostics.length > 0) {
    findings.push({
      rank: findings.length + 1,
      severity: 'info',
      title: `${comparison.resolvedDiagnostics.length} diagnostic(s) resolved`,
      description: `Previously flagged issues are no longer present in the target tile.`,
      references: [],
    });
  }

  // Renumber and cap at 7
  return findings.slice(0, 7).map((f, i) => ({ ...f, rank: i + 1 }));
}

// ---------------------------------------------------------------------------
// Layer Impact
// ---------------------------------------------------------------------------

export function buildLayerImpact(
  comparison: ComparisonInput,
  regression: RegressionInput,
): LayerImpactEntry[] {
  // Prefer explicit per-layer data from the caller
  if (comparison.layerStats && comparison.layerStats.length > 0) {
    return comparison.layerStats.map(ls => ({
      layerName: ls.layerName,
      added: ls.added,
      modified: ls.modified,
      removed: ls.removed,
      unchanged: ls.unchanged,
      topExamples: ls.topExamples ?? [],
      netChange: ls.added - ls.removed,
    }));
  }

  // Fallback: synthesise from regression candidates when no per-layer data
  const layerMap = new Map<string, LayerImpactEntry>();

  for (const c of regression.candidates) {
    const existing = layerMap.get(c.layerName);
    if (existing) {
      layerMap.set(c.layerName, {
        ...existing,
        modified: existing.modified + 1,
        netChange: existing.netChange,
        topExamples: existing.topExamples.length < 5
          ? [...existing.topExamples, c.featureId !== undefined ? String(c.featureId) : '']
          : existing.topExamples,
      });
    } else {
      layerMap.set(c.layerName, {
        layerName: c.layerName,
        added: 0,
        modified: 1,
        removed: 0,
        unchanged: 0,
        topExamples: c.featureId !== undefined ? [String(c.featureId)] : [],
        netChange: 0,
      });
    }
  }

  // If still empty, create a single aggregate entry
  if (layerMap.size === 0) {
    return [{
      layerName: '(all layers)',
      added: comparison.features.added,
      modified: comparison.features.modified,
      removed: comparison.features.removed,
      unchanged: comparison.features.unchanged,
      topExamples: [],
      netChange: comparison.features.added - comparison.features.removed,
    }];
  }

  return [...layerMap.values()].sort((a, b) =>
    (b.modified + b.added + b.removed) - (a.modified + a.added + a.removed),
  );
}

// ---------------------------------------------------------------------------
// Regression Highlights
// ---------------------------------------------------------------------------

export function buildRegressionHighlights(regression: RegressionInput): RegressionHighlightSection {
  const top = regression.candidates.slice(0, TOP_CANDIDATES_LIMIT);
  const remaining = regression.candidates.slice(TOP_CANDIDATES_LIMIT);

  const topCandidates: RegressionHighlight[] = top.map((c, i) => ({
    rank: i + 1,
    layerName: c.layerName,
    featureId: c.featureId,
    kind: c.kind,
    confidencePct: Math.round(c.confidence * 100),
    topReason: c.topReason,
    evidenceLabels: c.evidenceLabels,
  }));

  return {
    topCandidates,
    remainingCandidates: remaining,
    isClean: regression.isClean,
    totalCandidates: regression.totalCandidates,
    overallConfidencePct: regression.totalCandidates > 0
      ? Math.round(regression.overallConfidence * 100)
      : 0,
    dominantKind: regression.dominantKind,
  };
}

// ---------------------------------------------------------------------------
// Diagnostics Summary
// ---------------------------------------------------------------------------

export function buildDiagnosticsSummary(comparison: ComparisonInput): DiagnosticsSummarySection {
  const totalA = comparison.diagnosticsA.errors + comparison.diagnosticsA.warnings + comparison.diagnosticsA.info;
  const totalB = comparison.diagnosticsB.errors + comparison.diagnosticsB.warnings + comparison.diagnosticsB.info;

  // Persistent = minimum overlap (conservative estimate)
  const persistentCount = Math.max(0, Math.min(totalA, totalB) - comparison.newDiagnostics.length);

  // Build top-rules frequency table from new diagnostics
  const ruleFreq = new Map<string, { count: number; severity: 'error' | 'warning' | 'info' }>();
  for (const d of comparison.newDiagnostics) {
    const existing = ruleFreq.get(d.ruleId);
    if (existing) {
      ruleFreq.set(d.ruleId, { count: existing.count + 1, severity: existing.severity });
    } else {
      ruleFreq.set(d.ruleId, { count: 1, severity: d.severity });
    }
  }

  const topRules: TopDiagnosticRule[] = [...ruleFreq.entries()]
    .map(([ruleId, { count, severity }]) => ({ ruleId, count, severity }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    newCount: comparison.newDiagnostics.length,
    resolvedCount: comparison.resolvedDiagnostics.length,
    persistentCount,
    totalA,
    totalB,
    topRules,
    newDiagnostics: comparison.newDiagnostics,
    resolvedDiagnostics: comparison.resolvedDiagnostics,
  };
}

// ---------------------------------------------------------------------------
// Statistics Dashboard
// ---------------------------------------------------------------------------

export function buildStatisticsDashboard(comparison: ComparisonInput): StatisticsDashboard {
  const { stats } = comparison;
  return {
    layersA: stats.layersA,
    layersB: stats.layersB,
    featuresA: stats.featuresA,
    featuresB: stats.featuresB,
    verticesA: stats.verticesA,
    verticesB: stats.verticesB,
    diagnosticsA: stats.diagnosticsA,
    diagnosticsB: stats.diagnosticsB,
    layersDelta: stats.layersB - stats.layersA,
    featuresDelta: stats.featuresB - stats.featuresA,
    verticesDelta: stats.verticesB - stats.verticesA,
    diagnosticsDelta: stats.diagnosticsB - stats.diagnosticsA,
  };
}

// ---------------------------------------------------------------------------
// Prioritized Recommendations
// ---------------------------------------------------------------------------

export function buildPrioritizedRecommendations(
  comparison: ComparisonInput,
  regression: RegressionInput,
): PrioritizedRecommendation[] {
  const recs: PrioritizedRecommendation[] = [];

  // HIGH: geometry regression for top candidate
  if (regression.candidates.length > 0) {
    const top = regression.candidates[0]!;
    const pct = Math.round(top.confidence * 100);
    if (pct >= 60) {
      recs.push({
        priority: pct >= 80 ? 'HIGH' : 'MEDIUM',
        title: `Investigate ${top.kind} in ${top.layerName}`,
        reason: top.topReason,
        affectedLayers: [top.layerName],
        evidence: top.evidenceLabels,
        actions: top.recommendations.length > 0
          ? top.recommendations
          : ['Inspect affected features in the tile viewer', 'Compare geometry with source data'],
      });
    }
  }

  // HIGH: new error-severity diagnostics
  const errorDiags = comparison.newDiagnostics.filter(d => d.severity === 'error');
  if (errorDiags.length > 0) {
    const layers = [...new Set(errorDiags.map(d => d.layer ?? 'unknown').filter(Boolean))];
    recs.push({
      priority: 'HIGH',
      title: `Fix ${errorDiags.length} new error diagnostic(s)`,
      reason: `Error-severity diagnostics were introduced: ${errorDiags.map(d => d.ruleId).join(', ')}`,
      affectedLayers: layers,
      evidence: errorDiags.map(d => `${d.ruleId}: ${d.message}`),
      actions: ['Review and fix rule violations before merging', 'Run tileguard check locally'],
    });
  }

  // MEDIUM: feature removals
  if (comparison.features.removed > 0) {
    recs.push({
      priority: 'MEDIUM',
      title: `Verify ${comparison.features.removed} removed feature(s)`,
      reason: `Features were removed from the tile — confirm this is intentional.`,
      affectedLayers: [],
      evidence: [`${comparison.features.removed} feature(s) absent in target tile`],
      actions: ['Review source data for accidental deletions', 'Check data pipeline filters'],
    });
  }

  // MEDIUM: remaining candidates
  const remaining = regression.candidates.slice(1);
  for (const c of remaining.slice(0, 3)) {
    const pct = Math.round(c.confidence * 100);
    if (pct < 40) break;
    recs.push({
      priority: 'MEDIUM',
      title: `Review ${c.kind} in ${c.layerName}`,
      reason: c.topReason,
      affectedLayers: [c.layerName],
      evidence: c.evidenceLabels,
      actions: c.recommendations.length > 0
        ? c.recommendations
        : ['Inspect feature in tile viewer'],
    });
  }

  // LOW: warning diagnostics
  const warnDiags = comparison.newDiagnostics.filter(d => d.severity === 'warning');
  if (warnDiags.length > 0) {
    recs.push({
      priority: 'LOW',
      title: `Review ${warnDiags.length} new warning(s)`,
      reason: `Warning-severity diagnostics introduced: ${warnDiags.map(d => d.ruleId).join(', ')}`,
      affectedLayers: [],
      evidence: warnDiags.map(d => d.message),
      actions: ['Consider fixing before the next release'],
    });
  }

  // Fallback — generic rec from raw candidates
  if (recs.length === 0) {
    const allRawRecs = new Set<string>();
    for (const c of regression.candidates) {
      for (const r of c.recommendations) allRawRecs.add(r);
    }
    if (allRawRecs.size > 0) {
      recs.push({
        priority: 'LOW',
        title: 'Follow up on regression hints',
        reason: 'Analysis produced actionable hints.',
        affectedLayers: [],
        evidence: [],
        actions: [...allRawRecs],
      });
    }
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Appendix
// ---------------------------------------------------------------------------

export function buildAppendix(
  comparison: ComparisonInput,
  regression: RegressionInput,
  dashboard: StatisticsDashboard,
): ReportAppendix {
  // Build grouped entries from layerStats if available
  const addedByLayer = groupFromLayerStats(comparison.layerStats, 'added');
  const modifiedByLayer = groupFromLayerStats(comparison.layerStats, 'modified');
  const removedByLayer = groupFromLayerStats(comparison.layerStats, 'removed');

  return {
    addedByLayer,
    modifiedByLayer,
    removedByLayer,
    allNewDiagnostics: comparison.newDiagnostics,
    rawStatistics: dashboard,
    allCandidates: regression.candidates,
  };
}

function groupFromLayerStats(
  layerStats: readonly LayerStatInput[] | undefined,
  field: 'added' | 'modified' | 'removed',
): AppendixFeatureGroup[] {
  if (!layerStats || layerStats.length === 0) return [];

  return layerStats
    .filter(ls => ls[field] > 0)
    .map(ls => ({
      layerName: ls.layerName,
      count: ls[field],
      examples: ls.topExamples ?? [],
    }));
}

// ---------------------------------------------------------------------------
// Helper: build plain recommendation strings from prioritized recs
// (used to populate the legacy RecommendationSection for JSON compat)
// ---------------------------------------------------------------------------

export function flattenRecommendations(
  prioritized: readonly PrioritizedRecommendation[],
  rawCandidates: readonly RegressionCandidateInput[],
): string[] {
  // Priority-ordered deduped action strings
  const items = new Set<string>();

  // First: actions from prioritized recs
  for (const r of prioritized) {
    for (const a of r.actions) {
      items.add(a);
    }
  }

  // Fallback: raw candidate recommendations
  if (items.size === 0) {
    for (const c of rawCandidates) {
      for (const r of c.recommendations) {
        items.add(r);
      }
    }
  }

  return [...items];
}
