/**
 * @tileguard/inspector — NavigationService (Phase 2 — Step 1 + Step 5)
 *
 * Manages application-level navigation state: which top-level view is
 * displayed (Home vs Workspace) and which workspace page is active.
 *
 * Phase 2 additions:
 *   - History is capped at 20 entries (oldest entry dropped when full).
 *   - Page metadata (title, subtitle, breadcrumb, nextSteps) exposed via
 *     getPageMeta() so header + NextStepBar can render contextual identity.
 *
 * NavigationService is:
 *   - Independent of React (no hooks, no JSX, no React imports).
 *   - A singleton obtained via {@link getNavigationService}.
 *   - Observable — consumers register listeners and call getState().
 *
 * Application state machine:
 *
 *   home ──openWorkspace()──► workspace
 *   workspace ──goHome()────► home
 *
 * Workspace page history is maintained so `back()` restores the previous
 * page within the workspace, not the entire application state.
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs
 * beyond the history array.
 */

import type { WorkspaceTab } from './WorkspaceService.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * The top-level application state: either the Home screen or the Workspace.
 */
export type ApplicationState = 'home' | 'workspace' | 'docs';

/**
 * A page within the Workspace — maps 1-to-1 onto WorkspaceTab.
 */
export type WorkspacePage = WorkspaceTab;

/**
 * Recommended next action shown in the NextStepBar.
 */
export interface NextStep {
  readonly label: string;
  readonly description: string;
  readonly targetPage: WorkspacePage | null;
  /** Optional icon name from lucide-react. */
  readonly icon?: string;
}

/**
 * Per-page metadata: title, subtitle, breadcrumb path, and recommended
 * next steps shown in the WorkspaceHeader and NextStepBar.
 */
export interface PageMeta {
  readonly title: string;
  readonly subtitle: string;
  readonly breadcrumb: readonly string[];
  readonly nextSteps: readonly NextStep[];
}

/**
 * Complete navigation state snapshot returned by {@link NavigationService.getState}.
 */
export interface NavigationState {
  /** Top-level application view. */
  readonly application: ApplicationState;
  /** Currently active workspace page (only meaningful when application === 'workspace'). */
  readonly page: WorkspacePage;
  /** History of workspace pages (most-recent last, capped at 20), excluding the current page. */
  readonly history: readonly WorkspacePage[];
}

// ---------------------------------------------------------------------------
// NavigationService interface
// ---------------------------------------------------------------------------

/**
 * NavigationService — manages application routing independent of React.
 *
 * All mutations are synchronous.  Listeners are notified synchronously after
 * each state change, in registration order.
 */
export interface NavigationService {
  // ── State ─────────────────────────────────────────────────────────────────

  /** Returns the current navigation state snapshot (immutable). */
  getState(): NavigationState;

  /** Returns the current application-level view. */
  currentApplication(): ApplicationState;

  /** Returns the currently active workspace page. */
  currentPage(): WorkspacePage;

  /**
   * Returns metadata (title, subtitle, breadcrumb, nextSteps) for the given page.
   * Falls back to sensible defaults if the page has no explicit metadata.
   */
  getPageMeta(page?: WorkspacePage): PageMeta;

  // ── Navigation ────────────────────────────────────────────────────────────

  /**
   * Navigate to the Home screen.
   * The workspace page history is preserved so the workspace can be resumed
   * at the same page if the user returns to it in the same session.
   */
  goHome(): void;

  /**
   * Navigate to the Documentation screen.
   */
  openDocs(): void;

  /**
   * Open the Workspace, optionally landing on a specific page.
   * If `page` is omitted, the last active workspace page is restored.
   * Pushes the previous page onto the history stack if different.
   *
   * @param page  Optional workspace page to navigate to.
   */
  openWorkspace(page?: WorkspacePage): void;

  /**
   * Navigate to a specific workspace page.
   * The application state transitions to 'workspace' if not already there.
   * Pushes the previous page onto the history stack (capped at 20 entries).
   *
   * @param page  Target workspace page.
   */
  navigate(page: WorkspacePage): void;

  /**
   * Go back to the previous workspace page.
   * No-op if there is no history (at the initial page).
   */
  back(): void;

