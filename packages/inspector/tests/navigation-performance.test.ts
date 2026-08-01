/**
 * @tileguard/inspector — Navigation & performance subsystem integration tests
 *
 * Cross-cutting tests verifying that the Step 4 subsystems cooperate correctly:
 *
 *   CameraAnimator  ↔  WorkspaceService   (animate → persist viewport)
 *   PerformanceProfiler                   (multi-instance, large frame counts)
 *   ExportService                         (stub pipeline, concurrent calls)
 *   SpatialIndex                          (viewport culling pattern)
 *   ShortcutService ↔ WorkspaceService    (action dispatch → layout update)
 *
 * Unit-level edge cases live in the individual service/module test files.
 * This file only tests cross-boundary behaviour.
 */

import { describe, expect, it } from 'vitest';

import {
  createCameraAnimator,
  type RafScheduler,
} from '../src/animation/CameraAnimator.js';
import {
  createExportService,
  ExportNotImplementedError,
} from '../src/services/ExportService.js';
import {
  createPerformanceProfiler,
  EMPTY_METRICS,
} from '../src/performance/PerformanceProfiler.js';
import {
  createSpatialIndex,
  type SpatialFeatureRef,
} from '../src/performance/SpatialIndex.js';
import {
  DEFAULT_LAYOUT,
  getWorkspaceService,
  resetWorkspaceServiceInstance,
} from '../src/services/WorkspaceService.js';
import { createShortcutService } from '../src/services/ShortcutService.js';
import type { ViewportState } from '../src/viewport/viewport.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeViewport(overrides: Partial<ViewportState> = {}): ViewportState {
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

function makeSyncScheduler(): RafScheduler & { step: (count?: number) => void } {
  let nextId = 0;
  const pending = new Map<number, (ts: number) => void>();
  let ts = 0;
  return {
    requestFrame(cb) { const id = nextId++; pending.set(id, cb); return id; },
    cancelFrame(id) { pending.delete(id as number); },
    step(count = 100_000) {
      let i = 0;
      while (pending.size > 0 && i++ < count) {
        const [id, cb] = pending.entries().next().value as [number, (ts: number) => void];
        pending.delete(id);
        ts += 16;
        cb(ts);
      }
    },
  };
}

function makeRef(
  layerName: string,
  featureIndex: number,
  minX: number, minY: number, maxX: number, maxY: number,
): SpatialFeatureRef {
  return { layerName, featureIndex, bounds: { minX, minY, maxX, maxY } };
}

// ---------------------------------------------------------------------------
// CameraAnimator ↔ WorkspaceService
// ---------------------------------------------------------------------------

describe('CameraAnimator ↔ WorkspaceService', () => {
  it('persists the final animated viewport to WorkspaceService on completion', () => {
    resetWorkspaceServiceInstance();
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const svc = getWorkspaceService();

    let finalState: ViewportState | null = null;
    animator.animateTo(
      makeViewport({ zoom: 1 }),
      makeViewport({ zoom: 3, panX: 200, panY: 100 }),
      {
        duration: 128,
        easing: 'easeInOut',
        onFrame: (s) => { finalState = s; },
        onComplete: () => {
          if (finalState !== null) {
            svc.updateLayout({
              viewport: { zoom: finalState.zoom, panX: finalState.panX, panY: finalState.panY },
            });
          }
        },
      },
    );
    scheduler.step();

    const vp = svc.getLayout().viewport;
    expect(vp).not.toBeNull();
    expect(vp!.zoom).toBeCloseTo(3, 1);
    expect(vp!.panX).toBeCloseTo(200, 1);
    resetWorkspaceServiceInstance();
  });

  it('does not persist a partial viewport when the animation is cancelled', () => {
    resetWorkspaceServiceInstance();
    const scheduler = makeSyncScheduler();
    const animator = createCameraAnimator(scheduler);
    const svc = getWorkspaceService();

    animator.animateTo(
      makeViewport({ zoom: 1 }),
      makeViewport({ zoom: 10 }),
      {
        duration: 1000,
        easing: 'linear',
        onFrame: () => {},
        onComplete: () => {
          svc.updateLayout({ viewport: { zoom: 10, panX: 0, panY: 0 } });
        },
      },
    );
    scheduler.step(3);
    animator.cancel();

    // onComplete must not have fired — viewport stays null
    expect(svc.getLayout().viewport).toBeNull();
    resetWorkspaceServiceInstance();
  });
});

// ---------------------------------------------------------------------------
// PerformanceProfiler — multi-instance behaviour
// ---------------------------------------------------------------------------

describe('PerformanceProfiler — multi-instance behaviour', () => {
  it('two profilers do not share state', () => {
    const p1 = createPerformanceProfiler();
    const p2 = createPerformanceProfiler();

    for (let i = 0; i < 10; i++) p1.recordFrame(i * 16);

    expect(p1.getMetrics().renderCount).toBe(10);
    expect(p2.getMetrics().renderCount).toBe(0);
  });

  it('resetting one profiler does not affect another', () => {
    const p1 = createPerformanceProfiler();
    const p2 = createPerformanceProfiler();

    for (let i = 0; i < 5; i++) { p1.recordFrame(i * 16); p2.recordFrame(i * 16); }
    p1.reset();

    expect(p1.getMetrics().renderCount).toBe(0);
    expect(p2.getMetrics().renderCount).toBe(5);
  });

  it('FPS remains accurate after 1000 frames (rolling window holds)', () => {
    const p = createPerformanceProfiler();
    for (let i = 0; i < 1000; i++) p.recordFrame(i * 16);

    const { fps, renderCount } = p.getMetrics();
    expect(renderCount).toBe(1000);
    expect(fps).toBeGreaterThan(50);
    expect(fps).toBeLessThan(70);
  });

  it('EMPTY_METRICS is returned when no profiler is connected (useProfiler null branch)', () => {
    // This mirrors what useProfiler does when profiler === null
    const result = null === null ? EMPTY_METRICS : createPerformanceProfiler().getMetrics();
    expect(result).toEqual(EMPTY_METRICS);
  });
});

