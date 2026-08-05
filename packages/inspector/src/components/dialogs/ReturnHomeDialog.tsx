/**
 * @tileguard/inspector — ReturnHomeDialog (Phase 1 — Step 9)
 *
 * Confirmation dialog shown when the user tries to leave an active session
 * and return to the Home screen.
 *
 * Spec text:
 *   Return Home?
 *   Discard current investigation?
 *
 *   [ Cancel ]   [ Return Home ]
 *
 * This prevents silent state loss — the user must explicitly confirm that
 * they want to close the current session.
 *
 * Accessibility:
 *   - role="alertdialog" (destructive action)
 *   - aria-labelledby / aria-describedby
 *   - Focus trap within the dialog
 *   - Escape key → Cancel
 *   - Backdrop click → Cancel (same as Cancel button)
 */
import { AlertTriangle } from 'lucide-react';
import { useEffect, useRef } from 'react';

export interface ReturnHomeDialogProps {
  /** Called when the user confirms returning to Home. */
  readonly onConfirm: () => void;
  /** Called when the user cancels and wants to stay in the workspace. */
  readonly onCancel: () => void;
}

export function ReturnHomeDialog({
  onConfirm,
  onCancel,
}: ReturnHomeDialogProps): JSX.Element {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus the Cancel button by default so Escape / Enter both feel safe
  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // Trap focus inside the dialog
  useEffect(() => {
    const container = dialogRef.current;
    if (container === null) return;

    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (focusable.length === 0) { e.preventDefault(); return; }
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };

    container.addEventListener('keydown', handleTab);
    return () => container.removeEventListener('keydown', handleTab);
  }, []);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[var(--tg-space-lg)]"
      aria-modal="true"
    >
      {/* Semi-transparent backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        aria-hidden="true"
        onClick={onCancel}
      />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-labelledby="return-home-title"
        aria-describedby="return-home-desc"
        className="relative z-10 w-full max-w-sm rounded-[var(--tg-panel-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] p-[var(--tg-space-xl)] shadow-[var(--tg-shadow-lg)]"
        style={{ animation: 'fadeInScale 150ms ease' }}
      >
        {/* Icon + Title */}
        <div className="mb-[var(--tg-space-md)] flex items-start gap-[var(--tg-space-md)]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--tg-warning)]/15">
            <AlertTriangle
              className="h-5 w-5 text-[var(--tg-warning)]"
              aria-hidden="true"
            />
          </div>
          <div>
            <h2
              id="return-home-title"
              className="text-base font-semibold text-[var(--tg-text-primary)]"
            >
              Return Home?
            </h2>
            <p
              id="return-home-desc"
              className="mt-[var(--tg-space-xs)] text-sm text-[var(--tg-text-secondary)]"
            >
              Discard current investigation?
            </p>
          </div>
        </div>

        {/* Additional context */}
        <p className="mb-[var(--tg-space-xl)] text-xs text-[var(--tg-text-muted)]">
          Returning to Home will close the current session. Any unsaved analysis
          will be lost.
        </p>

        {/* Action buttons */}
        <div className="flex justify-end gap-[var(--tg-space-sm)]">
          {/* Cancel — focused by default (safe action) */}
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-[var(--tg-border-radius)] border border-[var(--tg-border)] bg-[var(--tg-bg-surface)] px-[var(--tg-space-lg)] py-[var(--tg-space-sm)] text-sm font-medium text-[var(--tg-text-primary)] transition hover:bg-[var(--tg-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)]"
          >
            Cancel
          </button>

          {/* Return Home — destructive primary action */}
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[var(--tg-border-radius)] bg-[var(--tg-accent)] px-[var(--tg-space-lg)] py-[var(--tg-space-sm)] text-sm font-medium text-white transition hover:bg-[var(--tg-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tg-bg-secondary)]"
          >
            Return Home
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