  /**
   * Returns `true` if there is at least one page in the history to go back to.
   */
  canGoBack(): boolean;

  // ── Subscriptions ─────────────────────────────────────────────────────────

  /**
   * Register a listener called whenever navigation state changes.
   * Returns an unsubscribe callback (idempotent).
   */
  subscribe(listener: () => void): () => void;
}

// ---------------------------------------------------------------------------
// Page metadata registry
// ---------------------------------------------------------------------------

const HISTORY_CAP = 20;

const PAGE_META: Record<WorkspacePage, PageMeta> = {
  welcome: {
    title: 'Home',
    subtitle: 'Start a new inspection session or load a tile.',
    breadcrumb: ['Home'],
    nextSteps: [
      {
        label: 'Load a tile',
        description: 'Drop a .pbf file to begin inspection.',
        targetPage: 'inspector',
        icon: 'Upload',
      },
      {
        label: 'Open Demo',
        description: 'Explore the Tokyo demo tile.',
        targetPage: 'inspector',
        icon: 'Play',
      },
    ],
  },
  inspector: {
    title: 'Explore',
    subtitle: 'Inspect geometry, features, and layer structure of this tile.',
    breadcrumb: ['Home', 'Workspace', 'Explore'],
    nextSteps: [
      {
        label: 'Run Diagnostics',
        description: 'Check for geometry errors and rule violations.',
        targetPage: 'diagnostics',
        icon: 'Bug',
      },
      {
        label: 'View Statistics',
        description: 'Understand feature counts and layer composition.',
        targetPage: 'statistics',
        icon: 'BarChart3',
      },
    ],
  },
  diagnostics: {
    title: 'Diagnose',
    subtitle: 'Identify geometry errors, rule violations, and quality issues.',
    breadcrumb: ['Home', 'Workspace', 'Diagnose'],
    nextSteps: [
      {
        label: 'Compare Tiles',
        description: 'Run a structural comparison against a baseline tile.',
        targetPage: 'compare',
        icon: 'GitCompare',
      },
      {
        label: 'Generate Report',
        description: 'Export a diagnostic report for this tile.',
        targetPage: 'reports',
        icon: 'FileText',
      },
    ],
  },
  statistics: {
    title: 'Statistics',
    subtitle: 'Understand the composition and structure of this vector tile.',
    breadcrumb: ['Home', 'Workspace', 'Statistics'],
    nextSteps: [
      {
        label: 'Run Diagnostics',
        description: 'Check for geometry errors in these layers.',
        targetPage: 'diagnostics',
        icon: 'Bug',
      },
      {
        label: 'Compare Tiles',
        description: 'Compare layer statistics against another tile.',
        targetPage: 'compare',
        icon: 'GitCompare',
      },
    ],
  },
  'style-explorer': {
    title: 'Style Explorer',
    subtitle:
      'Validate MapLibre style specifications and layer configurations.',
    breadcrumb: ['Home', 'Workspace', 'Style'],
    nextSteps: [
      {
        label: 'Run Diagnostics',
        description: 'Check tile geometry against style layer references.',
        targetPage: 'diagnostics',
        icon: 'Bug',
      },
      {
        label: 'Generate Report',
        description: 'Document style findings in a report.',
        targetPage: 'reports',
        icon: 'FileText',
      },
    ],
  },
  compare: {
    title: 'Compare',
    subtitle: 'Run a structural diff between a baseline and candidate tile.',
    breadcrumb: ['Home', 'Analysis', 'Compare'],
    nextSteps: [
      {
        label: 'Run Regression',
        description: 'Analyze comparison results for regressions.',
        targetPage: 'regression',
        icon: 'Radar',
      },
      {
        label: 'Generate Report',
        description: 'Export the comparison as a structured report.',
        targetPage: 'reports',
        icon: 'FileText',
      },
    ],
  },
  regression: {
    title: 'Regression',
    subtitle: 'Detect regressions and quality changes between tile versions.',
    breadcrumb: ['Home', 'Analysis', 'Regression'],
    nextSteps: [
      {
        label: 'Generate Report',
        description: 'Export regression findings for CI review.',
        targetPage: 'reports',
        icon: 'FileText',
      },
      {
        label: 'Compare Again',
        description: 'Load a different candidate tile for comparison.',
        targetPage: 'compare',
        icon: 'GitCompare',
      },
    ],
  },
  reports: {
    title: 'Reports',
    subtitle: 'Generate and export structured quality reports.',
    breadcrumb: ['Home', 'Analysis', 'Reports'],
    nextSteps: [
      {
        label: 'Explore Tile',
        description: 'Return to the canvas to inspect geometry directly.',
        targetPage: 'inspector',
        icon: 'Crosshair',
      },
      {
        label: 'Run Comparison',
        description: 'Start a new comparison to generate fresh data.',
        targetPage: 'compare',
        icon: 'GitCompare',
      },
    ],
  },
  settings: {
    title: 'Settings',
    subtitle: 'Configure appearance, rendering, and workspace behaviour.',
    breadcrumb: ['Home', 'Settings'],
    nextSteps: [],
  },
};

