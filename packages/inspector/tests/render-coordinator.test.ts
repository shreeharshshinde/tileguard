/**
 * @tileguard/inspector — RenderCoordinator Unit Tests
 */

import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OverlayDescriptor } from '../src/overlay/overlay-adapter.js';
import type { SelectionProducer } from '../src/overlay/selection-producer.js';
import {
  createRenderCoordinator,
  type RenderCoordinator,
} from '../src/render/render-coordinator.js';
import type { Renderer } from '../src/renderer/canvas-renderer.js';
import {
  createInspectorStore,
  type InspectorStore,
} from '../src/store/inspector-store.js';

const mockArtifact = {
  type: 'VectorTile',
  source: 'test-tile.pbf',
  content: {
    layers: {
      roads: {
        name: 'roads',
        extent: 4096,
        version: 2,
        features: [
          {
            type: 2,
            geometryType: 'LineString',
            id: 1,
            properties: {},
            geometry: [],
          },
        ],
      },
    },
  },
} as unknown as VectorTileArtifact;

describe('RenderCoordinator', () => {
  let store: InspectorStore;
  let selectionProducer: SelectionProducer;
  let renderer: Renderer;
  let coordinator: RenderCoordinator;
  let producedOverlays: OverlayDescriptor[];

  beforeEach(() => {
    store = createInspectorStore();
    producedOverlays = [
      {
        type: 'bbox-fill',
        layerName: 'roads',
        featureIndex: 0,
        target: 0,
        severity: 'info',
      },
    ];

    selectionProducer = {
      toOverlays: vi.fn().mockImplementation(() => producedOverlays),
    };

    renderer = {
      attachCanvas: vi.fn(),
      resize: vi.fn(),
      clear: vi.fn(),
      render: vi.fn(),
    };

    coordinator = createRenderCoordinator({
      store,
      selectionProducer,
      renderer,
    });
  });

  describe('render (loaded)', () => {
    it('reads store state, requests overlays, and calls renderer when loaded', async () => {
      await store.load('test-tile.pbf', mockArtifact, []);
      store.select('roads', 0);
      store.setHover('roads', 0);

      coordinator.render();

      expect(selectionProducer.toOverlays).toHaveBeenCalledTimes(1);
      expect(selectionProducer.toOverlays).toHaveBeenCalledWith(
        { layerName: 'roads', featureIndex: 0 },
        { layerName: 'roads', featureIndex: 0 },
        mockArtifact,
      );
      expect(renderer.render).toHaveBeenCalledTimes(1);
      expect(renderer.render).toHaveBeenCalledWith(
        mockArtifact,
        producedOverlays,
        null,
      );
    });

    it('passes fresh store state to selectionProducer on each call', async () => {
      await store.load('test-tile.pbf', mockArtifact, []);

      store.select('roads', 1);
      coordinator.render();
      expect(selectionProducer.toOverlays).toHaveBeenLastCalledWith(
        { layerName: 'roads', featureIndex: 1 },
        { layerName: null, featureIndex: null },
        mockArtifact,
      );

      store.setHover('water', 2);
      coordinator.render();
      expect(selectionProducer.toOverlays).toHaveBeenLastCalledWith(
        { layerName: 'roads', featureIndex: 1 },
        { layerName: 'water', featureIndex: 2 },
        mockArtifact,
      );
    });
  });

  describe('render (unloaded)', () => {
    it('returns immediately without calling selectionProducer or renderer when uninitialized', () => {
      coordinator.render();
      expect(selectionProducer.toOverlays).not.toHaveBeenCalled();
      expect(renderer.render).not.toHaveBeenCalled();
    });

    it('returns immediately when store is in empty lifecycle state', async () => {
      const emptyArtifact = {
        type: 'VectorTile',
        source: 'empty.pbf',
        content: { layers: {} },
      } as unknown as VectorTileArtifact;

      await store.load('empty.pbf', emptyArtifact, []);
      coordinator.render();

      expect(selectionProducer.toOverlays).not.toHaveBeenCalled();
      expect(renderer.render).not.toHaveBeenCalled();
    });

    it('returns immediately when store is disposed', async () => {
      await store.load('test-tile.pbf', mockArtifact, []);
      store.dispose();

      coordinator.render();

      expect(selectionProducer.toOverlays).not.toHaveBeenCalled();
      expect(renderer.render).not.toHaveBeenCalled();
    });
  });

  describe('delegation & statelessness', () => {
    it('performs independent render passes without caching state', async () => {
      await store.load('test-tile.pbf', mockArtifact, []);

      coordinator.render();
      coordinator.render();

      expect(selectionProducer.toOverlays).toHaveBeenCalledTimes(2);
      expect(renderer.render).toHaveBeenCalledTimes(2);
    });
  });

  describe('error propagation', () => {
    it('propagates renderer errors to caller', async () => {
      await store.load('test-tile.pbf', mockArtifact, []);

      const error = new Error('Canvas Context Context2D Lost');
      vi.mocked(renderer.render).mockImplementationOnce(() => {
        throw error;
      });

      expect(() => coordinator.render()).toThrow(
        'Canvas Context Context2D Lost',
      );
    });
  });
});
