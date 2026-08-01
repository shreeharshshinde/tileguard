/**
 * @tileguard/inspector — CameraAnimator tests (Milestone 6 — Step 4)
 *
 * Tests the animation engine: easing functions, RAF scheduling,
 * cancellation, onComplete callback, and isAnimating state.
 *
 * All tests use a synchronous, injectable RAF scheduler so no real timers
 * or browser APIs are required.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  createCameraAnimator,
  type RafScheduler,
} from '../src/animation/CameraAnimator.js';
import type { ViewportState } from '../src/viewport/viewport.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeViewportState(
  overrides: Partial<ViewportState> = {},
): ViewportState {
  return {
    zoom: 1,
    panX: 0,
    panY: 0,
    extent: 4096,
    width: 800,
    height: 600,
    minZoom: 0.25,
    maxZoom: 64,
    ...overrides,
  };
}

/**
 * Synchronous RAF scheduler. Frames run immediately in registration order.
 * Use step(n) to advance exactly n frames; step() to drain everything.
 */
function makeSyncScheduler(): RafScheduler & {
  step: (count?: number) => void;
} {
  let nextId = 0;
  const pending = new Map<number, (ts: number) => void>();
  let ts = 0;
  return {
    requestFrame(cb) {
      const id = nextId++;
      pending.set(id, cb);
      return id;
    },
    cancelFrame(id) {
      pending.delete(id as number);
    },
    step(count = 100_000) {
      let i = 0;
      while (pending.size > 0 && i++ < count) {
        const [id, cb] = pending.entries().next().value as [
          number,
          (ts: number) => void,
        ];
        pending.delete(id);
        ts += 16; // simulate ~60fps
        cb(ts);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CameraAnimator', () => {
  // ── Initial state ──────────────────────────────────────────────────────

  it('starts as not animating', () => {
    const animator = createCameraAnimator(makeSyncScheduler());
    expect(animator.isAnimating).toBe(false);
  });

  // ── Basic animation ────────────────────────────────────────────────────

  it('animates from source to target viewport', () => {
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const frames: ViewportState[] = [];

    animator.animateTo(
      makeViewportState({ zoom: 1 }),
      makeViewportState({ zoom: 4 }),
      { duration: 160, easing: 'linear', onFrame: (s) => frames.push(s) },
    );
    scheduler.step();

    expect(frames.length).toBeGreaterThan(0);
    expect(frames[frames.length - 1]!.zoom).toBeCloseTo(4, 1);
    expect(animator.isAnimating).toBe(false);
  });

  it('interpolates panX and panY alongside zoom', () => {
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const final: ViewportState[] = [];

    animator.animateTo(
      makeViewportState({ zoom: 1, panX: 0, panY: 0 }),
      makeViewportState({ zoom: 2, panX: 100, panY: 200 }),
      { duration: 64, easing: 'linear', onFrame: (s) => final.push(s) },
    );
    scheduler.step();

    const last = final[final.length - 1]!;
    expect(last.panX).toBeCloseTo(100, 1);
    expect(last.panY).toBeCloseTo(200, 1);
  });

  // ── onComplete ─────────────────────────────────────────────────────────

  it('fires onComplete exactly once when animation finishes naturally', () => {
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const onComplete = vi.fn();

    animator.animateTo(
      makeViewportState({ zoom: 1 }),
      makeViewportState({ zoom: 2 }),
      { duration: 64, easing: 'linear', onFrame: () => {}, onComplete },
    );
    scheduler.step();

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(animator.isAnimating).toBe(false);
  });

  // ── Cancellation ───────────────────────────────────────────────────────

  it('cancel() stops animation mid-flight', () => {
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    let frameCount = 0;

    animator.animateTo(
      makeViewportState({ zoom: 1 }),
      makeViewportState({ zoom: 8 }),
      {
        duration: 1000,
        easing: 'linear',
        onFrame: () => {
          frameCount++;
        },
      },
    );
    scheduler.step(3); // advance 3 frames
    const countAtCancel = frameCount;
    animator.cancel();
    scheduler.step(10); // more steps — should produce nothing

    expect(animator.isAnimating).toBe(false);
    expect(frameCount).toBe(countAtCancel);
  });

  it('cancel() is a no-op when no animation is running', () => {
    const animator = createCameraAnimator(makeSyncScheduler());
    expect(() => animator.cancel()).not.toThrow();
    expect(animator.isAnimating).toBe(false);
  });

  it('onComplete is NOT called when animation is cancelled', () => {
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const onComplete = vi.fn();

    animator.animateTo(
      makeViewportState({ zoom: 1 }),
      makeViewportState({ zoom: 10 }),
      { duration: 640, easing: 'linear', onFrame: () => {}, onComplete },
    );
    scheduler.step(3);
    animator.cancel();

    expect(onComplete).not.toHaveBeenCalled();
  });

  // ── New animation cancels previous ────────────────────────────────────

  it('starting a new animation cancels the in-flight one', () => {
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const complete1 = vi.fn();
    const frames2: number[] = [];

    // Long first animation
    animator.animateTo(
      makeViewportState({ zoom: 1 }),
      makeViewportState({ zoom: 10 }),
      {
        duration: 640,
        easing: 'linear',
        onFrame: () => {},
        onComplete: complete1,
      },
    );
    scheduler.step(3); // 3 frames in, still running
    expect(animator.isAnimating).toBe(true);

    // Start second animation — should cancel the first
    animator.animateTo(
      makeViewportState({ zoom: 1 }),
      makeViewportState({ zoom: 2 }),
      { duration: 64, easing: 'linear', onFrame: (s) => frames2.push(s.zoom) },
    );
    scheduler.step();

    expect(complete1).not.toHaveBeenCalled();
    expect(frames2[frames2.length - 1]).toBeCloseTo(2, 1);
  });

  // ── Easing functions ───────────────────────────────────────────────────

  it('supports all four easing functions without throwing', () => {
    for (const easing of [
      'linear',
      'easeOut',
      'easeInOut',
      'smoothstep',
    ] as const) {
      const scheduler = makeSyncScheduler();
      const animator = createCameraAnimator(scheduler);
      expect(() => {
        animator.animateTo(
          makeViewportState({ zoom: 1 }),
          makeViewportState({ zoom: 3 }),
          { duration: 64, easing, onFrame: () => {} },
        );
        scheduler.step();
      }).not.toThrow();
    }
  });

  it('easeOut converges faster than linear at the start', () => {
    // With easeOut, the first few frames should advance more than linear
    let linearZoom = 0;
    let easeOutZoom = 0;

    const run = (easing: 'linear' | 'easeOut', setter: (z: number) => void) => {
      const scheduler = makeSyncScheduler();
      const animator = createCameraAnimator(scheduler);
      animator.animateTo(
        makeViewportState({ zoom: 0 }),
        makeViewportState({ zoom: 1 }),
        { duration: 160, easing, onFrame: (s) => setter(s.zoom) },
      );
      scheduler.step(2); // just 2 frames
    };

    run('linear', (z) => {
      linearZoom = z;
    });
    run('easeOut', (z) => {
      easeOutZoom = z;
    });

    // easeOut should have progressed further than linear after the same number of frames
    expect(easeOutZoom).toBeGreaterThan(linearZoom);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  it('zero-duration animation completes immediately (no RAF scheduled)', () => {
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const frames: number[] = [];
    const onComplete = vi.fn();

    animator.animateTo(
      makeViewportState({ zoom: 1 }),
      makeViewportState({ zoom: 5 }),
      {
        duration: 0,
        easing: 'linear',
        onFrame: (s) => frames.push(s.zoom),
        onComplete,
      },
    );
    // No scheduler.step() needed — should have run synchronously
    expect(frames[frames.length - 1]).toBeCloseTo(5, 1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(animator.isAnimating).toBe(false);
  });

  it('animating flag is true during animation and false after', () => {
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const snapshots: boolean[] = [];

    animator.animateTo(
      makeViewportState({ zoom: 1 }),
      makeViewportState({ zoom: 2 }),
      {
        duration: 64,
        easing: 'linear',
        onFrame: () => {
          snapshots.push(animator.isAnimating);
        },
      },
    );
    scheduler.step();

    expect(snapshots.every(Boolean)).toBe(true); // true during all frames
    expect(animator.isAnimating).toBe(false); // false after completion
  });
});
