/**
 * @tileguard/inspector — LoadingOverlay (Phase 2 — Step 13)
 *
 * Multi-step loading progress display shown while a tile is being decoded.
 *
 * Phase 2 improvements:
 *   - Framer Motion animations: steps fade+slide in as they become active.
 *   - Animated progress bar showing overall completion.
 *   - Staggered step entrance animation on mount.
 */

import { motion } from 'framer-motion';
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
  detail: string;
}

const STEPS: StepDef[] = [
  { id: 'loading', label: 'Reading PBF', detail: 'Fetching the tile binary' },
  {
    id: 'parsing',
    label: 'Decoding geometry',
    detail: 'Building the spatial index',
  },
  {
    id: 'statistics',
    label: 'Computing statistics',
    detail: 'Counting features and layers',
  },
  {
    id: 'diagnostics',
    label: 'Running diagnostics',
    detail: 'Applying quality rules',
  },
  { id: 'ready', label: 'Workspace ready', detail: 'All checks passed' },
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
  const progressPct = Math.round((currentIdx / (STEPS.length - 1)) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--tg-bg-primary)]/90 backdrop-blur-sm"
      role="status"
      aria-label="Loading tile"
      aria-live="polite"
    >
      <motion.div
        initial={{ scale: 0.95, y: 8, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.05, ease: 'easeOut' }}
        className="w-80 rounded-xl border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] p-6 shadow-[var(--tg-shadow-lg)]"
      >
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-[var(--tg-text-primary)]">
            {error != null ? 'Load failed' : 'Preparing Workspace'}
          </h2>
          {fileName != null && (
            <p className="mt-0.5 max-w-full truncate text-[11px] text-[var(--tg-text-muted)]">
              {fileName}
            </p>
          )}
        </div>

        {error != null ? (
          <div className="rounded-md border border-[var(--tg-error)]/30 bg-[var(--tg-error)]/10 px-3 py-2.5 text-xs text-[var(--tg-error)]">
            {error}
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-[var(--tg-bg-surface)]">
              <motion.div
                className="h-full rounded-full bg-[var(--tg-accent)]"
                initial={{ width: '0%' }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>

            {/* Steps */}
            <ol className="space-y-2">
              {STEPS.map((step, i) => {
                const isDone = i < currentIdx;
                const isActive = i === currentIdx;
                const isPending = i > currentIdx;

                return (
                  <motion.li
                    key={step.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: isPending ? 0.4 : 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.04 }}
                    className="flex items-start gap-3"
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                      {isDone ? (
                        <CheckCircle2
                          className="h-4 w-4 text-[var(--tg-success)]"
                          aria-hidden="true"
                        />
                      ) : isActive ? (
                        <Loader2
                          className="h-4 w-4 animate-spin text-[var(--tg-accent)]"
                          aria-hidden="true"
                        />
                      ) : (
                        <Circle
                          className="h-4 w-4 text-[var(--tg-text-muted)]"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span
                        className={[
                          'block text-xs',
                          isDone
                            ? 'text-[var(--tg-text-secondary)]'
                            : isActive
                              ? 'font-medium text-[var(--tg-text-primary)]'
                              : 'text-[var(--tg-text-muted)]',
                        ].join(' ')}
                      >
                        {step.label}
                      </span>
                      {isActive && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="block text-[10px] text-[var(--tg-text-muted)]"
                        >
                          {step.detail}
                        </motion.span>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
