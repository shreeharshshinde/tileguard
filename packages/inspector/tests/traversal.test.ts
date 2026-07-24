/**
 * @tileguard/inspector — Traversal Unit Tests
 *
 * Tests for walkFeatureGeometry, walkLayer, and walkArtifact against all
 * geometry types: Point, MultiPoint, LineString, MultiLineString, Polygon,
 * MultiPolygon, Unknown, and empty layers.
 *
 * No DOM, no Canvas, no React. Pure TypeScript, Vitest node environment.
 */

import { describe, expect, it, vi } from 'vitest';
import type { FeatureContext } from '../src/geometry/traversal';
import { walkArtifact, walkFeatureGeometry, walkLayer } from '../src/geometry/traversal';
import type {
  VectorTileArtifact,
  VectorTileFeature,
  VectorTileLayer,
} from '@tileguard/tile-rules';

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function makeLayer(
  name: string,
  features: VectorTileFeature[],
  extent = 4096,
): VectorTileLayer {
  return { name, version: 2, extent, keys: [], values: [], features };
}

function makeArtifact(layers: VectorTileLayer[]): VectorTileArtifact {
  const layerMap: Record<string, VectorTileLayer> = {};
  for (const l of layers) layerMap[l.name] = l;
  return { type: 'VectorTile', ref: { type: 'VectorTile', source: 'test.pbf' }, content: { layers: layerMap } };
}

// Geometry fixtures
const POINT_FEATURE: VectorTileFeature = {
  id: 1, type: 1, geometryType: 'Point', properties: {},
  geometry: [{ x: 100, y: 200 }],
};

const MULTIPOINT_FEATURE: VectorTileFeature = {
  id: 2, type: 1, geometryType: 'Point', properties: {},
  // Two vertices in a flat array → dispatched as two separate onPoint calls
  geometry: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
};

const LINESTRING_FEATURE: VectorTileFeature = {
  id: 3, type: 2, geometryType: 'LineString', properties: {},
  geometry: [[{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 200, y: 50 }]],
};

const MULTILINESTRING_FEATURE: VectorTileFeature = {
  id: 4, type: 2, geometryType: 'LineString', properties: {},
  geometry: [
    [{ x: 0, y: 0 }, { x: 10, y: 10 }],
    [{ x: 20, y: 20 }, { x: 30, y: 30 }],
  ],
};

const POLYGON_FEATURE: VectorTileFeature = {
  id: 5, type: 3, geometryType: 'Polygon', properties: {},
  geometry: [
    // exterior ring
    [{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 500, y: 500 }, { x: 0, y: 500 }, { x: 0, y: 0 }],
    // interior ring (hole)
    [{ x: 100, y: 100 }, { x: 400, y: 100 }, { x: 400, y: 400 }, { x: 100, y: 400 }, { x: 100, y: 100 }],
  ],
};

const MULTIPOLYGON_FEATURE: VectorTileFeature = {
  id: 6, type: 3, geometryType: 'Polygon', properties: {},
  geometry: [
    [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 0, y: 0 }],
    [{ x: 200, y: 200 }, { x: 300, y: 200 }, { x: 300, y: 300 }, { x: 200, y: 300 }, { x: 200, y: 200 }],
  ],
};

const UNKNOWN_FEATURE: VectorTileFeature = {
  id: 7, type: 0, geometryType: 'Unknown', properties: {}, geometry: [],
};

// ---------------------------------------------------------------------------
// walkFeatureGeometry
// ---------------------------------------------------------------------------

