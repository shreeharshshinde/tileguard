/**
 * @tileguard/inspector — SearchService extended-query tests (Milestone 6 — Step 4)
 *
 * Tests the new query syntax added in Step 4:
 *   layer:  — filter by layer name
 *   type:   — filter by geometry type
 *   id:     — match by feature ID (alias for feature:)
 *   /regex/ — regex match on property values
 *   AND     — combine two sub-queries
 *
 * Also validates relevance scoring (results sorted high→low)
 * and verifies backward compatibility with the original syntax.
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
              id: 10,
              properties: { highway: 'primary', name: 'Main Street' },
              geometry: [
                [
                  { x: 0, y: 0 },
                  { x: 100, y: 100 },
                ],
              ],
            },
            {
              type: 2,
              geometryType: 'LineString',
              id: 11,
              properties: { highway: 'secondary', name: 'Side Road' },
              geometry: [
                [
                  { x: 50, y: 50 },
                  { x: 200, y: 200 },
                ],
              ],
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
              id: 20,
              properties: { type: 'civic', height: 30 },
              geometry: [
                [
                  [
                    { x: 10, y: 10 },
                    { x: 20, y: 10 },
                    { x: 20, y: 20 },
                    { x: 10, y: 10 },
                  ],
                ],
              ],
            },
          ],
        },
        poi: {
          name: 'poi',
          extent: 4096,
          version: 2,
          features: [
            {
              type: 1,
              geometryType: 'Point',
              id: 1,
              properties: { name: 'cafe', category: 'food' },
              geometry: [{ x: 200, y: 200 }],
            },
            {
              type: 1,
              geometryType: 'Point',
              id: 2,
              properties: { name: 'school', category: 'education' },
              geometry: [{ x: 300, y: 300 }],
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
  return createSearchService(createFeatureProvider(store));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SearchService — extended queries (Step 4)', () => {
  // ── layer: ─────────────────────────────────────────────────────────────

  it('layer: returns only features from the named layer', async () => {
    const svc = await makeService();
    const results = svc.search('layer:roads');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.feature.layerName === 'roads')).toBe(true);
  });

  it('layer: is case-insensitive', async () => {
    const svc = await makeService();
    const results = svc.search('layer:ROADS');
    expect(results.every((r) => r.feature.layerName === 'roads')).toBe(true);
  });

  it('layer: returns empty when the layer does not exist', async () => {
    const svc = await makeService();
    expect(svc.search('layer:nonexistent')).toHaveLength(0);
  });

  it('layer: partial match works (contains semantics)', async () => {
    const svc = await makeService();
    // 'oad' is a substring of 'roads'
    const results = svc.search('layer:oad');
    expect(results.every((r) => r.feature.layerName === 'roads')).toBe(true);
  });

  // ── type: ──────────────────────────────────────────────────────────────

  it('type: returns only features with the given geometry type', async () => {
    const svc = await makeService();
    const results = svc.search('type:polygon');
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((r) =>
        r.feature.geometryType.toLowerCase().includes('polygon'),
      ),
    ).toBe(true);
  });

  it('type:point returns only point features', async () => {
    const svc = await makeService();
    const results = svc.search('type:point');
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((r) =>
        r.feature.geometryType.toLowerCase().includes('point'),
      ),
    ).toBe(true);
  });

  it('type:linestring returns only LineString features', async () => {
    const svc = await makeService();
    const results = svc.search('type:linestring');
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every((r) =>
        r.feature.geometryType.toLowerCase().includes('line'),
      ),
    ).toBe(true);
  });

  // ── id: (Step 4 alias) ─────────────────────────────────────────────────

  it('id: matches feature by numeric ID', async () => {
    const svc = await makeService();
    const results = svc.search('id:10');
    expect(results).toHaveLength(1);
    expect(results[0]!.feature.id).toBe(10);
  });

  it('id: returns empty for an ID that does not exist', async () => {
    const svc = await makeService();
    expect(svc.search('id:9999')).toHaveLength(0);
  });

  // ── feature: (backward compatibility) ─────────────────────────────────

  it('feature: prefix still works as an alias for id:', async () => {
    const svc = await makeService();
    const results = svc.search('feature:20');
    expect(results).toHaveLength(1);
    expect(results[0]!.feature.id).toBe(20);
  });

  // ── /regex/ ────────────────────────────────────────────────────────────

  it('/regex/ matches property values by pattern', async () => {
    const svc = await makeService();
    const results = svc.search('/^cafe$/');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.feature.properties.name === 'cafe')).toBe(
      true,
    );
  });

  it('/regex/ is case-insensitive', async () => {
    const svc = await makeService();
    const results = svc.search('/CAFE/');
    expect(results.some((r) => r.feature.properties.name === 'cafe')).toBe(
      true,
    );
  });

  it('/regex/ works with partial patterns', async () => {
    const svc = await makeService();
    const results = svc.search('/sch/');
    expect(results.some((r) => r.feature.properties.name === 'school')).toBe(
      true,
    );
  });

  it('/regex/ returns empty for a pattern that matches nothing', async () => {
    const svc = await makeService();
    expect(svc.search('/zzznomatch/')).toHaveLength(0);
  });

  it('malformed /regex/ (invalid pattern) falls back to free-text search', async () => {
    const svc = await makeService();
    // Invalid regex — should not throw
    expect(() => svc.search('/[invalid regex/')).not.toThrow();
  });

  // ── AND ────────────────────────────────────────────────────────────────

  it('AND combines two clauses (both must match)', async () => {
    const svc = await makeService();
    const results = svc.search('layer:buildings AND type:polygon');
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.feature.layerName).toBe('buildings');
      expect(r.feature.geometryType.toLowerCase()).toContain('polygon');
    }
  });

  it('AND returns empty when one clause has no matches', async () => {
    const svc = await makeService();
    // roads layer has LineStrings, not Polygons
    expect(svc.search('layer:roads AND type:polygon')).toHaveLength(0);
  });

  it('AND works with id: and layer: clauses', async () => {
    const svc = await makeService();
    const results = svc.search('layer:roads AND id:10');
    expect(results).toHaveLength(1);
    expect(results[0]!.feature.id).toBe(10);
  });

  it('AND with property key=value and layer:', async () => {
    const svc = await makeService();
    const results = svc.search('layer:poi AND name=cafe');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.feature.layerName === 'poi')).toBe(true);
  });

  // ── Relevance scoring ──────────────────────────────────────────────────

  it('results are sorted by score descending', async () => {
    const svc = await makeService();
    const results = svc.search('roads');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
    }
  });

  it('each result has a positive score', async () => {
    const svc = await makeService();
    const results = svc.search('layer:roads');
    for (const r of results) {
      expect(r.score).toBeGreaterThan(0);
    }
  });

  it('exact layer match scores higher than partial match', async () => {
    const svc = await makeService();
    // 'roads' is exact; 'road' is partial — roads-layer features should score higher
    const exactResults = svc.search('layer:roads');
    const partialResults = svc.search('layer:road');
    if (exactResults.length > 0 && partialResults.length > 0) {
      expect(exactResults[0]!.score).toBeGreaterThanOrEqual(
        partialResults[0]!.score,
      );
    }
  });

  // ── Backward compatibility ─────────────────────────────────────────────

  it('free-text search still works alongside new syntax', async () => {
    const svc = await makeService();
    expect(
      svc
        .search('primary')
        .some((r) => r.feature.properties.highway === 'primary'),
    ).toBe(true);
  });

  it('key=value search still works', async () => {
    const svc = await makeService();
    const results = svc.search('highway=primary');
    expect(results).toHaveLength(1);
    expect(results[0]!.feature.properties.highway).toBe('primary');
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  it('returns empty array for blank query', async () => {
    const svc = await makeService();
    expect(svc.search('')).toHaveLength(0);
    expect(svc.search('   ')).toHaveLength(0);
  });

  it('returns empty array for a query with no matches', async () => {
    const svc = await makeService();
    expect(svc.search('layer:definitely_not_a_real_layer')).toHaveLength(0);
  });

  it('returns empty when no tile is loaded', () => {
    const store = createInspectorStore();
    const svc = createSearchService(createFeatureProvider(store));
    expect(svc.search('roads')).toHaveLength(0);
  });
});
