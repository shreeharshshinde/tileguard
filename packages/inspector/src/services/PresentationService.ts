/**
 * @tileguard/inspector — PresentationService (Milestone 7.5 — Step D)
 *
 * Manages Presentation Mode — a projector-optimised display mode that:
 *   - Adds/removes class "presentation-mode" on <html>
 *   - Persists preference to localStorage
 *   - Notifies subscribers on toggle
 *
 * Activation: Ctrl+Shift+P keyboard shortcut (registered in ShortcutService)
 * Deactivation: same shortcut, or clicking the toolbar toggle
 *
 * CSS effects (defined in tokens.css / presentation.css):
 *   - Increased font size (+2px across the board)
 *   - Increased panel padding
 *   - Larger icons
 *   - Higher contrast accent colours
 *   - Hides: FPS counter, DeveloperOverlay, debug buttons
 *   - Larger selection/hover outline thickness on canvas
 *
 * Architecture: pure CSS-class approach — no theme-switching, no new
 * providers, no React context needed. The <html> class propagates naturally
 * to all descendant CSS var consumers.
 *
 * Boundary: DOM only. No React, no store, no renderer.
 */

const STORAGE_KEY = 'tileguard:inspector:presentation-mode:v1';
const HTML_CLASS = 'presentation-mode';

// ---------------------------------------------------------------------------
// PresentationService interface
// ---------------------------------------------------------------------------

export interface PresentationService {
  /** Returns true if presentation mode is currently active. */
  isActive(): boolean;

  /** Toggle presentation mode on/off. */
  toggle(): void;

  /** Explicitly enable presentation mode. */
  enable(): void;

  /** Explicitly disable presentation mode. */
  disable(): void;

  /** Subscribe to changes. Returns unsubscribe callback. */
  subscribe(listener: (active: boolean) => void): () => void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class PresentationServiceImpl implements PresentationService {
  private _active: boolean;
  private readonly _listeners: Set<(active: boolean) => void> = new Set();

  constructor() {
    // Restore from localStorage
    try {
      const stored =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(STORAGE_KEY)
          : null;
      this._active = stored === 'true';
    } catch {
      this._active = false;
    }
    this._applyClass();
  }

  isActive(): boolean {
    return this._active;
  }

  toggle(): void {
    this._active ? this.disable() : this.enable();
  }

  enable(): void {
    if (this._active) return;
    this._active = true;
    this._applyClass();
    this._persist();
    this._notify();
  }

  disable(): void {
    if (!this._active) return;
    this._active = false;
    this._applyClass();
    this._persist();
    this._notify();
  }

  subscribe(listener: (active: boolean) => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _applyClass(): void {
    if (typeof document === 'undefined') return;
    if (this._active) {
      document.documentElement.classList.add(HTML_CLASS);
    } else {
      document.documentElement.classList.remove(HTML_CLASS);
    }
  }

  private _persist(): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, String(this._active));
      }
    } catch {
      // Ignore
    }
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      try {
        listener(this._active);
      } catch {
        // Isolate listener errors
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _instance: PresentationService | null = null;

export function getPresentationService(): PresentationService {
  if (_instance === null) {
    _instance = new PresentationServiceImpl();
  }
  return _instance;
}

/** Reset singleton — for tests. */
export function resetPresentationServiceInstance(): void {
  _instance = null;
}
