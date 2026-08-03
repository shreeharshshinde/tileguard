/**
 * Unit tests — ConfidenceScorer (Milestone 7 — Step 2)
 *
 * Covers:
 *   - Empty reasons → 0
 *   - Single reason weight is reflected in score
 *   - Multiple reasons are summed
 *   - Score is clamped to [0, 1]
 *   - Custom ceiling changes normalisation
 *   - rawScore returns un-normalised sum
 *   - getCeiling() returns configured ceiling
 *   - Determinism: same input → same output
 */

import { describe, expect, it } from 'vitest';
import {
  createConfidenceScorer,
  DEFAULT_CONFIDENCE_WEIGHTS,
} from '../src/analysis/ConfidenceScorer.js';
import type { RegressionReason } from '../src/analysis/models/regression.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function reason(
  code: string,
  weight: number,
  severity: RegressionReason['severity'] = 'medium',
): RegressionReason {
  return { code, description: `Reason ${code}`, weight, severity };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConfidenceScorer', () => {
  describe('empty input', () => {
    it('returns 0 for empty reasons array', () => {
      const scorer = createConfidenceScorer();
      expect(scorer.score([])).toBe(0);
    });

    it('rawScore returns 0 for empty reasons', () => {
      const scorer = createConfidenceScorer();
      expect(scorer.rawScore([])).toBe(0);
    });
  });

  describe('single reason', () => {
    it('score = weight / ceiling (default ceiling 100)', () => {
      const scorer = createConfidenceScorer();
      const result = scorer.score([reason('r1', 40)]);
      expect(result).toBeCloseTo(0.4);
    });

    it('rawScore = weight sum for single reason', () => {
      const scorer = createConfidenceScorer();
      expect(scorer.rawScore([reason('r1', 40)])).toBe(40);
    });
  });

  describe('multiple reasons', () => {
    it('sums all weights before dividing by ceiling', () => {
      const scorer = createConfidenceScorer();
      const result = scorer.score([reason('r1', 40), reason('r2', 20), reason('r3', 10)]);
      // (40+20+10) / 100 = 0.7
      expect(result).toBeCloseTo(0.7);
    });

    it('rawScore equals sum of all weights', () => {
      const scorer = createConfidenceScorer();
      expect(scorer.rawScore([reason('r1', 30), reason('r2', 25)])).toBe(55);
    });
  });

  describe('clamping', () => {
    it('clamps score to 1 when weights exceed ceiling', () => {
      const scorer = createConfidenceScorer(undefined, 100);
      // total weight 150 > ceiling 100 → should clamp to 1
      const result = scorer.score([reason('r1', 80), reason('r2', 70)]);
      expect(result).toBe(1);
    });

    it('never returns negative score', () => {
      const scorer = createConfidenceScorer();
      // weight 0 is still valid
      const result = scorer.score([reason('r1', 0)]);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('custom ceiling', () => {
    it('normalises against the configured ceiling', () => {
      const scorer = createConfidenceScorer(undefined, 200);
      // weight 100 / ceiling 200 = 0.5
      const result = scorer.score([reason('r1', 100)]);
      expect(result).toBeCloseTo(0.5);
    });

    it('getCeiling() returns configured ceiling', () => {
      const scorer = createConfidenceScorer(undefined, 150);
      expect(scorer.getCeiling()).toBe(150);
    });

    it('protects against zero ceiling', () => {
      // ceiling is clamped to 1 internally so no divide-by-zero
      const scorer = createConfidenceScorer(undefined, 0);
      expect(scorer.getCeiling()).toBeGreaterThan(0);
    });
  });

  describe('determinism', () => {
    it('same input always produces same score', () => {
      const scorer = createConfidenceScorer();
      const reasons = [reason('a', 40), reason('b', 30)];
      const first = scorer.score(reasons);
      const second = scorer.score(reasons);
      expect(first).toBe(second);
    });
  });

  describe('DEFAULT_CONFIDENCE_WEIGHTS', () => {
    it('exports positive weights for every key', () => {
      for (const [key, val] of Object.entries(DEFAULT_CONFIDENCE_WEIGHTS)) {
        expect(val, `${key} should be > 0`).toBeGreaterThan(0);
      }
    });
  });
});
