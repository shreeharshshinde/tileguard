/**
 * @tileguard/inspector — PerformanceProfiler tests (Milestone 6 — Step 4)
 *
 * Tests FPS calculation, frame-time tracking, render count, and reset.
 * All timestamps are injected so the tests are deterministic and require
 * no real timers or DOM environment.
 */

import { describe, expect, it } from 'vitest';
import {
  createPerformanceProfiler,
  EMPTY_METRICS,
} from '../src/performance/PerformanceProfiler.js';

describe('PerformanceProfiler', () => {
  // ── Initial state ──────────────────────────────────────────────────────

  it('returns EMPTY_METRICS shape on creation', () => {
    const p = createPerformanceProfiler();
    const m = p.getMetrics();
    expect(m.fps).toBe(0);
    expect(m.frameTimeMs).toBe(0);
    expect(m.renderCount).toBe(0);
    expect(m.lastFrameTime).toBe(0);
  });

  it('EMPTY_METRICS constant is frozen', () => {
    expect(Object.isFrozen(EMPTY_METRICS)).toBe(true);
  });

  it('getMetrics() returns a frozen snapshot', () => {
    const p = createPerformanceProfiler();
    p.recordFrame(0);
    expect(Object.isFrozen(p.getMetrics())).toBe(true);
  });

  // ── renderCount ────────────────────────────────────────────────────────

  it('increments renderCount on every recordFrame() call', () => {
    const p = createPerformanceProfiler();
    p.recordFrame(0);
    p.recordFrame(16);
    p.recordFrame(32);
    expect(p.getMetrics().renderCount).toBe(3);
  });

  it('renderCount starts at 0 and counts up from there', () => {
    const p = createPerformanceProfiler();
    expect(p.getMetrics().renderCount).toBe(0);
    p.recordFrame(100);
    expect(p.getMetrics().renderCount).toBe(1);
  });

  // ── frameTimeMs ────────────────────────────────────────────────────────

  it('computes frame time as delta between consecutive recordFrame() calls', () => {
    const p = createPerformanceProfiler();
    p.recordFrame(0); // first frame
    p.recordFrame(20); // second frame — delta = 20ms
    expect(p.getMetrics().frameTimeMs).toBeCloseTo(20, 1);
  });

  it('frame time is 0 when only one frame has been recorded', () => {
    const p = createPerformanceProfiler();
    p.recordFrame(50);
    expect(p.getMetrics().frameTimeMs).toBe(0);
  });

  it('frame time updates to reflect the most recent interval', () => {
    const p = createPerformanceProfiler();
    p.recordFrame(0);
    p.recordFrame(16);
    p.recordFrame(33); // ~17ms gap
    expect(p.getMetrics().frameTimeMs).toBeCloseTo(17, 1);
  });

  it('handles first frame at timestamp 0 correctly', () => {
    const p = createPerformanceProfiler();
    p.recordFrame(0);
    p.recordFrame(16);
    // Should not produce NaN or incorrect values from ts=0 edge case
    const m = p.getMetrics();
    expect(Number.isFinite(m.frameTimeMs)).toBe(true);
    expect(m.frameTimeMs).toBeCloseTo(16, 1);
  });

  // ── FPS calculation ────────────────────────────────────────────────────

  it('returns fps=0 with fewer than 2 recorded frames', () => {
    const p = createPerformanceProfiler();
    expect(p.getMetrics().fps).toBe(0);
    p.recordFrame(0);
    expect(p.getMetrics().fps).toBe(0);
  });

  it('computes ~60 fps for 16ms frame intervals', () => {
    const p = createPerformanceProfiler();
    for (let i = 0; i < 61; i++) p.recordFrame(i * 16);
    const { fps } = p.getMetrics();
    expect(fps).toBeGreaterThan(55);
    expect(fps).toBeLessThan(70);
  });

  it('computes ~30 fps for 33ms frame intervals', () => {
    const p = createPerformanceProfiler();
    for (let i = 0; i < 61; i++) p.recordFrame(i * 33);
    const { fps } = p.getMetrics();
    expect(fps).toBeGreaterThan(25);
    expect(fps).toBeLessThan(35);
  });

  it('reports higher FPS after frame rate increases', () => {
    const p = createPerformanceProfiler();
    // First 30 frames at 33ms = ~30fps
    for (let i = 0; i < 30; i++) p.recordFrame(i * 33);
    const slowFps = p.getMetrics().fps;

    // Next 60 frames at 16ms = ~60fps (fills the 60-frame window)
    let t = 30 * 33;
    for (let i = 0; i < 60; i++) {
      t += 16;
      p.recordFrame(t);
    }
    const fastFps = p.getMetrics().fps;
    expect(fastFps).toBeGreaterThan(slowFps);
  });

  // ── lastFrameTime ─────────────────────────────────────────────────────

  it('lastFrameTime reflects the most recent recordFrame() timestamp', () => {
    const p = createPerformanceProfiler();
    p.recordFrame(100);
    p.recordFrame(200);
    expect(p.getMetrics().lastFrameTime).toBe(200);
  });

  // ── reset() ───────────────────────────────────────────────────────────

  it('reset() clears all recorded state', () => {
    const p = createPerformanceProfiler();
    for (let i = 0; i < 20; i++) p.recordFrame(i * 16);
    p.reset();
    const m = p.getMetrics();
    expect(m.fps).toBe(0);
    expect(m.frameTimeMs).toBe(0);
    expect(m.renderCount).toBe(0);
    expect(m.lastFrameTime).toBe(0);
  });

  it('can record frames normally after reset()', () => {
    const p = createPerformanceProfiler();
    for (let i = 0; i < 10; i++) p.recordFrame(i * 16);
    p.reset();
    p.recordFrame(0);
    p.recordFrame(16);
    expect(p.getMetrics().renderCount).toBe(2);
    expect(p.getMetrics().frameTimeMs).toBeCloseTo(16, 1);
  });
});
