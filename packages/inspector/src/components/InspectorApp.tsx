import {
  HelpCircle,
  Minus,
  Moon,
  Settings as SettingsIcon,
  Shield,
  Square,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  InspectorProvider,
  useInspectorContext,
} from '../context/InspectorContext.js';
import { useLifecycle } from '../hooks/use-store.js';
import { decodeBrowserTile } from '../services/browser-tile-loader.js';
import type { ViewportState } from '../viewport/viewport.js';
import { CanvasView } from './CanvasView.js';
import { type NavTab, SidebarNav } from './SidebarNav.js';
import { Toolbar } from './Toolbar.js';
import { WelcomeView } from './WelcomeView.js';

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

function Workspace(): JSX.Element {
  const { inspector, store } = useInspectorContext();
  const lifecycle = useLifecycle(store);
  const [activeTab, setActiveTab] = useState<NavTab>('welcome');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [viewport, setViewport] = useState<ViewportState | null>(null);

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

  const loaded = lifecycle.status === 'loaded';
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--tg-bg-primary)] font-[var(--tg-font-sans)] text-[var(--tg-text-primary)]">
      <AppHeader />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SidebarNav
          activeTab={activeTab}
          onTabChange={(tab) =>
            setActiveTab(tab === 'welcome' ? 'welcome' : 'inspector')
          }
        />
        {activeTab === 'welcome' && !loaded ? (
          <WelcomeView onFileSelected={selectFile} />
        ) : (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Toolbar
              leftCollapsed={leftCollapsed}
              rightCollapsed={rightCollapsed}
              onToggleLeft={() => setLeftCollapsed((value) => !value)}
              onToggleRight={() => setRightCollapsed((value) => !value)}
              onFileSelected={selectFile}
            />
            <div className="flex min-h-0 flex-1 overflow-hidden">
              {!leftCollapsed && (
                <aside className="w-[var(--tg-sidebar-width)] shrink-0 border-r border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]">
                  <div className="border-b border-[var(--tg-border)] p-[var(--tg-space-lg)] text-sm font-semibold">
                    Diagnostics
                  </div>
                  <div className="p-[var(--tg-space-lg)] text-sm text-[var(--tg-text-muted)]">
                    Coming in Step 2
                  </div>
                </aside>
              )}
              <CanvasView
                onFileSelected={selectFile}
                onViewportChange={setViewport}
              />
              {!rightCollapsed && (
                <aside className="w-[var(--tg-sidebar-width)] shrink-0 border-l border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]">
                  <div className="border-b border-[var(--tg-border)] p-[var(--tg-space-lg)] text-sm font-semibold">
                    Feature Inspector
                  </div>
                  <div className="p-[var(--tg-space-lg)] text-sm text-[var(--tg-text-muted)]">
                    Coming in Step 2
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}
      </div>
      <footer className="flex h-[var(--tg-footer-height)] shrink-0 items-center gap-[var(--tg-space-sm)] border-t border-[var(--tg-border)] bg-[var(--tg-bg-secondary)] px-[var(--tg-space-lg)] text-xs text-[var(--tg-text-secondary)]">
        <span
          className={`h-2 w-2 rounded-full ${loaded ? 'bg-[var(--tg-success)]' : 'bg-[var(--tg-text-muted)]'}`}
        />
        <span>{loaded ? 'Ready' : 'No tile loaded'}</span>
        <span className="flex-1" />
        {viewport !== null && (
          <span>
            Zoom: {viewport.zoom.toFixed(1)}x · Canvas:{' '}
            {Math.round(viewport.width)} × {Math.round(viewport.height)}
          </span>
        )}
      </footer>
    </div>
  );
}

/** Step 1 application shell. */
export function InspectorApp(): JSX.Element {
  return (
    <InspectorProvider>
      <Workspace />
    </InspectorProvider>
  );
}
