/**
 * EvidencePanel — displays the structured evidence for one RegressionCandidate.
 *
 * Shows:
 *   - All RegressionEvidence items (confirming and refuting)
 *   - Each item's kind (geometry / property / diagnostic / statistics / layer),
 *     measured value, and baseline value
 *   - Visual cues: green check for confirming, grey dash for refuting
 */

import {
  Activity,
  AlertTriangle,
  Layers,
  Tags,
  TrendingUp,
} from 'lucide-react';
import type { RegressionCandidate } from '../../analysis/models/regression.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EvidencePanelProps {
  readonly candidate: RegressionCandidate;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KIND_ICONS = {
  geometry: Activity,
  property: Tags,
  diagnostic: AlertTriangle,
  statistics: TrendingUp,
  layer: Layers,
} as const;

const KIND_LABELS: Record<string, string> = {
  geometry: 'Geometry',
  property: 'Property',
  diagnostic: 'Diagnostic',
  statistics: 'Statistics',
  layer: 'Layer',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EvidencePanel({ candidate }: EvidencePanelProps): JSX.Element {
  const { evidence, timeline, reasons } = candidate;

  return (
    <div className="space-y-4">
      {/* Reasons summary */}
      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--tg-text-muted)]">
          Contributing Factors
        </h4>
        <ul className="space-y-1">
          {reasons.map((reason) => (
            <li
              key={reason.code}
              className="flex items-start gap-2 rounded-md bg-[var(--tg-bg-secondary)] px-2 py-1.5"
            >
              <SeverityDot severity={reason.severity} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--tg-text-primary)]">
                  {reason.description}
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--tg-text-muted)]">
                  weight: {reason.weight}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Evidence items */}
      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--tg-text-muted)]">
          Evidence
        </h4>
        {evidence.length === 0 ? (
          <p className="text-xs text-[var(--tg-text-muted)]">
            No structured evidence available.
          </p>
        ) : (
          <ul className="space-y-1">
            {evidence.map((ev, i) => {
              const Icon = KIND_ICONS[ev.kind] ?? Activity;
              return (
                <li
                  key={`${ev.kind}-${ev.label}-${i}`}
                  className="flex items-start gap-2 rounded-md border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-2 py-1.5"
                >
                  <span
                    className={
                      ev.confirms
                        ? 'mt-0.5 text-[var(--tg-success)]'
                        : 'mt-0.5 text-[var(--tg-text-muted)]'
                    }
                    aria-label={
                      ev.confirms ? 'Confirms regression' : 'Does not confirm'
                    }
                  >
                    {ev.confirms ? '✓' : '–'}
                  </span>
                  <Icon
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tg-text-secondary)]"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[var(--tg-text-primary)]">
                      {ev.label}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-[var(--tg-text-muted)]">
                      <span>{KIND_LABELS[ev.kind] ?? ev.kind}</span>
                      {ev.measuredValue !== undefined && (
                        <span className="font-mono">
                          value: {String(ev.measuredValue)}
                        </span>
                      )}
                      {ev.baselineValue !== undefined && (
                        <span className="font-mono">
                          baseline: {String(ev.baselineValue)}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Timeline */}
      {timeline.length > 0 && (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--tg-text-muted)]">
            Impact Narrative
          </h4>
          <ol className="relative ml-2 space-y-2 border-l border-[var(--tg-border)] pl-4">
            {timeline.map((step, i) => (
              <li key={i} className="relative">
                <span
                  className="absolute -left-[1.125rem] top-1.5 h-2 w-2 rounded-full bg-[var(--tg-accent)]"
                  aria-hidden="true"
                />
                <p className="text-xs text-[var(--tg-text-primary)]">
                  {step.label}
                </p>
                {step.detail && (
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--tg-text-muted)]">
                    {step.detail}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SeverityDot({
  severity,
}: {
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
}): JSX.Element {
  const colorMap = {
    critical: 'bg-[var(--tg-error)]',
    high: 'bg-[var(--tg-warning)]',
    medium: 'bg-[var(--tg-accent)]',
    low: 'bg-[var(--tg-text-muted)]',
  };
  return (
    <span
      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${colorMap[severity]}`}
      aria-label={severity}
    />
  );
}
