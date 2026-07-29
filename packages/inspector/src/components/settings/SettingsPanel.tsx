/**
 * @tileguard/inspector — SettingsPanel (Milestone 6 — Step 3)
 *
 * Full-width settings panel shown when the Settings tab is active.
 *
 * All state reads from useSettings() which subscribes to SettingsService.
 * All mutations go through inspector.updateSettings() → SettingsService →
 * renderer update → re-render.
 *
 * Categories:
 *   Rendering   — vertices, tile/buffer bounds, anti-aliasing
 *   Interaction — hover, auto-focus, smooth zoom, selection outline
 *   Diagnostics — minimum severity filter
 *   Appearance  — overlay opacity, selection/hover thickness
 */
import type { Inspector } from '../../create-inspector.js';
import { useSettings } from '../../hooks/use-statistics-settings.js';
import './SettingsPanel.css';
import { Section } from './Section.js';
import { SliderSetting } from './SliderSetting.js';
import { ToggleSetting } from './ToggleSetting.js';

export interface SettingsPanelProps {
  readonly inspector: Inspector | null;
}

export function SettingsPanel({ inspector }: SettingsPanelProps): JSX.Element {
  const settings = useSettings();

  const update = (patch: Parameters<Inspector['updateSettings']>[0]) => {
    inspector?.updateSettings(patch);
  };

  const reset = () => {
    inspector?.resetSettings();
  };

  return (
    <div className="settings-panel" aria-label="Settings panel">
      <div className="settings-panel__header">
        <span className="settings-panel__title">Settings</span>
        <button
          type="button"
          className="settings-panel__reset-btn"
          onClick={reset}
          aria-label="Reset all settings to defaults"
          title="Reset to defaults"
        >
          ↺ Reset
        </button>
      </div>

      <div className="settings-panel__body">
        {/* ── Rendering ─────────────────────────────────────────────── */}
        <Section title="Rendering">
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
        </Section>

        {/* ── Interaction ──────────────────────────────────────────── */}
        <Section title="Interaction">
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
        </Section>

        {/* ── Diagnostics ───────────────────────────────────────────── */}
        <Section title="Diagnostics">
          <div className="settings-panel__row settings-panel__row--label">
            <span className="settings-panel__field-label">
              Minimum severity
            </span>
          </div>
          <div
            className="settings-panel__severity-group"
            role="radiogroup"
            aria-label="Minimum diagnostic severity"
          >
            {(['error', 'warning', 'info'] as const).map((sev) => (
              <label key={sev} className="settings-panel__severity-option">
                <input
                  type="radio"
                  name="minSeverity"
                  value={sev}
                  checked={settings.minSeverity === sev}
                  onChange={() => update({ minSeverity: sev })}
                  className="settings-panel__radio"
                />
                <span
                  className={`settings-panel__severity-label settings-panel__severity-label--${sev}`}
                >
                  {sev.charAt(0).toUpperCase() + sev.slice(1)}
                </span>
              </label>
            ))}
          </div>
        </Section>

        {/* ── Appearance ───────────────────────────────────────────── */}
        <Section title="Appearance">
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
        </Section>

        {/* ── Keyboard shortcuts reference ─────────────────────────── */}
        <Section title="Keyboard shortcuts" defaultOpen={false}>
          <div className="settings-panel__shortcuts">
            {[
              { key: 'F', desc: 'Focus selected feature' },
              { key: 'R', desc: 'Reset view' },
              { key: 'Esc', desc: 'Clear selection' },
              { key: 'Ctrl+F', desc: 'Focus search' },
              { key: 'Ctrl+,', desc: 'Open settings' },
              { key: 'Ctrl+1', desc: 'Diagnostics tab' },
              { key: 'Ctrl+2', desc: 'Statistics tab' },
              { key: 'Ctrl+3', desc: 'Settings tab' },
            ].map(({ key, desc }) => (
              <div key={key} className="settings-panel__shortcut-row">
                <kbd className="settings-panel__kbd">{key}</kbd>
                <span className="settings-panel__shortcut-desc">{desc}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