describe('walkFeatureGeometry', () => {
  function layer1(feature: VectorTileFeature): VectorTileLayer {
    return makeLayer('test', [feature]);
  }

  it('dispatches Point to onPoint with correct partIndex and geometry', () => {
    const onPoint = vi.fn();
    const layer = layer1(POINT_FEATURE);
    walkFeatureGeometry(POINT_FEATURE, 'test', layer, 0, { onPoint });

    expect(onPoint).toHaveBeenCalledOnce();
    const [pts, ctx] = onPoint.mock.calls[0] as [unknown[], FeatureContext];
    expect(ctx.partIndex).toBe(0);
    expect(ctx.featureIndex).toBe(0);
    expect(ctx.layerName).toBe('test');
    expect(pts).toEqual([{ x: 100, y: 200 }]);
  });

  it('does not call onLineString or onPolygon for a Point feature', () => {
    const onLineString = vi.fn();
    const onPolygon = vi.fn();
    const layer = layer1(POINT_FEATURE);
    walkFeatureGeometry(POINT_FEATURE, 'test', layer, 0, { onLineString, onPolygon });
    expect(onLineString).not.toHaveBeenCalled();
    expect(onPolygon).not.toHaveBeenCalled();
  });

  it('dispatches LineString to onLineString with partIndex 0', () => {
    const onLineString = vi.fn();
    const layer = layer1(LINESTRING_FEATURE);
    walkFeatureGeometry(LINESTRING_FEATURE, 'test', layer, 0, { onLineString });

    expect(onLineString).toHaveBeenCalledOnce();
    const [, ctx] = onLineString.mock.calls[0] as [unknown, FeatureContext];
    expect(ctx.partIndex).toBe(0);
    expect(ctx.feature).toBe(LINESTRING_FEATURE);
  });

  it('dispatches Polygon to onPolygon once with all rings', () => {
    const onPolygon = vi.fn();
    const layer = layer1(POLYGON_FEATURE);
    walkFeatureGeometry(POLYGON_FEATURE, 'test', layer, 0, { onPolygon });

    expect(onPolygon).toHaveBeenCalledOnce();
    const [rings] = onPolygon.mock.calls[0] as [readonly (readonly unknown[])[]];
    expect(rings).toHaveLength(2); // exterior + hole
  });

  it('skips Unknown (type 0) features without calling any callback', () => {
    const onPoint = vi.fn();
    const onLineString = vi.fn();
    const onPolygon = vi.fn();
    const layer = layer1(UNKNOWN_FEATURE);
    walkFeatureGeometry(UNKNOWN_FEATURE, 'test', layer, 0, { onPoint, onLineString, onPolygon });
    expect(onPoint).not.toHaveBeenCalled();
    expect(onLineString).not.toHaveBeenCalled();
    expect(onPolygon).not.toHaveBeenCalled();
  });

  it('does not throw with an empty visitor {}', () => {
    const layer = layer1(POINT_FEATURE);
    expect(() => walkFeatureGeometry(POINT_FEATURE, 'test', layer, 0, {})).not.toThrow();
  });

  it('provides the correct layer reference in context', () => {
    const layer = layer1(LINESTRING_FEATURE);
    let capturedLayer: VectorTileLayer | undefined;
    walkFeatureGeometry(LINESTRING_FEATURE, 'test', layer, 0, {
      onLineString: (_, ctx) => { capturedLayer = ctx.layer; },
    });
    expect(capturedLayer).toBe(layer);
  });
});

// ---------------------------------------------------------------------------
// MultiPoint
// ---------------------------------------------------------------------------

describe('walkFeatureGeometry — MultiPoint', () => {
  // In MVT, a "Point" feature always has type=1. The geometry is a flat
  // readonly Point[] array. normaliseToParts wraps it in one outer array,
  // so walkFeatureGeometry dispatches ONE onPoint call with the full flat
  // array (all vertices of the feature).
  it('dispatches a single onPoint call with the full vertex array', () => {
    const onPoint = vi.fn();
    const layer = makeLayer('places', [MULTIPOINT_FEATURE]);
    walkFeatureGeometry(MULTIPOINT_FEATURE, 'places', layer, 0, { onPoint });

    // One call, not two — the entire flat array is one part
    expect(onPoint).toHaveBeenCalledOnce();
    const [pts, ctx] = onPoint.mock.calls[0] as [Array<{ x: number; y: number }>, FeatureContext];
    expect(ctx.partIndex).toBe(0);
    // Both vertices are present in the array
    expect(pts).toContainEqual({ x: 10, y: 20 });
    expect(pts).toContainEqual({ x: 30, y: 40 });
  });
});

// ---------------------------------------------------------------------------
// MultiLineString
// ---------------------------------------------------------------------------

