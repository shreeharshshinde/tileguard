/**
 * @tileguard/inspector — Inspector Integration Tests (Milestone 5 — Step 5)
 *
 * These are integration tests, not unit tests. They use real implementations
 * of all internal components and mock only external dependencies (Renderer).
 *
 * The goal is to verify that the architecture works as a whole:
 *   Pointer Event → InteractionController → HitTester → InspectorStore
 *                                                           │
 *                                                           ▼
 *                                       RenderCoordinator → SelectionProducer → Renderer
 */

import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInspector, type Inspector } from '../src/create-inspector.js';
import type { Renderer } from '../src/renderer/canvas-renderer.js';
import { createViewport, type Viewport } from '../src/viewport/viewport.js';

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

/**
 * Build a mock artifact with a single point feature at (100, 100)
 * and a linestring feature from (200,200)→(300,300).
 */
function createTestArtifact(): VectorTileArtifact {
  return {
    type: 'VectorTile',
    source: 'test-tile.pbf',
    content: {
      layers: {
        points: {
          name: 'points',
          extent: 4096,
          version: 2,
          features: [
            {
              type: 1,
              geometryType: 'Point',
              id: 1,
              properties: {},
              geometry: [{ x: 100, y: 100 }],
            },
          ],
        },
        roads: {
          name: 'roads',
          extent: 4096,
          version: 2,
          features: [
            {
              type: 2,
              geometryType: 'LineString',
              id: 2,
              properties: {},
              geometry: [
                [
                  { x: 200, y: 200 },
                  { x: 300, y: 300 },
                ],
              ],
            },
          ],
        },
      },
    },
  } as unknown as VectorTileArtifact;
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('Inspector (integration)', () => {
  let viewport: Viewport;
  let renderer: Renderer;
  let inspector: Inspector;
  let artifact: VectorTileArtifact;

  beforeEach(() => {
    // Create a viewport with 1:1 mapping (zoom=1, pan=0,0)
    // so screen coordinates equal tile coordinates.
    viewport = createViewport({
      width: 4096,
      height: 4096,
      zoom: 1,
      panX: 0,
      panY: 0,
    });

    renderer = {
      attachCanvas: vi.fn(),
      resize: vi.fn(),
      clear: vi.fn(),
      render: vi.fn(),
    };

    artifact = createTestArtifact();
    inspector = createInspector({ viewport, renderer });
  });

  // ── Construction ──────────────────────────────────────────────────────────

  describe('construction', () => {
    it('creates an inspector without throwing', () => {
      expect(inspector).toBeDefined();
      expect(typeof inspector.load).toBe('function');
      expect(typeof inspector.handlePointerMove).toBe('function');
      expect(typeof inspector.handlePointerLeave).toBe('function');
      expect(typeof inspector.handleClick).toBe('function');
      expect(typeof inspector.render).toBe('function');
      expect(typeof inspector.dispose).toBe('function');
    });

    it('does not call renderer during construction', () => {
      expect(renderer.render).not.toHaveBeenCalled();
    });
  });

  // ── Load ──────────────────────────────────────────────────────────────────

  describe('load', () => {
    it('triggers a render pass after loading a tile', async () => {
      await inspector.load('test.pbf', artifact, []);

      // The store.subscribe callback fires on load, which calls render()
      expect(renderer.render).toHaveBeenCalled();
    });

    it('passes the loaded artifact to the renderer', async () => {
      await inspector.load('test.pbf', artifact, []);

      expect(renderer.render).toHaveBeenCalledWith(artifact, expect.any(Array));
    });

    it('produces no interaction overlays immediately after load', async () => {
      await inspector.load('test.pbf', artifact, []);

      // No selection or hover → empty overlay array
      const lastCall = vi.mocked(renderer.render).mock.lastCall;
      expect(lastCall).toBeDefined();
      expect(lastCall![1]).toEqual([]);
    });
  });

  // ── Pointer Move (hover) ──────────────────────────────────────────────────

  describe('pointer move', () => {
    it('updates hover state and triggers a render on feature hit', async () => {
      await inspector.load('test.pbf', artifact, []);
      vi.mocked(renderer.render).mockClear();

      // Move pointer to (100, 100) — should hit the point feature
      inspector.handlePointerMove({ x: 100, y: 100 });

      expect(renderer.render).toHaveBeenCalled();
      // Should have a hover overlay (bbox-fill with severity 'warning')
      const lastCall = vi.mocked(renderer.render).mock.lastCall;
      expect(lastCall).toBeDefined();
      const overlays = lastCall![1];
      expect(overlays.length).toBeGreaterThan(0);
      expect(overlays.some((o: { severity: string }) => o.severity === 'warning')).toBe(true);
    });

    it('clears hover state when pointer moves to empty space', async () => {
      await inspector.load('test.pbf', artifact, []);

      // First hover over a feature
      inspector.handlePointerMove({ x: 100, y: 100 });
      vi.mocked(renderer.render).mockClear();

      // Move to empty space (far from any feature)
      inspector.handlePointerMove({ x: 2000, y: 2000 });

      expect(renderer.render).toHaveBeenCalled();
      const lastCall = vi.mocked(renderer.render).mock.lastCall;
      expect(lastCall).toBeDefined();
      const overlays = lastCall![1];
      // No hover overlay should be present
      expect(overlays.every((o: { severity: string }) => o.severity !== 'warning')).toBe(true);
    });
  });

  // ── Pointer Leave ─────────────────────────────────────────────────────────

  describe('pointer leave', () => {
    it('clears hover and triggers a render', async () => {
      await inspector.load('test.pbf', artifact, []);

      // Hover over a feature first
      inspector.handlePointerMove({ x: 100, y: 100 });
      vi.mocked(renderer.render).mockClear();

      inspector.handlePointerLeave();

      expect(renderer.render).toHaveBeenCalled();
      const lastCall = vi.mocked(renderer.render).mock.lastCall;
      expect(lastCall).toBeDefined();
      const overlays = lastCall![1];
      expect(overlays.every((o: { severity: string }) => o.severity !== 'warning')).toBe(true);
    });
  });

  // ── Click (selection) ─────────────────────────────────────────────────────

  describe('click', () => {
    it('updates selection state and triggers a render on feature hit', async () => {
      await inspector.load('test.pbf', artifact, []);
      vi.mocked(renderer.render).mockClear();

      // Click on (100, 100) — should select the point feature
      inspector.handleClick({ x: 100, y: 100 });

      expect(renderer.render).toHaveBeenCalled();
      const lastCall = vi.mocked(renderer.render).mock.lastCall;
      expect(lastCall).toBeDefined();
      const overlays = lastCall![1];
      expect(overlays.length).toBeGreaterThan(0);
      // Should have a selection overlay (bbox-fill with severity 'info')
      expect(overlays.some((o: { severity: string }) => o.severity === 'info')).toBe(true);
    });

    it('clears selection when clicking empty space', async () => {
      await inspector.load('test.pbf', artifact, []);

      // First select a feature
      inspector.handleClick({ x: 100, y: 100 });
      vi.mocked(renderer.render).mockClear();

      // Click empty space
      inspector.handleClick({ x: 2000, y: 2000 });

      expect(renderer.render).toHaveBeenCalled();
      const lastCall = vi.mocked(renderer.render).mock.lastCall;
      expect(lastCall).toBeDefined();
      const overlays = lastCall![1];
      expect(overlays.every((o: { severity: string }) => o.severity !== 'info')).toBe(true);
    });
  });

  // ── Repeated Interactions ─────────────────────────────────────────────────

  describe('repeated interactions', () => {
    it('maintains synchronized state across multiple interactions', async () => {
      await inspector.load('test.pbf', artifact, []);
      vi.mocked(renderer.render).mockClear();

      // Select a feature
      inspector.handleClick({ x: 100, y: 100 });
      // Hover over a different feature
      inspector.handlePointerMove({ x: 250, y: 250 });

      // Should have both selection (info) and hover (warning) overlays
      const lastCall = vi.mocked(renderer.render).mock.lastCall;
      expect(lastCall).toBeDefined();
      const overlays = lastCall![1];
      expect(overlays.some((o: { severity: string }) => o.severity === 'info')).toBe(true);
      expect(overlays.some((o: { severity: string }) => o.severity === 'warning')).toBe(true);
    });

    it('each render pass is independent (no stale state)', async () => {
      await inspector.load('test.pbf', artifact, []);

      // Select, hover, clear hover — each triggers a fresh render
      inspector.handleClick({ x: 100, y: 100 });
      inspector.handlePointerMove({ x: 250, y: 250 });
      inspector.handlePointerLeave();

      // After pointer leave: selection should remain, hover should be gone
      const lastCall = vi.mocked(renderer.render).mock.lastCall;
      expect(lastCall).toBeDefined();
      const overlays = lastCall![1];
      expect(overlays.some((o: { severity: string }) => o.severity === 'info')).toBe(true);
      expect(overlays.every((o: { severity: string }) => o.severity !== 'warning')).toBe(true);
    });
  });

  // ── Disposal ──────────────────────────────────────────────────────────────

  describe('disposal', () => {
    it('stops rendering after disposal', async () => {
      await inspector.load('test.pbf', artifact, []);
      vi.mocked(renderer.render).mockClear();

      inspector.dispose();

      // Calling render() after dispose should not invoke renderer
      // (store is disposed, lifecycle is 'disposed', render guard returns early)
      inspector.render();
      expect(renderer.render).not.toHaveBeenCalled();
    });

    it('is safe to call dispose multiple times', async () => {
      await inspector.load('test.pbf', artifact, []);

      inspector.dispose();
      expect(() => inspector.dispose()).not.toThrow();
    });
  });
});
