/**
 * @tileguard/analysis — Regression Investigation Models
 *
 * Domain types for the regression detection and analysis engine.
 *
 * ## Concepts
 *
 * - **RegressionAnalysis**: Root result produced by {@link RegressionEngine.analyze}.
 *   Contains ranked candidates, summary statistics, and overall risk assessment.
 * - **RegressionCandidate**: A single feature flagged as a potential regression,
 *   ranked by confidence score (0–1).
 * - **RegressionEvidence**: A structured data point explaining why a candidate
 *   was flagged (geometry shift, property mutation, new diagnostic, etc.)
 * - **RegressionReason**: An atomic scoring contribution with human-readable
 *   explanation.
 * - **ConfidenceWeights**: Tunable coefficients controlling how different
 *   change types contribute to the overall confidence score.
 *
 * @packageDocumentation
 */

import type { FeatureComparison } from './comparison.js';

// ---------------------------------------------------------------------------
// Root classification
// ---------------------------------------------------------------------------

/**
 * High-level category of a regression.
 */
export type RegressionKind =
  | 'geometry' // geometry-only change (positions/shape)
  | 'attribute' // property/attribute-only change
  | 'layer' // layer added or removed
  | 'diagnostic' // new diagnostic flagged on a feature
  | 'mixed'; // combination of the above

// ---------------------------------------------------------------------------
// Reason — atomic evidence unit
// ---------------------------------------------------------------------------

/**
 * A single atomic reason contributing to a candidate's confidence score.
 * Every conclusion must have at least one reason.
 */
