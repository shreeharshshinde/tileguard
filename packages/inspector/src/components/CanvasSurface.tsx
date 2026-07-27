import {
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  type WheelEvent,
} from 'react';

export interface CanvasSurfaceProps {
  readonly cursor: string;
  readonly onCanvasReady: (canvas: HTMLCanvasElement) => void;
  readonly onResize: (cssWidth: number, cssHeight: number) => void;
  readonly onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => void;
  readonly onPointerUp: (event: PointerEvent<HTMLCanvasElement>) => void;
  readonly onPointerLeave: () => void;
  readonly onClick: (event: MouseEvent<HTMLCanvasElement>) => void;
  readonly onWheel: (event: WheelEvent<HTMLCanvasElement>) => void;
}

/** Owns the canvas element, its dimensions, and device-pixel-ratio scaling. */
export function CanvasSurface(props: CanvasSurfaceProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (container === null || canvas === null) return undefined;
    propsRef.current.onCanvasReady(canvas);
    const observer = new ResizeObserver(([entry]) => {
      if (entry === undefined) return;
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      // The renderer receives CSS pixels before this component restores DPR scaling.
      propsRef.current.onResize(width, height);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full">
      <canvas
        ref={canvasRef}
        className="block touch-none"
        style={{ cursor: props.cursor }}
        onPointerDown={props.onPointerDown}
        onPointerMove={props.onPointerMove}
        onPointerUp={props.onPointerUp}
        onPointerLeave={props.onPointerLeave}
        onClick={props.onClick}
        onWheel={props.onWheel}
      />
    </div>
  );
}
