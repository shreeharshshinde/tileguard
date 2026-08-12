/**
 * CandidateList — ranked list of regression candidates.
 *
 * Renders candidates in descending confidence order.
 * Selecting a candidate fires onSelect so the parent (RegressionPage) can
 * show detailed evidence and synchronise the Comparison Explorer.
 */

import { ChevronRight } from 'lucide-react';
import type {
  RegressionCandidate,
  RegressionKind,
} from '../../analysis/models/regression.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CandidateListProps {
  readonly candidates: readonly RegressionCandidate[];
  readonly selectedIndex: number | null;
  readonly onSelect: (index: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function kindBadgeClass(kind: RegressionKind): string {
  switch (kind) {
    case 'geometry':
      return 'bg-[var(--tg-accent)] text-white';
    case 'attribute':
      return 'bg-[var(--tg-info,#3b82f6)] text-white';
    case 'diagnostic':
      return 'bg-[var(--tg-error)] text-white';
    case 'layer':
      return 'bg-[var(--tg-warning)] text-black';
    case 'mixed':
      return 'bg-[var(--tg-text-muted)] text-white';
  }
}

function confidenceBarColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-[var(--tg-error)]';
  if (confidence >= 0.5) return 'bg-[var(--tg-warning)]';
  return 'bg-[var(--tg-accent)]';
}

function featureLabel(candidate: RegressionCandidate): string {
  const fc = candidate.feature;
  const layer = fc.featureA?.layerName ?? fc.featureB?.layerName ?? 'unknown';
  const id = fc.featureA?.id ?? fc.featureB?.id ?? fc.featureA?.featureIndex;
  return id !== undefined ? `${layer} #${id}` : layer;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CandidateList({
  candidates,
  selectedIndex,
  onSelect,
}: CandidateListProps): JSX.Element {
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="text-2xl" role="img" aria-label="green check">
          ✅
        </span>
        <p className="text-sm font-medium text-[var(--tg-text-primary)]">
          No regression candidates found
        </p>
        <p className="text-xs text-[var(--tg-text-muted)]">
          The tiles appear identical or have only insignificant differences.
        </p>
      </div>
    );
  }

  return (
    <ul
      className="divide-y divide-[var(--tg-border)]"
      aria-label="Regression candidates"
    >
      {candidates.map((c, i) => {
        const isSelected = selectedIndex === i;
        const confidencePct = Math.round(c.confidence * 100);

        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--tg-bg-hover)] ${
                isSelected ? 'bg-[var(--tg-bg-hover)]' : ''
              }`}
              aria-selected={isSelected}
            >
              {/* Rank badge */}
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--tg-bg-primary)] text-[10px] font-bold text-[var(--tg-text-muted)]">
                {i + 1}
              </span>

              {/* Main content */}
              <div className="min-w-0 flex-1">
                {/* Top row: feature label + kind badge */}
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-semibold text-[var(--tg-text-primary)]">
                    {featureLabel(c)}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide ${kindBadgeClass(c.kind)}`}
                  >
                    {c.kind}
                  </span>
                </div>

                {/* Confidence bar */}
                <div className="mt-1.5 flex items-center gap-2">
                  <div
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--tg-bg-primary)]"
                    role="progressbar"
                    aria-valuenow={confidencePct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Confidence ${confidencePct}%`}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${confidenceBarColor(c.confidence)}`}
                      style={{ width: `${confidencePct}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-[10px] font-mono text-[var(--tg-text-muted)]">
                    {confidencePct}%
                  </span>
                </div>

                {/* Top reason summary */}
                {c.reasons.length > 0 && (
                  <p className="mt-1 truncate text-[10px] text-[var(--tg-text-muted)]">
                    {c.reasons[0]?.description}
                  </p>
                )}
              </div>

              <ChevronRight
                className={`mt-1 h-3.5 w-3.5 shrink-0 text-[var(--tg-text-muted)] transition-transform ${
                  isSelected ? 'rotate-90' : ''
                }`}
                aria-hidden="true"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
