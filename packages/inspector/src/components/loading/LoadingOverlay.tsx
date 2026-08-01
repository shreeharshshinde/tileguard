/**
 * @tileguard/inspector — LoadingOverlay (Milestone 6 — Step 4)
 *
 * Multi-step loading progress display shown while a tile is being decoded.
 */

import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

export type LoadingStep =
  | 'loading'
  | 'parsing'
  | 'statistics'
  | 'diagnostics'
  | 'ready';

interface StepDef {
  id: LoadingStep;
  label: string;
}

const STEPS: StepDef[] = [
  { id: 'loading', label: 'Loading tile' },
  { id: 'parsing', label: 'Parsing geometry' },
  { id: 'statistics', label: 'Building statistics' },
  { id: 'diagnostics', label: 'Preparing diagnostics' },
  { id: 'ready', label: 'Ready' },
];

const STEP_ORDER: LoadingStep[] = STEPS.map((s) => s.id);

function stepIndex(step: LoadingStep): number {
  return STEP_ORDER.indexOf(step);
}

export interface LoadingOverlayProps {
  readonly currentStep: LoadingStep;
  readonly fileName?: string;
  readonly error?: string;
}

export function LoadingOverlay({
  currentStep,
  fileName,
  error,
}: LoadingOverlayProps): JSX.Element {
  const currentIdx = stepIndex(currentStep);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--tg-bg-primary)]/90 backdrop-blur-sm"
      role="status"
      aria-label="Loading tile"
      aria-live="polite"
    >
      <div className="w-72 rounded-lg border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] p-6 shadow-[var(--tg-shadow-md)]">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-[var(--tg-text-primary)]">
            {error != null ? 'Load failed' : 'Loading'}
          </h2>
          {fileName != null && (
            <p className="mt-0.5 max-w-full truncate text-[11px] text-[var(--tg-text-muted)]">
              {fileName}
            </p>
          )}
        </div>

        {error != null ? (
          <div className="rounded border border-[var(--tg-error)]/30 bg-[var(--tg-error)]/10 px-3 py-2 text-xs text-[var(--tg-error)]">
            {error}
          </div>
        ) : (
          <ol className="space-y-2">
            {STEPS.map((step, i) => {
              const isDone = i < currentIdx;
              const isActive = i === currentIdx;

              return (
                <li
                  key={step.id}
                  className="flex items-center gap-3 text-xs"
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isDone ? (
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-[var(--tg-success)]"
                      aria-hidden="true"
                    />
                  ) : isActive ? (
                    <Loader2
                      className="h-4 w-4 shrink-0 animate-spin text-[var(--tg-accent)]"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="h-4 w-4 shrink-0 text-[var(--tg-text-muted)]"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={
                      isDone
                        ? 'text-[var(--tg-text-secondary)]'
                        : isActive
                          ? 'font-medium text-[var(--tg-text-primary)]'
                          : 'text-[var(--tg-text-muted)]'
                    }
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
