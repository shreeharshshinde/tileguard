/**
 * @tileguard/reporters — ReportEngine (Milestone 7.3 — Engineering Report UX)
 *
 * Orchestrates report generation:
 *   1. Validates inputs.
 *   2. Builds an immutable EngineeringReport from ComparisonInput + RegressionInput
 *      via ReportAssembler (populates all new UX sections + legacy sections).
 *   3. Dispatches to the format-specific renderer via ReporterRegistry.
 *   4. Returns a ReportResult (ok | error) — never throws.
 *
 * The engine never compares tiles, never computes confidence, and never
 * performs investigation. It only transforms existing analysis results.
 */

import type {
  ComparisonInput,
  DiagnosticSection,
  EngineeringReport,
  OverviewSection,
  RecommendationSection,
  RegressionInput,
  ReportFormat,
  ReportOutput,
  ReportResult,
  StatisticsSection,
} from './models/EngineeringReport.js';
import { createReporterRegistry, type ReporterRegistry } from './ReporterRegistry.js';
import {
  buildAppendix,
  buildDiagnosticsSummary,
  buildExecutiveSummary,
  buildKeyFindings,
  buildLayerImpact,
  buildPrioritizedRecommendations,
  buildRegressionHighlights,
  buildStatisticsDashboard,
  flattenRecommendations,
} from './ReportAssembler.js';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface ReportEngineOptions {
  readonly tileguardVersion?: string;
  readonly totalDurationMs?: number;
  /** Injectable registry for testing / plugins. */
  readonly registry?: ReporterRegistry;
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface ReportEngine {
  generate(
    comparison: ComparisonInput,
    regression: RegressionInput,
    format: ReportFormat | string,
    options?: ReportEngineOptions,
  ): ReportResult;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createReportEngine(defaults: ReportEngineOptions = {}): ReportEngine {
  function generate(
    comparison: ComparisonInput | null | undefined,
    regression: RegressionInput | null | undefined,
    format: ReportFormat | string,
    options: ReportEngineOptions = {},
  ): ReportResult {
    if (!comparison) {
      return { ok: false, error: { code: 'MISSING_COMPARISON', message: 'comparison input is required.' } };
    }
    if (!regression) {
      return { ok: false, error: { code: 'MISSING_REGRESSION', message: 'regression input is required.' } };
    }

    const registry = options.registry ?? defaults.registry ?? createReporterRegistry();
    const renderer = registry.resolve(format);
    if (!renderer) {
      return {
        ok: false,
        error: {
          code: 'UNSUPPORTED_FORMAT',
          message: `Format "${format}" is not supported. Available: ${registry.formats().join(', ')}.`,
        },
      };
    }

    let report: EngineeringReport;
    try {
      report = buildReport(comparison, regression, options, defaults);
    } catch (err) {
      return {
        ok: false,
        error: {
          code: 'SERIALIZATION_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error building report.',
        },
      };
    }

    let content: string;
    try {
      content = renderer(report);
    } catch (err) {
      return {
        ok: false,
        error: {
          code: 'SERIALIZATION_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error rendering report.',
        },
      };
    }

    const output: ReportOutput = { format: format as ReportFormat, content, report };
    return { ok: true, value: output };
  }

  return { generate };
}

// ---------------------------------------------------------------------------
// Build the immutable EngineeringReport from inputs
// ---------------------------------------------------------------------------

function buildReport(
  comparison: ComparisonInput,
  regression: RegressionInput,
  options: ReportEngineOptions,
  defaults: ReportEngineOptions,
): EngineeringReport {
  const tileguardVersion = options.tileguardVersion ?? defaults.tileguardVersion ?? '0.0.0';
  const totalDurationMs = options.totalDurationMs ?? defaults.totalDurationMs ?? 0;
  const generatedAt = new Date().toISOString();

  // ── Legacy sections (preserved for JSON backwards-compat) ──────────────

  const overview: OverviewSection = {
    sourceTile: comparison.sourceTile,
    targetTile: comparison.targetTile,
    isIdentical: comparison.isIdentical,
    totalCandidates: regression.totalCandidates,
    overallConfidence: regression.overallConfidence,
    dominantKind: regression.dominantKind,
    featureChangeSummary: comparison.features,
    layerChangeSummary: comparison.layers,
  };

  const diagnostics: DiagnosticSection = {
    countA: comparison.diagnosticsA,
    countB: comparison.diagnosticsB,
    newDiagnostics: comparison.newDiagnostics,
    resolvedDiagnostics: comparison.resolvedDiagnostics,
  };

  const statistics: StatisticsSection = {
    layersA: comparison.stats.layersA,
    layersB: comparison.stats.layersB,
    featuresA: comparison.stats.featuresA,
    featuresB: comparison.stats.featuresB,
    verticesA: comparison.stats.verticesA,
    verticesB: comparison.stats.verticesB,
    diagnosticsA: comparison.stats.diagnosticsA,
    diagnosticsB: comparison.stats.diagnosticsB,
  };

  // ── New UX sections — assembled by ReportAssembler ─────────────────────

  const executiveSummary = buildExecutiveSummary(comparison, regression, totalDurationMs, generatedAt);
  const keyFindings = buildKeyFindings(comparison, regression);
  const layerImpact = buildLayerImpact(comparison, regression);
  const regressionHighlights = buildRegressionHighlights(regression);
  const diagnosticsSummary = buildDiagnosticsSummary(comparison);
  const statisticsDashboard = buildStatisticsDashboard(comparison);
  const prioritizedRecommendations = buildPrioritizedRecommendations(comparison, regression);
  const appendix = buildAppendix(comparison, regression, statisticsDashboard);

  // ── Legacy recommendations — derived from prioritized recs ─────────────
  // This keeps existing tests passing (they check recommendations.items)
  const legacyItems = flattenRecommendations(prioritizedRecommendations, regression.candidates);
  const recommendations: RecommendationSection = {
    items: legacyItems,
    notes: [],
  };

  return {
    metadata: {
      generatedAt,
      tileguardVersion,
      sourceTile: comparison.sourceTile,
      targetTile: comparison.targetTile,
      totalDurationMs,
    },
    // Legacy sections
    overview,
    comparison: {
      features: comparison.features,
      layers: comparison.layers,
      stats: comparison.stats,
      isIdentical: comparison.isIdentical,
    },
    regression: {
      isClean: regression.isClean,
      totalFeatures: regression.totalFeatures,
      totalCandidates: regression.totalCandidates,
      overallConfidence: regression.overallConfidence,
      dominantKind: regression.dominantKind,
      candidates: regression.candidates,
    },
    statistics,
    diagnostics,
    recommendations,
    // New UX sections
    executiveSummary,
    keyFindings,
    layerImpact,
    regressionHighlights,
    diagnosticsSummary,
    statisticsDashboard,
    prioritizedRecommendations,
    appendix,
  };
}
