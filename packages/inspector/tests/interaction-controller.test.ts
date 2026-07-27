/**
 * @tileguard/inspector — InteractionController Unit Tests
 *
 * All tests use mock implementations of Viewport, HitTester, and InspectorStore.
 * The controller is tested purely for its orchestration behaviour — no real
 * geometry, no real store, no real viewport.
 *
 * Covers:
 *   1. Pointer move — hit, miss, viewport failure
 *   2. Pointer leave
 *   3. Click — hit, miss, viewport failure
 *   4. Delegation verification (correct arguments forwarded)
 *   5. Repeated interactions (same feature, same empty space)
 *   6. Unloaded store lifecycle (no artifact available)
 *   7. Stateless behavior across multiple interactions
 *   8. Boundary: no renderer or overlay methods touched
 */

import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { describe, expect, it, vi } from 'vitest';
import type { HitResult, HitTester } from '../src/hittest/hit-tester.js';
import {
  createInteractionController,
  type InteractionControllerOptions,
} from '../src/interaction/interaction-controller.js';
import type {
  FeatureRef,
  FilterState,
  InspectorLifecycle,
  InspectorStore,
} from '../src/store/inspector-store.js';
import type { ScreenPoint, Viewport } from '../src/viewport/viewport.js';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

/** A minimal mock Viewport. screenToTile returns the point offset by (1000,1000). */
function makeMockViewport(throwOnConvert = false): Viewport {
  return {
    screenToTile: vi.fn((p: ScreenPoint) => {
      if (throwOnConvert) throw new Error('viewport failure');
      return { x: p.x + 1000, y: p.y + 1000 };
    }),
    tileToScreen: vi.fn((p) => ({ x: p.x - 1000, y: p.y - 1000 })),
    getState: vi.fn(),
    resize: vi.fn(),
    pan: vi.fn(),
    zoomAt: vi.fn(),
    fitBounds: vi.fn(),
  } as unknown as Viewport;
}

/** A mock HitTester. Returns a preset result (or undefined) on hitTest(). */
function makeMockHitTester(result: HitResult | undefined): HitTester {
  return { hitTest: vi.fn(() => result) };
}

/** A minimal mock VectorTileArtifact. */
function makeMockArtifact(): VectorTileArtifact {
  return {
    type: 'VectorTile',
    ref: { type: 'VectorTile', source: 'test.pbf' },
    content: { layers: {} },
  } as unknown as VectorTileArtifact;
}

/** A mock InspectorStore with tracking spies. */
function makeMockStore(
  lifecycle: InspectorLifecycle = {
    status: 'loaded',
    artifact: makeMockArtifact(),
    diagnostics: [],
    filePath: 'test.pbf',
  },
): InspectorStore & { select: ReturnType<typeof vi.fn>; setHover: ReturnType<typeof vi.fn> } {
  const nullRef: FeatureRef = { layerName: null, featureIndex: null };
  const filters: FilterState = {
    visibleLayers: Object.freeze(new Set<string>()),
    minSeverity: null,
    ruleId: null,
  };
  return {
    lifecycle,
    selection: nullRef,
    hover: nullRef,
    filters,
    select: vi.fn(),
    setHover: vi.fn(),
    setFilters: vi.fn(),
    load: vi.fn(),
    dispose: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  };
}

/** Build a controller and its collaborators with default hit result. */
function makeController(
  opts: { hitResult?: HitResult; throwViewport?: boolean; lifecycle?: InspectorLifecycle } = {},
) {
  const viewport = makeMockViewport(opts.throwViewport ?? false);
  const hitTester = makeMockHitTester(opts.hitResult);
  const store = makeMockStore(opts.lifecycle);
  const options: InteractionControllerOptions = { store, viewport, hitTester };
  const controller = createInteractionController(options);
  return { controller, viewport, hitTester, store };
}

const SCREEN_PT: ScreenPoint = { x: 100, y: 200 };
const HIT: HitResult = { layerName: 'roads', featureIndex: 3, distance: 2.5 };

// ---------------------------------------------------------------------------
// 1. handlePointerMove — hit
// ---------------------------------------------------------------------------

