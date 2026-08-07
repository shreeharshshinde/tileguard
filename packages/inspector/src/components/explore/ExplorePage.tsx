/**
 * @tileguard/inspector — ExplorePage (Phase 3 — Explore Workspace)
 *
 * The primary feature inspection environment.
 * Answers: "What is inside this tile?"
 *
 * Layout:
 *   ┌──────────────┬──────────────────────────┬──────────────────────┐
 *   │ LayerExplorer│                          │  FeatureInspector    │
 *   │              │        Canvas            │                      │
 *   │ Search       │                          │  Properties          │
 *   │ Filters      │  (singleton — never      │  Geometry            │
 *   │ Layer list   │   remounted)             │  Coordinates         │
 *   │ Selection    │                          │                      │
 *   └──────────────┴──────────────────────────┴──────────────────────┘
 *
 * This component owns:
 *   - ExplorePage-specific toolbar
 *   - Panel collapse/expand state forwarded from Workspace
 *   - Props threading to LayerExplorer and FeatureInspector
 *
 * It does NOT own:
 *   - The CanvasView (passed in as `canvas` prop — Workspace singleton)
 *   - Store / inspector instances (passed down from Workspace)
 */
import {
  Center,
  Crosshair,
  DownloadIcon,
  Search,
  RotateCcw,
} from 'lucide-react';
import type { Inspector } from '../../create-inspector.js';
import type { InspectorStore } from '../../store/inspector-store.js';
import { WorkspaceToolbar } from '../shared/index.js';
import type { WorkspaceToolbarAction } from '../shared/WorkspaceComponents.js';
import { FeatureInspector } from './FeatureInspector.js';
import { LayerExplorer } from './LayerExplorer.js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ExplorePageProps {
  readonly store: InspectorStore;
  readonly inspector: Inspector | null;
  readonly canvas: React.ReactNode;
  readonly searchQuery: string;
  readonly onSearchChange: (q: string) => void;
  readonly leftWidth?: number;
  readonly rightWidth?: number;
  readonly leftCollapsed?: boolean;
  readonly rightCollapsed?: boolean;
  readonly onLeftResize?: (w: number) => void;
  readonly onRightResize?: (w: number) => void;
  readonly onResetView?: () => void;
  readonly onExport?: () => void;
}

// ---------------------------------------------------------------------------
// ExplorePage
// ---------------------------------------------------------------------------

export function ExplorePage({
  store,
  inspector,
  canvas,
  searchQuery,
  onSearchChange,
  leftWidth = 280,
  rightWidth = 280,
  leftCollapsed = false,
  rightCollapsed = false,
  onLeftResize,
  onRightResize,
  onResetView,
  onExport,
}: ExplorePageProps): JSX.Element {
  // ── Contextual toolbar actions ───────────────────────────────────────────
  const toolbarActions: readonly WorkspaceToolbarAction[] = [
    {
      id: 'reset-view',
      icon: RotateCcw,
      label: 'Reset View',
      onClick: () => onResetView?.(),
    },
    {
      id: 'center',
      icon: Crosshair,
      label: 'Center',
      onClick: () => {
        store.select(null, null);
        onResetView?.();
      },
    },
    {
      id: 'export',
      icon: DownloadIcon,
      label: 'Export',
      onClick: () => onExport?.(),
    },
  ];

  // ── Layout ───────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Contextual toolbar */}
      <WorkspaceToolbar
        actions={toolbarActions}
        rightSlot={
          <div className="flex items-center gap-1">
            <Search className="h-3.5 w-3.5 text-[var(--tg-text-muted)]" aria-hidden />
            <input
              type="search"
              placeholder="Quick search…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-32 bg-transparent text-xs text-[var(--tg-text-primary)] placeholder-[var(--tg-text-muted)] outline-none"
              aria-label="Quick search features"
            />
          </div>
        }
      />

      {/* Three-column resizable layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left: Layer Explorer */}
        {!leftCollapsed && (
          <aside
            className="relative flex shrink-0 flex-col overflow-hidden border-r border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]"
            style={{ width: leftWidth }}
            aria-label="Layer Explorer"
          >
            <LayerExplorer
              store={store}
              inspector={inspector}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
            />
            {/* Resize handle */}
            <ResizeHandle
              side="right"
              onResize={onLeftResize}
              containerRef="left"
              panelWidth={leftWidth}
            />
          </aside>
        )}

        {/* Center: Canvas (singleton) */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {canvas}
        </div>

        {/* Right: Feature Inspector */}
        {!rightCollapsed && (
          <aside
            className="relative flex shrink-0 flex-col overflow-hidden border-l border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]"
            style={{ width: rightWidth }}
            aria-label="Feature Inspector"
          >
            <ResizeHandle
              side="left"
              onResize={onRightResize}
              containerRef="right"
              panelWidth={rightWidth}
            />
            <FeatureInspector store={store} inspector={inspector} />
          </aside>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline ResizeHandle (pointer-event drag)
// ---------------------------------------------------------------------------

interface ResizeHandleProps {
  readonly side: 'left' | 'right';
  readonly onResize?: (w: number) => void;
  readonly containerRef: 'left' | 'right';
  readonly panelWidth: number;
}

function ResizeHandle({
  side,
  onResize,
  panelWidth,
}: ResizeHandleProps): JSX.Element {
  let dragging = false;
  let startX = 0;
  let startWidth = panelWidth;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging = true;
    startX = e.clientX;
    startWidth = panelWidth;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const delta = side === 'right' ? e.clientX - startX : startX - e.clientX;
    const next = Math.max(160, Math.min(520, startWidth + delta));
    onResize?.(next);
  };

  const onPointerUp = () => { dragging = false; };

  const pos = side === 'right' ? 'right-0' : 'left-0';

  return (
    <div
      className={`absolute top-0 ${pos} z-20 h-full w-1 cursor-col-resize transition-colors hover:bg-[var(--tg-accent)]/40 active:bg-[var(--tg-accent)]/60`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-hidden="true"
    />
  );
}
