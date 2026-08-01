/**
 * @tileguard/inspector — PerformanceProfiler (Milestone 6 — Step 4)
 *
 * Tracks rendering performance metrics: FPS, frame time, and render count.
 * Designed to be called once per render frame from the RenderCoordinator
 * or InspectorApp's render loop.
 *
 * Algorithm:
 *   - Maintain a rolling 60-frame window for FPS calculation.
 *   - Track last frame timestamp and elapsed time.
 *   - Expose metrics as a frozen snapshot for React consumption.
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs.
 * Uses only performance.now() (universal in browsers and Node.js 16+).
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PerformanceMetrics {
  /** Frames per second (rolling 60-frame average). */
  readonly fps: number;
  /** Time elapsed since the previous frame, in milliseconds. */
  readonly frameTimeMs: number;
  /** Total number of frames recorded since the profiler started. */
  readonly renderCount: number;
  /** Timestamp of the last frame (performance.now() value). */
  readonly lastFrameTime: number;
}

export const EMPTY_METRICS: PerformanceMetrics = Object.freeze({
  fps: 0,
  frameTimeMs: 0,
  renderCount: 0,
  lastFrameTime: 0,
});

export interface PerformanceProfiler {
  /**
   * Record a new frame. Call this once per render invocation.
   * Updates all internal state.
   *
   * @param now  Optional timestamp override (default: performance.now()).
   *             Inject a value in tests for deterministic results.
   */
  recordFrame(now?: number): void;

  /** Returns a frozen snapshot of current metrics. */
  getMetrics(): PerformanceMetrics;

  /** Reset all recorded state to initial values. */
  reset(): void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const WINDOW_SIZE = 60;

class PerformanceProfilerImpl implements PerformanceProfiler {
  /** Ring buffer of frame timestamps for FPS calculation. */
  private _timestamps: number[] = [];
  private _head = 0; // ring buffer write pointer
  private _count = 0; // number of entries in use (0 … WINDOW_SIZE)
  private _lastTimestamp = -1; // -1 = no frame recorded yet
  private _renderCount = 0;
  private _frameTimeMs = 0;

  recordFrame(now?: number): void {
    const ts = now ?? performance.now();
    this._renderCount++;

    if (this._lastTimestamp >= 0) {
      this._frameTimeMs = ts - this._lastTimestamp;
    }

    // Insert into ring buffer
    if (this._timestamps.length < WINDOW_SIZE) {
      this._timestamps.push(ts);
    } else {
      this._timestamps[this._head] = ts;
    }
    this._head = (this._head + 1) % WINDOW_SIZE;
    this._count = Math.min(this._count + 1, WINDOW_SIZE);
    this._lastTimestamp = ts;
  }

  getMetrics(): PerformanceMetrics {
    if (this._count < 2) {
      return Object.freeze({
        fps: 0,
        frameTimeMs: this._frameTimeMs,
        renderCount: this._renderCount,
        lastFrameTime: Math.max(0, this._lastTimestamp),
      });
    }

    // Find oldest and newest timestamps in the window
    let oldest = this._timestamps[0] ?? 0;
    let newest = oldest;
    for (let i = 1; i < this._count; i++) {
      const t = this._timestamps[i] ?? 0;
      if (t < oldest) oldest = t;
      if (t > newest) newest = t;
    }

    const span = newest - oldest;
    const fps = span > 0 ? ((this._count - 1) / span) * 1000 : 0;

    return Object.freeze({
      fps: Math.round(fps * 10) / 10,
      frameTimeMs: Math.round(this._frameTimeMs * 100) / 100,
      renderCount: this._renderCount,
      lastFrameTime: this._lastTimestamp,
    });
  }

  reset(): void {
    this._timestamps = [];
    this._head = 0;
    this._count = 0;
    this._lastTimestamp = -1;
    this._renderCount = 0;
    this._frameTimeMs = 0;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a PerformanceProfiler with a 60-frame rolling window.
 *
 * @example
 *   const profiler = createPerformanceProfiler();
 *   // In render loop:
 *   profiler.recordFrame();
 *   const { fps, frameTimeMs } = profiler.getMetrics();
 */
export function createPerformanceProfiler(): PerformanceProfiler {
  return new PerformanceProfilerImpl();
}
