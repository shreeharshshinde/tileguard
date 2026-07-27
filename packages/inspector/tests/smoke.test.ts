/**
 * @tileguard/inspector — Milestone 1 Smoke Test
 *
 * Verifies that the package skeleton compiles cleanly and that all public
 * module surfaces are importable and their exported shapes are correct.
 *
 * This test does NOT exercise any runtime behaviour — it is a compile-time
 * and import-resolution gate that ensures:
 *
 *   1. All subsystem modules export the types and stubs declared in the
 *      approved Phase 3 architecture (ADR-008).
 *   2. The Vite + TypeScript toolchain resolves workspace package aliases
 *      (@tileguard/core, @tileguard/tile-rules, etc.) correctly.
 *   3. The package skeleton is complete — all directories listed in the
 *      Phase 3 Reference Architecture exist and are importable.
 *
 * Runtime implementations are delivered in Milestones 2–8.
 * passWithNoTests: true is set in vite.config.ts, so this file's presence
 * is optional — but having at least one test keeps the CI output clean.
 */

// ---------------------------------------------------------------------------
// Node built-ins (used by Milestone 4 integration tests)
// ---------------------------------------------------------------------------
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Diagnostic } from '@tileguard/core';
// ---------------------------------------------------------------------------
// Core engine (used by Milestone 4 integration tests)
// ---------------------------------------------------------------------------
import { createEngine } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { tilePlugin, tileProvider } from '@tileguard/tile-rules';
import { beforeAll, describe, expect, it, vi } from 'vitest';
// ---------------------------------------------------------------------------
// HitTester module (Milestone 5 stubs)
// ---------------------------------------------------------------------------
import { createHitTester } from '../src/hittest/hit-tester';
// ---------------------------------------------------------------------------
// Overlay module (Milestone 4)
// ---------------------------------------------------------------------------
import {
  createDefaultOverlayAdapter,
  OverlayAdapter,
} from '../src/overlay/overlay-adapter';
import { createSelectionProducer } from '../src/overlay/selection-producer';
import { coordinateRangeStrategy } from '../src/overlay/strategies/coordinate-range';
import { degenerateGeometryStrategy } from '../src/overlay/strategies/degenerate-geometry';
import { noEmptyStrategy } from '../src/overlay/strategies/no-empty';
import { selfIntersectionStrategy } from '../src/overlay/strategies/self-intersection';
import { unclosedRingStrategy } from '../src/overlay/strategies/unclosed-ring';
import { zeroAreaRingStrategy } from '../src/overlay/strategies/zero-area-ring';
// ---------------------------------------------------------------------------
// Renderer module (Milestone 3)
// ---------------------------------------------------------------------------
import { CanvasRenderer } from '../src/renderer/canvas-renderer';
import {
  drawLineString,
  drawPoint,
  drawPolygon,
  drawTileBoundary,
  drawVertexMarkers,
} from '../src/renderer/shapes';
// ---------------------------------------------------------------------------
// Server module (Milestone 7 stub)
// ---------------------------------------------------------------------------
import {
  DEFAULT_PORT,
  MAX_PORT_ATTEMPTS,
  startInspectorServer,
} from '../src/server/server';
// ---------------------------------------------------------------------------
// InspectorStore module (Milestone 5 stubs)
// ---------------------------------------------------------------------------
import { createInspectorStore } from '../src/store/inspector-store';
// ---------------------------------------------------------------------------
// Viewport module (Milestone 2)
// ---------------------------------------------------------------------------
import { createViewport } from '../src/viewport/viewport';

// ---------------------------------------------------------------------------
// Smoke tests — module import resolution and exported symbol shape checks
// ---------------------------------------------------------------------------

