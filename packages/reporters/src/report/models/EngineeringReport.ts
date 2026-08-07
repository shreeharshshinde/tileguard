/**
 * @tileguard/reporters — Engineering Report Model (Milestone 7.3 — Engineering Report UX)
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

/**
 * Per-layer statistics contributed by the caller.
 * Optional — if omitted, layer impact section is derived from aggregate data.
 */
export interface LayerStatInput {
  readonly layerName: string;
  readonly added: number;
  readonly modified: number;
  readonly removed: number;
  readonly unchanged: number;
  /** Top example feature IDs or descriptions for the appendix preview. */
  readonly topExamples?: readonly string[];
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
  /** Optional per-layer breakdown — used to build LayerImpact section. */
  readonly layerStats?: readonly LayerStatInput[];
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
  // ── Investigation metadata (Phase 2 — Step 2) ──
  /** Operating system identifier (e.g., "linux x64", "darwin arm64"). */
  readonly platform?: string | undefined;
  /** CLI version that invoked the report (may differ from tileguardVersion). */
  readonly cliVersion?: string | undefined;
  /** Node.js version used for execution. */
  readonly nodeVersion?: string | undefined;
  /** Rule set version or config hash. */
  readonly ruleSetVersion?: string | undefined;
  /** Configuration file path used (if any). */
  readonly configPath?: string | undefined;
  /** SHA-256 hash of the source tile (for reproducibility). */
  readonly sourceTileHash?: string | undefined;
  /** SHA-256 hash of the target tile (for reproducibility). */
  readonly targetTileHash?: string | undefined;
  /** Unique report ID for cross-referencing. */
  readonly reportId?: string | undefined;
}

// ---------------------------------------------------------------------------
// NEW: Executive Summary
// ---------------------------------------------------------------------------

/** Overall health signal for the report. */
export type ReportStatus = 'identical' | 'changes-detected' | 'regressions-found' | 'clean';

/** Risk level derived from regression confidence. */
export type RegressionRisk = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Executive Summary — the first thing the reader sees.
 * Must fit on one screen. Every field should be immediately actionable.
 */
export interface ExecutiveSummary {
  readonly status: ReportStatus;
  readonly regressionRisk: RegressionRisk;
  readonly durationMs: number;
  readonly sourceTile: string;
  readonly targetTile: string;
  readonly generatedAt: string;
  /** Quick numeric metrics for the header cards. */
  readonly metrics: {
    readonly layersChanged: number;
    readonly featuresAdded: number;
    readonly featuresModified: number;
    readonly featuresRemoved: number;
    readonly regressionCandidates: number;
    readonly newDiagnostics: number;
    readonly overallConfidencePct: number;
  };
}

// ---------------------------------------------------------------------------
// NEW: Key Findings
// ---------------------------------------------------------------------------

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * A single top-level finding.  The top 5–7 findings are shown before
 * any detailed data.
 */
export interface KeyFinding {
  readonly rank: number;
  readonly title: string;
  readonly severity: FindingSeverity;
  readonly description: string;
  /**
   * Optional structured references — e.g. ["roads", "candidate #2"].
   * Used by HTML renderer to link to sections.
   */
  readonly references?: readonly string[];
}

// ---------------------------------------------------------------------------
// NEW: Layer Impact Summary
// ---------------------------------------------------------------------------

/**
 * Per-layer change summary — replaces the flat feature list in the main body.
 * Full detail is deferred to the Appendix.
 */
export interface LayerImpactEntry {
  readonly layerName: string;
  readonly added: number;
  readonly modified: number;
  readonly removed: number;
  readonly unchanged: number;
  /** Top feature IDs / descriptions shown in the collapsible preview. */
  readonly topExamples: readonly string[];
  /** Net change signal for colour-coding. */
  readonly netChange: number;
}

// ---------------------------------------------------------------------------
// NEW: Regression Highlights (top N + remaining)
// ---------------------------------------------------------------------------

/**
 * Top-N regression highlight — shown in the main body.
 * The remaining candidates go to the Appendix.
 */
export interface RegressionHighlight {
  readonly rank: number;
  readonly layerName: string;
  readonly featureId: string | number | undefined;
  readonly kind: string;
  readonly confidencePct: number;
  readonly topReason: string;
  readonly evidenceLabels: readonly string[];
}

