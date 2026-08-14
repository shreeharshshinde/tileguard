/**
 * @tileguard/analysis — ConfidenceScorer
 *
 * Converts a set of RegressionReasons into a normalised confidence score in [0, 1].
 *
 * Design:
 *   - Accumulates the weight of each reason.
 *   - Normalises the total against a configurable ceiling (default 100).
 *   - Clamps the result to [0, 1].
 *   - Deterministic: same reasons always produce the same score.
 *   - Weights are injectable so tests can exercise edge cases cleanly.
 *
 * Boundary: imports only from analysis/models/regression.
 */

import type {
  ConfidenceWeights,
  RegressionReason,
} from './models/regression.js';
import { DEFAULT_CONFIDENCE_WEIGHTS } from './models/regression.js';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface ConfidenceScorer {
  /**
   * Compute a normalised confidence score in [0, 1] from a list of reasons.
   * Empty reasons → 0.
   */
  score(reasons: readonly RegressionReason[]): number;

  /**
   * Compute the raw (un-normalised) weight sum. Useful for testing.
   */
  rawScore(reasons: readonly RegressionReason[]): number;

  /**
   * Return the normalisation ceiling this scorer uses.
   */
  getCeiling(): number;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a ConfidenceScorer with optional weight overrides.
 *
 * @param weights  Override any subset of the default weights.
 * @param ceiling  Score sum at which confidence reaches 1.0 (default: 100).
 */
export function createConfidenceScorer(
  weights?: Partial<ConfidenceWeights>,
  ceiling = 100,
): ConfidenceScorer {
  const _weights: ConfidenceWeights = {
    ...DEFAULT_CONFIDENCE_WEIGHTS,
    ...weights,
  };
  const _ceiling = Math.max(1, ceiling);

  function rawScore(reasons: readonly RegressionReason[]): number {
    if (reasons.length === 0) return 0;
    let total = 0;
    for (const reason of reasons) {
      total += reason.weight;
    }
    return total;
  }

  function score(reasons: readonly RegressionReason[]): number {
    if (reasons.length === 0) return 0;
    const raw = rawScore(reasons);
    return Math.min(1, Math.max(0, raw / _ceiling));
  }

  function getCeiling(): number {
    return _ceiling;
  }

  return { score, rawScore, getCeiling };
}

// ---------------------------------------------------------------------------
// Exported weights accessor (convenience for tests)
// ---------------------------------------------------------------------------

export { DEFAULT_CONFIDENCE_WEIGHTS };