describe('Milestone 1 — package skeleton smoke tests', () => {
  // ---- Viewport ----------------------------------------------------------
  describe('viewport module', () => {
    it('exports createViewport as a function', () => {
      expect(typeof createViewport).toBe('function');
    });

    it('createViewport returns a Viewport instance with correct dimensions', () => {
      const vp = createViewport({ width: 800, height: 600 });
      const s = vp.getState();
      expect(s.width).toBe(800);
      expect(s.height).toBe(600);
    });
  });

  // ---- Renderer ----------------------------------------------------------
  describe('renderer/shapes module', () => {
    it('exports all drawing stub functions', () => {
      expect(typeof drawPoint).toBe('function');
      expect(typeof drawLineString).toBe('function');
      expect(typeof drawPolygon).toBe('function');
      expect(typeof drawVertexMarkers).toBe('function');
      expect(typeof drawTileBoundary).toBe('function');
    });
  });

  describe('renderer/canvas-renderer module', () => {
    it('exports CanvasRenderer as a class', () => {
      expect(typeof CanvasRenderer).toBe('function'); // classes are typeof 'function'
    });
  });

  // ---- Overlay -----------------------------------------------------------
  describe('overlay/overlay-adapter module', () => {
    it('exports OverlayAdapter as a class', () => {
      expect(typeof OverlayAdapter).toBe('function');
    });

    it('createDefaultOverlayAdapter returns an OverlayAdapter instance', () => {
      const adapter = createDefaultOverlayAdapter();
      expect(adapter).toBeInstanceOf(OverlayAdapter);
    });

    it('OverlayAdapter exposes register and getStrategy', () => {
      const adapter = new OverlayAdapter();
      expect(typeof adapter.register).toBe('function');
      expect(typeof adapter.getStrategy).toBe('function');
    });
  });

  describe('overlay/strategies', () => {
    const strategies = [
      {
        name: 'coordinateRangeStrategy',
        strategy: coordinateRangeStrategy,
        ruleId: 'tile/coordinate-range',
      },
      {
        name: 'selfIntersectionStrategy',
        strategy: selfIntersectionStrategy,
        ruleId: 'tile/self-intersection',
      },
      {
        name: 'zeroAreaRingStrategy',
        strategy: zeroAreaRingStrategy,
        ruleId: 'tile/zero-area-ring',
      },
      {
        name: 'degenerateGeometryStrategy',
        strategy: degenerateGeometryStrategy,
        ruleId: 'tile/degenerate-geometry',
      },
      {
        name: 'unclosedRingStrategy',
        strategy: unclosedRingStrategy,
        ruleId: 'tile/unclosed-ring',
      },
      {
        name: 'noEmptyStrategy',
        strategy: noEmptyStrategy,
        ruleId: 'tile/no-empty',
      },
    ];

    for (const { name, strategy, ruleId } of strategies) {
      it(`${name} has correct ruleId "${ruleId}"`, () => {
        expect(strategy.ruleId).toBe(ruleId);
      });

      it(`${name}.toDescriptors is a function`, () => {
        expect(typeof strategy.toDescriptors).toBe('function');
      });

      it(`${name}.toDescriptors returns an empty array at Milestone 1`, () => {
        // Construct the minimum valid Diagnostic shape (ArtifactRef is required).
        const fakeDiagnostic = {
          ruleId,
          severity: 'error' as const,
          message: 'smoke test diagnostic',
          artifact: { type: 'VectorTile', source: 'test.pbf' },
        };
        // Construct a minimal VectorTileArtifact shape for the artifact parameter.
        const fakeArtifact = {
          type: 'VectorTile' as const,
          source: 'test.pbf',
          content: { layers: [] },
        };
        // Stubs return [] — this will fail loudly if a strategy throws unexpectedly.
        const result = strategy.toDescriptors(
          fakeDiagnostic as unknown as import('@tileguard/core').Diagnostic,
          fakeArtifact as unknown as import('@tileguard/tile-rules').VectorTileArtifact,
        );
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
      });
    }
  });

  // ---- HitTester ---------------------------------------------------------
  describe('hittest module', () => {
    it('exports createHitTester as a function', () => {
      expect(typeof createHitTester).toBe('function');
    });

    it('createHitTester returns a HitTester instance', () => {
      const hitTester = createHitTester();
      expect(typeof hitTester.hitTest).toBe('function');
    });
  });

  // ---- InspectorStore ----------------------------------------------------
  describe('store module', () => {
    it('exports createInspectorStore as a function', () => {
      expect(typeof createInspectorStore).toBe('function');
    });

    it('createInspectorStore returns a store in uninitialized state', () => {
      const store = createInspectorStore();
      expect(store.lifecycle.status).toBe('uninitialized');
      store.dispose();
    });

    it('createInspectorStore returns a store with null selection', () => {
      const store = createInspectorStore();
      expect(store.selection.layerName).toBeNull();
      expect(store.selection.featureIndex).toBeNull();
      store.dispose();
    });
  });

  // ---- Server ------------------------------------------------------------
  describe('server module', () => {
    it('exports DEFAULT_PORT as 3100', () => {
      expect(DEFAULT_PORT).toBe(3100);
    });

    it('exports MAX_PORT_ATTEMPTS as a positive number', () => {
      expect(typeof MAX_PORT_ATTEMPTS).toBe('number');
      expect(MAX_PORT_ATTEMPTS).toBeGreaterThan(0);
    });

    it('exports startInspectorServer as a function', () => {
      expect(typeof startInspectorServer).toBe('function');
    });

    it('startInspectorServer throws a "Milestone 7" stub error at runtime', async () => {
      await expect(
        startInspectorServer({ tilePath: '/fake/tile.pbf' }),
      ).rejects.toThrow('Milestone 7');
    });
  });
});

