/**
 * @tileguard/reporters — Report Engine public API (Milestone 7 — Step 3)
 */

// Models
export type {
  ComparisonInput,
  DiagnosticCounts,
  DiagnosticSection,
  EngineeringReport,
  FeatureChangeSummary,
  LayerChangeSummary,
  NewDiagnosticEntry,
  OverviewSection,
  RecommendationSection,
  RegressionCandidateInput,
  RegressionInput,
  RegressionSection,
  ReportError,
  ReportFormat,
  ReportMetadata,
  ReportOutput,
  ReportResult,
  StatsDelta,
  StatisticsSection,
} from './models/EngineeringReport.js';

// Engine
export type { ReportEngine, ReportEngineOptions } from './ReportEngine.js';
export { createReportEngine } from './ReportEngine.js';

// Registry
export type { FormatRenderer, ReporterRegistry } from './ReporterRegistry.js';
export { createReporterRegistry, defaultRegistry } from './ReporterRegistry.js';

// Format renderers (usable directly if needed)
export { renderMarkdown } from './reporters/MarkdownReporter.js';
export { renderHtml } from './reporters/HtmlReporter.js';
export { renderJson } from './reporters/JsonReporter.js';
export type { JsonReportOptions } from './reporters/JsonReporter.js';

// Writer utilities
export { MarkdownWriter } from './utils/MarkdownWriter.js';
export { HtmlWriter, escapeHtml } from './utils/HtmlWriter.js';
