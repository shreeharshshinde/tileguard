/**
 * @tileguard/inspector — WorkspaceService (Milestone 6 — Step 4)
 *
 * Persists and restores the user's workspace layout across sessions.
 *
 * Stored state:
 *   - Left/right panel collapsed state
 *   - Active navigation tab
 *   - Last viewport state (zoom, panX, panY)
 *   - Last loaded file path (display only — not reloaded automatically)
 *
 * Storage key: tileguard:inspector:workspace:v1
 * Storage backend: localStorage (graceful degradation if unavailable).
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs
 * beyond window.localStorage.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type WorkspaceTab =
  | 'welcome'
  | 'inspector'
  | 'diagnostics'
  | 'statistics'
  | 'compare'
  | 'regression'
  | 'reports'
  | 'style-explorer'
  | 'settings';

export interface WorkspaceViewport {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

export interface WorkspaceLayout {
  /** Whether the left (diagnostics/stats/settings) panel is collapsed. */
  readonly leftCollapsed: boolean;
  /** Whether the right (feature inspector) panel is collapsed. */
  readonly rightCollapsed: boolean;
  /** The active navigation tab. */
  readonly activeTab: WorkspaceTab;
  /** Last known viewport position (for restore on same tile). */
  readonly viewport: WorkspaceViewport | null;
  /** Last loaded file path (for display; not auto-reloaded). */
  readonly lastFilePath: string | null;
}

export const DEFAULT_LAYOUT: Readonly<WorkspaceLayout> = Object.freeze({
  leftCollapsed: false,
  rightCollapsed: false,
  activeTab: 'welcome',
  viewport: null,
  lastFilePath: null,
});

const STORAGE_KEY = 'tileguard:inspector:workspace:v1';

// ---------------------------------------------------------------------------
// WorkspaceService interface
// ---------------------------------------------------------------------------

export interface WorkspaceService {
  /** Returns the currently loaded workspace layout. */
  getLayout(): WorkspaceLayout;

  /**
   * Apply a partial update and persist immediately.
   * Notifies all subscribers.
   */
  updateLayout(patch: Partial<WorkspaceLayout>): void;

  /** Reset to defaults and persist. */
  resetLayout(): void;

  /** Subscribe to layout changes. Returns unsubscribe callback. */
  subscribe(listener: () => void): () => void;
}

// ---------------------------------------------------------------------------
// Serialisation
// ---------------------------------------------------------------------------

function load(): WorkspaceLayout {
  try {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    if (raw === null) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<WorkspaceLayout>;
    return {
      leftCollapsed:
        typeof parsed.leftCollapsed === 'boolean'
          ? parsed.leftCollapsed
          : DEFAULT_LAYOUT.leftCollapsed,
      rightCollapsed:
        typeof parsed.rightCollapsed === 'boolean'
          ? parsed.rightCollapsed
          : DEFAULT_LAYOUT.rightCollapsed,
      activeTab: isValidTab(parsed.activeTab)
        ? parsed.activeTab
        : DEFAULT_LAYOUT.activeTab,
      viewport: isValidViewport(parsed.viewport) ? parsed.viewport : null,
      lastFilePath:
        typeof parsed.lastFilePath === 'string' ? parsed.lastFilePath : null,
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function save(layout: WorkspaceLayout): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    }
  } catch {
    // Silently ignore quota exceeded / private-browsing restrictions
  }
}

function isValidTab(tab: unknown): tab is WorkspaceTab {
  return (
    tab === 'welcome' ||
    tab === 'inspector' ||
    tab === 'diagnostics' ||
    tab === 'statistics' ||
    tab === 'compare' ||
    tab === 'settings'
  );
}

function isValidViewport(v: unknown): v is WorkspaceViewport {
  if (v === null || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.zoom === 'number' &&
    typeof obj.panX === 'number' &&
    typeof obj.panY === 'number'
  );
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class WorkspaceServiceImpl implements WorkspaceService {
  private _layout: WorkspaceLayout;
  private readonly _listeners: Set<() => void> = new Set();

  constructor() {
    this._layout = load();
  }

  getLayout(): WorkspaceLayout {
    return this._layout;
  }

  updateLayout(patch: Partial<WorkspaceLayout>): void {
    this._layout = Object.freeze({ ...this._layout, ...patch });
    this._notify();
    save(this._layout);
  }

  resetLayout(): void {
    this._layout = DEFAULT_LAYOUT;
    this._notify();
    save(this._layout);
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
// Singleton factory
// ---------------------------------------------------------------------------

let _instance: WorkspaceService | null = null;

export function getWorkspaceService(): WorkspaceService {
  if (_instance === null) {
    _instance = new WorkspaceServiceImpl();
  }
  return _instance;
}

/** Reset singleton — use in tests. */
export function resetWorkspaceServiceInstance(): void {
  _instance = null;
}
