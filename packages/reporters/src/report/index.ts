/**
 * @tileguard/reporters — Report Engine public API (Milestone 7.3 — Engineering Report UX)
 */

// Models
export type {
  // New UX section types (Milestone 7.3)
  AppendixFeatureGroup,
  // Input types
  ComparisonInput,
  // Legacy section types
  ComparisonSection,
  DiagnosticCounts,
  DiagnosticSection,
  DiagnosticsSummarySection,
  // Report output types
  EngineeringReport,
  ExecutiveSummary,
  FeatureChangeSummary,
  FindingSeverity,
  KeyFinding,
  LayerChangeSummary,
  LayerImpactEntry,
  LayerStatInput,
  NewDiagnosticEntry,
  OverviewSection,
  PrioritizedRecommendation,
  RecommendationPriority,
  RecommendationSection,
  RegressionCandidateInput,
  RegressionHighlight,
  RegressionHighlightSection,
  RegressionInput,
  RegressionRisk,
  RegressionSection,
  ReportAppendix,
  ReportError,
  ReportFormat,
  ReportMetadata,
  ReportOutput,
  ReportResult,
  ReportStatus,
  StatisticsDashboard,
  StatisticsSection,
  StatsDelta,
  TopDiagnosticRule,
} from './models/EngineeringReport.js';
// Assembler
export {
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
// Engine
export type { ReportEngine, ReportEngineOptions } from './ReportEngine.js';
export { createReportEngine } from './ReportEngine.js';

// Registry
export type { FormatRenderer, ReporterRegistry } from './ReporterRegistry.js';
export { createReporterRegistry, defaultRegistry } from './ReporterRegistry.js';
export { renderHtml } from './reporters/HtmlReporter.js';
export type { JsonReportOptions } from './reporters/JsonReporter.js';
export { JSON_SCHEMA_VERSION, renderJson } from './reporters/JsonReporter.js';
// Format renderers (usable directly if needed)
export { renderMarkdown } from './reporters/MarkdownReporter.js';
export { escapeHtml, HtmlWriter } from './utils/HtmlWriter.js';
// Writer utilities
export { MarkdownWriter } from './utils/MarkdownWriter.js';
