/**
 * @tileguard/inspector — SettingsOverlay (Phase 1 — Step 6)
 *
 * Settings displayed as a slide-over overlay on top of the current
 * workspace view instead of replacing the active page.
 *
 * The canvas remains visible and live behind the overlay; no state is
 * lost when the overlay is opened or closed.
 *
 * Spec:
 *   Workspace
 *     └── Overlay
 *           └── Settings   (existing SettingsPanel reused unchanged)
 *
 * Accessibility:
 *   - Role="dialog" with aria-label
 *   - Focus trap: Tab/Shift+Tab cycle within the overlay
 *   - Escape key closes the overlay
 *   - Backdrop click closes the overlay
 */
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useInspectorContext } from '../../context/InspectorContext.js';
import { SettingsPanel } from './SettingsPanel.js';

export interface SettingsOverlayProps {
  /** Called when the overlay should be closed. */
  readonly onClose: () => void;
}

export function SettingsOverlay({ onClose }: SettingsOverlayProps): JSX.Element {
  const { inspector } = useInspectorContext();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus the close button when the overlay opens
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Trap focus within the overlay
  useEffect(() => {
    const container = overlayRef.current;
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
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);
    return () => container.removeEventListener('keydown', handleTab);
  }, []);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end"
      aria-modal="true"
    >
      {/* Semi-transparent backdrop — click to dismiss */}
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={overlayRef}
        role="dialog"
        aria-label="Settings"
        className="relative z-10 flex w-[var(--tg-sidebar-width)] max-w-full flex-col overflow-hidden border-l border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] shadow-[var(--tg-shadow-lg)]"
        style={{ animation: 'slideInFromRight 200ms ease' }}
      >
        {/* Overlay header */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--tg-border)] px-[var(--tg-space-md)]">
          <span className="text-sm font-semibold text-[var(--tg-text-primary)]">
            Settings
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-[var(--tg-border-radius)] p-1.5 text-[var(--tg-text-secondary)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tg-accent)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* SettingsPanel — existing component, fully reused */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SettingsPanel inspector={inspector} />
        </div>
      </div>

      {/* Keyframe animation injected inline so no CSS file is needed */}
      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
