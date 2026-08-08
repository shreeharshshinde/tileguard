/**
 * @tileguard/reporters — Built-in output reporters
 *
 * This package provides the default reporters shipped with TileGuard:
 *
 *   textReporter  — Human-readable colored terminal output (default)
 *   jsonReporter  — Structured JSON output for CI and programmatic consumption
 *
 * Both reporters conform to the Reporter interface from @tileguard/core.
 * They are plain objects with a report() method that receives the complete
 * diagnostic list and run context.
 *
 * Future reporters (SARIF, GitHub Annotations) will be added here.
 *
 * @packageDocumentation
 */

export type {
  JsonReporterOptions,
  JsonReporterOutput,
  SerializedDiagnostic,
  WriteFn as JsonWriteFn,
} from './json-reporter.js';
// JSON reporter — structured output for CI and tools
export { createJsonReporter, jsonReporter } from './json-reporter.js';
export type {
  AppendixFeatureGroup,
  ComparisonInput,
  DiagnosticCounts,
  DiagnosticsSummarySection,
  EngineeringReport,
  ExecutiveSummary,
  FeatureChangeSummary,
  FindingSeverity,
  FormatRenderer,
  JsonReportOptions,
  KeyFinding,
  LayerChangeSummary,
  LayerImpactEntry,
  LayerStatInput,
  NewDiagnosticEntry,
  PrioritizedRecommendation,
  RecommendationPriority,
  RegressionCandidateInput,
  RegressionHighlight,
  RegressionHighlightSection,
  RegressionInput,
  RegressionRisk,
  ReportAppendix,
  ReportEngine,
  ReportEngineOptions,
  ReportError,
  ReporterRegistry,
  ReportFormat,
  ReportOutput,
  ReportResult,
  ReportStatus,
  StatisticsDashboard,
  StatsDelta,
  TopDiagnosticRule,
} from './report/index.js';
// Engineering Report Engine (Milestone 7.3 — Engineering Report UX)
export {
  buildAppendix,
  buildDiagnosticsSummary,
  buildExecutiveSummary,
  buildKeyFindings,
  buildLayerImpact,
  buildPrioritizedRecommendations,
  buildRegressionHighlights,
  buildStatisticsDashboard,
  createReportEngine,
  createReporterRegistry,
  defaultRegistry,
  escapeHtml,
  flattenRecommendations,
  HtmlWriter,
  JSON_SCHEMA_VERSION,
  MarkdownWriter,
  renderHtml,
  renderJson,
  renderMarkdown,
} from './report/index.js';
export type {
  TextReporterOptions,
  WriteFn as TextWriteFn,
} from './text-reporter.js';
// Text reporter — the default, human-readable terminal output
export { createTextReporter, textReporter } from './text-reporter.js';
