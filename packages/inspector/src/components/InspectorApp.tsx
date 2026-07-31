import {
  HelpCircle,
  Minus,
  Moon,
  Settings as SettingsIcon,
  Shield,
  Square,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  InspectorProvider,
  useInspectorContext,
} from '../context/InspectorContext.js';
import {
  useLifecycle,
  useSearch,
  useSelectedFeature,
} from '../hooks/use-store.js';
import { useStatistics } from '../hooks/use-statistics-settings.js';
import { decodeBrowserTile } from '../services/browser-tile-loader.js';
import {
  createShortcutService,
  type ShortcutAction,
} from '../services/ShortcutService.js';
import type { ViewportState } from '../viewport/viewport.js';
import { CanvasView } from './CanvasView.js';
import { DiagnosticPanel } from './diagnostics/DiagnosticPanel.js';
import { FeaturePanel } from './feature/FeaturePanel.js';
import { type NavTab, SidebarNav } from './SidebarNav.js';
import { SettingsPanel } from './settings/SettingsPanel.js';
import { StatisticsPanel } from './statistics/StatisticsPanel.js';
import { Toolbar } from './Toolbar.js';
import { WelcomeView } from './WelcomeView.js';

// ---------------------------------------------------------------------------
// AppHeader
// ---------------------------------------------------------------------------

function AppHeader(): JSX.Element {
  const iconButton =
    'rounded-[var(--tg-border-radius)] p-1.5 text-[var(--tg-text-secondary)] transition hover:bg-[var(--tg-bg-hover)] hover:text-[var(--tg-text-primary)]';
  return (
    <header className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-3">
      <div className="flex items-center gap-4">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[var(--tg-error)]" />
          <span className="h-3 w-3 rounded-full bg-[var(--tg-warning)]" />
          <span className="h-3 w-3 rounded-full bg-[var(--tg-success)]" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--tg-text-primary)]">
          <Shield className="h-4 w-4 text-[var(--tg-accent)]" />
          TileGuard Inspector
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className={iconButton} aria-label="Theme">
          <Moon className="h-4 w-4" />
        </button>
        <button type="button" className={iconButton} aria-label="Help">
          <HelpCircle className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled
          className={`${iconButton} cursor-not-allowed opacity-50`}
          aria-label="Settings"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
        <span className="mx-1 h-4 w-px bg-[var(--tg-border)]" />
        <button type="button" className={iconButton} aria-label="Minimize">
          <Minus className="h-4 w-4" />
        </button>
        <button type="button" className={iconButton} aria-label="Maximize">
          <Square className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={iconButton} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function Footer({
  viewport,
}: {
  readonly viewport: ViewportState | null;
}): JSX.Element {
  const { store } = useInspectorContext();
  const lifecycle = useLifecycle(store);
  const stats = useStatistics(store);
  const selected = useSelectedFeature(store);
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
      {loaded && (
        <span className="max-w-40 truncate" title={lifecycle.filePath}>
          {lifecycle.filePath.split('/').pop() ?? lifecycle.filePath}
        </span>
      )}
      {!loaded && <span>No tile loaded</span>}

      {/* Tile stats */}
      {loaded && stats.totalLayers > 0 && (
        <>
          <span className="text-[var(--tg-text-muted)]">·</span>
          <span>
            {stats.totalLayers} {stats.totalLayers === 1 ? 'layer' : 'layers'}
          </span>
          <span className="text-[var(--tg-text-muted)]">·</span>
          <span>{stats.totalFeatures.toLocaleString()} features</span>
          {stats.diagnostics.errors +
            stats.diagnostics.warnings +
            stats.diagnostics.info >
            0 && (
            <>
              <span className="text-[var(--tg-text-muted)]">·</span>
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

      {/* Selection info */}
      {selected !== null && (
        <>
          <span className="text-[var(--tg-accent)]">
            {selected.layerName} #{selected.id ?? selected.featureIndex}
          </span>
          <span className="text-[var(--tg-text-muted)]">·</span>
        </>
      )}

      {/* Viewport zoom */}
      {viewport !== null && (
        <span>
          Zoom {viewport.zoom.toFixed(1)}× · {Math.round(viewport.width)}×
          {Math.round(viewport.height)}
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
  const [activeTab, setActiveTab] = useState<NavTab>('welcome');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [viewport, setViewport] = useState<ViewportState | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loaded = lifecycle.status === 'loaded';

  // ── File loading ─────────────────────────────────────────────────────────
  const selectFile = useCallback((file: File) => {
    setPendingFile(file);
    setActiveTab('inspector');
  }, []);

  useEffect(() => {
    if (inspector === null || pendingFile === null) return;
    let cancelled = false;
    void decodeBrowserTile(pendingFile)
      .then((artifact) =>
        cancelled ? undefined : inspector.load(pendingFile.name, artifact, []),
      )
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setPendingFile(null);
      });
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
          inspector?.focusFeature('', -1); // cleared via null guard in store
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
        default:
          break;
      }
    });
    const cleanup = shortcuts.attach(window);
    return () => {
      cleanup();
      unsub();
    };
  }, [inspector, store]);

  // ── Panel content for left aside (depends on activeTab) ──────────────────
  const leftPanel: JSX.Element | null = (() => {
    if (activeTab === 'statistics') {
      return <StatisticsPanel store={store} />;
    }
    if (activeTab === 'settings') {
      return <SettingsPanel inspector={inspector} />;
    }
    // 'inspector' | 'diagnostics' | anything else
    return <DiagnosticPanel store={store} inspector={inspector} />;
  })();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--tg-bg-primary)] font-[var(--tg-font-sans)] text-[var(--tg-text-primary)]">
      <AppHeader />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar navigation */}
        <SidebarNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            // welcome tab: only go to welcome if nothing is loaded
            if (tab === 'welcome' && loaded) return;
            setActiveTab(tab);
          }}
        />

        {activeTab === 'welcome' && !loaded ? (
          <WelcomeView onFileSelected={selectFile} />
        ) : (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Toolbar
              leftCollapsed={leftCollapsed}
              rightCollapsed={rightCollapsed}
              onToggleLeft={() => setLeftCollapsed((v) => !v)}
              onToggleRight={() => setRightCollapsed((v) => !v)}
              onFileSelected={selectFile}
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
            <div className="flex min-h-0 flex-1 overflow-hidden">
              {/* Left panel: varies by tab */}
              {!leftCollapsed && (
                <aside
                  className="w-[var(--tg-sidebar-width)] shrink-0 border-r border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] overflow-hidden flex flex-col"
                  aria-label={
                    activeTab === 'statistics'
                      ? 'Statistics'
                      : activeTab === 'settings'
                        ? 'Settings'
                        : 'Diagnostics'
                  }
                >
                  {leftPanel}
                </aside>
              )}

              {/* Canvas */}
              <CanvasView
                onFileSelected={selectFile}
                onViewportChange={setViewport}
              />

              {/* Right panel: Feature Inspector */}
              {!rightCollapsed && (
                <aside
                  className="w-[var(--tg-sidebar-width)] shrink-0 border-l border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] overflow-hidden flex flex-col"
                  aria-label="Feature Inspector"
                >
                  <FeaturePanel store={store} />
                </aside>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer viewport={viewport} />
    </div>
  );
}

/** Step 3 application shell. */
export function InspectorApp(): JSX.Element {
  return (
    <InspectorProvider>
      <Workspace />
    </InspectorProvider>
  );
}
