/**
 * @tileguard/inspector — InspectorApp (Milestone 7 — Step 1)
 *
 * Full production shell integrating:
 *   - WorkspaceService (panel layout persistence)
 *   - CameraAnimator (smooth feature focus)
 *   - PerformanceProfiler + DeveloperOverlay
 *   - LoadingOverlay with multi-step progress
 *   - Enhanced Footer (FPS, hover, selected, zoom)
 *   - All 12 keyboard shortcuts
 *   - Wired Settings button, Reset View button
 *   - Compare tab with ComparisonPage (Milestone 7)
 */

import {
  HelpCircle,
  Minus,
  Moon,
  Settings as SettingsIcon,
  Shield,
  Square,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createComparisonService,
  type TileComparison,
  type TileSnapshot,
} from '../comparison/index.js';
import {
  InspectorProvider,
  useInspectorContext,
} from '../context/InspectorContext.js';
import { useStatistics } from '../hooks/use-statistics-settings.js';
import {
  useHover,
  useLifecycle,
  useSearch,
  useSelectedFeature,
} from '../hooks/use-store.js';
import { useProfiler } from '../hooks/useProfiler.js';
import { useWorkspace } from '../hooks/useWorkspace.js';
import {
  createPerformanceProfiler,
  type PerformanceProfiler,
} from '../performance/PerformanceProfiler.js';
import { decodeBrowserTile } from '../services/browser-tile-loader.js';
import {
  createShortcutService,
  type ShortcutAction,
} from '../services/ShortcutService.js';
import { getPresentationService } from '../services/PresentationService.js';
import type { ViewportState } from '../viewport/viewport.js';
import { createRegressionEngine } from '../analysis/RegressionEngine.js';
import type { RegressionAnalysis } from '../analysis/models/regression.js';
import { CanvasView } from './CanvasView.js';
import { ComparisonPage } from './comparison/ComparisonPage.js';
import { RegressionPage } from './regression/RegressionPage.js';
import { ReportPage } from './report/ReportPage.js';
import { StyleExplorerPage } from './style/StyleExplorerPage.js';
import {
  DiagnosticsPageHeader,
  DiagnosticsLeftPanel,
  DiagnosticsRightPanel,
  useDiagnosticsState,
} from './diagnostics/DiagnosticsPage.js';
import { FeatureExplorer } from './inspector/FeatureExplorer.js';
import { InspectorPageHeader } from './inspector/InspectorPageHeader.js';
import { PresentationToggle } from './presentation/PresentationToggle.js';
import { FeaturePanel } from './feature/FeaturePanel.js';
import type { LoadingStep } from './loading/LoadingOverlay.js';
import { LoadingOverlay } from './loading/LoadingOverlay.js';
import { DeveloperOverlay } from './profiler/DeveloperOverlay.js';
import { type NavTab, SidebarNav } from './SidebarNav.js';
import { SettingsPanel } from './settings/SettingsPanel.js';
import { StatisticsPanel } from './statistics/StatisticsPanel.js';
import { Toolbar } from './Toolbar.js';
import { WelcomeView } from './WelcomeView.js';

// ---------------------------------------------------------------------------
// Module-level singleton profiler (shared across renders)
// ---------------------------------------------------------------------------
const _profiler: PerformanceProfiler = createPerformanceProfiler();

// ---------------------------------------------------------------------------
// AppHeader
// ---------------------------------------------------------------------------

function AppHeader(): JSX.Element {
  const iconButton =
    'rounded-[var(--tg-border-radius)] p-1.5 text-[var(--tg-text-secondary)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]';
  return (
    <header className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-3">
      <div className="flex items-center gap-4">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-[var(--tg-error)]" />
          <span className="h-3 w-3 rounded-full bg-[var(--tg-warning)]" />
          <span className="h-3 w-3 rounded-full bg-[var(--tg-success)]" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--tg-text-primary)]">
          <Shield
            className="h-4 w-4 text-[var(--tg-accent)]"
            aria-hidden="true"
          />
          TileGuard Inspector
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className={iconButton} aria-label="Toggle theme">
          <Moon className="h-4 w-4" />
        </button>
        <button type="button" className={iconButton} aria-label="Help">
          <HelpCircle className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={iconButton}
          aria-label="Application settings"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
        <PresentationToggle />
        <span
          className="mx-1 h-4 w-px bg-[var(--tg-border)]"
          aria-hidden="true"
        />
        <button
          type="button"
          className={iconButton}
          aria-label="Minimize window"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={iconButton}
          aria-label="Maximize window"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={iconButton} aria-label="Close window">
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Enhanced Footer
// ---------------------------------------------------------------------------

