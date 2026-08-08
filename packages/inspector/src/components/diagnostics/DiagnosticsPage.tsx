/**
 * @tileguard/inspector — DiagnosticsPage (Milestone 7.5 — Step A, fixed M7.5 audit)
 *
 * Pure layout component for the Diagnostics tab's panel content.
 * Answers: "What is wrong with this tile?"
 *
 * IMPORTANT: This component does NOT render a CanvasView.
 * The canvas is owned by Workspace in InspectorApp and is a singleton
 * that never unmounts. DiagnosticsPage contributes only:
 *   - TileHealthHeader  (top identity/summary bar)
 *   - DiagnosticPanel   (left sidebar — "Diagnostic Explorer")
 *   - RuleDetailsPanel  (right sidebar — rule explanation)
 *
 * The canvas slot in the three-column layout is provided by the parent (Workspace).
 * Collapse state is also owned by Workspace so it applies consistently across tabs.
 */

import type { Diagnostic } from '@tileguard/core';
import { useState } from 'react';
import type { Inspector } from '../../create-inspector.js';
import type { InspectorStore } from '../../store/inspector-store.js';
import { DiagnosticPanel } from './DiagnosticPanel.js';
import { RuleDetailsPanel } from './RuleDetailsPanel.js';
import { TileHealthHeader } from './TileHealthHeader.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DiagnosticsPagePanelsProps {
  readonly store: InspectorStore;
  readonly inspector: Inspector | null;
}

// ---------------------------------------------------------------------------
// DiagnosticsLeftPanel — the Diagnostic Explorer sidebar
// ---------------------------------------------------------------------------

/**
 * Left sidebar content for the Diagnostics tab.
 * Renders DiagnosticPanel and keeps the selected diagnostic in local state
 * so that RuleDetailsPanel can be updated via the context below.
 *
 * Because both panels live in different sidebar slots owned by Workspace,
 * we lift the selectedDiagnostic state into the shared hook below.
 */

export interface DiagnosticsState {
  readonly selectedDiagnostic: Diagnostic | null;
  readonly handleSelectDiagnostic: (index: number) => void;
}

export function useDiagnosticsState(
  store: InspectorStore,
  inspector: Inspector | null,
): DiagnosticsState {
  const [selectedDiagnostic, setSelectedDiagnostic] =
    useState<Diagnostic | null>(null);

  const handleSelectDiagnostic = (index: number) => {
    if (store.lifecycle.status === 'loaded') {
      const all = store.lifecycle.diagnostics;
      setSelectedDiagnostic(all[index] ?? null);
    }
    inspector?.selectDiagnostic(index);
  };

  return { selectedDiagnostic, handleSelectDiagnostic };
}

// ---------------------------------------------------------------------------
// Sub-panel components consumed by InspectorApp's canvas workspace
// ---------------------------------------------------------------------------

interface DiagnosticsLeftPanelProps {
  readonly store: InspectorStore;
  readonly inspector: Inspector | null;
  readonly onDiagnosticSelected: (index: number) => void;
}

export function DiagnosticsLeftPanel({
  store,
  inspector,
  onDiagnosticSelected,
}: DiagnosticsLeftPanelProps): JSX.Element {
  return (
    <DiagnosticPanel
      store={store}
      inspector={inspector}
      panelTitle="Diagnostic Explorer"
      onDiagnosticSelected={onDiagnosticSelected}
    />
  );
}

interface DiagnosticsRightPanelProps {
  readonly diagnostic: Diagnostic | null;
}

export function DiagnosticsRightPanel({
  diagnostic,
}: DiagnosticsRightPanelProps): JSX.Element {
  return <RuleDetailsPanel diagnostic={diagnostic} />;
}

// ---------------------------------------------------------------------------
// DiagnosticsPageHeader — the TileHealth identity bar
// (rendered above the toolbar/three-column layout by Workspace)
// ---------------------------------------------------------------------------

interface DiagnosticsPageHeaderProps {
  readonly store: InspectorStore;
}

export function DiagnosticsPageHeader({
  store,
}: DiagnosticsPageHeaderProps): JSX.Element {
  return <TileHealthHeader store={store} />;
}