describe('walkFeatureGeometry — MultiLineString', () => {
  it('dispatches each line as a separate onLineString call with incrementing partIndex', () => {
    const onLineString = vi.fn();
    const layer = makeLayer('roads', [MULTILINESTRING_FEATURE]);
    walkFeatureGeometry(MULTILINESTRING_FEATURE, 'roads', layer, 0, { onLineString });

    expect(onLineString).toHaveBeenCalledTimes(2);
    const [, ctx0] = onLineString.mock.calls[0] as [unknown, FeatureContext];
    const [, ctx1] = onLineString.mock.calls[1] as [unknown, FeatureContext];
    expect(ctx0.partIndex).toBe(0);
    expect(ctx1.partIndex).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// walkLayer
// ---------------------------------------------------------------------------

describe('walkLayer', () => {
  it('walks all features in order', () => {
    const visited: number[] = [];
    const layer = makeLayer('mixed', [POINT_FEATURE, LINESTRING_FEATURE, POLYGON_FEATURE]);
    walkLayer(layer, {
      onPoint: (_, ctx) => visited.push(ctx.featureIndex),
      onLineString: (_, ctx) => visited.push(ctx.featureIndex),
      onPolygon: (_, ctx) => visited.push(ctx.featureIndex),
    });
    expect(visited).toEqual([0, 1, 2]);
  });

  it('handles an empty layer without throwing', () => {
    expect(() => walkLayer(makeLayer('empty', []), {})).not.toThrow();
  });

  it('passes the layer name from the layer object, not a separate argument', () => {
    const names: string[] = [];
    const layer = makeLayer('buildings', [POLYGON_FEATURE]);
    walkLayer(layer, { onPolygon: (_, ctx) => names.push(ctx.layerName) });
    expect(names).toEqual(['buildings']);
  });

  it('skips Unknown features among valid ones', () => {
    const onPoint = vi.fn();
    const onPolygon = vi.fn();
    const layer = makeLayer('mixed', [UNKNOWN_FEATURE, POINT_FEATURE, UNKNOWN_FEATURE, POLYGON_FEATURE]);
    walkLayer(layer, { onPoint, onPolygon });
    expect(onPoint).toHaveBeenCalledOnce();
    expect(onPolygon).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// walkArtifact
// ---------------------------------------------------------------------------

describe('walkArtifact', () => {
  it('walks all layers and features in a multi-layer artifact', () => {
    const layerNames: string[] = [];
    const artifact = makeArtifact([
      makeLayer('buildings', [POLYGON_FEATURE]),
      makeLayer('roads', [LINESTRING_FEATURE]),
      makeLayer('places', [POINT_FEATURE]),
    ]);
    walkArtifact(artifact, {
      onPoint: (_, ctx) => layerNames.push(ctx.layerName),
      onLineString: (_, ctx) => layerNames.push(ctx.layerName),
      onPolygon: (_, ctx) => layerNames.push(ctx.layerName),
    });
    expect(layerNames).toContain('buildings');
    expect(layerNames).toContain('roads');
    expect(layerNames).toContain('places');
    expect(layerNames).toHaveLength(3);
  });

  it('handles an artifact with no layers', () => {
    expect(() => walkArtifact(makeArtifact([]), {})).not.toThrow();
  });

  it('handles an artifact with a single empty layer', () => {
    expect(() => walkArtifact(makeArtifact([makeLayer('empty', [])]), {})).not.toThrow();
  });

  it('counts geometry calls correctly across mixed-type features', () => {
    const counts = { point: 0, line: 0, polygon: 0 };
    const artifact = makeArtifact([
      makeLayer('mixed', [POINT_FEATURE, LINESTRING_FEATURE, POLYGON_FEATURE, POINT_FEATURE]),
    ]);
    walkArtifact(artifact, {
      onPoint: () => counts.point++,
      onLineString: () => counts.line++,
      onPolygon: () => counts.polygon++,
    });
    expect(counts).toEqual({ point: 2, line: 1, polygon: 1 });
  });

  it('MultiPolygon dispatches as a single onPolygon call containing all rings', () => {
    const onPolygon = vi.fn();
    walkArtifact(makeArtifact([makeLayer('buildings', [MULTIPOLYGON_FEATURE])]), { onPolygon });
    expect(onPolygon).toHaveBeenCalledOnce();
    const [rings] = onPolygon.mock.calls[0] as [readonly (readonly unknown[])[]];
    expect(rings).toHaveLength(2);
  });

  it('accumulates geometry across multiple layers with the same visitor', () => {
    const allPts: Array<{ x: number; y: number }> = [];
    const artifact = makeArtifact([
      makeLayer('a', [POINT_FEATURE]),      // 1 call → 1 vertex in array
      makeLayer('b', [MULTIPOINT_FEATURE]), // 1 call → 2 vertices in array
    ]);
    walkArtifact(artifact, {
      onPoint: (pts) => { for (const p of pts) allPts.push(p); },
    });
    // POINT_FEATURE: [{ x:100, y:200 }] → 1 vertex
    // MULTIPOINT_FEATURE: [{ x:10, y:20 }, { x:30, y:40 }] → 2 vertices (one call)
    expect(allPts).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Visitor optional safety
// ---------------------------------------------------------------------------

describe('GeometryVisitor optional callbacks', () => {
  const artifact = makeArtifact([
    makeLayer('mixed', [POINT_FEATURE, LINESTRING_FEATURE, POLYGON_FEATURE]),
  ]);

  it('does not throw when onPoint is absent', () => {
    expect(() => walkArtifact(artifact, { onLineString: vi.fn(), onPolygon: vi.fn() })).not.toThrow();
  });

  it('does not throw when onLineString is absent', () => {
    expect(() => walkArtifact(artifact, { onPoint: vi.fn(), onPolygon: vi.fn() })).not.toThrow();
  });

  it('does not throw when onPolygon is absent', () => {
    expect(() => walkArtifact(artifact, { onPoint: vi.fn(), onLineString: vi.fn() })).not.toThrow();
  });

  it('does not throw with an entirely empty visitor', () => {
    expect(() => walkArtifact(artifact, {})).not.toThrow();
  });
});