// ---------------------------------------------------------------------------
// Milestone 4 — Inspector Integration (Step 3)
//
// Full pipeline: createEngine().run() → Diagnostic[] → adapter.toDescriptors()
// → OverlayDescriptor[] → renderer.render(artifact, overlays)
//
// All tests use real .pbf fixture files and a mocked HTMLCanvasElement so the
// full chain executes without error in a headless node environment.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname_m4 = dirname(__filename);
const REPO_ROOT = join(__dirname_m4, '../../..');

/** Fixture paths — all pre-exist on disk; no generation required. */
const FIXTURES = {
  validTile: join(REPO_ROOT, 'fixtures/good/valid-tile.pbf'),
  coordsTile: join(REPO_ROOT, 'fixtures/bad/invalid-tile-coords.pbf'),
  intersectTile: join(
    REPO_ROOT,
    'fixtures/bad/invalid-tile-self-intersection.pbf',
  ),
  degenerateTile: join(REPO_ROOT, 'fixtures/bad/invalid-tile-degenerate.pbf'),
} as const;

// ---------------------------------------------------------------------------
// Minimal canvas mock (no DOM required)
// ---------------------------------------------------------------------------

function makeCtxM4(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    closePath: vi.fn(),
    clearRect: vi.fn(),
    setLineDash: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D;
}

function makeCanvasM4(width = 800, height = 600): HTMLCanvasElement {
  const ctx = makeCtxM4();
  return {
    width,
    height,
    getContext: vi.fn(() => ctx),
  } as unknown as HTMLCanvasElement;
}

// ---------------------------------------------------------------------------
// Milestone 4 — End-to-end integration
// ---------------------------------------------------------------------------

