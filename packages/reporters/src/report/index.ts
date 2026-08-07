/**
 * @tileguard/reporters — Report Engine public API (Milestone 7.3 — Engineering Report UX)
 */

// Models
export type {
  // Input types
  ComparisonInput,
  DiagnosticCounts,
  FeatureChangeSummary,
  LayerChangeSummary,
  LayerStatInput,
  NewDiagnosticEntry,
  RegressionCandidateInput,
  RegressionInput,
  StatsDelta,

  // Legacy section types
  ComparisonSection,
  DiagnosticSection,
  OverviewSection,
  RecommendationSection,
  RegressionSection,
  StatisticsSection,

  // New UX section types (Milestone 7.3)
  AppendixFeatureGroup,
  DiagnosticsSummarySection,
  ExecutiveSummary,
  FindingSeverity,
  KeyFinding,
  LayerImpactEntry,
  PrioritizedRecommendation,
  RecommendationPriority,
  RegressionHighlight,
  RegressionHighlightSection,
  RegressionRisk,
  ReportAppendix,
  ReportStatus,
  StatisticsDashboard,
  TopDiagnosticRule,

  // Report output types
  EngineeringReport,
  ReportError,
  ReportFormat,
  ReportMetadata,
  ReportOutput,
  ReportResult,
} from './models/EngineeringReport.js';

// Engine
export type { ReportEngine, ReportEngineOptions } from './ReportEngine.js';
export { createReportEngine } from './ReportEngine.js';

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

// Registry
export type { FormatRenderer, ReporterRegistry } from './ReporterRegistry.js';
export { createReporterRegistry, defaultRegistry } from './ReporterRegistry.js';

// Format renderers (usable directly if needed)
export { renderMarkdown } from './reporters/MarkdownReporter.js';
export { renderHtml } from './reporters/HtmlReporter.js';
export { renderJson, JSON_SCHEMA_VERSION } from './reporters/JsonReporter.js';
export type { JsonReportOptions } from './reporters/JsonReporter.js';

// Writer utilities
export { MarkdownWriter } from './utils/MarkdownWriter.js';
export { HtmlWriter, escapeHtml } from './utils/HtmlWriter.js';