// ---------------------------------------------------------------------------
// Default pages
// ---------------------------------------------------------------------------

const DEFAULT_PAGE: WorkspacePage = 'inspector';

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class NavigationServiceImpl implements NavigationService {
  private _application: ApplicationState = 'home';
  private _page: WorkspacePage = DEFAULT_PAGE;
  private _history: WorkspacePage[] = [];
  private readonly _listeners: Set<() => void> = new Set();

  // ── State ──────────────────────────────────────────────────────────────

  getState(): NavigationState {
    return {
      application: this._application,
      page: this._page,
      history: [...this._history],
    };
  }

  currentApplication(): ApplicationState {
    return this._application;
  }

  currentPage(): WorkspacePage {
    return this._page;
  }

  getPageMeta(page?: WorkspacePage): PageMeta {
    const target = page ?? this._page;
    return (
      PAGE_META[target] ?? {
        title: target,
        subtitle: '',
        breadcrumb: ['Home', 'Workspace', target],
        nextSteps: [],
      }
    );
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  goHome(): void {
    if (this._application === 'home') return;
    this._application = 'home';
    this._notify();
  }

  openDocs(): void {
    if (this._application === 'docs') return;
    this._application = 'docs';
    this._notify();
  }

  openWorkspace(page?: WorkspacePage): void {
    const target = page ?? this._page;

    if (this._application === 'workspace' && target === this._page) {
      // Already on the target page inside the workspace — no-op.
      return;
    }

    if (this._application === 'workspace' && target !== this._page) {
      // Already in workspace but changing page — push history.
      this._pushHistory(this._page);
    }

    this._application = 'workspace';
    this._page = target;
    this._notify();
  }

  navigate(page: WorkspacePage): void {
    if (page === this._page && this._application === 'workspace') return;

    if (this._application === 'workspace') {
      // Push current page onto history before changing (capped at 20).
      this._pushHistory(this._page);
    }

    this._application = 'workspace';
    this._page = page;
    this._notify();
  }

  back(): void {
    if (!this.canGoBack()) return;

    const previous = this._history.pop()!;
    this._page = previous;
    this._notify();
  }

  canGoBack(): boolean {
    return this._history.length > 0;
  }

  // ── Subscriptions ──────────────────────────────────────────────────────

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  // ── Internal ───────────────────────────────────────────────────────────

  /**
   * Push a page onto history, enforcing the 20-entry cap.
   * The oldest entry is dropped when the cap is exceeded.
   */
  private _pushHistory(page: WorkspacePage): void {
    this._history.push(page);
    if (this._history.length > HISTORY_CAP) {
      this._history.shift();
    }
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      try {
        listener();
      } catch {
        // Isolate listener errors from the navigation state machine.
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

let _instance: NavigationService | null = null;

/**
 * Returns the shared {@link NavigationService} singleton.
 *
 * @example
 *   const nav = getNavigationService();
 *   nav.navigate('diagnostics');
 */
export function getNavigationService(): NavigationService {
  if (_instance === null) {
    _instance = new NavigationServiceImpl();
  }
  return _instance;
}

/**
 * Reset the singleton — use in tests only.
 */
export function resetNavigationServiceInstance(): void {
  _instance = null;
}
