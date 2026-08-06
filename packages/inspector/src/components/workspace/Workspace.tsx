/**
 * @tileguard/inspector — Workspace (Phase 2)
 *
 * Engineering workstation shell.
 *
 * Phase 2 changes:
 *   - WorkspaceHeader now shows page identity (title, subtitle, breadcrumb, back button).
 *   - WorkspaceSidebar uses the new sectioned Sidebar with structured navigation.
 *   - ResizablePanel replaces fixed-width aside panels.
 *   - NextStepBar rendered at the bottom of every page.
 *   - CommandPalette (Ctrl+K), ShortcutOverlay (?), HelpOverlay integrated.
 *   - Sonner toasts replace browser alerts.
 *   - AnimatePresence + Framer Motion for panel/header transitions.
 *   - All engine/renderer code is unchanged.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createComparisonService,
  type TileComparison,
  type TileSnapshot,
} from '../../comparison/index.js';
import { useInspectorContext } from '../../context/InspectorContext.js';
import { useStatistics } from '../../hooks/use-statistics-settings.js';
import {
  useHover,
  useLifecycle,
  useSearch,
  useSelectedFeature,
} from '../../hooks/use-store.js';
import { useProfiler } from '../../hooks/useProfiler.js';
import { useWorkspace } from '../../hooks/useWorkspace.js';
import { tileLoadedToast, tileLoadErrorToast, comparisonCompleteToast } from '../../lib/toast.js';
import {
  createPerformanceProfiler,
  type PerformanceProfiler,
} from '../../performance/PerformanceProfiler.js';
import { decodeBrowserTile } from '../../services/browser-tile-loader.js';
import {
  createShortcutService,
  type ShortcutAction,
} from '../../services/ShortcutService.js';
import { getPresentationService } from '../../services/PresentationService.js';
import { getNavigationService } from '../../services/NavigationService.js';
import type { ViewportState } from '../../viewport/viewport.js';
import { createRegressionEngine } from '../../analysis/RegressionEngine.js';
import type { RegressionAnalysis } from '../../analysis/models/regression.js';
import { CanvasView } from '../CanvasView.js';
import { ComparisonPage } from '../comparison/ComparisonPage.js';
import { RegressionPage } from '../regression/RegressionPage.js';
import { ReportPage } from '../report/ReportPage.js';
import { StyleExplorerPage } from '../style/StyleExplorerPage.js';
import {
  DiagnosticsPageHeader,
  DiagnosticsLeftPanel,
  DiagnosticsRightPanel,
  useDiagnosticsState,
} from '../diagnostics/DiagnosticsPage.js';
import { FeatureExplorer } from '../inspector/FeatureExplorer.js';
import { InspectorPageHeader } from '../inspector/InspectorPageHeader.js';
import { FeaturePanel } from '../feature/FeaturePanel.js';
import type { LoadingStep } from '../loading/LoadingOverlay.js';
import { LoadingOverlay } from '../loading/LoadingOverlay.js';
import { DeveloperOverlay } from '../profiler/DeveloperOverlay.js';
import type { NavTab } from '../SidebarNav.js';
import { SettingsOverlay } from '../settings/SettingsOverlay.js';
import { StatisticsPanel } from '../statistics/StatisticsPanel.js';
import { Toolbar } from '../Toolbar.js';
import { CommandPalette } from '../dialogs/CommandPalette.js';
import { ShortcutOverlay } from '../dialogs/ShortcutOverlay.js';
import { HelpOverlay } from '../dialogs/HelpOverlay.js';
import { NextStepBar } from '../navigation/NextStepBar.js';
import { WorkspaceFooter } from './WorkspaceFooter.js';
import { WorkspaceHeader } from './WorkspaceHeader.js';
import { WorkspaceSidebar } from './WorkspaceSidebar.js';
import { ResizablePanel } from './ResizablePanel.js';

// ---------------------------------------------------------------------------
// Module-level singleton profiler (shared across renders)
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
  const lifecycle = useLifecycle(store);
  const search = useSearch(store);
  const stats = useStatistics(store);
  const selectedFeature = useSelectedFeature(store);
  const hover = useHover(store);

  const { layout, updateLayout } = useWorkspace();

  // Active tab
  const [activeTab, setActiveTabRaw] = useState<NavTab>('inspector');
  const [leftCollapsed, setLeftCollapsed] = useState(layout.leftCollapsed);
  const [rightCollapsed, setRightCollapsed] = useState(layout.rightCollapsed);

  // Resizable panel widths
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(280);

  // Overlay visibility
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutOverlayOpen, setShortcutOverlayOpen] = useState(false);
  const [helpOverlayOpen, setHelpOverlayOpen] = useState(false);

  // Active file name for sidebar card
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
      // Sync with NavigationService
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

  // Loading state
  const [pendingFile, setPendingFile] = useState<File | null>(initialFile ?? null);
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
        const { createInspectorStore } = await import('../../store/inspector-store.js');
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

  // Load initial comparison pair on first mount
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
  // Run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelectedA = useCallback(
    async (file: File) => {
      setFilePathA(file.name);
      const snap = await captureSnapshot(file);
      setSnapshotA(snap);
      setComparison(null);
    },
    [captureSnapshot],
  );

  const handleFileSelectedB = useCallback(
    async (file: File) => {
      setFilePathB(file.name);
      const snap = await captureSnapshot(file);
      setSnapshotB(snap);
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
        // Toast
        const diffCount =
          (result.summary.addedFeatures ?? 0) +
          (result.summary.removedFeatures ?? 0) +
          (result.summary.modifiedFeatures ?? 0);
        comparisonCompleteToast(diffCount);
      } finally {
        setIsComparing(false);
      }
    }, 0);
  }, [snapshotA, snapshotB]);

  // ── Regression analysis ───────────────────────────────────────────────────
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
        // Toast on successful load
        tileLoadedToast(pendingFile.name);
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
    return () => { cancelled = true; };
  }, [inspector, pendingFile]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const shortcuts = createShortcutService();
    const unsub = shortcuts.registerHandler((action: ShortcutAction) => {
      switch (action) {
        case 'clearSelection': store.select(null, null); break;
        case 'resetView': inspector?.render(); break;
        case 'focusSearch': searchInputRef.current?.focus(); break;
        case 'showDiagnostics': setActiveTab('diagnostics'); break;
        case 'openSettings':
        case 'showSettings': setSettingsOpen(true); break;
        case 'showStatistics': setActiveTab('statistics'); break;
        case 'toggleHover':
          inspector?.updateSettings({ hoverEnabled: !inspector.getSettings().hoverEnabled });
          break;
        case 'toggleVertices':
          inspector?.updateSettings({ showVertices: !inspector.getSettings().showVertices });
          break;
        case 'toggleBounds':
          inspector?.updateSettings({ showTileBounds: !inspector.getSettings().showTileBounds });
          break;
        case 'toggleDevOverlay': setDevOverlayVisible((v) => !v); break;
        case 'togglePresentationMode': getPresentationService().toggle(); break;
        default: break;
      }
    });
    const cleanup = shortcuts.attach(window);

    // Additional Phase 2 shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K → Command palette
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      // ? → Shortcut overlay
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
  }, [inspector, store, setActiveTab]);

  // ── Diagnostics state ─────────────────────────────────────────────────────
  const diagnostics = useDiagnosticsState(store, inspector);

  // ── Left panel ────────────────────────────────────────────────────────────
  const leftPanel = useMemo<JSX.Element | null>(() => {
    if (activeTab === 'statistics') return <StatisticsPanel store={store} />;
    if (activeTab === 'diagnostics')
      return (
        <DiagnosticsLeftPanel
          store={store}
          inspector={inspector}
          onDiagnosticSelected={diagnostics.handleSelectDiagnostic}
        />
      );
    return (
      <FeatureExplorer
        store={store}
        inspector={inspector}
        searchQuery={search.query}
        onSearchChange={search.setQuery}
      />
    );
  }, [activeTab, store, inspector, search.query, search.setQuery, diagnostics.handleSelectDiagnostic]);

  // ── Canvas-based page ─────────────────────────────────────────────────────
  const isCanvasPage =
    activeTab === 'inspector' ||
    activeTab === 'diagnostics' ||
    activeTab === 'statistics';

  // ── Page transition key ───────────────────────────────────────────────────
  const pageGroupKey = isCanvasPage ? 'canvas' : activeTab;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--tg-bg-primary)] font-[var(--tg-font-sans)] text-[var(--tg-text-primary)]">
      {/* Application header with page identity */}
      <WorkspaceHeader
        activePage={activeTab as any}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHelp={() => setHelpOverlayOpen(true)}
      />

      {/* Body row: Sidebar + content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <WorkspaceSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onHomeRequested={onGoHome}
          currentFile={activeFileName}
          onOpenFile={() => {
            // Trigger the toolbar's file picker — handled via DropZone
            document.querySelector<HTMLInputElement>('[data-file-input]')?.click();
          }}
          onHelpRequested={() => setHelpOverlayOpen(true)}
        />

        {/* Page content area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Page header (Toolbar replaces PageHeader for canvas pages) */}
          {isCanvasPage && (
            <>
              {activeTab === 'inspector' && <InspectorPageHeader store={store} />}
              {activeTab === 'diagnostics' && <DiagnosticsPageHeader store={store} />}

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
                  inspector?.focusFeature(result.feature.layerName, result.feature.featureIndex);
                  search.clearSearch();
                }}
              />
            </>
          )}

          {/* Animated page content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={pageGroupKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              {activeTab === 'compare' ? (
                <ComparisonPage
                  comparison={comparison}
                  filePathA={filePathA}
                  filePathB={filePathB}
                  isComparing={isComparing}
                  onFileSelectedA={(f) => { void handleFileSelectedA(f); }}
                  onFileSelectedB={(f) => { void handleFileSelectedB(f); }}
                  onRunComparison={handleRunComparison}
                />
              ) : activeTab === 'regression' ? (
                <RegressionPage comparison={comparison} />
              ) : activeTab === 'reports' ? (
                <ReportPage comparison={comparison} regression={regressionAnalysis} />
              ) : activeTab === 'style-explorer' ? (
                <StyleExplorerPage />
              ) : (
                /* Canvas-based pages: inspector/explore, diagnostics, statistics */
                <ResizablePanel
                  leftWidth={leftPanelWidth}
                  rightWidth={rightPanelWidth}
                  leftCollapsed={leftCollapsed}
                  rightCollapsed={rightCollapsed}
                  onLeftResize={setLeftPanelWidth}
                  onRightResize={setRightPanelWidth}
                  left={
                    leftPanel ? (
                      <div
                        className="flex h-full flex-col overflow-hidden"
                        aria-label={
                          activeTab === 'statistics'
                            ? 'Statistics'
                            : activeTab === 'diagnostics'
                            ? 'Diagnostic Explorer'
                            : 'Feature Explorer'
                        }
                      >
                        {leftPanel}
                      </div>
                    ) : null
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
                          {...(pendingFile !== null ? { fileName: pendingFile.name } : {})}
                          {...(loadError !== undefined ? { error: loadError } : {})}
                        />
                      )}
                      {devOverlayVisible && (
                        <div data-dev-overlay="">
                          <DeveloperOverlay
                            metrics={metrics}
                            viewport={viewport}
                            hoveredFeature={
                              hover.layerName !== null && hover.featureIndex !== null
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
                  right={
                    <div
                      className="flex h-full flex-col overflow-hidden"
                      aria-label={
                        activeTab === 'diagnostics' ? 'Rule Details' : 'Feature Inspector'
                      }
                    >
                      {activeTab === 'diagnostics' ? (
                        <DiagnosticsRightPanel
                          diagnostic={diagnostics.selectedDiagnostic}
                        />
                      ) : (
                        <FeaturePanel store={store} />
                      )}
                    </div>
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* NextStepBar — contextual recommended actions */}
          <NextStepBar
            currentPage={activeTab as any}
            onNavigate={(page) => setActiveTab(page as NavTab)}
          />
        </div>
      </div>

      {/* Footer */}
      <WorkspaceFooter viewport={viewport} fps={metrics.fps} />

      {/* Overlays — render over workspace without unmounting canvas */}
      <AnimatePresence>
        {settingsOpen && (
          <SettingsOverlay key="settings" onClose={() => setSettingsOpen(false)} />
        )}
        {commandPaletteOpen && (
          <CommandPalette
            key="command-palette"
            onClose={() => setCommandPaletteOpen(false)}
            onNavigate={(page) => setActiveTab(page as NavTab)}
            onGoHome={onGoHome}
            onOpenSettings={() => { setCommandPaletteOpen(false); setSettingsOpen(true); }}
            onOpenShortcuts={() => { setCommandPaletteOpen(false); setShortcutOverlayOpen(true); }}
            onTogglePresentationMode={() => { getPresentationService().toggle(); setCommandPaletteOpen(false); }}
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
          <HelpOverlay
            key="help"
            onClose={() => setHelpOverlayOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
