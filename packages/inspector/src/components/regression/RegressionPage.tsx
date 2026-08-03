/**
 * RegressionPage — Milestone 7 Step 2 Investigation Panel
 *
 * Layout (from spec):
 *   Summary
 *   ────────────────────
 *   Likely Causes (CandidateList)
 *   ────────────────────
 *   Evidence (EvidencePanel)
 *   ────────────────────
 *   Feature Details
 *   ────────────────────
 *   Recommendations (RecommendationPanel)
 *
 * The panel receives a TileComparison (already computed by ComparisonPage).
 * It runs the RegressionEngine inside a useMemo, then presents the ranked
 * candidates. Selecting a candidate fires onSelectFeature so the comparison
 * explorer can sync.
 *
 * Dependency boundary: never imports renderer/, viewport/, or DOM APIs.
 */

import { AlertTriangle, GitMerge, Layers, Search, Shuffle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createRegressionEngine } from '../../analysis/RegressionEngine.js';
import type {
  RegressionAnalysis,
  RegressionKind,
} from '../../analysis/models/regression.js';
import type { TileComparison } from '../../comparison/models.js';
import { CandidateList } from './CandidateList.js';
import { EvidencePanel } from './EvidencePanel.js';
import { RecommendationPanel } from './RecommendationPanel.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RegressionPageProps {
  /** The comparison to analyse. null = no data yet. */
  readonly comparison: TileComparison | null;
  /** Called when a candidate is selected so ComparisonPage can sync. */
  readonly onSelectFeature?: (layerName: string, featureIndex: number) => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeading({
  children,
}: {
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[var(--tg-text-muted)]">
      {children}
    </h3>
  );
}

function SummarySection({
  analysis,
}: {
  readonly analysis: RegressionAnalysis;
}): JSX.Element {
  const { summary } = analysis;
  const overallPct = Math.round(analysis.confidence * 100);

  const statusColor = summary.isClean
    ? 'text-[var(--tg-success)]'
    : summary.topConfidence >= 0.8
      ? 'text-[var(--tg-error)]'
      : summary.topConfidence >= 0.5
        ? 'text-[var(--tg-warning)]'
        : 'text-[var(--tg-accent)]';

  const kindIconMap: Record<RegressionKind, typeof Search> = {
    geometry: Shuffle,
    attribute: Layers,
    diagnostic: AlertTriangle,
    layer: GitMerge,
    mixed: Search,
  };

  return (
    <div className="rounded-md border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] p-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-bold ${statusColor}`}>
            {summary.isClean
              ? 'No Regression Detected'
              : `${summary.totalCandidates} Candidate${summary.totalCandidates !== 1 ? 's' : ''} Found`}
          </p>
          <p className="mt-0.5 text-xs text-[var(--tg-text-muted)]">
            {summary.totalFeatures} feature{summary.totalFeatures !== 1 ? 's' : ''} analysed
            {summary.dominantKind && ` · dominant: ${summary.dominantKind}`}
          </p>
        </div>

        {!summary.isClean && (
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-[var(--tg-text-muted)]">confidence</span>
            <div className="flex items-center gap-2">
              <div
                className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--tg-bg-primary)]"
                role="progressbar"
                aria-valuenow={overallPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-[var(--tg-accent)] transition-all"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
              <span className="w-9 text-right text-xs font-mono font-semibold text-[var(--tg-text-primary)]">
                {overallPct}%
              </span>
            </div>
          </div>
        )}
      </div>

      {!summary.isClean && (
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.entries(summary.kindCounts) as [RegressionKind, number][])
            .filter(([, count]) => count > 0)
            .map(([kind, count]) => {
              const Icon = kindIconMap[kind] ?? Search;
              return (
                <span
                  key={kind}
                  className="flex items-center gap-1 rounded bg-[var(--tg-bg-hover)] px-1.5 py-0.5 text-[10px] text-[var(--tg-text-muted)]"
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                  {count} {kind}
                </span>
              );
            })}
        </div>
      )}
    </div>
  );
}

