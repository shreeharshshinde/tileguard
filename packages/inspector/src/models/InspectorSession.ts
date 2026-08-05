/**
 * @tileguard/inspector — InspectorSession (Phase 1 — Step 2)
 *
 * Explicit session model representing a single tile investigation lifecycle.
 *
 * A session is created when the user loads a tile and is closed when the user
 * returns to Home.  The session tracks what was loaded (tile path, comparison
 * pair) and when the investigation started, providing a clear lifecycle for
 * future features such as session history, resume, and export.
 *
 * Lifecycle:
 *   No Session → Loading → Active → Closed
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, DOM, or React.
 */

// ---------------------------------------------------------------------------
// Descriptors
// ---------------------------------------------------------------------------

/**
 * Identifies a single vector tile that was loaded into a session.
 */
export interface TileDescriptor {
  /** The file name or path as provided by the user. */
  readonly filePath: string;
}

/**
 * Identifies a two-tile comparison pair (before / after) loaded into
 * a session for side-by-side diff or regression analysis.
 */
export interface ComparisonDescriptor {
  /** The "before" (baseline) tile path. */
  readonly filePathA: string;
  /** The "after" (candidate) tile path. */
  readonly filePathB: string;
}

// ---------------------------------------------------------------------------
// Session status
// ---------------------------------------------------------------------------

/**
 * Discriminated union of session lifecycle states.
 *
 * - `loading`  — the session has been initiated and the tile is being decoded.
 * - `active`   — the tile is loaded and the workspace is open.
 * - `closed`   — the user returned to Home; the session is no longer active.
 */
export type SessionStatus = 'loading' | 'active' | 'closed';

// ---------------------------------------------------------------------------
// InspectorSession
// ---------------------------------------------------------------------------

/**
 * An InspectorSession represents a single investigation of one tile (or
 * comparison pair).  Sessions are immutable value objects — mutations are
 * expressed by creating updated copies via {@link updateSession}.
 *
 * @example
 *   const session = createSession({ filePath: 'tokyo-clean.pbf' });
 *   const active  = updateSession(session, { status: 'active' });
 */
export interface InspectorSession {
  /** Stable, unique identifier generated at session creation. */
  readonly id: string;
  /** Timestamp when the session was first created (tile load triggered). */
  readonly createdAt: Date;
  /**
   * Timestamp of the most-recent status transition.
   * Equals `createdAt` immediately after creation.
   */
  readonly updatedAt: Date;
  /** Current lifecycle state. */
  readonly status: SessionStatus;
  /**
   * The primary tile being inspected.
   * Present for all session types except when only a comparison is loaded.
   */
  readonly tile?: TileDescriptor;
  /**
   * The comparison pair, if the session was started from the Compare flow.
   * May coexist with `tile` when the user loaded a single tile and then
   * initiated a comparison.
   */
  readonly comparison?: ComparisonDescriptor;
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/**
 * Options for creating a new session.  At least one of `tile` or `comparison`
 * should be provided; the session is still valid without either (e.g. when
 * the type of load is not yet determined at creation time).
 */
export interface CreateSessionOptions {
  readonly tile?: TileDescriptor;
  readonly comparison?: ComparisonDescriptor;
}

/**
 * Creates a new {@link InspectorSession} in the `loading` state.
 *
 * @param options  Optional tile / comparison descriptors.
 * @param idOverride  Stable ID override — useful for testing.
 */
export function createSession(
  options: CreateSessionOptions = {},
  idOverride?: string,
): InspectorSession {
  const now = new Date();
  return {
    id: idOverride ?? generateId(),
    createdAt: now,
    updatedAt: now,
    status: 'loading',
    ...(options.tile !== undefined ? { tile: options.tile } : {}),
    ...(options.comparison !== undefined
      ? { comparison: options.comparison }
      : {}),
  };
}

/**
 * Returns a new {@link InspectorSession} with the supplied fields merged in.
 * `updatedAt` is always refreshed to `now` on every update.
 *
 * @example
 *   const active = updateSession(session, { status: 'active' });
 */
export function updateSession(
  session: InspectorSession,
  patch: Partial<
    Omit<InspectorSession, 'id' | 'createdAt' | 'updatedAt'>
  >,
): InspectorSession {
  return {
    ...session,
    ...patch,
    updatedAt: new Date(),
  };
}

/**
 * Returns `true` when a session exists and its status is `'active'`.
 * Safe to call with `null` / `undefined`.
 */
export function isActiveSession(
  session: InspectorSession | null | undefined,
): session is InspectorSession & { status: 'active' } {
  return session !== null && session !== undefined && session.status === 'active';
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Generates a simple monotonically-incrementing session ID. */
let _counter = 0;
function generateId(): string {
  _counter += 1;
  return `session-${Date.now()}-${_counter}`;
}
