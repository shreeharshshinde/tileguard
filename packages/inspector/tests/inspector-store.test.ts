/**
 * @tileguard/inspector — InspectorStore Unit Tests
 *
 * Comprehensive tests for the reactive state container (Step 1).
 */

import type { Diagnostic } from '@tileguard/core';
import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createInspectorStore,
  type InspectorStore,
} from '../src/store/inspector-store.js';

// ---------------------------------------------------------------------------
// Test Helpers & Fixtures
// ---------------------------------------------------------------------------

const fakeArtifact = {
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
            geometry: [
              [
                { x: 0, y: 0 },
                { x: 10, y: 10 },
              ],
            ],
          },
        ],
      },
      water: {
        name: 'water',
        extent: 4096,
        version: 2,
        features: [
          {
            type: 3,
            geometryType: 'Polygon',
            id: 2,
            properties: {},
            geometry: [
              [
                { x: 0, y: 0 },
                { x: 5, y: 0 },
                { x: 5, y: 5 },
                { x: 0, y: 0 },
              ],
            ],
          },
        ],
      },
    },
  },
} as unknown as VectorTileArtifact;

const fakeEmptyArtifact = {
  type: 'VectorTile',
  source: 'empty-tile.pbf',
  content: { layers: {} },
} as unknown as VectorTileArtifact;

const fakeDiagnostics: Diagnostic[] = [
  {
    ruleId: 'tile/self-intersection',
    severity: 'error',
    message: 'Self intersection in roads',
    artifact: { type: 'VectorTile', source: 'test-tile.pbf' },
    location: { layer: 'roads', featureIndex: 0 },
  },
  {
    ruleId: 'tile/coordinate-range',
    severity: 'warning',
    message: 'Out of range point in water',
    artifact: { type: 'VectorTile', source: 'test-tile.pbf' },
    location: { layer: 'water', featureIndex: 0 },
  },
];

async function loadSync(
  store: InspectorStore,
  artifact = fakeArtifact,
  diags = fakeDiagnostics,
  filePath = 'test-tile.pbf',
): Promise<void> {
  await store.load(filePath, artifact, diags);
}

// ---------------------------------------------------------------------------
// 1. Initial State
// ---------------------------------------------------------------------------