function FeatureDetailSection({
  candidate,
}: {
  readonly candidate: RegressionAnalysis['candidates'][number];
}): JSX.Element {
  const fc = candidate.feature;
  const featureA = fc.featureA;
  const featureB = fc.featureB;

  return (
    <div className="rounded-md border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] p-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 font-semibold text-[var(--tg-text-secondary)]">Before (A)</p>
          {featureA ? (
            <dl className="space-y-0.5 text-[10px] text-[var(--tg-text-muted)]">
              <div className="flex gap-1">
                <dt>Layer:</dt>
                <dd className="font-mono">{featureA.layerName}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Type:</dt>
                <dd className="font-mono">{featureA.geometryType}</dd>
              </div>
              <div className="flex gap-1">
                <dt>ID:</dt>
                <dd className="font-mono">{featureA.id !== undefined ? String(featureA.id) : '—'}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Index:</dt>
                <dd className="font-mono">{featureA.featureIndex}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-[10px] italic text-[var(--tg-text-muted)]">Not present</p>
          )}
        </div>

        <div>
          <p className="mb-1 font-semibold text-[var(--tg-text-secondary)]">After (B)</p>
          {featureB ? (
            <dl className="space-y-0.5 text-[10px] text-[var(--tg-text-muted)]">
              <div className="flex gap-1">
                <dt>Layer:</dt>
                <dd className="font-mono">{featureB.layerName}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Type:</dt>
                <dd className="font-mono">{featureB.geometryType}</dd>
              </div>
              <div className="flex gap-1">
                <dt>ID:</dt>
                <dd className="font-mono">{featureB.id !== undefined ? String(featureB.id) : '—'}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Index:</dt>
                <dd className="font-mono">{featureB.featureIndex}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-[10px] italic text-[var(--tg-text-muted)]">Not present</p>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[var(--tg-text-muted)]">Change:</span>
        <span className="font-mono font-semibold text-[var(--tg-accent)]">{fc.kind}</span>
        {fc.matchPriority !== null && (
          <span className="text-[var(--tg-text-muted)]">· match priority {fc.matchPriority}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RegressionPage({
  comparison,
  onSelectFeature,
}: RegressionPageProps): JSX.Element {
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null);

  const analysis = useMemo<RegressionAnalysis | null>(() => {
    if (!comparison) return null;
    return createRegressionEngine().analyze(comparison);
  }, [comparison]);

  const selectedCandidate =
    analysis !== null && selectedCandidateIndex !== null
      ? (analysis.candidates[selectedCandidateIndex] ?? null)
      : null;

  function handleSelectCandidate(index: number): void {
    setSelectedCandidateIndex(index);
    if (analysis && onSelectFeature) {
      const c = analysis.candidates[index];
      if (c) {
        const layer = c.feature.featureA?.layerName ?? c.feature.featureB?.layerName;
        const featureIndex =
          c.feature.featureA?.featureIndex ?? c.feature.featureB?.featureIndex;
        if (layer !== undefined && featureIndex !== undefined) {
          onSelectFeature(layer, featureIndex);
        }
      }
    }
  }

  // ── No comparison loaded yet ─────────────────────────────────────────────
  if (!comparison || !analysis) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <Search className="h-10 w-10 text-[var(--tg-text-muted)]" aria-hidden="true" />
        <p className="text-sm font-semibold text-[var(--tg-text-primary)]">
          Regression Investigation
        </p>
        <p className="max-w-xs text-xs text-[var(--tg-text-muted)]">
          Run a tile comparison first, then switch here to investigate likely root
          causes ranked by confidence.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left column: Summary + Candidate List ── */}
      <div className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-[var(--tg-border)]">
        <div className="space-y-4 p-3">
          <section>
            <SectionHeading>Summary</SectionHeading>
            <div className="mt-2">
              <SummarySection analysis={analysis} />
            </div>
          </section>

          <section>
            <SectionHeading>
              Likely Causes ({analysis.candidates.length})
            </SectionHeading>
          </section>
        </div>

        <div className="flex-1 overflow-y-auto">
          <CandidateList
            candidates={analysis.candidates}
            selectedIndex={selectedCandidateIndex}
            onSelect={handleSelectCandidate}
          />
        </div>
      </div>

      {/* ── Right column: Detail panels ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {selectedCandidate ? (
          <div className="space-y-4 p-4">
            <section>
              <SectionHeading>Feature Details</SectionHeading>
              <div className="mt-2">
                <FeatureDetailSection candidate={selectedCandidate} />
              </div>
            </section>

            <section>
              <SectionHeading>Evidence</SectionHeading>
              <div className="mt-2">
                <EvidencePanel candidate={selectedCandidate} />
              </div>
            </section>

            <section>
              <SectionHeading>Recommendations</SectionHeading>
              <div className="mt-2">
                <RecommendationPanel candidate={selectedCandidate} />
              </div>
            </section>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm text-[var(--tg-text-muted)]">
              {analysis.candidates.length > 0
                ? 'Select a candidate on the left to see details.'
                : 'No candidates to investigate.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
