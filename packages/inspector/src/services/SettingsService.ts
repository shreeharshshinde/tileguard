/**
 * @tileguard/inspector — SettingsService (Milestone 6 — Step 3)
 *
 * Manages persistent user preferences via localStorage.
 * Exposes a subscribe/notify API so React hooks can use
 * useSyncExternalStore() to react to settings changes.
 *
 * Architecture:
 *   - All settings are owned here; InspectorStore never sees them.
 *   - SettingsService is the single source of truth for preferences.
 *   - The Inspector facade bridges SettingsService → CanvasRenderer.
 *
 * Persistence:
 *   - Serialised to localStorage under STORAGE_KEY on every update.
 *   - Loaded lazily on first access; falls back to defaults on error.
 *   - Gracefully degrades when localStorage is unavailable.
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, React, or DOM
 * canvas APIs. Only uses window.localStorage.
 */

// ---------------------------------------------------------------------------
// Settings model
// ---------------------------------------------------------------------------

export interface InspectorSettings {
  // Rendering
  readonly showVertices: boolean;
  readonly showTileBounds: boolean;
  readonly showBufferBounds: boolean;
  readonly antiAliasing: boolean;

  // Interaction
  readonly hoverEnabled: boolean;
  readonly autoFocusDiagnostics: boolean;
  readonly smoothZoom: boolean;
  readonly selectionOutline: boolean;

  // Diagnostics display
  readonly minSeverity: 'error' | 'warning' | 'info';

  // Appearance
  readonly overlayOpacity: number;   // 0.0 – 1.0
  readonly selectionThickness: number; // 1 – 6
  readonly hoverThickness: number;   // 1 – 6
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS: Readonly<InspectorSettings> = Object.freeze({
  showVertices: false,
  showTileBounds: true,
  showBufferBounds: true,
  antiAliasing: true,
  hoverEnabled: true,
  autoFocusDiagnostics: true,
  smoothZoom: true,
  selectionOutline: true,
  minSeverity: 'info',
  overlayOpacity: 0.85,
  selectionThickness: 2,
  hoverThickness: 1,
});

const STORAGE_KEY = 'tileguard:inspector:settings:v1';

// ---------------------------------------------------------------------------
// Serialisation helpers
// ---------------------------------------------------------------------------

function loadFromStorage(): InspectorSettings {
  try {
    const raw = typeof window !== 'undefined'
      ? window.localStorage.getItem(STORAGE_KEY)
      : null;
    if (raw === null) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<InspectorSettings>;
    // Merge parsed values over defaults — unknown keys are ignored
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      // Clamp numeric values to safe ranges
      overlayOpacity: clamp(parsed.overlayOpacity ?? DEFAULT_SETTINGS.overlayOpacity, 0, 1),
      selectionThickness: clamp(parsed.selectionThickness ?? DEFAULT_SETTINGS.selectionThickness, 1, 6),
      hoverThickness: clamp(parsed.hoverThickness ?? DEFAULT_SETTINGS.hoverThickness, 1, 6),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveToStorage(settings: InspectorSettings): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  } catch {
    // Silently ignore quota exceeded / private-browsing restrictions
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// SettingsService interface
// ---------------------------------------------------------------------------

export interface SettingsService {
  /** Returns the current settings snapshot. Always returns a frozen object. */
  getSettings(): InspectorSettings;

  /**
   * Apply a partial update. Only the supplied keys are changed.
   * Notifies all subscribers synchronously, then persists to localStorage.
   */
  updateSettings(patch: Partial<InspectorSettings>): void;

  /**
   * Reset all settings to their default values.
   * Notifies subscribers and persists.
   */
  resetSettings(): void;

  /**
   * Register a change listener (for useSyncExternalStore).
   * Returns an unsubscribe callback (idempotent).
   */
  subscribe(listener: () => void): () => void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class SettingsServiceImpl implements SettingsService {
  private _settings: InspectorSettings;
  private readonly _listeners: Set<() => void> = new Set();

  constructor() {
    this._settings = loadFromStorage();
  }

  getSettings(): InspectorSettings {
    return this._settings;
  }

  updateSettings(patch: Partial<InspectorSettings>): void {
    const next: InspectorSettings = { ...this._settings, ...patch };
    // Clamp numeric settings
    const clamped: InspectorSettings = {
      ...next,
      overlayOpacity: clamp(next.overlayOpacity, 0, 1),
      selectionThickness: clamp(next.selectionThickness, 1, 6),
      hoverThickness: clamp(next.hoverThickness, 1, 6),
    };
    this._settings = Object.freeze(clamped);
    this._notify();
    saveToStorage(this._settings);
  }

  resetSettings(): void {
    this._settings = DEFAULT_SETTINGS;
    this._notify();
    saveToStorage(this._settings);
  }

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      try {
        listener();
      } catch {
        // Isolate listener errors
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton factory (one instance per application)
// ---------------------------------------------------------------------------

let _instance: SettingsService | null = null;

/**
 * Returns the application-wide SettingsService singleton.
 *
 * Using a singleton ensures all consumers share the same settings state
 * without threading it through context. The Inspector facade and React
 * hooks both call this to read/write settings.
 *
 * @example
 *   const svc = getSettingsService();
 *   svc.updateSettings({ showVertices: true });
 */
export function getSettingsService(): SettingsService {
  if (_instance === null) {
    _instance = new SettingsServiceImpl();
  }
  return _instance;
}

/**
 * Replace the singleton with a fresh instance.
 * Use in tests to reset state between test cases.
 */
export function resetSettingsServiceInstance(): void {
  _instance = null;
}
