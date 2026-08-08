/**
 * @tileguard/inspector — SettingsOverlay (Phase 2 — Step 7)
 *
 * Settings displayed as a slide-over overlay on top of the workspace.
 * The canvas remains visible and live behind the overlay.
 *
 * Phase 2 improvements:
 *   - Tabbed categories: Appearance | Interaction | Diagnostics | Rendering | Keyboard | Developer
 *   - Each tab shows only the relevant settings group.
 *   - Framer Motion slide-in animation.
 *
 * Accessibility:
 *   - Role="dialog" with aria-label
 *   - Focus trap: Tab/Shift+Tab cycle within the overlay
 *   - Escape key closes the overlay
 *   - Backdrop click closes the overlay
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  Code,
  Keyboard,
  Layers,
  Monitor,
  MousePointer,
  ScanLine,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useInspectorContext } from '../../context/InspectorContext.js';
import type { Inspector } from '../../create-inspector.js';
import { useSettings } from '../../hooks/use-statistics-settings.js';
import { SliderSetting } from './SliderSetting.js';
import { ToggleSetting } from './ToggleSetting.js';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { id: 'appearance', label: 'Appearance', icon: Monitor },
  { id: 'interaction', label: 'Interaction', icon: MousePointer },
  { id: 'diagnostics', label: 'Diagnostics', icon: ScanLine },
  { id: 'rendering', label: 'Rendering', icon: Layers },
  { id: 'keyboard', label: 'Keyboard', icon: Keyboard },
  { id: 'developer', label: 'Developer', icon: Code },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface SettingsOverlayProps {
  readonly onClose: () => void;
}

export function SettingsOverlay({
  onClose,
}: SettingsOverlayProps): JSX.Element {
  const { inspector } = useInspectorContext();
  const settings = useSettings();
  const [activeTab, setActiveTab] = useState('appearance');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const update = (patch: Parameters<Inspector['updateSettings']>[0]) => {
    inspector?.updateSettings(patch);
  };

  const reset = () => {
    inspector?.resetSettings();
  };

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

    const getFocusable = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
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

  const rowClass =
    'flex items-center justify-between gap-4 py-3 border-b border-[var(--tg-border)] last:border-0';
  const labelClass = 'text-sm font-medium text-[var(--tg-text-primary)]';
  const descClass = 'mt-0.5 text-xs text-[var(--tg-text-muted)]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        ref={overlayRef}
        role="dialog"
        aria-label="Settings"
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative z-10 flex w-[380px] max-w-full flex-col overflow-hidden border-l border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] shadow-[var(--tg-shadow-lg)]"
      >
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--tg-border)] px-4">
          <span className="text-sm font-semibold text-[var(--tg-text-primary)]">
            Settings
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-[var(--tg-text-muted)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-secondary)]"
              aria-label="Reset all settings to defaults"
            >
              Reset
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close settings"
              className="rounded-md p-1.5 text-[var(--tg-text-secondary)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Tab strip */}
        <div
          role="tablist"
          aria-label="Settings categories"
          className="flex shrink-0 overflow-x-auto border-b border-[var(--tg-border)] px-2"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-[var(--tg-accent)] text-[var(--tg-accent)]'
                    : 'border-transparent text-[var(--tg-text-muted)] hover:text-[var(--tg-text-secondary)]',
                ].join(' ')}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {activeTab === 'appearance' && (
            <div className="space-y-0">
              <SliderSetting
                label="Overlay opacity"
                description="Transparency of diagnostic overlay markers"
                value={settings.overlayOpacity}
                min={0.1}
                max={1.0}
                step={0.05}
                onChange={(v) => update({ overlayOpacity: v })}
                format={(v) => `${Math.round(v * 100)}%`}
              />
              <SliderSetting
                label="Selection thickness"
                description="Outline width of the selected feature"
                value={settings.selectionThickness}
                min={1}
                max={6}
                step={1}
                onChange={(v) => update({ selectionThickness: v })}
                format={(v) => `${v}px`}
              />
              <SliderSetting
                label="Hover thickness"
                description="Outline width of the hovered feature"
                value={settings.hoverThickness}
                min={1}
                max={6}
                step={1}
                onChange={(v) => update({ hoverThickness: v })}
                format={(v) => `${v}px`}
              />
            </div>
          )}

          {activeTab === 'interaction' && (
            <div className="space-y-0">
              <ToggleSetting
                label="Hover highlight"
                description="Highlight the feature under the cursor"
                checked={settings.hoverEnabled}
                onChange={(v) => update({ hoverEnabled: v })}
              />
              <ToggleSetting
                label="Auto-focus diagnostics"
                description="Scroll the canvas to the affected feature when selecting a diagnostic"
                checked={settings.autoFocusDiagnostics}
                onChange={(v) => update({ autoFocusDiagnostics: v })}
              />
              <ToggleSetting
                label="Smooth zoom"
                description="Animate zoom transitions"
                checked={settings.smoothZoom}
                onChange={(v) => update({ smoothZoom: v })}
              />
              <ToggleSetting
                label="Selection outline"
                description="Draw a prominent outline around the selected feature"
                checked={settings.selectionOutline}
                onChange={(v) => update({ selectionOutline: v })}
              />
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              <div>
                <p className="mb-3 text-sm font-medium text-[var(--tg-text-primary)]">
                  Minimum severity
                </p>
                <div
                  className="flex flex-col gap-2"
                  role="radiogroup"
                  aria-label="Minimum diagnostic severity"
                >
                  {(['error', 'warning', 'info'] as const).map((sev) => (
                    <label
                      key={sev}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-[var(--tg-border)] px-3 py-2 transition hover:bg-[var(--tg-bg-hover)]"
                    >
                      <input
                        type="radio"
                        name="minSeverity"
                        value={sev}
                        checked={settings.minSeverity === sev}
                        onChange={() => update({ minSeverity: sev })}
                        className="h-4 w-4 accent-[var(--tg-accent)]"
                      />
                      <span
                        className={[
                          'text-sm font-medium',
                          sev === 'error'
                            ? 'text-[var(--tg-error)]'
                            : sev === 'warning'
                              ? 'text-[var(--tg-warning)]'
                              : 'text-[var(--tg-info)]',
                        ].join(' ')}
                      >
                        {sev.charAt(0).toUpperCase() + sev.slice(1)} and above
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rendering' && (
            <div className="space-y-0">
              <ToggleSetting
                label="Show vertices"
                description="Draw a marker on every geometry vertex"
                checked={settings.showVertices}
                onChange={(v) => update({ showVertices: v })}
              />
              <ToggleSetting
                label="Show tile bounds"
                description="Draw the tile extent rectangle"
                checked={settings.showTileBounds}
                onChange={(v) => update({ showTileBounds: v })}
              />
              <ToggleSetting
                label="Show buffer bounds"
                description="Draw the tile buffer zone rectangle"
                checked={settings.showBufferBounds}
                onChange={(v) => update({ showBufferBounds: v })}
              />
              <ToggleSetting
                label="Anti-aliasing"
                description="Smooth geometry edges"
                checked={settings.antiAliasing}
                onChange={(v) => update({ antiAliasing: v })}
              />
            </div>
          )}

          {activeTab === 'keyboard' && (
            <div className="space-y-1">
              <p className="mb-3 text-xs text-[var(--tg-text-muted)]">
                Global keyboard shortcuts available in the workspace.
              </p>
              {[
                { key: 'Ctrl+K', desc: 'Open command palette' },
                { key: '?', desc: 'Show keyboard shortcuts' },
                { key: 'Ctrl+,', desc: 'Open settings' },
                { key: 'Ctrl+1', desc: 'Diagnostics tab' },
                { key: 'Ctrl+2', desc: 'Statistics tab' },
                { key: 'Ctrl+F', desc: 'Focus search' },
                { key: 'Ctrl+Shift+P', desc: 'Presentation mode' },
                { key: 'R', desc: 'Reset view' },
                { key: 'Esc', desc: 'Clear selection' },
                { key: 'F', desc: 'Focus selected feature' },
              ].map(({ key, desc }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-md px-2 py-2 transition hover:bg-[var(--tg-bg-hover)]"
                >
                  <span className="text-xs text-[var(--tg-text-secondary)]">
                    {desc}
                  </span>
                  <kbd className="rounded bg-[var(--tg-bg-surface)] px-2 py-0.5 font-mono text-[10px] text-[var(--tg-text-primary)] ring-1 ring-[var(--tg-border)]">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'developer' && (
            <div className="space-y-0">
              <div className={rowClass}>
                <div>
                  <p className={labelClass}>Developer overlay</p>
                  <p className={descClass}>
                    FPS, memory, and viewport metrics (Ctrl+D)
                  </p>
                </div>
                <span className="rounded-full bg-[var(--tg-bg-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--tg-text-muted)]">
                  Ctrl+D
                </span>
              </div>
              <div className={rowClass}>
                <div>
                  <p className={labelClass}>Version</p>
                  <p className={descClass}>TileGuard Inspector v1.0.0</p>
                </div>
              </div>
              <div className={rowClass}>
                <div>
                  <p className={labelClass}>Session storage key</p>
                  <p className={descClass + ' font-mono'}>
                    tileguard:inspector:workspace:v1
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
