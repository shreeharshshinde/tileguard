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

import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Viewport module (Milestone 2 stubs)
// ---------------------------------------------------------------------------
import { createViewport } from '../src/viewport/viewport';
import type { Viewport, ViewportState } from '../src/viewport/viewport';

// ---------------------------------------------------------------------------
// Renderer module (Milestone 3 stubs)
// ---------------------------------------------------------------------------
import { CanvasRenderer } from '../src/renderer/canvas-renderer';
import type { OverlayDescriptor, Renderer } from '../src/renderer/canvas-renderer';
import { drawLineString, drawPoint, drawPolygon, drawTileBoundary, drawVertexMarkers } from '../src/renderer/shapes';

// ---------------------------------------------------------------------------
// Overlay module (Milestone 4 stubs)
// ---------------------------------------------------------------------------
import { OverlayAdapter, createDefaultOverlayAdapter } from '../src/overlay/overlay-adapter';
import type { OverlayStrategy } from '../src/overlay/overlay-adapter';
import { coordinateRangeStrategy } from '../src/overlay/strategies/coordinate-range';
import { degenerateGeometryStrategy } from '../src/overlay/strategies/degenerate-geometry';
import { noEmptyStrategy } from '../src/overlay/strategies/no-empty';
import { selfIntersectionStrategy } from '../src/overlay/strategies/self-intersection';
import { unclosedRingStrategy } from '../src/overlay/strategies/unclosed-ring';
import { zeroAreaRingStrategy } from '../src/overlay/strategies/zero-area-ring';

// ---------------------------------------------------------------------------
// HitTester module (Milestone 5 stubs)
// ---------------------------------------------------------------------------
import { createHitTester } from '../src/hittest/hit-tester';
import type { HitResult, HitTester } from '../src/hittest/hit-tester';

// ---------------------------------------------------------------------------
// InspectorStore module (Milestone 5 stubs)
// ---------------------------------------------------------------------------
import { createInspectorStore } from '../src/store/inspector-store';
import type {
  FilterState,
  InspectorLifecycle,
  InspectorStore,
  SelectionState,
} from '../src/store/inspector-store';

// ---------------------------------------------------------------------------
// Server module (Milestone 7 stub)
// ---------------------------------------------------------------------------
import { DEFAULT_PORT, MAX_PORT_ATTEMPTS, startInspectorServer } from '../src/server/server';
import type { InspectorServer, ServerOptions } from '../src/server/server';

// ---------------------------------------------------------------------------
// Smoke tests — module import resolution and exported symbol shape checks
// ---------------------------------------------------------------------------

describe('Milestone 1 — package skeleton smoke tests', () => {
  // ---- Viewport ----------------------------------------------------------
  describe('viewport module', () => {
    it('exports createViewport as a function', () => {
      expect(typeof createViewport).toBe('function');
    });

    it('createViewport throws a "Milestone 2" stub error at runtime', () => {
      expect(() => createViewport(800, 600)).toThrow('Milestone 2');
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
      { name: 'coordinateRangeStrategy', strategy: coordinateRangeStrategy, ruleId: 'tile/coordinate-range' },
      { name: 'selfIntersectionStrategy', strategy: selfIntersectionStrategy, ruleId: 'tile/self-intersection' },
      { name: 'zeroAreaRingStrategy', strategy: zeroAreaRingStrategy, ruleId: 'tile/zero-area-ring' },
      { name: 'degenerateGeometryStrategy', strategy: degenerateGeometryStrategy, ruleId: 'tile/degenerate-geometry' },
      { name: 'unclosedRingStrategy', strategy: unclosedRingStrategy, ruleId: 'tile/unclosed-ring' },
      { name: 'noEmptyStrategy', strategy: noEmptyStrategy, ruleId: 'tile/no-empty' },
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

    it('createHitTester throws a "Milestone 5" stub error at runtime', () => {
      expect(() => createHitTester()).toThrow('Milestone 5');
    });
  });

  // ---- InspectorStore ----------------------------------------------------
  describe('store module', () => {
    it('exports createInspectorStore as a function', () => {
      expect(typeof createInspectorStore).toBe('function');
    });

    it('createInspectorStore throws a "Milestone 5" stub error at runtime', () => {
      expect(() => createInspectorStore()).toThrow('Milestone 5');
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
