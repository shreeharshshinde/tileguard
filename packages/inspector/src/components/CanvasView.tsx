import {
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  type WheelEvent,
} from 'react';
import { useInspectorContext } from '../context/InspectorContext.js';
import { createInspector, type Inspector } from '../create-inspector.js';
import { useHover, useLifecycle } from '../hooks/use-store.js';
import { CanvasRenderer } from '../renderer/canvas-renderer.js';
import type { ViewportState } from '../viewport/viewport.js';
import { createViewport, type Viewport } from '../viewport/viewport.js';
import { CanvasSurface } from './CanvasSurface.js';
import { DropZone } from './DropZone.js';

export interface CanvasViewProps {
  readonly onFileSelected: (file: File) => void;
  readonly onViewportChange: (state: ViewportState) => void;
}

/** Composes the frozen inspector pipeline with canvas DOM event orchestration. */
export function CanvasView({
  onFileSelected,
  onViewportChange,
}: CanvasViewProps): JSX.Element {
  const { store, setInspector } = useInspectorContext();
  const lifecycle = useLifecycle(store);
  const hover = useHover(store);
  const viewportRef = useRef<Viewport | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const inspectorRef = useRef<Inspector | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const didDragRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);

  const updateViewport = useCallback(
    (viewport: Viewport): void => {
      viewportRef.current = viewport;
      rendererRef.current?.setViewport(viewport);
      onViewportChange(viewport.getState());
    },
    [onViewportChange],
  );
  const onCanvasReady = (canvas: HTMLCanvasElement): void => {
    if (inspectorRef.current !== null) return;
    const viewport = createViewport({
      width: Math.max(canvas.clientWidth, 1),
      height: Math.max(canvas.clientHeight, 1),
    });
    const renderer = new CanvasRenderer({ viewport, showVertices: false });
    renderer.attachCanvas(canvas);
    const inspector = createInspector({ viewport, renderer, store });
    viewportRef.current = viewport;
    rendererRef.current = renderer;
    inspectorRef.current = inspector;
    setInspector(inspector);
    onViewportChange(viewport.getState());
  };
  const onResize = (width: number, height: number): void => {
    const viewport = viewportRef.current;
    if (viewport === null) return;
    updateViewport(viewport.resize(width, height));
    rendererRef.current?.resize(width, height);
    inspectorRef.current?.render();
  };
  useEffect(() => () => inspectorRef.current?.dispose(), []);
  useEffect(() => {
    if (lifecycle.status !== 'loaded' || viewportRef.current === null) return;
    const extent =
      Object.values(lifecycle.artifact.content.layers)[0]?.extent ?? 4096;
    updateViewport(
      viewportRef.current.fitBounds(
        { minX: 0, minY: 0, maxX: extent, maxY: extent },
        40,
      ),
    );
    inspectorRef.current?.render();
  }, [lifecycle, updateViewport]);
  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (event.button !== 0 && event.button !== 1) return;
    isPanningRef.current = true;
    didDragRef.current = false;
    setIsPanning(true);
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (!isPanningRef.current) {
      inspectorRef.current?.handlePointerMove({
        x: event.nativeEvent.offsetX,
        y: event.nativeEvent.offsetY,
      });
      return;
    }
    const dx = event.clientX - lastPointerRef.current.x;
    const dy = event.clientY - lastPointerRef.current.y;
    if (dx !== 0 || dy !== 0) didDragRef.current = true;
    if (viewportRef.current !== null) {
      updateViewport(viewportRef.current.pan(dx, dy));
      inspectorRef.current?.render();
    }
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    setIsPanning(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onClick = (event: MouseEvent<HTMLCanvasElement>): void => {
    if (!didDragRef.current)
      inspectorRef.current?.handleClick({
        x: event.nativeEvent.offsetX,
        y: event.nativeEvent.offsetY,
      });
  };
  const onWheel = (event: WheelEvent<HTMLCanvasElement>): void => {
    event.preventDefault();
    if (viewportRef.current === null) return;
    updateViewport(
      viewportRef.current.zoomAt(event.deltaY < 0 ? 1.15 : 1 / 1.15, {
        x: event.nativeEvent.offsetX,
        y: event.nativeEvent.offsetY,
      }),
    );
    inspectorRef.current?.render();
  };
  const cursor = isPanning
    ? 'grabbing'
    : hover.layerName !== null
      ? 'pointer'
      : 'grab';
  const showDropZone =
    lifecycle.status === 'uninitialized' || lifecycle.status === 'empty';
  return (
    <main className="relative h-full min-h-0 min-w-0 w-full flex-1 overflow-hidden bg-[var(--tg-bg-primary)]">
      <CanvasSurface
        cursor={cursor}
        onCanvasReady={onCanvasReady}
        onResize={onResize}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => inspectorRef.current?.handlePointerLeave()}
        onClick={onClick}
        onWheel={onWheel}
      />
      {showDropZone && <DropZone onFileSelected={onFileSelected} />}
    </main>
  );
}
