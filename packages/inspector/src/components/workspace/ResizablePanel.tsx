/**
 * @tileguard/inspector — ResizablePanel (Phase 2 — Step 11)
 *
 * IDE-style resizable panel layout.
 * Implements a draggable resize handle between the left sidebar and canvas,
 * and between the canvas and the right inspector panel.
 *
 * Built without react-resizable-panels — uses mouse/pointer events + CSS
 * flexbox for full control and no additional dependencies.
 *
 * Usage:
 *   <ResizablePanel
 *     left={<FeatureExplorer />}
 *     center={<CanvasView />}
 *     right={<FeaturePanel />}
 *     leftWidth={280}
 *     rightWidth={280}
 *     onLeftResize={(w) => ...}
 *     onRightResize={(w) => ...}
 *     leftCollapsed={false}
 *     rightCollapsed={false}
 *   />
 */
import { useCallback, useRef } from 'react';

export interface ResizablePanelProps {
  readonly left?: React.ReactNode;
  readonly center: React.ReactNode;
  readonly right?: React.ReactNode;
  readonly leftWidth?: number;
  readonly rightWidth?: number;
  readonly leftCollapsed?: boolean;
  readonly rightCollapsed?: boolean;
  readonly minPanelWidth?: number;
  readonly maxPanelWidth?: number;
  readonly onLeftResize?: (width: number) => void;
  readonly onRightResize?: (width: number) => void;
}

const DEFAULT_MIN = 160;
const DEFAULT_MAX = 520;

export function ResizablePanel({
  left,
  center,
  right,
  leftWidth = 280,
  rightWidth = 280,
  leftCollapsed = false,
  rightCollapsed = false,
  minPanelWidth = DEFAULT_MIN,
  maxPanelWidth = DEFAULT_MAX,
  onLeftResize,
  onRightResize,
}: ResizablePanelProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);

  // ── Left drag handle ────────────────────────────────────────────────────
  const handleLeftDragStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      isResizingLeft.current = true;
    },
    [],
  );

  const handleLeftDragMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isResizingLeft.current || !containerRef.current) return;
      const containerLeft = containerRef.current.getBoundingClientRect().left;
      const sidebarOffset = leftCollapsed ? 0 : 200; // sidebar width
      const rawWidth = e.clientX - containerLeft - sidebarOffset;
      const clamped = Math.max(
        minPanelWidth,
        Math.min(maxPanelWidth, rawWidth),
      );
      onLeftResize?.(clamped);
    },
    [leftCollapsed, minPanelWidth, maxPanelWidth, onLeftResize],
  );

  const handleLeftDragEnd = useCallback(() => {
    isResizingLeft.current = false;
  }, []);

  // ── Right drag handle ───────────────────────────────────────────────────
  const handleRightDragStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      isResizingRight.current = true;
    },
    [],
  );

  const handleRightDragMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isResizingRight.current || !containerRef.current) return;
      const containerRight = containerRef.current.getBoundingClientRect().right;
      const rawWidth = containerRight - e.clientX;
      const clamped = Math.max(
        minPanelWidth,
        Math.min(maxPanelWidth, rawWidth),
      );
      onRightResize?.(clamped);
    },
    [minPanelWidth, maxPanelWidth, onRightResize],
  );

  const handleRightDragEnd = useCallback(() => {
    isResizingRight.current = false;
  }, []);

  const handleStyle = [
    'absolute top-0 w-1 h-full z-20 cursor-col-resize',
    'transition-colors',
    'hover:bg-[var(--tg-accent)]/40',
    'active:bg-[var(--tg-accent)]/60',
    'before:absolute before:inset-y-0 before:-left-1 before:right-0 before:w-3',
  ].join(' ');

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 flex-1 overflow-hidden"
    >
      {/* Left panel */}
      {left && !leftCollapsed && (
        <aside
          className="relative flex shrink-0 flex-col overflow-hidden border-r border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]"
          style={{ width: leftWidth }}
        >
          {left}
          {/* Left resize handle */}
          <div
            className={handleStyle + ' right-0'}
            onPointerDown={handleLeftDragStart}
            onPointerMove={handleLeftDragMove}
            onPointerUp={handleLeftDragEnd}
            onPointerCancel={handleLeftDragEnd}
            aria-hidden="true"
          />
        </aside>
      )}

      {/* Center: canvas / main content */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {center}
      </div>

      {/* Right panel */}
      {right && !rightCollapsed && (
        <aside
          className="relative flex shrink-0 flex-col overflow-hidden border-l border-[var(--tg-border)] bg-[var(--tg-bg-secondary)]"
          style={{ width: rightWidth }}
        >
          {/* Right resize handle */}
          <div
            className={handleStyle + ' left-0'}
            onPointerDown={handleRightDragStart}
            onPointerMove={handleRightDragMove}
            onPointerUp={handleRightDragEnd}
            onPointerCancel={handleRightDragEnd}
            aria-hidden="true"
          />
          {right}
        </aside>
      )}
    </div>
  );
}
