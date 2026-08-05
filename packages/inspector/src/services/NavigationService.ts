/**
 * @tileguard/inspector — NavigationService (Phase 1 — Step 4)
 *
 * Manages application-level navigation state: which top-level view is
 * displayed (Home vs Workspace) and which workspace page is active.
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
export type ApplicationState = 'home' | 'workspace';

/**
 * A page within the Workspace — maps 1-to-1 onto WorkspaceTab.
 */
export type WorkspacePage = WorkspaceTab;

/**
 * Complete navigation state snapshot returned by {@link NavigationService.getState}.
 */
export interface NavigationState {
  /** Top-level application view. */
  readonly application: ApplicationState;
  /** Currently active workspace page (only meaningful when application === 'workspace'). */
  readonly page: WorkspacePage;
  /** History of workspace pages (most-recent last), excluding the current page. */
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

  // ── Navigation ────────────────────────────────────────────────────────────

  /**
   * Navigate to the Home screen.
   * The workspace page history is preserved so the workspace can be resumed
   * at the same page if the user returns to it in the same session.
   */
  goHome(): void;

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
   * Pushes the previous page onto the history stack.
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

  // ── Navigation ─────────────────────────────────────────────────────────

  goHome(): void {
    if (this._application === 'home') return;
    this._application = 'home';
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
      this._history.push(this._page);
    }

    this._application = 'workspace';
    this._page = target;
    this._notify();
  }

  navigate(page: WorkspacePage): void {
    if (page === this._page && this._application === 'workspace') return;

    if (this._application === 'workspace') {
      // Push current page onto history before changing.
      this._history.push(this._page);
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
