/**
 * @tileguard/inspector — ApplicationRouter (Phase 1 — Step 1 / Step 10)
 *
 * Manages the top-level application lifecycle:
 *
 *   Home ──Load Tile──► Session Created ──► Workspace ──Home button──► (dialog) ──► Home
 *
 * ApplicationState:
 *   'home'      — HomePage is shown; canvas is NOT mounted.
 *   'workspace' — Workspace is shown; canvas IS mounted.
 *
 * This component owns:
 *   - The ApplicationState transition logic.
 *   - The InspectorSession lifecycle (create/close).
 *   - The ReturnHomeDialog (shown when leaving an active session).
 *
 * It does NOT own:
 *   - Any analysis, comparison, regression, or rendering logic (those live
 *     inside Workspace and its children, unchanged).
 */
import { useState } from 'react';
import {
  createSession,
  type InspectorSession,
  isActiveSession,
  updateSession,
} from '../models/InspectorSession.js';
import type { ApplicationState } from '../services/NavigationService.js';
import { ReturnHomeDialog } from './dialogs/ReturnHomeDialog.js';
import { HomePage } from './home/HomePage.js';
import { Workspace } from './workspace/Workspace.js';

// ---------------------------------------------------------------------------
// ApplicationRouter
// ---------------------------------------------------------------------------

export function ApplicationRouter(): JSX.Element {
  const [appState, setAppState] = useState<ApplicationState>('home');
  const [session, setSession] = useState<InspectorSession | null>(null);
  const [showReturnDialog, setShowReturnDialog] = useState(false);

  // Files to hand off to Workspace on session start
  const [pendingFile, setPendingFile] = useState<File | undefined>();
  const [pendingComparisonA, setPendingComparisonA] = useState<
    File | undefined
  >();
  const [pendingComparisonB, setPendingComparisonB] = useState<
    File | undefined
  >();

  // ── Home → Workspace (single tile) ───────────────────────────────────────
  const handleFileSelected = (file: File) => {
    const newSession = createSession({ tile: { filePath: file.name } });
    setSession(updateSession(newSession, { status: 'active' }));
    setPendingFile(file);
    setPendingComparisonA(undefined);
    setPendingComparisonB(undefined);
    setAppState('workspace');
  };

  // ── Home → Workspace (comparison pair) ───────────────────────────────────
  const handleComparisonSelected = (fileA: File, fileB: File) => {
    const newSession = createSession({
      comparison: { filePathA: fileA.name, filePathB: fileB.name },
    });
    setSession(updateSession(newSession, { status: 'active' }));
    setPendingFile(undefined);
    setPendingComparisonA(fileA);
    setPendingComparisonB(fileB);
    setAppState('workspace');
  };

  // ── Workspace → Home request (intercept if session active) ───────────────
  const handleGoHome = () => {
    if (isActiveSession(session)) {
      // Session is active — ask for confirmation before discarding.
      setShowReturnDialog(true);
    } else {
      // No active session — navigate directly.
      navigateToHome();
    }
  };

  // ── ReturnHomeDialog: confirm ─────────────────────────────────────────────
  const handleConfirmReturnHome = () => {
    setShowReturnDialog(false);
    navigateToHome();
  };

  // ── ReturnHomeDialog: cancel ──────────────────────────────────────────────
  const handleCancelReturnHome = () => {
    setShowReturnDialog(false);
  };

  // ── Internal: transition to Home ─────────────────────────────────────────
  const navigateToHome = () => {
    if (session !== null) {
      setSession(updateSession(session, { status: 'closed' }));
    }
    setPendingFile(undefined);
    setPendingComparisonA(undefined);
    setPendingComparisonB(undefined);
    setAppState('home');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {appState === 'home' ? (
        <HomePage
          onFileSelected={handleFileSelected}
          onComparisonSelected={handleComparisonSelected}
        />
      ) : (
        <Workspace
          onGoHome={handleGoHome}
          {...(pendingFile !== undefined ? { initialFile: pendingFile } : {})}
          {...(pendingComparisonA !== undefined
            ? { initialComparisonA: pendingComparisonA }
            : {})}
          {...(pendingComparisonB !== undefined
            ? { initialComparisonB: pendingComparisonB }
            : {})}
        />
      )}

      {/* ReturnHomeDialog — rendered on top of Workspace when triggered */}
      {showReturnDialog && (
        <ReturnHomeDialog
          onConfirm={handleConfirmReturnHome}
          onCancel={handleCancelReturnHome}
        />
      )}
    </>
  );
}
