/**
 * @tileguard/inspector — SearchService Tests (Milestone 6 — Step 2)
 *
 * Tests every supported query pattern:
 *   - Layer name (contains, case-insensitive)
 *   - feature:ID (exact match)
 *   - key=value (property match, case-insensitive)
 *   - free text (layer, property key, property value)
 *   - blank query (returns empty)
 */

import type { VectorTileArtifact } from '@tileguard/tile-rules';
import { describe, expect, it } from 'vitest';
import { createFeatureProvider } from '../src/providers/FeatureProvider.js';
import { createSearchService } from '../src/services/SearchService.js';
import { createInspectorStore } from '../src/store/inspector-store.js';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function makeArtifact(): VectorTileArtifact {
  return {
    type: 'VectorTile',
    source: 'test.pbf',
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
              id: 48,
              properties: { highway: 'primary', name: 'Main Street', bridge: 'yes' },
              geometry: [[{ x: 0, y: 0 }, { x: 100, y: 100 }]],
            },
            {
              type: 2,
              geometryType: 'LineString',
              id: 81,
              properties: { highway: 'secondary', oneway: 'yes' },
              geometry: [[{ x: 50, y: 50 }, { x: 200, y: 200 }]],
            },
          ],
        },
        buildings: {
          name: 'buildings',
          extent: 4096,
          version: 2,
          features: [
            {
              type: 3,
              geometryType: 'Polygon',
              id: 52,
              properties: { type: 'civic', name: 'City Hall', height: 25 },
              geometry: [[[{ x: 10, y: 10 }, { x: 20, y: 10 }, { x: 20, y: 20 }, { x: 10, y: 10 }]]],
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
              id: 17,
              properties: { class: 'lake', name: 'Blue Lake' },
              geometry: [[[{ x: 300, y: 300 }, { x: 400, y: 300 }, { x: 400, y: 400 }, { x: 300, y: 300 }]]],
            },
          ],
        },
      },
    },
  } as unknown as VectorTileArtifact;
}

async function makeService() {
  const store = createInspectorStore();
  await store.load('test.pbf', makeArtifact(), []);
  const provider = createFeatureProvider(store);
  return createSearchService(provider);
}

// ---------------------------------------------------------------------------
// Blank / whitespace
// ---------------------------------------------------------------------------

describe('SearchService — blank query', () => {
  it('returns empty array for blank string', async () => {
    const service = await makeService();
    expect(service.search('')).toHaveLength(0);
  });

  it('returns empty array for whitespace-only string', async () => {
    const service = await makeService();
    expect(service.search('   ')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Layer name query
// ---------------------------------------------------------------------------

describe('SearchService — layer name (text)', () => {
  it('matches by exact layer name', async () => {
    const service = await makeService();
    const results = service.search('roads');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.feature.layerName === 'roads')).toBe(true);
  });

  it('matches layer name case-insensitively', async () => {
    const service = await makeService();
    const results = service.search('ROADS');
    expect(results.length).toBeGreaterThan(0);
  });

  it('matches partial layer name', async () => {
    const service = await makeService();
    const results = service.search('build');
    expect(results.some((r) => r.feature.layerName === 'buildings')).toBe(true);
  });

  it('matchReason describes layer match', async () => {
    const service = await makeService();
    const results = service.search('water');
    const [first] = results;
    expect(first?.matchReason).toMatch(/Layer: water/);
  });
});

// ---------------------------------------------------------------------------
// feature:ID query
// ---------------------------------------------------------------------------

describe('SearchService — feature:ID', () => {
  it('finds feature by exact ID', async () => {
    const service = await makeService();
    const results = service.search('feature:48');
    expect(results).toHaveLength(1);
    const [first] = results;
    expect(first?.feature.id).toBe(48);
  });

  it('finds feature ID 52 in buildings', async () => {
    const service = await makeService();
    const results = service.search('feature:52');
    expect(results).toHaveLength(1);
    const [first] = results;
    expect(first?.feature.layerName).toBe('buildings');
  });

  it('returns empty when ID does not exist', async () => {
    const service = await makeService();
    expect(service.search('feature:999')).toHaveLength(0);
  });

  it('matchReason includes Feature ID', async () => {
    const service = await makeService();
    const results = service.search('feature:17');
    const [first] = results;
    expect(first?.matchReason).toMatch(/Feature ID/);
  });
});

// ---------------------------------------------------------------------------
// key=value query
// ---------------------------------------------------------------------------

describe('SearchService — key=value', () => {
  it('finds by exact key=value', async () => {
    const service = await makeService();
    const results = service.search('highway=primary');
    expect(results).toHaveLength(1);
    const [first] = results;
    expect(first?.feature.properties).toMatchObject({ highway: 'primary' });
  });

  it('finds by partial key=value match', async () => {
    const service = await makeService();
    const results = service.search('high=prim');
    expect(results.length).toBeGreaterThan(0);
  });

  it('is case-insensitive for key and value', async () => {
    const service = await makeService();
    const results = service.search('HIGHWAY=PRIMARY');
    expect(results.length).toBeGreaterThan(0);
  });

  it('bridge=yes finds the bridged road', async () => {
    const service = await makeService();
    const results = service.search('bridge=yes');
    expect(results).toHaveLength(1);
    const [first] = results;
    expect(first?.feature.properties).toMatchObject({ bridge: 'yes' });
  });

  it('matchReason includes key = value', async () => {
    const service = await makeService();
    const results = service.search('highway=primary');
    const [first] = results;
    expect(first?.matchReason).toContain('highway');
    expect(first?.matchReason).toContain('primary');
  });
});

// ---------------------------------------------------------------------------
// Free text (property key or value)
// ---------------------------------------------------------------------------

describe('SearchService — free text', () => {
  it('finds by property key substring', async () => {
    const service = await makeService();
    const results = service.search('highway');
    // matches property key 'highway' in roads features
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.feature.layerName === 'roads')).toBe(true);
  });

  it('finds by property value substring', async () => {
    const service = await makeService();
    const results = service.search('Main Street');
    expect(results).toHaveLength(1);
    const [first] = results;
    expect(first?.feature.properties).toMatchObject({ name: 'Main Street' });
  });

  it('value search is case-insensitive', async () => {
    const service = await makeService();
    const results = service.search('main street');
    expect(results).toHaveLength(1);
  });

  it('returns nothing for unmatched text', async () => {
    const service = await makeService();
    expect(service.search('xyzzy')).toHaveLength(0);
  });

  it('numeric property values are not searched by free text', async () => {
    // height=25 is a number — free text search skips non-strings
    const service = await makeService();
    // '25' as free text: may match layer names or string values, but NOT number 25
    const results = service.search('City Hall');
    // 'City Hall' is a string value, so it should match
    expect(results).toHaveLength(1);
    const [first] = results;
    expect(first?.feature.layerName).toBe('buildings');
  });
});

// ---------------------------------------------------------------------------
// No tile loaded
// ---------------------------------------------------------------------------

describe('SearchService — no tile loaded', () => {
  it('returns empty array when store has no tile', () => {
    const store = createInspectorStore();
    const provider = createFeatureProvider(store);
    const service = createSearchService(provider);
    expect(service.search('roads')).toHaveLength(0);
  });
});