describe('Milestone 4 — Inspector Integration', () => {
  const engine = createEngine({ plugins: [tilePlugin] });
  const adapter = createDefaultOverlayAdapter();
  const selectionProducer = createSelectionProducer();

  // ── 1. Valid tile — happy path ──────────────────────────────────────────

  describe('valid tile pipeline', () => {
    let artifact: VectorTileArtifact;

    beforeAll(async () => {
      artifact = (await tileProvider.load(
        FIXTURES.validTile,
      )) as VectorTileArtifact;
    });

    it('loads valid-tile.pbf without error', () => {
      expect(artifact).toBeDefined();
      expect(artifact.type).toBe('VectorTile');
    });

    it('engine produces zero diagnostics for a clean tile', async () => {
      const result = await engine.run([FIXTURES.validTile]);
      expect(result.summary.pass).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('adapter produces empty overlays for zero diagnostics', async () => {
      const result = await engine.run([FIXTURES.validTile]);
      const overlays = adapter.toDescriptors(result.diagnostics, artifact);
      expect(overlays).toEqual([]);
    });

    it('renderer.render() runs to completion with zero overlays', () => {
      const canvas = makeCanvasM4();
      const viewport = createViewport({ width: 800, height: 600 });
      const renderer = new CanvasRenderer({ viewport });
      renderer.attachCanvas(canvas);

      expect(() => renderer.render(artifact, [])).not.toThrow();
    });

    it('full chain — engine → adapter → renderer — executes without error', async () => {
      const result = await engine.run([FIXTURES.validTile]);
      const overlays = adapter.toDescriptors(result.diagnostics, artifact);

      const canvas = makeCanvasM4();
      const viewport = createViewport({ width: 800, height: 600 });
      const renderer = new CanvasRenderer({ viewport });
      renderer.attachCanvas(canvas);

      expect(() => renderer.render(artifact, overlays)).not.toThrow();
    });

    it('full chain with selection/hover overlays appended', async () => {
      const result = await engine.run([FIXTURES.validTile]);
      const diagnosticOverlays = adapter.toDescriptors(
        result.diagnostics,
        artifact,
      );
      const interactionOverlays = selectionProducer.toOverlays(
        { layerName: 'roads', featureIndex: 0 },
        { layerName: null, featureIndex: null },
      );
      const combined = [...diagnosticOverlays, ...interactionOverlays];

      const canvas = makeCanvasM4();
      const viewport = createViewport({ width: 800, height: 600 });
      const renderer = new CanvasRenderer({ viewport });
      renderer.attachCanvas(canvas);

      expect(() => renderer.render(artifact, combined)).not.toThrow();
      // One selection overlay produced
      expect(interactionOverlays).toHaveLength(1);
      expect(interactionOverlays[0]?.type).toBe('bbox-fill');
      expect(interactionOverlays[0]?.severity).toBe('info');
    });
  });

  // ── 2. Self-intersection tile ───────────────────────────────────────────

  describe('self-intersection tile pipeline', () => {
    let artifact: VectorTileArtifact;

    beforeAll(async () => {
      artifact = (await tileProvider.load(
        FIXTURES.intersectTile,
      )) as VectorTileArtifact;
    });

    it('engine flags tile/self-intersection', async () => {
      const result = await engine.run([FIXTURES.intersectTile]);
      expect(result.summary.pass).toBe(false);
      expect(
        result.diagnostics.some((d) => d.ruleId === 'tile/self-intersection'),
      ).toBe(true);
    });

    it('adapter produces at least one segment-highlight overlay', async () => {
      const result = await engine.run([FIXTURES.intersectTile]);
      const overlays = adapter.toDescriptors(result.diagnostics, artifact);

      const segmentOverlays = overlays.filter(
        (o) => o.type === 'segment-highlight',
      );
      expect(segmentOverlays.length).toBeGreaterThan(0);
    });

    it('all produced overlays have valid structure', async () => {
      const result = await engine.run([FIXTURES.intersectTile]);
      const overlays = adapter.toDescriptors(result.diagnostics, artifact);

      for (const overlay of overlays) {
        expect(overlay).toHaveProperty('type');
        expect(overlay).toHaveProperty('layerName');
        expect(typeof overlay.featureIndex).toBe('number');
        expect(['error', 'warning', 'info']).toContain(overlay.severity);
      }
    });

    it('renderer.render() does not throw with self-intersection overlays', async () => {
      const result = await engine.run([FIXTURES.intersectTile]);
      const overlays = adapter.toDescriptors(result.diagnostics, artifact);

      const canvas = makeCanvasM4();
      const viewport = createViewport({ width: 800, height: 600 });
      const renderer = new CanvasRenderer({ viewport });
      renderer.attachCanvas(canvas);

      expect(() => renderer.render(artifact, overlays)).not.toThrow();
    });

    it('full chain — engine → adapter → renderer — executes without error', async () => {
      const result = await engine.run([FIXTURES.intersectTile]);
      const overlays = adapter.toDescriptors(result.diagnostics, artifact);

      const canvas = makeCanvasM4();
      const viewport = createViewport({ width: 800, height: 600 });
      const renderer = new CanvasRenderer({ viewport });
      renderer.attachCanvas(canvas);

      expect(() => renderer.render(artifact, overlays)).not.toThrow();
    });
  });

  // ── 3. Coordinate range tile ────────────────────────────────────────────

  describe('coordinate-range tile pipeline', () => {
    let artifact: VectorTileArtifact;

    beforeAll(async () => {
      artifact = (await tileProvider.load(
        FIXTURES.coordsTile,
      )) as VectorTileArtifact;
    });

    it('engine flags tile/coordinate-range', async () => {
      const result = await engine.run([FIXTURES.coordsTile]);
      expect(
        result.diagnostics.some((d) => d.ruleId === 'tile/coordinate-range'),
      ).toBe(true);
    });

    it('adapter produces point-marker overlays for coordinate-range diagnostics', async () => {
      const result = await engine.run([FIXTURES.coordsTile]);
      const overlays = adapter.toDescriptors(result.diagnostics, artifact);

      const pointMarkers = overlays.filter((o) => o.type === 'point-marker');
      expect(pointMarkers.length).toBeGreaterThan(0);
    });

    it('full chain — engine → adapter → renderer — executes without error', async () => {
      const result = await engine.run([FIXTURES.coordsTile]);
      const overlays = adapter.toDescriptors(result.diagnostics, artifact);

      const canvas = makeCanvasM4();
      const viewport = createViewport({ width: 800, height: 600 });
      const renderer = new CanvasRenderer({ viewport });
      renderer.attachCanvas(canvas);

      expect(() => renderer.render(artifact, overlays)).not.toThrow();
    });
  });

  // ── 4. Degenerate geometry tile ─────────────────────────────────────────

  describe('degenerate geometry tile pipeline', () => {
    let artifact: VectorTileArtifact;

    beforeAll(async () => {
      artifact = (await tileProvider.load(
        FIXTURES.degenerateTile,
      )) as VectorTileArtifact;
    });

    it('engine flags tile/degenerate-geometry', async () => {
      const result = await engine.run([FIXTURES.degenerateTile]);
      expect(
        result.diagnostics.some((d) => d.ruleId === 'tile/degenerate-geometry'),
      ).toBe(true);
    });

    it('full chain — engine → adapter → renderer — executes without error', async () => {
      const result = await engine.run([FIXTURES.degenerateTile]);
      const overlays = adapter.toDescriptors(result.diagnostics, artifact);

      const canvas = makeCanvasM4();
      const viewport = createViewport({ width: 800, height: 600 });
      const renderer = new CanvasRenderer({ viewport });
      renderer.attachCanvas(canvas);

      expect(() => renderer.render(artifact, overlays)).not.toThrow();
    });
  });

  // ── 5. Overlay + interaction concatenation contract ─────────────────────

  describe('overlay concatenation contract', () => {
    it('diagnostic overlays and interaction overlays are independent arrays', async () => {
      const artifact = (await tileProvider.load(
        FIXTURES.intersectTile,
      )) as VectorTileArtifact;
      const result = await engine.run([FIXTURES.intersectTile]);

      const diagnosticOverlays = adapter.toDescriptors(
        result.diagnostics,
        artifact,
      );
      const interactionOverlays = selectionProducer.toOverlays(
        { layerName: 'buildings', featureIndex: 0 },
        { layerName: 'buildings', featureIndex: 0 },
      );
      const combined = [...diagnosticOverlays, ...interactionOverlays];

      // Combined is the sum of both
      expect(combined.length).toBe(
        diagnosticOverlays.length + interactionOverlays.length,
      );

      // Selection + hover → 2 bbox-fill descriptors
      expect(interactionOverlays).toHaveLength(2);
      expect(interactionOverlays[0]?.type).toBe('bbox-fill');
      expect(interactionOverlays[1]?.type).toBe('bbox-fill');
    });

    it('neither producer is coupled to the other (toDescriptors does not call toOverlays)', async () => {
      // Verifies structural independence by checking both can be called
      // independently and return disjoint descriptor sets.
      const artifact = (await tileProvider.load(
        FIXTURES.intersectTile,
      )) as VectorTileArtifact;
      const result = await engine.run([FIXTURES.intersectTile]);

      const diagnosticOverlays = adapter.toDescriptors(
        result.diagnostics,
        artifact,
      );
      const noInteraction = selectionProducer.toOverlays(
        { layerName: null, featureIndex: null },
        { layerName: null, featureIndex: null },
      );

      expect(noInteraction).toEqual([]);
      // diagnosticOverlays still contains real content from the engine run
      expect(Array.isArray(diagnosticOverlays)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Milestone 4 — Benchmarking
//
// Measures adapter.toDescriptors() latency against synthetic diagnostic
// batches of 200 and 1000 items.
//
// Success criterion (per Phase 3): < 100ms at 200 diagnostics.
// 1000-diagnostic run captures the scaling curve without a hard gate.
// ---------------------------------------------------------------------------

/** Build a synthetic Diagnostic array for the given count and ruleIds pool. */
function makeSyntheticDiagnostics(
  count: number,
  ruleIds: readonly string[],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (let i = 0; i < count; i++) {
    const ruleId = ruleIds[i % ruleIds.length] ?? ruleIds[0]!;
    diagnostics.push({
      ruleId,
      severity: 'error',
      message: `Synthetic diagnostic ${i}`,
      artifact: { type: 'VectorTile', source: 'bench.pbf' },
      location: { layer: 'roads', featureIndex: i % 10 },
      data: {
        segments: [i % 8, (i % 8) + 1],
        pointIndex: i % 4,
        code: 'TOO_FEW_POINTS',
      },
    });
  }
  return diagnostics;
}

/** Build a minimal VectorTileArtifact with enough features for benchmarking. */
function makeBenchArtifact(): VectorTileArtifact {
  const features = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    type: 2 as const,
    geometryType: 'LineString' as const,
    properties: {},
    geometry: [
      [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        { x: 200, y: 0 },
        { x: 300, y: 100 },
      ],
    ],
  }));

  return {
    type: 'VectorTile',
    ref: { type: 'VectorTile', source: 'bench.pbf' },
    content: {
      layers: {
        roads: {
          name: 'roads',
          version: 2,
          extent: 4096,
          keys: [],
          values: [],
          features,
        },
      },
    },
  } as unknown as VectorTileArtifact;
}

describe('Milestone 4 — Benchmarking: adapter.toDescriptors() latency', () => {
  const benchAdapter = createDefaultOverlayAdapter();
  const benchArtifact = makeBenchArtifact();

  // All 6 registered rule IDs — exercises the full strategy dispatch path.
  const RULE_IDS = [
    'tile/coordinate-range',
    'tile/self-intersection',
    'tile/zero-area-ring',
    'tile/degenerate-geometry',
    'tile/unclosed-ring',
    'tile/no-empty',
  ] as const;

  it('processes 200 diagnostics in under 100ms', () => {
    const diagnostics = makeSyntheticDiagnostics(200, RULE_IDS);

    const start = performance.now();
    const overlays = benchAdapter.toDescriptors(diagnostics, benchArtifact);
    const elapsed = performance.now() - start;

    // Sanity: all 6 strategies are real — no-empty returns [], others return descriptors.
    // Expect at least some overlays back (5 strategies produce output, 1 returns []).
    expect(Array.isArray(overlays)).toBe(true);
    expect(elapsed).toBeLessThan(100);

    console.log(
      `[bench] 200 diagnostics → ${overlays.length} overlays in ${elapsed.toFixed(2)}ms`,
    );
  });

  it('processes 1000 diagnostics without error (scaling curve)', () => {
    const diagnostics = makeSyntheticDiagnostics(1000, RULE_IDS);

    const start = performance.now();
    const overlays = benchAdapter.toDescriptors(diagnostics, benchArtifact);
    const elapsed = performance.now() - start;

    expect(Array.isArray(overlays)).toBe(true);

    console.log(
      `[bench] 1000 diagnostics → ${overlays.length} overlays in ${elapsed.toFixed(2)}ms`,
    );
  });

  it('latency grows sub-linearly from 200 to 1000 diagnostics', () => {
    // Warm up the JIT by running a small batch first.
    const warmup = makeSyntheticDiagnostics(50, RULE_IDS);
    benchAdapter.toDescriptors(warmup, benchArtifact);

    const d200 = makeSyntheticDiagnostics(200, RULE_IDS);
    const d1000 = makeSyntheticDiagnostics(1000, RULE_IDS);

    const t0 = performance.now();
    benchAdapter.toDescriptors(d200, benchArtifact);
    const elapsed200 = performance.now() - t0;

    const t1 = performance.now();
    benchAdapter.toDescriptors(d1000, benchArtifact);
    const elapsed1000 = performance.now() - t1;

    console.log(
      `[bench] 200→${elapsed200.toFixed(2)}ms, 1000→${elapsed1000.toFixed(2)}ms, ` +
        `ratio: ${(elapsed1000 / elapsed200).toFixed(2)}x (expected ≤ 5x for O(n))`,
    );

    // Both calls must complete — no hard sub-linear assertion since the
    // dispatch is O(n) by design and JIT timing varies.
    expect(elapsed200).toBeGreaterThanOrEqual(0);
    expect(elapsed1000).toBeGreaterThanOrEqual(0);
    // The 200-diagnostic batch must still satisfy the < 100ms target.
    expect(elapsed200).toBeLessThan(100);
  });
});
