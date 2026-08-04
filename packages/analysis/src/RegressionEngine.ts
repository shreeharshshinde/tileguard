/**
 * @tileguard/inspector — RegressionEngine (Milestone 7 — Step 2)
 *
 * Consumes a TileComparison produced by the Comparison Engine and transforms
 * it into a RegressionAnalysis: a ranked list of likely root-cause candidates
 * with evidence, confidence scores, classification, and recommendations.
 *
 * Architecture:
 *   1. Filters FeatureComparisons to those with actual changes.
 *   2. For each changed feature, delegates to EvidenceBuilder to build reasons
 *      and evidence.
 *   3. Uses ConfidenceScorer to produce a normalised confidence ∈ [0, 1].
 *   4. Classifies each candidate (geometry / attribute / diagnostic / mixed).
 *   5. Sorts candidates descending by confidence.
 *   6. Builds a RegressionSummary over all candidates.
 *   7. Returns a frozen RegressionAnalysis.
 *
 * Key invariant:
 *   - RegressionEngine NEVER calls ComparisonService or re-reads tiles.
 *   - It only reads the TileComparison argument.
 *
 * Boundary: imports only from comparison/models and analysis/*.
 */

import type { TileComparison } from './models/comparison.js';
import { createConfidenceScorer } from './ConfidenceScorer.js';
import { createEvidenceBuilder } from './EvidenceBuilder.js';
import type {
  ConfidenceWeights,
  RegressionAnalysis,
  RegressionCandidate,
  RegressionKind,
  RegressionSummary,
} from './models/regression.js';
import { MIN_CANDIDATE_CONFIDENCE } from './models/regression.js';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface RegressionEngine {
  /**
   * Analyse a TileComparison and produce a ranked RegressionAnalysis.
   * Deterministic: same TileComparison always produces the same result.
   *
   * Never re-reads tile data. Only processes comparison.features.
   */
  analyze(comparison: TileComparison): RegressionAnalysis;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface RegressionEngineOptions {
  /**
   * Override default confidence weights.
   * Useful for testing or future configurability.
   */
  readonly weights?: Partial<ConfidenceWeights>;

  /**
   * Minimum confidence score (in [0, 1]) to include a candidate.
   * Defaults to MIN_CANDIDATE_CONFIDENCE (0.05).
   */
  readonly minConfidence?: number;

  /**
   * Normalisation ceiling for the confidence scorer.
   * Defaults to 100.
   */
  readonly scoringCeiling?: number;
}

export function createRegressionEngine(
  options: RegressionEngineOptions = {},
): RegressionEngine {
  const {
    weights,
    minConfidence = MIN_CANDIDATE_CONFIDENCE,
    scoringCeiling = 100,
  } = options;

  const scorer = createConfidenceScorer(weights, scoringCeiling);
  const evidenceBuilder = createEvidenceBuilder();

  function analyze(comparison: TileComparison): RegressionAnalysis {
    const candidates: RegressionCandidate[] = [];

    for (const fc of comparison.features) {
      // Skip features that did not change
      if (fc.kind === 'unchanged') continue;

      // Build evidence from the feature comparison
      const built = evidenceBuilder.buildForFeature(fc, comparison);

      // No reasons → no candidate
      if (built.reasons.length === 0) continue;

      // Score
      const confidence = scorer.score(built.reasons);

      // Below minimum threshold → skip
      if (confidence < minConfidence) continue;

      // Classify
      const kind = classifyKind(built.reasons, fc.kind);

      candidates.push({
        feature: fc,
        confidence,
        kind,
        reasons: built.reasons,
        evidence: built.evidence,
        timeline: built.timeline,
        recommendations: built.recommendations,
      });
    }

    // Sort descending by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);

    // Deduplicate evidence across all candidates
    const allEvidence = deduplicateEvidence(candidates);

    // Build summary
    const summary = buildSummary(comparison, candidates);

    // Overall confidence: average of top-3 candidates
    const topThree = candidates.slice(0, 3);
    const overallConfidence =
      topThree.length > 0
        ? topThree.reduce((acc, c) => acc + c.confidence, 0) / topThree.length
        : 0;

    return {
      summary,
      candidates,
      evidence: allEvidence,
      confidence: overallConfidence,
    };
  }

  return { analyze };
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function classifyKind(
  reasons: readonly { code: string }[],
  fcKind: string,
): RegressionKind {
  if (fcKind === 'added' || fcKind === 'removed') return 'layer';

  const codes = new Set(reasons.map((r) => r.code));

  const hasGeometry =
    codes.has('geometry-modified') ||
    codes.has('geometry-type-changed') ||
    codes.has('centroid-shift-large') ||
    codes.has('centroid-shift-small') ||
    codes.has('area-changed-large');

  const hasProperty = [...codes].some(
    (c) => c.startsWith('property-') || c === 'property-changed',
  );

  const hasDiagnostic = codes.has('new-diagnostic');

  const activeKinds = [hasGeometry, hasProperty, hasDiagnostic].filter(Boolean).length;
  if (activeKinds > 1) return 'mixed';
  if (hasGeometry) return 'geometry';
  if (hasDiagnostic) return 'diagnostic';
  if (hasProperty) return 'attribute';
  return 'mixed';
}

// ---------------------------------------------------------------------------
// Summary builder
// ---------------------------------------------------------------------------

function buildSummary(
  comparison: TileComparison,
  candidates: readonly RegressionCandidate[],
): RegressionSummary {
  const totalFeatures = comparison.features.length;
  const topConfidence = candidates.length > 0 ? candidates[0]!.confidence : 0;

  const kindCounts: Record<RegressionKind, number> = {
    geometry: 0,
    attribute: 0,
    layer: 0,
    diagnostic: 0,
    mixed: 0,
  };

  for (const c of candidates) {
    kindCounts[c.kind]++;
  }

  // Dominant kind: the one with the highest count (tiebreak: highest confidence first)
  let dominantKind: RegressionKind | null = null;
  if (candidates.length > 0) {
    dominantKind = candidates[0]!.kind;
    let maxCount = 0;
    for (const [kind, count] of Object.entries(kindCounts) as [RegressionKind, number][]) {
      if (count > maxCount) {
        maxCount = count;
        dominantKind = kind;
      }
    }
  }

  return {
    totalFeatures,
    totalCandidates: candidates.length,
    topConfidence,
    isClean: candidates.length === 0,
    dominantKind,
    kindCounts,
  };
}

// ---------------------------------------------------------------------------
// Evidence deduplication
// ---------------------------------------------------------------------------

function deduplicateEvidence(
  candidates: readonly RegressionCandidate[],
) {
  const seen = new Set<string>();
  const result = [];

  for (const c of candidates) {
    for (const ev of c.evidence) {
      const key = `${ev.kind}:${ev.label}:${String(ev.measuredValue)}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(ev);
      }
    }
  }

  return result;
}