describe('InteractionController — handlePointerMove (hit)', () => {
  it('calls screenToTile with the provided screen point', () => {
    const { controller, viewport } = makeController({ hitResult: HIT });
    controller.handlePointerMove(SCREEN_PT);
    expect(viewport.screenToTile).toHaveBeenCalledWith(SCREEN_PT);
  });

  it('passes the converted tile point to hitTest', () => {
    const { controller, hitTester } = makeController({ hitResult: HIT });
    controller.handlePointerMove(SCREEN_PT);
    // viewport mock adds (1000,1000) offset
    expect(hitTester.hitTest).toHaveBeenCalledWith(
      { x: SCREEN_PT.x + 1000, y: SCREEN_PT.y + 1000 },
      expect.anything(),
    );
  });

  it('calls store.setHover with the hit feature', () => {
    const { controller, store } = makeController({ hitResult: HIT });
    controller.handlePointerMove(SCREEN_PT);
    expect(store.setHover).toHaveBeenCalledWith('roads', 3);
  });

  it('does NOT call store.select on pointer move', () => {
    const { controller, store } = makeController({ hitResult: HIT });
    controller.handlePointerMove(SCREEN_PT);
    expect(store.select).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. handlePointerMove — miss
// ---------------------------------------------------------------------------

describe('InteractionController — handlePointerMove (miss)', () => {
  it('calls store.setHover(null, null) when hit test returns undefined', () => {
    const { controller, store } = makeController();
    controller.handlePointerMove(SCREEN_PT);
    expect(store.setHover).toHaveBeenCalledWith(null, null);
  });

  it('still calls hitTest even on a miss', () => {
    const { controller, hitTester } = makeController();
    controller.handlePointerMove(SCREEN_PT);
    expect(hitTester.hitTest).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 3. handlePointerMove — viewport failure
// ---------------------------------------------------------------------------

describe('InteractionController — handlePointerMove (viewport failure)', () => {
  it('silently ignores the event when screenToTile throws', () => {
    const { controller, store, hitTester } = makeController({ throwViewport: true });
    expect(() => controller.handlePointerMove(SCREEN_PT)).not.toThrow();
    expect(store.setHover).not.toHaveBeenCalled();
    expect(hitTester.hitTest).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. handlePointerLeave
// ---------------------------------------------------------------------------

describe('InteractionController — handlePointerLeave', () => {
  it('calls store.setHover(null, null)', () => {
    const { controller, store } = makeController({ hitResult: HIT });
    controller.handlePointerLeave();
    expect(store.setHover).toHaveBeenCalledWith(null, null);
  });

  it('does not call screenToTile', () => {
    const { controller, viewport } = makeController({ hitResult: HIT });
    controller.handlePointerLeave();
    expect(viewport.screenToTile).not.toHaveBeenCalled();
  });

  it('does not call hitTest', () => {
    const { controller, hitTester } = makeController({ hitResult: HIT });
    controller.handlePointerLeave();
    expect(hitTester.hitTest).not.toHaveBeenCalled();
  });

  it('does not call store.select', () => {
    const { controller, store } = makeController({ hitResult: HIT });
    controller.handlePointerLeave();
    expect(store.select).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. handleClick — hit
// ---------------------------------------------------------------------------

describe('InteractionController — handleClick (hit)', () => {
  it('calls screenToTile with the click screen point', () => {
    const { controller, viewport } = makeController({ hitResult: HIT });
    controller.handleClick(SCREEN_PT);
    expect(viewport.screenToTile).toHaveBeenCalledWith(SCREEN_PT);
  });

  it('calls store.select with the hit feature', () => {
    const { controller, store } = makeController({ hitResult: HIT });
    controller.handleClick(SCREEN_PT);
    expect(store.select).toHaveBeenCalledWith('roads', 3);
  });

  it('does NOT call store.setHover on click', () => {
    const { controller, store } = makeController({ hitResult: HIT });
    controller.handleClick(SCREEN_PT);
    expect(store.setHover).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 6. handleClick — miss
// ---------------------------------------------------------------------------

describe('InteractionController — handleClick (miss)', () => {
  it('calls store.select(null, null) when hit test returns undefined', () => {
    const { controller, store } = makeController();
    controller.handleClick(SCREEN_PT);
    expect(store.select).toHaveBeenCalledWith(null, null);
  });
});

// ---------------------------------------------------------------------------
// 7. handleClick — viewport failure
// ---------------------------------------------------------------------------

describe('InteractionController — handleClick (viewport failure)', () => {
  it('silently ignores the event when screenToTile throws', () => {
    const { controller, store, hitTester } = makeController({ throwViewport: true });
    expect(() => controller.handleClick(SCREEN_PT)).not.toThrow();
    expect(store.select).not.toHaveBeenCalled();
    expect(hitTester.hitTest).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 8. Unloaded store lifecycle
// ---------------------------------------------------------------------------

describe('InteractionController — unloaded store lifecycle', () => {
  it('clears hover when store is in uninitialized state (no artifact)', () => {
    const { controller, store } = makeController({
      lifecycle: { status: 'uninitialized' },
    });
    controller.handlePointerMove(SCREEN_PT);
    expect(store.setHover).toHaveBeenCalledWith(null, null);
  });

  it('clears selection when clicking while store is loading', () => {
    const { controller, store } = makeController({
      lifecycle: { status: 'loading', filePath: 'test.pbf' },
    });
    controller.handleClick(SCREEN_PT);
    expect(store.select).toHaveBeenCalledWith(null, null);
  });

  it('clears hover when store is in error state', () => {
    const { controller, store } = makeController({
      lifecycle: { status: 'error', filePath: 'test.pbf', error: new Error('fail') },
    });
    controller.handlePointerMove(SCREEN_PT);
    expect(store.setHover).toHaveBeenCalledWith(null, null);
  });

  it('does not call hitTest when no artifact is available', () => {
    const { controller, hitTester } = makeController({
      lifecycle: { status: 'empty', filePath: 'test.pbf' },
    });
    controller.handlePointerMove(SCREEN_PT);
    expect(hitTester.hitTest).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 9. Repeated interactions
// ---------------------------------------------------------------------------

describe('InteractionController — repeated interactions', () => {
  it('handles repeated pointer moves independently (stateless)', () => {
    const { controller, store } = makeController({ hitResult: HIT });
    controller.handlePointerMove(SCREEN_PT);
    controller.handlePointerMove(SCREEN_PT);
    controller.handlePointerMove(SCREEN_PT);
    expect(store.setHover).toHaveBeenCalledTimes(3);
  });

  it('handles repeated clicks independently (stateless)', () => {
    const { controller, store } = makeController({ hitResult: HIT });
    controller.handleClick(SCREEN_PT);
    controller.handleClick(SCREEN_PT);
    expect(store.select).toHaveBeenCalledTimes(2);
  });

  it('handles move then leave correctly', () => {
    const { controller, store } = makeController({ hitResult: HIT });
    controller.handlePointerMove(SCREEN_PT);
    controller.handlePointerLeave();
    expect(store.setHover).toHaveBeenNthCalledWith(1, 'roads', 3);
    expect(store.setHover).toHaveBeenNthCalledWith(2, null, null);
  });

  it('different screen points produce different hitTest calls', () => {
    const { controller, hitTester } = makeController({ hitResult: HIT });
    controller.handlePointerMove({ x: 10, y: 20 });
    controller.handlePointerMove({ x: 30, y: 40 });
    expect(hitTester.hitTest).toHaveBeenCalledTimes(2);
    const [call1, call2] = (hitTester.hitTest as ReturnType<typeof vi.fn>).mock.calls;
    expect(call1?.[0]).toEqual({ x: 1010, y: 1020 });
    expect(call2?.[0]).toEqual({ x: 1030, y: 1040 });
  });
});

// ---------------------------------------------------------------------------
// 10. Delegation contract
// ---------------------------------------------------------------------------

describe('InteractionController — delegation contract', () => {
  it('never calls renderer or overlay methods (no such methods exist on mocks)', () => {
    // This test asserts the controller does not access anything beyond the
    // three injected collaborators. The mock store has select/setHover/setFilters
    // only — if the controller tried to call render() or toDescriptors() it
    // would get undefined and likely throw.
    const { controller, store } = makeController({ hitResult: HIT });
    controller.handlePointerMove(SCREEN_PT);
    controller.handlePointerLeave();
    controller.handleClick(SCREEN_PT);
    // Only store methods from the defined mock should have been called
    const calledMethods = Object.entries(store)
      .filter(
        ([, v]) =>
          typeof v === 'function' &&
          vi.isMockFunction(v) &&
          (v as ReturnType<typeof vi.fn>).mock.calls.length > 0,
      )
      .map(([k]) => k);
    expect(calledMethods.every((m) => ['select', 'setHover'].includes(m))).toBe(true);
  });

  it('passes the artifact from the loaded lifecycle to hitTest', () => {
    const artifact = makeMockArtifact();
    const lifecycle: InspectorLifecycle = {
      status: 'loaded',
      artifact,
      diagnostics: [],
      filePath: 'test.pbf',
    };
    const { controller, hitTester } = makeController({ hitResult: HIT, lifecycle });
    controller.handlePointerMove(SCREEN_PT);
    expect(hitTester.hitTest).toHaveBeenCalledWith(expect.anything(), artifact);
  });
});
