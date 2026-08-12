/**
 * @tileguard/inspector — Workspace (Phase 3 — Engineering Workspaces)
 *
 * Engineering workstation shell.
 *
 * Canvas architecture:
 *   The CanvasView is mounted ONCE and lives for the entire Workspace lifetime.
 *   It is NEVER inside AnimatePresence — its subtree must never unmount, because
 *   CanvasView.dispose() calls store.dispose(), and a disposed store throws on
 *   any subsequent subscribe() call from re-mounting components.
 *
 *   Canvas-page workspaces (Explore, Diagnose) are rendered permanently alongside
 *   the canvas. Non-active canvas panels are hidden with `hidden` (display:none).
 *   Non-canvas pages (Statistics, Style, Compare, Regression, Reports) are
 *   rendered in a separate absolutely-positioned layer that covers the canvas
 *   when active.
 *
 * Selection and viewport persist across all tab switches because the store
 * singleton and canvas renderer are never recreated.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RegressionAnalysis } from '../../analysis/models/regression.js';
import { createRegressionEngine } from '../../analysis/RegressionEngine.js';
import {
  createComparisonService,
  type TileComparison,
  type TileSnapshot,
} from '../../comparison/index.js';
import { useInspectorContext } from '../../context/InspectorContext.js';
import { useInvestigationActions } from '../../context/InvestigationContext.js';
import { useStatistics } from '../../hooks/use-statistics-settings.js';
import {
  useHover,
  useLifecycle,
  useSearch,
  useSelectedFeature,
} from '../../hooks/use-store.js';
import { useProfiler } from '../../hooks/useProfiler.js';
import { useWorkspace } from '../../hooks/useWorkspace.js';
import {
  comparisonCompleteToast,
  tileLoadErrorToast,
  tileLoadedToast,
} from '../../lib/toast.js';
import {
  createPerformanceProfiler,
  type PerformanceProfiler,
} from '../../performance/PerformanceProfiler.js';
import { decodeBrowserTile } from '../../services/browser-tile-loader.js';
import { getNavigationService } from '../../services/NavigationService.js';
import { getPresentationService } from '../../services/PresentationService.js';
import {
  createShortcutService,
  type ShortcutAction,
} from '../../services/ShortcutService.js';
import type { ViewportState } from '../../viewport/viewport.js';

// ── Components ───────────────────────────────────────────────────────────────
import { CanvasView } from '../CanvasView.js';
import { GlobalSearch } from '../command/GlobalSearch.js';
import { ComparisonPage } from '../comparison/ComparisonPage.js';
import { EngineeringConsole } from '../console/EngineeringConsole.js';

// Phase 3 workspaces
import { DiagnosticExplorer } from '../diagnostics/DiagnosticExplorer.js';
import { useDiagnosticsState } from '../diagnostics/DiagnosticsPage.js';
import { RuleInspector } from '../diagnostics/RuleInspector.js';
import { TileHealthHeader } from '../diagnostics/TileHealthHeader.js';
import { CommandPalette } from '../dialogs/CommandPalette.js';
import { HelpOverlay } from '../dialogs/HelpOverlay.js';
import { ShortcutOverlay } from '../dialogs/ShortcutOverlay.js';
import { FeatureInspector } from '../explore/FeatureInspector.js';
import { LayerExplorer } from '../explore/LayerExplorer.js';
import { InspectorPageHeader } from '../inspector/InspectorPageHeader.js';
// Shell
import type { LoadingStep } from '../loading/LoadingOverlay.js';
import { LoadingOverlay } from '../loading/LoadingOverlay.js';
import { NextStepBar } from '../navigation/NextStepBar.js';
import { DeveloperOverlay } from '../profiler/DeveloperOverlay.js';
import { RegressionPage } from '../regression/RegressionPage.js';
import { ReportPage } from '../report/ReportPage.js';
import type { NavTab } from '../SidebarNav.js';
import { SettingsOverlay } from '../settings/SettingsOverlay.js';
import { StatisticsDashboard } from '../statistics/StatisticsDashboard.js';
import { StylePage } from '../style/StylePage.js';
import { Toolbar } from '../Toolbar.js';
import { ResizablePanel } from './ResizablePanel.js';
import { WorkspaceFooter } from './WorkspaceFooter.js';
import { WorkspaceHeader } from './WorkspaceHeader.js';
import { WorkspaceSidebar } from './WorkspaceSidebar.js';

// ---------------------------------------------------------------------------
// Module-level singleton profiler
// ---------------------------------------------------------------------------
const _profiler: PerformanceProfiler = createPerformanceProfiler();

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WorkspaceProps {
  readonly onGoHome: () => void;
  readonly initialFile?: File;
  readonly initialComparisonA?: File;
  readonly initialComparisonB?: File;
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

export function Workspace({
  onGoHome,
  initialFile,
  initialComparisonA,
  initialComparisonB,
}: WorkspaceProps): JSX.Element {
  const { inspector, store } = useInspectorContext();
  const investigationActions = useInvestigationActions();
  const lifecycle = useLifecycle(store);
  const search = useSearch(store);
  const stats = useStatistics(store);
  const selectedFeature = useSelectedFeature(store);
  const hover = useHover(store);

  const { layout, updateLayout } = useWorkspace();

  // ── Tab & panel state ─────────────────────────────────────────────────────
  const [activeTab, setActiveTabRaw] = useState<NavTab>('inspector');
  const [leftCollapsed, setLeftCollapsed] = useState(layout.leftCollapsed);
  const [rightCollapsed, setRightCollapsed] = useState(layout.rightCollapsed);
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(280);

  // ── Overlay state ─────────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutOverlayOpen, setShortcutOverlayOpen] = useState(false);
  const [helpOverlayOpen, setHelpOverlayOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [consoleExpanded, setConsoleExpanded] = useState(false);

  const [activeFileName, setActiveFileName] = useState<string | null>(
    layout.lastFilePath ?? null,
  );

  const nav = getNavigationService();

  const setActiveTab = useCallback(
    (tab: NavTab) => {
      if (tab === 'settings') {
        setSettingsOpen(true);
        return;
      }
      setActiveTabRaw(tab);
      updateLayout({ activeTab: tab });
      nav.navigate(tab as NavTab);
    },
    [updateLayout, nav],
  );

  const toggleLeft = useCallback(() => {
    setLeftCollapsed((v) => {
      updateLayout({ leftCollapsed: !v });
      return !v;
    });
  }, [updateLayout]);

  const toggleRight = useCallback(() => {
    setRightCollapsed((v) => {
      updateLayout({ rightCollapsed: !v });
      return !v;
    });
  }, [updateLayout]);

  // ── Loading state ─────────────────────────────────────────────────────────
  const [pendingFile, setPendingFile] = useState<File | null>(
    initialFile ?? null,
  );
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('ready');
  const [loadError, setLoadError] = useState<string | undefined>();
  const isLoading = lifecycle.status === 'loading' || pendingFile !== null;

  const [viewport, setViewport] = useState<ViewportState | null>(null);
  const [devOverlayVisible, setDevOverlayVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const metrics = useProfiler(_profiler, 500);

  // ── Comparison state ──────────────────────────────────────────────────────
  const [snapshotA, setSnapshotA] = useState<TileSnapshot | null>(null);
  const [snapshotB, setSnapshotB] = useState<TileSnapshot | null>(null);
  const [filePathA, setFilePathA] = useState<string | null>(null);
  const [filePathB, setFilePathB] = useState<string | null>(null);
  const [comparison, setComparison] = useState<TileComparison | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const captureSnapshot = useCallback(
    async (file: File): Promise<TileSnapshot | null> => {
      try {
        const { createInspectorStore } = await import(
          '../../store/inspector-store.js'
        );
        const tmpStore = createInspectorStore();
        const artifact = await decodeBrowserTile(file);
        await tmpStore.load(file.name, artifact, []);
        const svc = createComparisonService();
        const snap = svc.createSnapshot(tmpStore);
        tmpStore.dispose();
        return snap;
      } catch {
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    if (initialComparisonA !== undefined && initialComparisonB !== undefined) {
      void (async () => {
        const [snapA, snapB] = await Promise.all([
          captureSnapshot(initialComparisonA),
          captureSnapshot(initialComparisonB),
        ]);
        setFilePathA(initialComparisonA.name);
        setFilePathB(initialComparisonB.name);
        setSnapshotA(snapA);
        setSnapshotB(snapB);
        setActiveTabRaw('compare');
        updateLayout({ activeTab: 'compare' });
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialComparisonB.name,
    initialComparisonA,
    initialComparisonB,
    updateLayout,
    captureSnapshot,
  ]);

  const handleFileSelectedA = useCallback(
    async (file: File) => {
      setFilePathA(file.name);
      setSnapshotA(await captureSnapshot(file));
      setComparison(null);
    },
    [captureSnapshot],
  );

  const handleFileSelectedB = useCallback(
    async (file: File) => {
      setFilePathB(file.name);
      setSnapshotB(await captureSnapshot(file));
      setComparison(null);
    },
    [captureSnapshot],
  );

  const handleRunComparison = useCallback(() => {
    if (!snapshotA || !snapshotB) return;
    setIsComparing(true);
    setTimeout(() => {
      try {
        const svc = createComparisonService();
        const result = svc.compare(snapshotA, snapshotB);
        setComparison(result);
        const diffCount =
          (result.summary.addedFeatures ?? 0) +
          (result.summary.removedFeatures ?? 0) +
          (result.summary.modifiedFeatures ?? 0);
        comparisonCompleteToast(diffCount);
        // Phase 4: update investigation context
        investigationActions.setComparison({
          filePathA: filePathA,
          filePathB: filePathB,
          isActive: true,
        });
        investigationActions.addTimelineEvent({
          action: 'Comparison Complete',
          detail: `${diffCount} differences found`,
          workspace: 'compare',
          icon: 'git-compare',
        });
      } finally {
        setIsComparing(false);
      }
    }, 0);
  }, [snapshotA, snapshotB, filePathA, filePathB, investigationActions]);

  const regressionAnalysis = useMemo<RegressionAnalysis | null>(() => {
    if (!comparison) return null;
    return createRegressionEngine().analyze(comparison);
  }, [comparison]);

  useEffect(() => {
    if (viewport !== null) _profiler.recordFrame();
  }, [viewport]);

  // ── File loading ──────────────────────────────────────────────────────────
  const selectFile = useCallback(
    (file: File) => {
      setPendingFile(file);
      setActiveTabRaw('inspector');
      setLoadError(undefined);
      setActiveFileName(file.name);
      updateLayout({ lastFilePath: file.name, activeTab: 'inspector' });
    },
    [updateLayout],
  );

  useEffect(() => {
    if (inspector === null || pendingFile === null) return;
    let cancelled = false;
    const run = async () => {
      try {
        setLoadingStep('loading');
        const artifact = await decodeBrowserTile(pendingFile);
        if (cancelled) return;
        setLoadingStep('parsing');
        await new Promise<void>((r) => setTimeout(r, 30));
        if (cancelled) return;
        setLoadingStep('statistics');
        await inspector.load(pendingFile.name, artifact, []);
        if (cancelled) return;
        setLoadingStep('diagnostics');
        await new Promise<void>((r) => setTimeout(r, 20));
        if (cancelled) return;
        setLoadingStep('ready');
        tileLoadedToast(pendingFile.name);
        // Phase 4: record in investigation context
        investigationActions.setDatasetName(pendingFile.name);
        investigationActions.addTimelineEvent({
          action: 'Loaded Tile',
          detail: pendingFile.name,
          icon: 'zap',
        });
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          setLoadError(msg);
          setLoadingStep('loading');
          tileLoadErrorToast(pendingFile.name, msg);
        }
      } finally {
        if (!cancelled) setPendingFile(null);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [
    inspector,
    pendingFile, // Phase 4: record in investigation context
    investigationActions.setDatasetName,
    investigationActions.addTimelineEvent,
  ]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const shortcuts = createShortcutService();
    const unsub = shortcuts.registerHandler((action: ShortcutAction) => {
      switch (action) {
        case 'clearSelection':
          store.select(null, null);
          break;
        case 'resetView':
          inspector?.render();
          break;
        case 'focusSearch':
          searchInputRef.current?.focus();
          break;
        case 'showExplore':
          setActiveTab('inspector');
          break;
        case 'showDiagnostics':
          setActiveTab('diagnostics');
          break;
        case 'showStatistics':
          setActiveTab('statistics');
          break;
        case 'showStyle':
          setActiveTab('style-explorer');
          break;
        case 'showCompare':
          setActiveTab('compare');
          break;
        case 'showRegression':
          setActiveTab('regression');
          break;
        case 'showReports':
          setActiveTab('reports');
          break;
        case 'openSettings':
        case 'showSettings':
          setSettingsOpen(true);
          break;
        case 'goHome':
          onGoHome();
          break;
        case 'toggleHover':
          inspector?.updateSettings({
            hoverEnabled: !inspector.getSettings().hoverEnabled,
          });
          break;
        case 'toggleVertices':
          inspector?.updateSettings({
            showVertices: !inspector.getSettings().showVertices,
          });
          break;
        case 'toggleBounds':
          inspector?.updateSettings({
            showTileBounds: !inspector.getSettings().showTileBounds,
          });
          break;
        case 'toggleDevOverlay':
          setDevOverlayVisible((v) => !v);
          break;
        case 'togglePresentationMode':
          getPresentationService().toggle();
          break;
        default:
          break;
      }
    });
    const cleanup = shortcuts.attach(window);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setGlobalSearchOpen(true);
        return;
      }
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setConsoleExpanded((v) => !v);
        return;
      }
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShortcutOverlayOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cleanup();
      unsub();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [inspector, store, setActiveTab, onGoHome]);

  // ── Diagnostics state (shared between left + right panels) ───────────────
  const diagnostics = useDiagnosticsState(store, inspector);

  // ── Derived flags ─────────────────────────────────────────────────────────
  // Canvas workspaces: canvas is visible, canvas-adjacent panels shown
  const isExplore = activeTab === 'inspector';
  const isDiagnose = activeTab === 'diagnostics';
  const isCanvasPage = isExplore || isDiagnose;

  // Non-canvas pages that render in the full-page overlay layer
  const isNonCanvasFullPage =
    activeTab === 'statistics' ||
    activeTab === 'style-explorer' ||
    activeTab === 'compare' ||
    activeTab === 'regression' ||
    activeTab === 'reports';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--tg-bg-primary)] font-[var(--tg-font-sans)] text-[var(--tg-text-primary)]">
      {/* Application header */}
      <WorkspaceHeader
        activePage={activeTab as any}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHelp={() => setHelpOverlayOpen(true)}
        onGoHome={onGoHome}
      />

      {/* Body: Sidebar + content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <WorkspaceSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onHomeRequested={onGoHome}
          currentFile={activeFileName}
          onOpenFile={() => {
            document
              .querySelector<HTMLInputElement>('[data-file-input]')
              ?.click();
          }}
          onHelpRequested={() => setHelpOverlayOpen(true)}
        />

        {/* Content column */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* ── Canvas-page identity headers (always present when on those tabs) */}
          {isExplore && <InspectorPageHeader store={store} />}
          {isDiagnose && <TileHealthHeader store={store} />}

          {/* ── Toolbar (canvas pages only) */}
          {isCanvasPage && (
            <Toolbar
              leftCollapsed={leftCollapsed}
              rightCollapsed={rightCollapsed}
              onToggleLeft={toggleLeft}
              onToggleRight={toggleRight}
              onFileSelected={selectFile}
              onResetView={() => inspector?.render()}
              onOpenSettings={() => setSettingsOpen(true)}
              searchQuery={search.query}
              onSearchChange={search.setQuery}
              searchResults={search.results}
              searchInputRef={searchInputRef}
              onSelectSearchResult={(result) => {
                inspector?.focusFeature(
                  result.feature.layerName,
                  result.feature.featureIndex,
                );
                search.clearSearch();
              }}
            />
          )}

          {/* ── Main content area ──────────────────────────────────────────── */}
          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            {/* ══════════════════════════════════════════════════════════════
                CANVAS LAYER — always mounted, never inside AnimatePresence.
                Visibility is controlled by `hidden` class so the DOM and
                React fiber stay alive. The InspectorStore is never disposed.
            ═══════════════════════════════════════════════════════════════ */}
            <div
              className={`flex min-h-0 flex-1 flex-col overflow-hidden ${isNonCanvasFullPage ? 'hidden' : ''}`}
            >
              {/* Explore workspace: LayerExplorer | Canvas | FeatureInspector */}
              <ResizablePanel
                leftWidth={leftPanelWidth}
                rightWidth={rightPanelWidth}
                leftCollapsed={leftCollapsed || !isExplore}
                rightCollapsed={rightCollapsed || !isExplore}
                onLeftResize={setLeftPanelWidth}
                onRightResize={setRightPanelWidth}
                left={
                  <LayerExplorer
                    store={store}
                    inspector={inspector}
                    searchQuery={search.query}
                    onSearchChange={search.setQuery}
                  />
                }
                center={
                  <div className="relative flex h-full w-full flex-col overflow-hidden">
                    <CanvasView
                      onFileSelected={selectFile}
                      onViewportChange={setViewport}
                    />
                    {isLoading && loadingStep !== 'ready' && (
                      <LoadingOverlay
                        currentStep={loadingStep}
                        {...(pendingFile !== null
                          ? { fileName: pendingFile.name }
                          : {})}
                        {...(loadError !== undefined
                          ? { error: loadError }
                          : {})}
                      />
                    )}
                    {devOverlayVisible && (
                      <div data-dev-overlay="">
                        <DeveloperOverlay
                          metrics={metrics}
                          viewport={viewport}
                          hoveredFeature={
                            hover.layerName !== null &&
                            hover.featureIndex !== null
                              ? (inspector?.getSelectedFeature() ?? null)
                              : null
                          }
                          selectedFeature={selectedFeature}
                          totalFeatures={stats.totalFeatures}
                        />
                      </div>
                    )}
                  </div>
                }
                right={<FeatureInspector store={store} inspector={inspector} />}
              />

              {/* Diagnose overlay panels (replace left+right when isDiagnose) */}
              {isDiagnose && (
                <div className="absolute inset-0 flex overflow-hidden pointer-events-none">
                  {/* Left: DiagnosticExplorer */}
                  {!leftCollapsed && (
                    <aside
                      className="pointer-events-auto relative flex shrink-0 flex-col overflow-hidden border-r border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]"
                      style={{ width: leftPanelWidth }}
                      aria-label="Diagnostic Explorer"
                    >
                      <DiagnosticExplorer
                        store={store}
                        inspector={inspector}
                        onDiagnosticSelected={
                          diagnostics.handleSelectDiagnostic
                        }
                      />
                    </aside>
                  )}
                  {/* Center spacer — canvas underneath shows through */}
                  <div className="flex-1" />
                  {/* Right: RuleInspector */}
                  {!rightCollapsed && (
                    <aside
                      className="pointer-events-auto relative flex shrink-0 flex-col overflow-hidden border-l border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]"
                      style={{ width: rightPanelWidth }}
                      aria-label="Rule Inspector"
                    >
                      <RuleInspector
                        diagnostic={diagnostics.selectedDiagnostic}
                      />
                    </aside>
                  )}
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                FULL-PAGE OVERLAY — non-canvas workspaces rendered on top.
                AnimatePresence only covers this layer, never the canvas.
            ═══════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
              {isNonCanvasFullPage && (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  className="absolute inset-0 flex flex-col overflow-hidden bg-[var(--tg-bg-primary)]"
                >
                  {activeTab === 'statistics' && (
                    <StatisticsDashboard store={store} />
                  )}
                  {activeTab === 'style-explorer' && (
                    <StylePage
                      leftWidth={leftPanelWidth}
                      rightWidth={rightPanelWidth}
                      leftCollapsed={leftCollapsed}
                      rightCollapsed={rightCollapsed}
                      onLeftResize={setLeftPanelWidth}
                      onRightResize={setRightPanelWidth}
                    />
                  )}
                  {activeTab === 'compare' && (
                    <ComparisonPage
                      comparison={comparison}
                      filePathA={filePathA}
                      filePathB={filePathB}
                      isComparing={isComparing}
                      onFileSelectedA={(f) => {
                        void handleFileSelectedA(f);
                      }}
                      onFileSelectedB={(f) => {
                        void handleFileSelectedB(f);
                      }}
                      onRunComparison={handleRunComparison}
                    />
                  )}
                  {activeTab === 'regression' && (
                    <RegressionPage comparison={comparison} />
                  )}
                  {activeTab === 'reports' && (
                    <ReportPage
                      comparison={comparison}
                      regression={regressionAnalysis}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* NextStepBar */}
          <NextStepBar
            currentPage={activeTab as any}
            onNavigate={(page) => setActiveTab(page as NavTab)}
          />
        </div>
      </div>

      {/* Footer status bar */}
      <WorkspaceFooter viewport={viewport} fps={metrics.fps} />

      {/* Engineering Console (Phase 4) */}
      <EngineeringConsole
        expanded={consoleExpanded}
        onToggle={() => setConsoleExpanded((v) => !v)}
        fps={metrics.fps}
        fileName={activeFileName}
      />

      {/* Overlays */}
      <AnimatePresence>
        {settingsOpen && (
          <SettingsOverlay
            key="settings"
            onClose={() => setSettingsOpen(false)}
          />
        )}
        {commandPaletteOpen && (
          <CommandPalette
            key="command-palette"
            onClose={() => setCommandPaletteOpen(false)}
            onNavigate={(page) => setActiveTab(page as NavTab)}
            onGoHome={onGoHome}
            onOpenSettings={() => {
              setCommandPaletteOpen(false);
              setSettingsOpen(true);
            }}
            onOpenShortcuts={() => {
              setCommandPaletteOpen(false);
              setShortcutOverlayOpen(true);
            }}
            onTogglePresentationMode={() => {
              getPresentationService().toggle();
              setCommandPaletteOpen(false);
            }}
            onOpenFile={() => setCommandPaletteOpen(false)}
          />
        )}
        {shortcutOverlayOpen && (
          <ShortcutOverlay
            key="shortcuts"
            onClose={() => setShortcutOverlayOpen(false)}
          />
        )}
        {helpOverlayOpen && (
          <HelpOverlay key="help" onClose={() => setHelpOverlayOpen(false)} />
        )}
      </AnimatePresence>

      {/* Global Search (Phase 4) */}
      <GlobalSearch
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        onNavigate={(page) => setActiveTab(page as NavTab)}
      />
    </div>
  );
}