export interface RegressionHighlightSection {
  /** Top-N shown inline (default: 10). */
  readonly topCandidates: readonly RegressionHighlight[];
  /** All candidates beyond top-N — placed in the Appendix. */
  readonly remainingCandidates: readonly RegressionCandidateInput[];
  readonly isClean: boolean;
  readonly totalCandidates: number;
  readonly overallConfidencePct: number;
  readonly dominantKind: string | null;
}

// ---------------------------------------------------------------------------
// NEW: Diagnostics Summary
// ---------------------------------------------------------------------------

/**
 * Improved diagnostics section — new / resolved / persistent breakdown
 * plus top-rules frequency table.
 */
export interface TopDiagnosticRule {
  readonly ruleId: string;
  readonly count: number;
  readonly severity: 'error' | 'warning' | 'info';
}

export interface DiagnosticsSummarySection {
  readonly newCount: number;
  readonly resolvedCount: number;
  readonly persistentCount: number;
  readonly totalA: number;
  readonly totalB: number;
  readonly topRules: readonly TopDiagnosticRule[];
  readonly newDiagnostics: readonly NewDiagnosticEntry[];
  readonly resolvedDiagnostics: readonly NewDiagnosticEntry[];
}

// ---------------------------------------------------------------------------
// NEW: Statistics Dashboard
// ---------------------------------------------------------------------------

/**
 * Expanded statistics section with before/after/delta table.
 */
export interface StatisticsDashboard {
  readonly layersA: number;
  readonly layersB: number;
  readonly featuresA: number;
  readonly featuresB: number;
  readonly verticesA: number;
  readonly verticesB: number;
  readonly diagnosticsA: number;
  readonly diagnosticsB: number;
  /** Computed deltas. */
  readonly layersDelta: number;
  readonly featuresDelta: number;
  readonly verticesDelta: number;
  readonly diagnosticsDelta: number;
}

// ---------------------------------------------------------------------------
// NEW: Prioritized Recommendations
// ---------------------------------------------------------------------------

export type RecommendationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * A single recommendation with evidence links and priority.
 */
export interface PrioritizedRecommendation {
  readonly priority: RecommendationPriority;
  readonly title: string;
  readonly reason: string;
  readonly affectedLayers: readonly string[];
  readonly evidence: readonly string[];
  readonly actions: readonly string[];
}

// ---------------------------------------------------------------------------
// NEW: Appendix
// ---------------------------------------------------------------------------

/**
 * Grouped added-feature entries for the appendix.
 */
export interface AppendixFeatureGroup {
  readonly layerName: string;
  readonly count: number;
  readonly examples: readonly string[];
}

export interface ReportAppendix {
  /** A — Added features, grouped by layer. */
  readonly addedByLayer: readonly AppendixFeatureGroup[];
  /** B — Modified features, grouped by layer. */
  readonly modifiedByLayer: readonly AppendixFeatureGroup[];
  /** C — Removed features, grouped by layer. */
  readonly removedByLayer: readonly AppendixFeatureGroup[];
  /** D — All new diagnostic entries. */
  readonly allNewDiagnostics: readonly NewDiagnosticEntry[];
  /** E — Raw statistics table. */
  readonly rawStatistics: StatisticsDashboard;
  /** F — All regression candidates (including those beyond top-N). */
  readonly allCandidates: readonly RegressionCandidateInput[];
}

// ---------------------------------------------------------------------------
// Legacy sections (kept for JSON backwards-compatibility)
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

  // ── Legacy sections (kept for JSON backwards-compat and existing tests) ──
  readonly overview: OverviewSection;
  readonly comparison: ComparisonSection;
  readonly regression: RegressionSection;
  readonly statistics: StatisticsSection;
  readonly diagnostics: DiagnosticSection;
  readonly recommendations: RecommendationSection;

  // ── New UX sections (Milestone 7.3) ──
  readonly executiveSummary: ExecutiveSummary;
  readonly keyFindings: readonly KeyFinding[];
  readonly layerImpact: readonly LayerImpactEntry[];
  readonly regressionHighlights: RegressionHighlightSection;
  readonly diagnosticsSummary: DiagnosticsSummarySection;
  readonly statisticsDashboard: StatisticsDashboard;
  readonly prioritizedRecommendations: readonly PrioritizedRecommendation[];
  readonly appendix: ReportAppendix;
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