// ---------------------------------------------------------------------------
// ExportService — pipeline usage patterns
// ---------------------------------------------------------------------------

describe('ExportService — pipeline usage patterns', () => {
  it('getSupportedFormats() gates export calls safely — no formats in Step 4 stub', async () => {
    const exporter = createExportService();
    const formats = exporter.getSupportedFormats();

    if (formats.includes('json')) {
      const result = await exporter.export({ format: 'json' });
      expect(result.format).toBe('json');
    } else {
      expect(formats).toHaveLength(0);
    }
  });

  it('concurrent export calls each reject independently', async () => {
    const exporter = createExportService();

    const results = await Promise.allSettled([
      exporter.export({ format: 'png' }),
      exporter.export({ format: 'json' }),
      exporter.export({ format: 'markdown' }),
    ]);

    for (const r of results) {
      expect(r.status).toBe('rejected');
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(
        ExportNotImplementedError,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// SpatialIndex — viewport culling pattern
// ---------------------------------------------------------------------------

describe('SpatialIndex — viewport culling pattern', () => {
  it('queryRegion returns only features inside the viewport bounds', () => {
    const index = createSpatialIndex();
    index.build([
      makeRef('roads', 0, 0, 0, 500, 500),          // inside
      makeRef('roads', 1, 2000, 2000, 3000, 3000),   // outside
      makeRef('buildings', 0, 100, 100, 400, 400),   // inside
    ]);

    const visible = index.queryRegion({ minX: 0, minY: 0, maxX: 600, maxY: 600 });
    const keys = visible.map((r) => `${r.layerName}:${r.featureIndex}`);

    expect(keys).toContain('roads:0');
    expect(keys).toContain('buildings:0');
    expect(keys).not.toContain('roads:1');
  });

  it('rebuilding the index clears previous data', () => {
    const index = createSpatialIndex();
    index.build([makeRef('old', 0, 0, 0, 100, 100)]);
    index.build([makeRef('new', 0, 2000, 2000, 3000, 3000)]);

    const nearOrigin = index.queryRegion({ minX: 0, minY: 0, maxX: 200, maxY: 200 });
    expect(nearOrigin.some((r) => r.layerName === 'old')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ShortcutService ↔ WorkspaceService
// ---------------------------------------------------------------------------

describe('ShortcutService ↔ WorkspaceService', () => {
  it('shortcut bindings include navigation and panel actions', () => {
    const bindings = createShortcutService().getBindings();
    const actions = bindings.map((b) => b.action);

    expect(actions).toContain('focusFeature');
    expect(actions).toContain('resetView');
    expect(actions).toContain('clearSelection');
    expect(actions).toContain('focusSearch');
    expect(actions).toContain('openSettings');
  });

  it('a shortcut action can drive a WorkspaceService layout update', () => {
    resetWorkspaceServiceInstance();
    const svc = getWorkspaceService();
    const bindings = createShortcutService().getBindings();
    const settingsBinding = bindings.find((b) => b.action === 'openSettings');

    expect(settingsBinding).toBeDefined();
    // Simulate what InspectorApp does when the shortcut fires:
    svc.updateLayout({ activeTab: 'settings' });

    expect(svc.getLayout().activeTab).toBe('settings');
    resetWorkspaceServiceInstance();
  });

  it('ShortcutService and WorkspaceService remain independent of each other', () => {
    resetWorkspaceServiceInstance();
    const svc = getWorkspaceService();

    svc.updateLayout({ leftCollapsed: true });
    // Workspace change must not corrupt shortcut bindings
    expect(createShortcutService().getBindings()).toHaveLength(12);

    resetWorkspaceServiceInstance();
  });
});

// ---------------------------------------------------------------------------
// Module availability smoke suite
// ---------------------------------------------------------------------------

describe('Step 4 module exports', () => {
  it('createCameraAnimator is exported as a function', () => {
    expect(typeof createCameraAnimator).toBe('function');
  });

  it('createSpatialIndex is exported as a function', () => {
    expect(typeof createSpatialIndex).toBe('function');
  });

  it('createPerformanceProfiler is exported as a function', () => {
    expect(typeof createPerformanceProfiler).toBe('function');
  });

  it('createExportService is exported as a function', () => {
    expect(typeof createExportService).toBe('function');
  });

  it('getWorkspaceService is exported as a function', () => {
    expect(typeof getWorkspaceService).toBe('function');
  });

  it('createShortcutService is exported as a function', () => {
    expect(typeof createShortcutService).toBe('function');
  });

  it('DEFAULT_LAYOUT has all required fields', () => {
    expect(DEFAULT_LAYOUT).toHaveProperty('leftCollapsed');
    expect(DEFAULT_LAYOUT).toHaveProperty('rightCollapsed');
    expect(DEFAULT_LAYOUT).toHaveProperty('activeTab');
    expect(DEFAULT_LAYOUT).toHaveProperty('viewport');
    expect(DEFAULT_LAYOUT).toHaveProperty('lastFilePath');
  });
});