export interface RegressionReason {
  /** Short machine-readable code (e.g. 'centroid-shift', 'property-class-changed'). */
  readonly code: string;
  /** Human-readable explanation shown in the investigation panel. */
  readonly description: string;
  /** The numeric contribution this reason adds to the weighted score (0–100). */
  readonly weight: number;
  /** Severity signal for UI highlighting. */
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

/**
 * A structured evidence data point attached to a candidate.
 * Evidence explains *why* a reason fired.
 */
export interface RegressionEvidence {
  /** Evidence category. */
  readonly kind:
    | 'geometry'
    | 'property'
    | 'diagnostic'
    | 'statistics'
    | 'layer';
  /** Display label. */
  readonly label: string;
  /** The specific measured value (e.g. centroid shift in tile units). */
  readonly measuredValue: unknown;
  /** Optional baseline for comparison (value in tile A). */
  readonly baselineValue?: unknown;
  /** Whether this evidence confirms a regression (true) or rules one out (false). */
  readonly confirms: boolean;
}

// ---------------------------------------------------------------------------
// Timeline step
// ---------------------------------------------------------------------------

/**
 * One step in a plausible impact chain: Original → Changed → Impact.
 * Not proving causality — showing plausible narrative.
 */
export interface TimelineStep {
  /** What was observed at this step. */
  readonly label: string;
  /** Optional detail / measured delta. */
  readonly detail?: string;
}

// ---------------------------------------------------------------------------
// Recommendation
// ---------------------------------------------------------------------------

/**
 * An actionable engineering recommendation derived from evidence.
 * Recommendations reference evidence — never invented out of thin air.
 */
export interface RegressionRecommendation {
  /** Short imperative action text (e.g. "Verify geometry in source data"). */
  readonly action: string;
  /** Detailed context explaining why this action is suggested. */
  readonly rationale: string;
  /** Which evidence items support this recommendation (indices into candidate.evidence). */
  readonly evidenceIndices: readonly number[];
  /** Priority ordering for display (lower = show first). */
  readonly priority: number;
}

// ---------------------------------------------------------------------------
// Candidate
// ---------------------------------------------------------------------------

/**
 * A single feature ranked as a likely regression root cause.
 * Every candidate must have at least one reason.
 */
export interface RegressionCandidate {
  /** The feature comparison this candidate is derived from. */
  readonly feature: FeatureComparison;
  /**
   * Aggregate confidence score in [0, 1].
   * 0 = very unlikely to be the root cause.
   * 1 = near-certain regression source.
   */
  readonly confidence: number;
  /** Classification of this regression. */
  readonly kind: RegressionKind;
  /** Ordered list of reasons (highest-weight first). */
  readonly reasons: readonly RegressionReason[];
  /** Structured evidence attached to this candidate. */
  readonly evidence: readonly RegressionEvidence[];
  /** Plausible impact narrative. */
  readonly timeline: readonly TimelineStep[];
  /** Actionable recommendations derived from evidence. */
  readonly recommendations: readonly RegressionRecommendation[];
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

/**
 * High-level summary of the regression analysis.
 */
export interface RegressionSummary {
  /** Total features analysed. */
  readonly totalFeatures: number;
  /** Number of candidates identified. */
  readonly totalCandidates: number;
  /** Confidence of the top candidate (or 0 if none). */
  readonly topConfidence: number;
  /** Whether the analysis found no meaningful differences. */
  readonly isClean: boolean;
  /** Dominant regression kind across all candidates (or null if none). */
  readonly dominantKind: RegressionKind | null;
  /** Count breakdown by kind. */
  readonly kindCounts: Readonly<Record<RegressionKind, number>>;
}

// ---------------------------------------------------------------------------
// Root analysis result
// ---------------------------------------------------------------------------

/**
 * The root result produced by RegressionEngine.
 * Consumed entirely by the UI and the Inspector API.
 *
 * Invariants:
 *   - candidates are sorted descending by confidence
 *   - every candidate.confidence ∈ [0, 1]
 *   - every candidate has at least one reason
 *   - summary.isClean === (candidates.length === 0)
 */
export interface RegressionAnalysis {
  readonly summary: RegressionSummary;
  readonly candidates: readonly RegressionCandidate[];
  /** All evidence items across all candidates, deduplicated for display. */
  readonly evidence: readonly RegressionEvidence[];
  /**
   * Overall weighted confidence for the entire analysis (average of top-3
   * candidates, or 0 if none).
   */
  readonly confidence: number;
}

// ---------------------------------------------------------------------------
// Scoring weights (injectable for testing / future configurability)
// ---------------------------------------------------------------------------

/**
 * Tunable weights for the ConfidenceScorer.
 * All values should sum to roughly 100 to keep scores in [0, 100] range
 * before normalisation.
 */
export interface ConfidenceWeights {
  /** Weight applied when geometry changes. */
  readonly geometryBase: number;
  /** Additional weight for large centroid shifts (> threshold). */
  readonly centroidShiftLarge: number;
  /** Additional weight for geometry type change. */
  readonly geometryTypeChange: number;
  /** Additional weight for polygon area change > 10%. */
  readonly areaChangeLarge: number;
  /** Weight applied when at least one property changes. */
  readonly propertyBase: number;
  /** Bonus weight for changes to high-signal properties (class, type, etc.). */
  readonly highSignalProperty: number;
  /** Deduction weight for changes to low-signal properties (name, label, etc.). */
  readonly lowSignalPropertyPenalty: number;
  /** Weight applied when a new diagnostic is introduced. */
  readonly newDiagnosticBase: number;
  /** Additional weight per new error-severity diagnostic. */
  readonly newDiagnosticError: number;
  /** Weight applied when statistics change (vertex count, ring count). */
  readonly statisticsBase: number;
}

/**
 * Default production weights.
 */
export const DEFAULT_CONFIDENCE_WEIGHTS: ConfidenceWeights = {
  geometryBase: 40,
  centroidShiftLarge: 20,
  geometryTypeChange: 30,
  areaChangeLarge: 15,
  propertyBase: 20,
  highSignalProperty: 15,
  lowSignalPropertyPenalty: 5,
  newDiagnosticBase: 30,
  newDiagnosticError: 15,
  statisticsBase: 10,
} as const;

// ---------------------------------------------------------------------------
// High-signal / low-signal property lists (configurable later)
// ---------------------------------------------------------------------------

export const HIGH_SIGNAL_PROPERTIES: readonly string[] = [
  'class',
  'type',
  'subtype',
  'kind',
  'category',
  'layer',
  'rank',
  'admin_level',
  'highway',
  'waterway',
  'landuse',
  'natural',
  'building',
] as const;

export const LOW_SIGNAL_PROPERTIES: readonly string[] = [
  'name',
  'name_en',
  'ref',
  'label',
  'description',
  'wikipedia',
  'wikidata',
] as const;

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/** Centroid shift (in tile units) considered "large". */
export const CENTROID_SHIFT_THRESHOLD = 50;

/** Area change fraction considered "large" (10%). */
export const AREA_CHANGE_THRESHOLD = 0.1;

/** Minimum confidence to include a candidate in results. */
export const MIN_CANDIDATE_CONFIDENCE = 0.05;
