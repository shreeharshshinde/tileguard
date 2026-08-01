/**
 * @tileguard/inspector — CameraAnimator (Milestone 6 — Step 4)
 *
 * Smooth viewport animation engine. Interpolates from the current
 * ViewportState to a target ViewportState over a configurable duration
 * using requestAnimationFrame scheduling.
 *
 * Features:
 *   - Four easing functions: linear, easeOut, easeInOut, smoothstep
 *   - Cancels any in-progress animation when a new one starts
 *   - Fires an onFrame callback each tick so callers can re-render
 *   - Fires an onComplete callback when the animation finishes naturally
 *   - Pure: no imports from DOM canvas / renderer / store / React
 *
 * Boundary: uses requestAnimationFrame (window.requestAnimationFrame) and
 * cancelAnimationFrame only. No canvas, no renderer, no React.
 */

import type { ViewportState } from '../viewport/viewport.js';

// ---------------------------------------------------------------------------
// Easing functions
// ---------------------------------------------------------------------------

export type EasingFn = 'linear' | 'easeOut' | 'easeInOut' | 'smoothstep';

function applyEasing(t: number, fn: EasingFn): number {
  switch (fn) {
    case 'linear':
      return t;
    case 'easeOut':
      return 1 - (1 - t) * (1 - t);
    case 'easeInOut':
      return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    case 'smoothstep':
      return t * t * (3 - 2 * t);
  }
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AnimationOptions {
  /** Duration in milliseconds. Default: 350. */
  readonly duration?: number;
  /** Easing function. Default: 'easeInOut'. */
  readonly easing?: EasingFn;
  /** Called each frame with the interpolated ViewportState. */
  readonly onFrame: (state: ViewportState) => void;
  /** Called once when the animation completes (not called if cancelled). */
  readonly onComplete?: () => void;
}

export interface CameraAnimator {
  /**
   * Start animating from `from` to `to`.
   * Any in-progress animation is cancelled before starting.
   */
  animateTo(
    from: ViewportState,
    to: ViewportState,
    opts: AnimationOptions,
  ): void;

  /**
   * Cancel any in-progress animation immediately.
   * The current frame's onFrame will NOT be called.
   * onComplete will NOT be called.
   */
  cancel(): void;

  /** Returns true if an animation is currently running. */
  readonly isAnimating: boolean;
}

// ---------------------------------------------------------------------------
// Interpolation helper
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateViewport(
  from: ViewportState,
  to: ViewportState,
  t: number,
): ViewportState {
  return {
    zoom: lerp(from.zoom, to.zoom, t),
    panX: lerp(from.panX, to.panX, t),
    panY: lerp(from.panY, to.panY, t),
    extent: to.extent,
    width: to.width,
    height: to.height,
    minZoom: to.minZoom,
    maxZoom: to.maxZoom,
  };
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * RAF-backed scheduler abstraction so tests can inject a synchronous
 * scheduler without needing a DOM environment.
 */
export interface RafScheduler {
  requestFrame(cb: (timestamp: number) => void): number;
  cancelFrame(id: number): void;
}

/** Production scheduler using window.requestAnimationFrame. */
export const BROWSER_RAF_SCHEDULER: RafScheduler = {
  requestFrame: (cb) => requestAnimationFrame(cb),
  cancelFrame: (id) => cancelAnimationFrame(id),
};

class CameraAnimatorImpl implements CameraAnimator {
  private _rafId: number | null = null;
  private _animating = false;
  private readonly _scheduler: RafScheduler;

  constructor(scheduler: RafScheduler) {
    this._scheduler = scheduler;
  }

  get isAnimating(): boolean {
    return this._animating;
  }

  cancel(): void {
    if (this._rafId !== null) {
      this._scheduler.cancelFrame(this._rafId);
      this._rafId = null;
    }
    this._animating = false;
  }

  animateTo(
    from: ViewportState,
    to: ViewportState,
    opts: AnimationOptions,
  ): void {
    // Cancel any running animation
    this.cancel();

    const duration = opts.duration ?? 350;
    const easing = opts.easing ?? 'easeInOut';
    // Guard: treat zero or negative duration as instant (t=1 immediately).
    if (duration <= 0) {
      const state = interpolateViewport(from, to, 1);
      opts.onFrame(state);
      this._animating = false;
      this._rafId = null;
      opts.onComplete?.();
      return;
    }
    let startTime: number | null = null;

    this._animating = true;

    const tick = (timestamp: number) => {
      if (!this._animating) return;

      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const rawT = Math.min(elapsed / duration, 1);
      const t = applyEasing(rawT, easing);

      const state = interpolateViewport(from, to, t);
      opts.onFrame(state);

      if (rawT < 1) {
        this._rafId = this._scheduler.requestFrame(tick);
      } else {
        this._animating = false;
        this._rafId = null;
        opts.onComplete?.();
      }
    };

    this._rafId = this._scheduler.requestFrame(tick);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a CameraAnimator.
 *
 * @param scheduler  Optional RAF scheduler (for testing). Defaults to browser.
 *
 * @example
 *   const animator = createCameraAnimator();
 *   animator.animateTo(currentViewport.getState(), targetState, {
 *     duration: 400,
 *     easing: 'easeOut',
 *     onFrame: (state) => setViewportState(state),
 *     onComplete: () => console.log('done'),
 *   });
 */
export function createCameraAnimator(
  scheduler: RafScheduler = BROWSER_RAF_SCHEDULER,
): CameraAnimator {
  return new CameraAnimatorImpl(scheduler);
}
