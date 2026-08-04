/**
 * @tileguard/reporters — Engineering Report Model (Milestone 7 — Step 3)
 *
 * Format-independent data model consumed by every report exporter.
 *
 * Design principles:
 *   - Fully immutable: every field is readonly.
 *   - No imports from @tileguard/inspector or DOM APIs.
 *   - ReportEngine populates this model from caller-supplied data.
 *   - Every exporter (Markdown / HTML / JSON) reads from this single model.
 *
 * The input shapes (ComparisonInput, RegressionInput) are deliberately
 * slim interfaces — not direct imports of inspector's concrete types — so
 * the reporters package remains independent of the inspector package.
 */

// ---------------------------------------------------------------------------
// Input shapes (caller supplies these; mirrors inspector models structurally)
// ---------------------------------------------------------------------------

export interface FeatureChangeSummary {
  readonly added: number;
  readonly removed: number;
  readonly modified: number;
  readonly unchanged: number;
}

export interface LayerChangeSummary {
  readonly added: number;
  readonly removed: number;
  readonly modified: number;
}

export interface DiagnosticCounts {
  readonly errors: number;
  readonly warnings: number;
  readonly info: number;
}

export interface StatsDelta {
  readonly layersA: number;
  readonly layersB: number;
  readonly featuresA: number;
  readonly featuresB: number;
  readonly verticesA: number;
  readonly verticesB: number;
  readonly diagnosticsA: number;
  readonly diagnosticsB: number;
}

export interface NewDiagnosticEntry {
  readonly ruleId: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly message: string;
  readonly layer?: string;
}

export interface RegressionCandidateInput {
  readonly layerName: string;
  readonly featureId: string | number | undefined;
  readonly confidence: number;
  readonly kind: string;
  readonly topReason: string;
  readonly evidenceLabels: readonly string[];
  readonly timelineLabels: readonly string[];
  readonly recommendations: readonly string[];
}

/** Slim comparison data the caller provides to ReportEngine. */
export interface ComparisonInput {
  readonly sourceTile: string;
  readonly targetTile: string;
  readonly features: FeatureChangeSummary;
  readonly layers: LayerChangeSummary;
  readonly diagnosticsA: DiagnosticCounts;
  readonly diagnosticsB: DiagnosticCounts;
  readonly newDiagnostics: readonly NewDiagnosticEntry[];
  readonly resolvedDiagnostics: readonly NewDiagnosticEntry[];
  readonly stats: StatsDelta;
  readonly isIdentical: boolean;
}

/** Slim regression data the caller provides to ReportEngine. */
export interface RegressionInput {
  readonly isClean: boolean;
  readonly totalFeatures: number;
  readonly totalCandidates: number;
  readonly overallConfidence: number;
  readonly dominantKind: string | null;
  readonly candidates: readonly RegressionCandidateInput[];
}

// ---------------------------------------------------------------------------
// Report Metadata
// ---------------------------------------------------------------------------

export interface ReportMetadata {
  /** ISO timestamp string when the report was generated. */
  readonly generatedAt: string;
  readonly tileguardVersion: string;
  readonly sourceTile: string;
  readonly targetTile: string;
  /** Total wall-clock duration of comparison + regression in ms. */
  readonly totalDurationMs: number;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export interface OverviewSection {
  readonly sourceTile: string;
  readonly targetTile: string;
  readonly isIdentical: boolean;
  readonly totalCandidates: number;
  readonly overallConfidence: number;
  readonly dominantKind: string | null;
  readonly featureChangeSummary: FeatureChangeSummary;
  readonly layerChangeSummary: LayerChangeSummary;
}

export interface ComparisonSection {
  readonly features: FeatureChangeSummary;
  readonly layers: LayerChangeSummary;
  readonly stats: StatsDelta;
  readonly isIdentical: boolean;
}

export interface RegressionSection {
  readonly isClean: boolean;
  readonly totalFeatures: number;
  readonly totalCandidates: number;
  readonly overallConfidence: number;
  readonly dominantKind: string | null;
  readonly candidates: readonly RegressionCandidateInput[];
}

export interface StatisticsSection {
  readonly layersA: number;
  readonly layersB: number;
  readonly featuresA: number;
  readonly featuresB: number;
  readonly verticesA: number;
  readonly verticesB: number;
  readonly diagnosticsA: number;
  readonly diagnosticsB: number;
}

export interface DiagnosticSection {
  readonly countA: DiagnosticCounts;
  readonly countB: DiagnosticCounts;
  readonly newDiagnostics: readonly NewDiagnosticEntry[];
  readonly resolvedDiagnostics: readonly NewDiagnosticEntry[];
}

export interface RecommendationSection {
  readonly items: readonly string[];
  /** Placeholder for engineer-written notes. Always empty in generated reports. */
  readonly notes: readonly string[];
}

// ---------------------------------------------------------------------------
// Root report model
// ---------------------------------------------------------------------------

export interface EngineeringReport {
  readonly metadata: ReportMetadata;
  readonly overview: OverviewSection;
  readonly comparison: ComparisonSection;
  readonly regression: RegressionSection;
  readonly statistics: StatisticsSection;
  readonly diagnostics: DiagnosticSection;
  readonly recommendations: RecommendationSection;
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export type ReportFormat = 'markdown' | 'html' | 'json';

export interface ReportOutput {
  readonly format: ReportFormat;
  readonly content: string;
  readonly report: EngineeringReport;
}

export interface ReportError {
  readonly code: 'MISSING_COMPARISON' | 'MISSING_REGRESSION' | 'UNSUPPORTED_FORMAT' | 'SERIALIZATION_ERROR';
  readonly message: string;
}

export type ReportResult = { ok: true; value: ReportOutput } | { ok: false; error: ReportError };
