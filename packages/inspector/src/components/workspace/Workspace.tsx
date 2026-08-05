/**
 * @tileguard/inspector — Workspace (Phase 1 — Step 3)
 *
 * Container that hosts every existing Inspector feature.
 * Rendered by ApplicationRouter only when a session is active.
 *
 * Structure:
 *   Workspace
 *   ├── WorkspaceHeader
 *   ├── [body row]
 *   │   ├── WorkspaceSidebar
 *   │   └── ActivePage (canvas, compare, regression, reports, style)
 *   └── WorkspaceFooter
 *
 * The canvas is mounted exactly once on first Workspace mount and is
 * never unmounted while Workspace is alive.
 *
 * Exit flow: WorkspaceSidebar calls onGoHome() when the user clicks Home.
 * The caller (ApplicationRouter) decides whether to show ReturnHomeDialog.
 */
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
import { SettingsPanel } from '../settings/SettingsPanel.js';
import { StatisticsPanel } from '../statistics/StatisticsPanel.js';
import { Toolbar } from '../Toolbar.js';
import { SettingsOverlay } from '../settings/SettingsOverlay.js';
import { WorkspaceFooter } from './WorkspaceFooter.js';
import { WorkspaceHeader } from './WorkspaceHeader.js';
import { WorkspaceSidebar } from './WorkspaceSidebar.js';

// ---------------------------------------------------------------------------
// Module-level singleton profiler (shared across renders)
// ---------------------------------------------------------------------------
const _profiler: PerformanceProfiler = createPerformanceProfiler();

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WorkspaceProps {
  /**
   * Called when the user clicks the Home nav item.
   * The parent (ApplicationRouter) handles ReturnHomeDialog logic.
   */
  readonly onGoHome: () => void;
  /** If provided, this file is loaded immediately on mount. */
  readonly initialFile?: File;
  /** Comparison pair — both must be provided together. */
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

  // Always open workspace on 'inspector' (Explore) tab, regardless of persisted state
  const [activeTab, setActiveTabRaw] = useState<NavTab>('inspector');
  const [leftCollapsed, setLeftCollapsed] = useState(layout.leftCollapsed);
  const [rightCollapsed, setRightCollapsed] = useState(layout.rightCollapsed);

  // Settings overlay
  const [settingsOpen, setSettingsOpen] = useState(false);

  const setActiveTab = useCallback(
    (tab: NavTab) => {
      if (tab === 'settings') {
        setSettingsOpen(true);
        return;
      }
      setActiveTabRaw(tab);
      updateLayout({ activeTab: tab });
    },
    [updateLayout],
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
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Unknown error');
          setLoadingStep('loading');
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
    return () => { cleanup(); unsub(); };
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--tg-bg-primary)] font-[var(--tg-font-sans)] text-[var(--tg-text-primary)]">
      <WorkspaceHeader onOpenSettings={() => setSettingsOpen(true)} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <WorkspaceSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onHomeRequested={onGoHome}
        />

        {/* ── Active page ────────────────────────────────────────────── */}
        {activeTab === 'compare' ? (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <ComparisonPage
              comparison={comparison}
              filePathA={filePathA}
              filePathB={filePathB}
              isComparing={isComparing}
              onFileSelectedA={(f) => { void handleFileSelectedA(f); }}
              onFileSelectedB={(f) => { void handleFileSelectedB(f); }}
              onRunComparison={handleRunComparison}
            />
          </div>
        ) : activeTab === 'regression' ? (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <RegressionPage comparison={comparison} />
          </div>
        ) : activeTab === 'reports' ? (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <ReportPage comparison={comparison} regression={regressionAnalysis} />
          </div>
        ) : activeTab === 'style-explorer' ? (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <StyleExplorerPage />
          </div>
        ) : (
          /* ── Canvas-based pages: inspector/explore, diagnostics, statistics */
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
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

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              {!leftCollapsed && (
                <aside
                  className="w-[var(--tg-sidebar-width)] shrink-0 border-r border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] overflow-hidden flex flex-col"
                  aria-label={
                    activeTab === 'statistics' ? 'Statistics'
                      : activeTab === 'diagnostics' ? 'Diagnostic Explorer'
                      : 'Feature Explorer'
                  }
                >
                  {leftPanel}
                </aside>
              )}

              {/* Canvas — always mounted while Workspace is alive */}
              <div className="relative min-w-0 flex-1">
                <CanvasView onFileSelected={selectFile} onViewportChange={setViewport} />

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

              {!rightCollapsed && (
                <aside
                  className="w-[var(--tg-sidebar-width)] shrink-0 border-l border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] overflow-hidden flex flex-col"
                  aria-label={activeTab === 'diagnostics' ? 'Rule Details' : 'Feature Inspector'}
                >
                  {activeTab === 'diagnostics' ? (
                    <DiagnosticsRightPanel diagnostic={diagnostics.selectedDiagnostic} />
                  ) : (
                    <FeaturePanel store={store} />
                  )}
                </aside>
              )}
            </div>
          </div>
        )}
      </div>

      <WorkspaceFooter viewport={viewport} fps={metrics.fps} />

      {/* Settings overlay — renders over workspace without unmounting canvas */}
      {settingsOpen && (
        <SettingsOverlay onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