function Footer({
  viewport,
  fps,
}: {
  readonly viewport: ViewportState | null;
  readonly fps: number;
}): JSX.Element {
  const { store } = useInspectorContext();
  const lifecycle = useLifecycle(store);
  const stats = useStatistics(store);
  const selected = useSelectedFeature(store);
  const hover = useHover(store);
  const loaded = lifecycle.status === 'loaded';

  return (
    <footer
      className="flex h-[var(--tg-footer-height)] shrink-0 items-center gap-[var(--tg-space-sm)] border-t border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-[var(--tg-space-lg)] text-xs text-[var(--tg-text-secondary)]"
      aria-label="Status bar"
    >
      {/* Status dot */}
      <span
        className={`h-2 w-2 rounded-full ${loaded ? 'bg-[var(--tg-success)]' : 'bg-[var(--tg-text-muted)]'}`}
        aria-hidden="true"
      />

      {/* File name */}
      {loaded ? (
        <span className="max-w-40 truncate" title={lifecycle.filePath}>
          {lifecycle.filePath.split('/').pop() ?? lifecycle.filePath}
        </span>
      ) : (
        <span>No tile loaded</span>
      )}

      {/* Tile stats */}
      {loaded && stats.totalLayers > 0 && (
        <>
          <span className="text-[var(--tg-text-muted)]" aria-hidden="true">
            ·
          </span>
          <span>
            {stats.totalLayers} {stats.totalLayers === 1 ? 'layer' : 'layers'}
          </span>
          <span className="text-[var(--tg-text-muted)]" aria-hidden="true">
            ·
          </span>
          <span>{stats.totalFeatures.toLocaleString()} features</span>
          {stats.diagnostics.errors +
            stats.diagnostics.warnings +
            stats.diagnostics.info >
            0 && (
              <>
                <span className="text-[var(--tg-text-muted)]" aria-hidden="true">
                  ·
                </span>
                <span
                  className={
                    stats.diagnostics.errors > 0
                      ? 'text-[var(--tg-error)]'
                      : 'text-[var(--tg-warning)]'
                  }
                >
                  {stats.diagnostics.errors +
                    stats.diagnostics.warnings +
                    stats.diagnostics.info}{' '}
                  diag.
                </span>
              </>
            )}
        </>
      )}

      <span className="flex-1" />

      {/* Hovered feature */}
      {hover.layerName !== null && hover.featureIndex !== null && (
        <>
          <span
            className="hidden text-[var(--tg-text-muted)] xl:inline"
            aria-hidden="true"
          >
            hover:
          </span>
          <span className="hidden text-[var(--tg-text-secondary)] xl:inline">
            {hover.layerName}[{hover.featureIndex}]
          </span>
          <span
            className="hidden text-[var(--tg-text-muted)] xl:inline"
            aria-hidden="true"
          >
            ·
          </span>
        </>
      )}

      {/* Selected feature */}
      {selected !== null && (
        <>
          <span className="text-[var(--tg-accent)]">
            {selected.layerName} #{selected.id ?? selected.featureIndex}
          </span>
          <span className="text-[var(--tg-text-muted)]" aria-hidden="true">
            ·
          </span>
        </>
      )}

      {/* Zoom */}
      {viewport !== null && <span>{viewport.zoom.toFixed(1)}×</span>}

      {/* FPS — hidden in presentation mode */}
      {fps > 0 && (
        <span data-fps-counter="" className="flex items-center gap-1">
          <span className="text-[var(--tg-text-muted)]" aria-hidden="true">
            ·
          </span>
          <span
            className={
              fps < 30
                ? 'text-[var(--tg-error)]'
                : fps < 55
                  ? 'text-[var(--tg-warning)]'
                  : 'text-[var(--tg-text-muted)]'
            }
          >
            {fps.toFixed(0)} fps
          </span>
        </span>
      )}
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

function Workspace(): JSX.Element {
  const { inspector, store } = useInspectorContext();
  const lifecycle = useLifecycle(store);
  const search = useSearch(store);
  const stats = useStatistics(store);
  const selectedFeature = useSelectedFeature(store);
  const hover = useHover(store);

  // Workspace persistence
  const { layout, updateLayout } = useWorkspace();
  const [activeTab, setActiveTabRaw] = useState<NavTab>(layout.activeTab);
  const [leftCollapsed, setLeftCollapsed] = useState(layout.leftCollapsed);
  const [rightCollapsed, setRightCollapsed] = useState(layout.rightCollapsed);

  // Sync tab changes to workspace service
  const setActiveTab = useCallback(
    (tab: NavTab) => {
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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('ready');
  const [loadError, setLoadError] = useState<string | undefined>();
  const isLoading = lifecycle.status === 'loading' || pendingFile !== null;

  // Viewport state (for footer + dev overlay)
  const [viewport, setViewport] = useState<ViewportState | null>(null);

  // Developer overlay
  const [devOverlayVisible, setDevOverlayVisible] = useState(false);

  // Search ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loaded = lifecycle.status === 'loaded';

  // ── Profiler metrics ───────────────────────────────────────────────────
  const metrics = useProfiler(_profiler, 500);

  // ── Comparison state ─────────────────────────────────────────────────────
  const [snapshotA, setSnapshotA] = useState<TileSnapshot | null>(null);
  const [snapshotB, setSnapshotB] = useState<TileSnapshot | null>(null);
  const [filePathA, setFilePathA] = useState<string | null>(null);
  const [filePathB, setFilePathB] = useState<string | null>(null);
  const [comparison, setComparison] = useState<TileComparison | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Build a snapshot from a loaded tile file using a temporary store
  const captureSnapshot = useCallback(
    async (file: File): Promise<TileSnapshot | null> => {
      try {
        const { createInspectorStore } = await import(
          '../store/inspector-store.js'
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
    // Run on next tick to allow UI to update
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

  // ── Regression analysis (shared with RegressionPage + ReportPage) ───────
  const regressionAnalysis = useMemo<RegressionAnalysis | null>(() => {
    if (!comparison) return null;
    return createRegressionEngine().analyze(comparison);
  }, [comparison]);

  // Record a frame whenever the viewport changes (proxy for render activity)
  useEffect(() => {
    if (viewport !== null) {
      _profiler.recordFrame();
    }
  }, [viewport]);

  // ── File loading ─────────────────────────────────────────────────────────
  const selectFile = useCallback(
    (file: File) => {
      setPendingFile(file);
      setActiveTab('inspector');
      setLoadError(undefined);
      updateLayout({ lastFilePath: file.name });
    },
    [setActiveTab, updateLayout],
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
    return () => {
      cancelled = true;
    };
  }, [inspector, pendingFile]);

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
        case 'showDiagnostics':
          setActiveTab('diagnostics');
          break;
        case 'openSettings':
        case 'showSettings':
          setActiveTab('settings');
          break;
        case 'showStatistics':
          setActiveTab('statistics');
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
    return () => {
      cleanup();
      unsub();
    };
  }, [inspector, store, setActiveTab]);

  // ── Diagnostics panel state (lifted so left + right panels share it) ────
  const diagnostics = useDiagnosticsState(store, inspector);

  // ── Left panel content ────────────────────────────────────────────────────
  const leftPanel = useMemo<JSX.Element | null>(() => {
    if (activeTab === 'statistics') return <StatisticsPanel store={store} />;
    if (activeTab === 'settings') return <SettingsPanel inspector={inspector} />;
    if (activeTab === 'diagnostics')
      return (
        <DiagnosticsLeftPanel
          store={store}
          inspector={inspector}
          onDiagnosticSelected={diagnostics.handleSelectDiagnostic}
        />
      );
    // inspector tab (and any other canvas tab)
    return (
      <FeatureExplorer
        store={store}
        inspector={inspector}
        searchQuery={search.query}
        onSearchChange={search.setQuery}
      />
    );
  }, [activeTab, store, inspector, search.query, search.setQuery, diagnostics.handleSelectDiagnostic]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--tg-bg-primary)] font-[var(--tg-font-sans)] text-[var(--tg-text-primary)]">
      <AppHeader />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar navigation */}
        <SidebarNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'welcome' && loaded) return;
            setActiveTab(tab);
          }}
        />

        {activeTab === 'welcome' && !loaded ? (
          <WelcomeView
            onFileSelected={selectFile}
            onComparisonSelected={async (fileA: File, fileB: File) => {
              // Load both snapshots, store them, then navigate to compare
              const [snapA, snapB] = await Promise.all([
                captureSnapshot(fileA),
                captureSnapshot(fileB),
              ]);
              setFilePathA(fileA.name);
              setFilePathB(fileB.name);
              setSnapshotA(snapA);
              setSnapshotB(snapB);
              setComparison(null);
              setActiveTab('compare');
            }}
          />
        ) : activeTab === 'compare' ? (
          /* ── Compare view (full-width, no toolbar/canvas) ─────────────── */
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
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
          </div>
        ) : activeTab === 'regression' ? (
          /* ── Regression Investigation view ─────────────────────────────── */
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <RegressionPage
              comparison={comparison}
            />
          </div>
        ) : activeTab === 'reports' ? (
          /* ── Report Generation view ────────────────────────────────────── */
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <ReportPage
              comparison={comparison}
              regression={regressionAnalysis}
            />
          </div>
        ) : activeTab === 'style-explorer' ? (
          /* ── Style Explorer view ───────────────────────────────────────── */
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <StyleExplorerPage />
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Page identity header — varies by active canvas tab */}
            {activeTab === 'inspector' && <InspectorPageHeader store={store} />}
            {activeTab === 'diagnostics' && <DiagnosticsPageHeader store={store} />}
            <Toolbar
              leftCollapsed={leftCollapsed}
              rightCollapsed={rightCollapsed}
              onToggleLeft={toggleLeft}
              onToggleRight={toggleRight}
              onFileSelected={selectFile}
              onResetView={() => inspector?.render()}
              onOpenSettings={() => setActiveTab('settings')}
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

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              {/* Left panel */}
              {!leftCollapsed && (
                <aside
                  className="w-[var(--tg-sidebar-width)] shrink-0 border-r border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] overflow-hidden flex flex-col"
                  aria-label={
                    activeTab === 'statistics'
                      ? 'Statistics'
                      : activeTab === 'settings'
                        ? 'Settings'
                        : activeTab === 'diagnostics'
                          ? 'Diagnostic Explorer'
                          : 'Feature Explorer'
                  }
                >
                  {leftPanel}
                </aside>
              )}

              {/* Canvas */}
              <div className="relative min-w-0 flex-1">
                <CanvasView
                  onFileSelected={selectFile}
                  onViewportChange={setViewport}
                />

                {/* Loading overlay */}
                {isLoading && loadingStep !== 'ready' && (
                  <LoadingOverlay
                    currentStep={loadingStep}
                    {...(pendingFile !== null
                      ? { fileName: pendingFile.name }
                      : {})}
                    {...(loadError !== undefined ? { error: loadError } : {})}
                  />
                )}

                {/* Developer overlay */}
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

              {/* Right panel: context-sensitive */}
              {!rightCollapsed && (
                <aside
                  className="w-[var(--tg-sidebar-width)] shrink-0 border-l border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] overflow-hidden flex flex-col"
                  aria-label={activeTab === 'diagnostics' ? 'Rule Details' : 'Feature Inspector'}
                >
                  {activeTab === 'diagnostics' ? (
                    <DiagnosticsRightPanel
                      diagnostic={diagnostics.selectedDiagnostic}
                    />
                  ) : (
                    <FeaturePanel store={store} />
                  )}
                </aside>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer viewport={viewport} fps={metrics.fps} />
    </div>
  );
}

/** Step 4 production application shell. */
export function InspectorApp(): JSX.Element {
  return (
    <InspectorProvider>
      <Workspace />
    </InspectorProvider>
  );
}