describe('InspectorStore — initial state', () => {
  it('starts in uninitialized lifecycle', () => {
    const store = createInspectorStore();
    expect(store.lifecycle.status).toBe('uninitialized');
  });

  it('starts with null selection', () => {
    const store = createInspectorStore();
    expect(store.selection.layerName).toBeNull();
    expect(store.selection.featureIndex).toBeNull();
  });

  it('starts with null hover', () => {
    const store = createInspectorStore();
    expect(store.hover.layerName).toBeNull();
    expect(store.hover.featureIndex).toBeNull();
  });

  it('starts with empty filter state', () => {
    const store = createInspectorStore();
    const f = store.filters;
    expect(f.visibleLayers.size).toBe(0);
    expect(f.minSeverity).toBeNull();
    expect(f.ruleId).toBeNull();
  });

  it('returns frozen snapshot objects', () => {
    const store = createInspectorStore();
    expect(Object.isFrozen(store.selection)).toBe(true);
    expect(Object.isFrozen(store.hover)).toBe(true);
    expect(Object.isFrozen(store.filters)).toBe(true);
    expect(Object.isFrozen(store.filters.visibleLayers)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Lifecycle transitions
// ---------------------------------------------------------------------------

describe('InspectorStore — lifecycle transitions', () => {
  it('transitions to loading then loaded on load() with artifact', async () => {
    const store = createInspectorStore();
    const notifications: string[] = [];
    store.subscribe(() => notifications.push(store.lifecycle.status));

    await loadSync(store);

    expect(notifications).toEqual(['loading', 'loaded']);
    expect(store.lifecycle.status).toBe('loaded');

    if (store.lifecycle.status === 'loaded') {
      expect(store.lifecycle.artifact).toBe(fakeArtifact);
      expect(store.lifecycle.diagnostics).toEqual(fakeDiagnostics);
      expect(store.lifecycle.filePath).toBe('test-tile.pbf');
    }
  });

  it('transitions to empty when tile has zero features', async () => {
    const store = createInspectorStore();
    await store.load('empty.pbf', fakeEmptyArtifact, []);
    expect(store.lifecycle.status).toBe('empty');
    if (store.lifecycle.status === 'empty') {
      expect(store.lifecycle.filePath).toBe('empty.pbf');
    }
  });

  it('permits re-loading from loaded or error state', async () => {
    const store = createInspectorStore();
    await loadSync(store);
    expect(store.lifecycle.status).toBe('loaded');

    await store.load('other.pbf', fakeArtifact, []);
    expect(store.lifecycle.status).toBe('loaded');
    if (store.lifecycle.status === 'loaded') {
      expect(store.lifecycle.filePath).toBe('other.pbf');
    }
  });

  it('resets selection and hover on new load()', async () => {
    const store = createInspectorStore();
    await loadSync(store);
    store.select('roads', 0);
    store.setHover('water', 0);

    await store.load('fresh.pbf', fakeArtifact, []);
    expect(store.selection.layerName).toBeNull();
    expect(store.hover.layerName).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Selection
// ---------------------------------------------------------------------------

describe('InspectorStore — selection', () => {
  let store: InspectorStore;
  beforeEach(() => {
    store = createInspectorStore();
  });

  it('select() updates selection state', () => {
    store.select('roads', 0);
    expect(store.selection.layerName).toBe('roads');
    expect(store.selection.featureIndex).toBe(0);
  });

  it('select(null, null) clears selection', () => {
    store.select('roads', 0);
    store.select(null, null);
    expect(store.selection.layerName).toBeNull();
    expect(store.selection.featureIndex).toBeNull();
  });

  it('select() notifies listeners', () => {
    const listener = vi.fn();
    store.subscribe(listener);
    store.select('roads', 0);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('select() with same value is a no-op (no notification)', () => {
    store.select('roads', 0);
    const listener = vi.fn();
    store.subscribe(listener);
    store.select('roads', 0);
    expect(listener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. Hover
// ---------------------------------------------------------------------------

describe('InspectorStore — hover', () => {
  let store: InspectorStore;
  beforeEach(() => {
    store = createInspectorStore();
  });

  it('setHover() updates hover state', () => {
    store.setHover('water', 5);
    expect(store.hover.layerName).toBe('water');
    expect(store.hover.featureIndex).toBe(5);
  });

  it('setHover(null, null) clears hover', () => {
    store.setHover('water', 5);
    store.setHover(null, null);
    expect(store.hover.layerName).toBeNull();
    expect(store.hover.featureIndex).toBeNull();
  });

  it('setHover() notifies listeners', () => {
    const listener = vi.fn();
    store.subscribe(listener);
    store.setHover('roads', 2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('setHover() with same value is a no-op (no notification)', () => {
    store.setHover('roads', 2);
    const listener = vi.fn();
    store.subscribe(listener);
    store.setHover('roads', 2);
    expect(listener).not.toHaveBeenCalled();
  });

  it('setHover() and select() are independent', () => {
    store.select('roads', 1);
    store.setHover('buildings', 3);
    expect(store.selection.layerName).toBe('roads');
    expect(store.hover.layerName).toBe('buildings');
  });
});

// ---------------------------------------------------------------------------
// 5. Filters
// ---------------------------------------------------------------------------

describe('InspectorStore — filters', () => {
  let store: InspectorStore;
  beforeEach(() => {
    store = createInspectorStore();
  });

  it('setFilters() merges visibleLayers', () => {
    const layers = new Set(['roads', 'buildings']);
    store.setFilters({ visibleLayers: layers });
    expect(store.filters.visibleLayers).toEqual(
      new Set(['roads', 'buildings']),
    );
  });

  it('setFilters() merges minSeverity', () => {
    store.setFilters({ minSeverity: 'warning' });
    expect(store.filters.minSeverity).toBe('warning');
  });

  it('setFilters() merges ruleId', () => {
    store.setFilters({ ruleId: 'tile/self-intersection' });
    expect(store.filters.ruleId).toBe('tile/self-intersection');
  });

  it('setFilters() with no-op changes emits no notification', () => {
    store.setFilters({ minSeverity: 'error' });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setFilters({ minSeverity: 'error' });
    expect(listener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 6. Listener Subscriptions & Ordering
// ---------------------------------------------------------------------------

describe('InspectorStore — subscriptions & ordering', () => {
  let store: InspectorStore;
  beforeEach(() => {
    store = createInspectorStore();
  });

  it('notifies listeners synchronously in registration order', () => {
    const order: number[] = [];
    store.subscribe(() => order.push(1));
    store.subscribe(() => order.push(2));
    store.subscribe(() => order.push(3));

    store.select('roads', 0);
    expect(order).toEqual([1, 2, 3]);
  });

  it('unsubscribing removes listener from notification chain', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const unsub1 = store.subscribe(fn1);
    store.subscribe(fn2);

    unsub1();
    store.select('water', 0);

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('isolates throwing listeners so other subscribers still execute', () => {
    const badFn = vi.fn().mockImplementation(() => {
      throw new Error('Bad subscriber');
    });
    const goodFn = vi.fn();

    store.subscribe(badFn);
    store.subscribe(goodFn);

    store.select('buildings', 0);

    expect(badFn).toHaveBeenCalledTimes(1);
    expect(goodFn).toHaveBeenCalledTimes(1);
  });

  it('each mutation triggers exactly one notification', () => {
    const listener = vi.fn();
    store.subscribe(listener);
    store.select('roads', 0);
    store.setHover('water', 1);
    store.setFilters({ minSeverity: 'warning' });
    expect(listener).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// 7. Disposal
// ---------------------------------------------------------------------------

describe('InspectorStore — disposal', () => {
  it('dispose() transitions lifecycle to disposed and clears listeners', () => {
    const store = createInspectorStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.dispose();

    expect(store.lifecycle.status).toBe('disposed');
    expect(listener).toHaveBeenCalledTimes(1);

    // Subsequent mutations are ignored and emit no notifications
    store.select('roads', 0);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('subscribe() throws when called on disposed store', () => {
    const store = createInspectorStore();
    store.dispose();
    expect(() => store.subscribe(() => {})).toThrow(
      'cannot subscribe to a disposed store',
    );
  });

  it('multiple dispose() calls are safe (idempotent)', () => {
    const store = createInspectorStore();
    store.dispose();
    expect(() => store.dispose()).not.toThrow();
    expect(store.lifecycle.status).toBe('disposed');
  });

  it('setHover() after dispose is silently ignored', () => {
    const store = createInspectorStore();
    store.dispose();
    store.setHover('roads', 0); // must not throw
    expect(store.lifecycle.status).toBe('disposed');
  });
});
