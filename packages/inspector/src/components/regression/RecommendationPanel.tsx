/**
 * RecommendationPanel — actionable recommendations derived from evidence.
 *
 * Every recommendation references evidence indices so the engineer can
 * trace each suggestion back to the specific finding that motivated it.
 */

import { ArrowRight, Lightbulb } from 'lucide-react';
import type { RegressionCandidate } from '../../analysis/models/regression.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RecommendationPanelProps {
  readonly candidate: RegressionCandidate;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecommendationPanel({
  candidate,
}: RecommendationPanelProps): JSX.Element {
  const { recommendations, evidence } = candidate;

  if (recommendations.length === 0) {
    return (
      <div className="rounded-md border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-3 py-2 text-xs text-[var(--tg-text-muted)]">
        No recommendations available.
      </div>
    );
  }

  const sorted = [...recommendations].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-2">
      {sorted.map((rec, i) => {
        // Gather evidence labels referenced by this recommendation
        const refEvidence = rec.evidenceIndices
          .map((idx) => evidence[idx])
          .filter(Boolean);

        return (
          <div
            key={i}
            className="rounded-md border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-3 py-2.5"
          >
            {/* Action */}
            <div className="flex items-start gap-2">
              <ArrowRight
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tg-accent)]"
                aria-hidden="true"
              />
              <p className="text-xs font-semibold text-[var(--tg-text-primary)]">
                {rec.action}
              </p>
            </div>

            {/* Rationale */}
            <p className="mt-1.5 pl-5 text-xs text-[var(--tg-text-secondary)]">
              {rec.rationale}
            </p>

            {/* Referenced evidence */}
            {refEvidence.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap gap-1 pl-5">
                {refEvidence.map((ev, j) => (
                  <li
                    key={j}
                    className="rounded bg-[var(--tg-bg-hover)] px-1.5 py-0.5 text-[10px] text-[var(--tg-text-muted)]"
                  >
                    {ev.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {/* Disclaimer */}
      <div className="flex items-start gap-1.5 rounded-md bg-[var(--tg-bg-secondary)] px-2 py-1.5">
        <Lightbulb
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tg-warning)]"
          aria-hidden="true"
        />
        <p className="text-[10px] text-[var(--tg-text-muted)]">
          These are investigation starting points, not automated fixes.
          Confirm each finding by inspecting the source data.
        </p>
      </div>
    </div>
  );
}
