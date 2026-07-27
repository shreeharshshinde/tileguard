/**
 * @tileguard/inspector — HitTester & Geometry Helpers Unit Tests
 *
 * Covers:
 *   Part 1 — Geometry helpers (distanceSquared, pointToSegmentDistanceSquared,
 *             pointInPolygon, minRingDistanceSquared)
 *   Part 2 — Point feature hit testing
 *   Part 3 — LineString feature hit testing
 *   Part 4 — Polygon feature hit testing
 *   Part 5 — Multi-feature / multi-layer / closest-feature selection
 *   Part 6 — Hit radius edge cases
 *   Part 7 — Robustness (empty artifact, degenerate geometry, invalid features)
 *   Part 8 — Large synthetic dataset performance
 *
 * All tests use synthetic VectorTileArtifact fixtures. No file I/O.
 */

import type { VectorTileArtifact, VectorTileFeature, VectorTileLayer } from '@tileguard/tile-rules';
import { describe, expect, it } from 'vitest';
import {
  distanceSquared,
  minRingDistanceSquared,
  pointInPolygon,
  pointToSegmentDistanceSquared,
} from '../src/hittest/helpers.js';
import { createHitTester, DEFAULT_HIT_RADIUS } from '../src/hittest/hit-tester.js';

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

type Pt = { x: number; y: number };

function pt(x: number, y: number): Pt {
  return { x, y };
}

function makePointFeature(points: Pt[]): VectorTileFeature {
  return { id: 0, type: 1, geometryType: 'Point', properties: {}, geometry: points };
}

function makeLineFeature(parts: Pt[][]): VectorTileFeature {
  return { id: 0, type: 2, geometryType: 'LineString', properties: {}, geometry: parts };
}

function makePolygonFeature(rings: Pt[][]): VectorTileFeature {
  return { id: 0, type: 3, geometryType: 'Polygon', properties: {}, geometry: rings };
}

function makeLayer(name: string, features: VectorTileFeature[]): VectorTileLayer {
  return { name, version: 2, extent: 4096, keys: [], values: [], features };
}

function makeArtifact(layers: VectorTileLayer[]): VectorTileArtifact {
  const map: Record<string, VectorTileLayer> = {};
  for (const l of layers) map[l.name] = l;
  return {
    type: 'VectorTile',
    ref: { type: 'VectorTile', source: 'test.pbf' },
    content: { layers: map },
  } as unknown as VectorTileArtifact;
}

// Common shapes
const UNIT_SQUARE = [pt(0, 0), pt(100, 0), pt(100, 100), pt(0, 100), pt(0, 0)];
const UNIT_SQUARE_HOLE = [pt(25, 25), pt(75, 25), pt(75, 75), pt(25, 75), pt(25, 25)];

// ---------------------------------------------------------------------------
// Part 1 — Geometry helpers
// ---------------------------------------------------------------------------

describe('distanceSquared', () => {
  it('returns 0 for identical points', () => {
    expect(distanceSquared(pt(0, 0), pt(0, 0))).toBe(0);
  });

  it('returns correct squared distance along x axis', () => {
    expect(distanceSquared(pt(0, 0), pt(3, 0))).toBe(9);
  });

  it('returns correct squared distance along y axis', () => {
    expect(distanceSquared(pt(0, 0), pt(0, 4))).toBe(16);
  });

  it('returns correct squared distance diagonally (3-4-5)', () => {
    expect(distanceSquared(pt(0, 0), pt(3, 4))).toBe(25);
  });

  it('is symmetric', () => {
    expect(distanceSquared(pt(1, 2), pt(5, 7))).toBe(distanceSquared(pt(5, 7), pt(1, 2)));
  });

  it('handles negative coordinates', () => {
    expect(distanceSquared(pt(-3, -4), pt(0, 0))).toBe(25);
  });
});

describe('pointToSegmentDistanceSquared', () => {
  it('returns 0 when point is on the segment start', () => {
    expect(pointToSegmentDistanceSquared(pt(0, 0), pt(0, 0), pt(10, 0))).toBe(0);
  });

  it('returns 0 when point is on the segment end', () => {
    expect(pointToSegmentDistanceSquared(pt(10, 0), pt(0, 0), pt(10, 0))).toBe(0);
  });

  it('returns 0 when point is in the middle of the segment', () => {
    expect(pointToSegmentDistanceSquared(pt(5, 0), pt(0, 0), pt(10, 0))).toBe(0);
  });

  it('returns perpendicular distance squared for point above midpoint', () => {
    // Point at (5,3), segment from (0,0) to (10,0) → perpendicular distance = 3
    expect(pointToSegmentDistanceSquared(pt(5, 3), pt(0, 0), pt(10, 0))).toBeCloseTo(9);
  });

  it('returns endpoint distance when projection falls before segment start', () => {
    // Point at (-3, 4), segment (0,0)→(10,0): projection t<0, nearest = (0,0), dist²=25
    expect(pointToSegmentDistanceSquared(pt(-3, 4), pt(0, 0), pt(10, 0))).toBeCloseTo(25);
  });

  it('returns endpoint distance when projection falls after segment end', () => {
    // Point at (13, 4), segment (0,0)→(10,0): projection t>1, nearest = (10,0), dist²=25
    expect(pointToSegmentDistanceSquared(pt(13, 4), pt(0, 0), pt(10, 0))).toBeCloseTo(25);
  });

  it('handles degenerate segment (a === b) — returns distance to point a', () => {
    expect(pointToSegmentDistanceSquared(pt(3, 4), pt(0, 0), pt(0, 0))).toBeCloseTo(25);
  });

  it('handles diagonal segment', () => {
    // Point at (0,2), segment from (0,0) to (2,2) — nearest point (1,1), dist²=2
    expect(pointToSegmentDistanceSquared(pt(0, 2), pt(0, 0), pt(2, 2))).toBeCloseTo(2);
  });
});

describe('pointInPolygon', () => {
  it('returns true for point inside unit square', () => {
    expect(pointInPolygon(pt(50, 50), UNIT_SQUARE)).toBe(true);
  });

  it('returns false for point outside unit square', () => {
    expect(pointInPolygon(pt(200, 200), UNIT_SQUARE)).toBe(false);
  });

  it('returns false for point to the left of ring', () => {
    expect(pointInPolygon(pt(-10, 50), UNIT_SQUARE)).toBe(false);
  });

  it('returns false for point above ring', () => {
    expect(pointInPolygon(pt(50, -10), UNIT_SQUARE)).toBe(false);
  });

  it('returns false for ring with fewer than 3 vertices', () => {
    expect(pointInPolygon(pt(0, 0), [pt(0, 0), pt(1, 1)])).toBe(false);
  });

  it('returns false for empty ring', () => {
    expect(pointInPolygon(pt(0, 0), [])).toBe(false);
  });

  it('works for a larger polygon (rectangle)', () => {
    const rect = [pt(100, 100), pt(400, 100), pt(400, 300), pt(100, 300), pt(100, 100)];
    expect(pointInPolygon(pt(250, 200), rect)).toBe(true);
    expect(pointInPolygon(pt(50, 200), rect)).toBe(false);
  });
});

describe('minRingDistanceSquared', () => {
  it('returns Infinity for a ring with fewer than 2 vertices', () => {
    expect(minRingDistanceSquared(pt(0, 0), [pt(5, 5)])).toBe(Infinity);
  });

  it('returns Infinity for empty ring', () => {
    expect(minRingDistanceSquared(pt(0, 0), [])).toBe(Infinity);
  });

  it('returns 0 when point is on the ring boundary', () => {
    // point at (50,0) lies on segment (0,0)-(100,0) of UNIT_SQUARE
    expect(minRingDistanceSquared(pt(50, 0), UNIT_SQUARE)).toBeCloseTo(0);
  });

  it('returns correct distance for point inside ring', () => {
    // point at (50,50) in UNIT_SQUARE: nearest boundary = 50 units → dist²=2500
    expect(minRingDistanceSquared(pt(50, 50), UNIT_SQUARE)).toBeCloseTo(2500);
  });

  it('returns correct distance for point outside ring', () => {
    // point at (150,50) outside UNIT_SQUARE: nearest side at x=100 → dist²=2500
    expect(minRingDistanceSquared(pt(150, 50), UNIT_SQUARE)).toBeCloseTo(2500);
  });
});

// ---------------------------------------------------------------------------
// Part 2 — Point feature hit testing
// ---------------------------------------------------------------------------

describe('HitTester — Point features', () => {
  const tester = createHitTester();

  it('hits a point feature at exact location (distance 0)', () => {
    const art = makeArtifact([makeLayer('pts', [makePointFeature([pt(100, 100)])])]);
    const result = tester.hitTest(pt(100, 100), art);
    expect(result).toBeDefined();
    expect(result?.layerName).toBe('pts');
    expect(result?.featureIndex).toBe(0);
    expect(result?.distance).toBe(0);
  });

  it('hits a point feature within default radius', () => {
    const art = makeArtifact([makeLayer('pts', [makePointFeature([pt(100, 100)])])]);
    const result = tester.hitTest(pt(100 + DEFAULT_HIT_RADIUS - 1, 100), art);
    expect(result).toBeDefined();
  });

  it('misses a point feature just outside default radius', () => {
    const art = makeArtifact([makeLayer('pts', [makePointFeature([pt(100, 100)])])]);
    const result = tester.hitTest(pt(100 + DEFAULT_HIT_RADIUS + 1, 100), art);
    expect(result).toBeUndefined();
  });

  it('hits the closest of two point vertices in a multi-point feature', () => {
    const art = makeArtifact([makeLayer('pts', [makePointFeature([pt(50, 50), pt(200, 200)])])]);
    const result = tester.hitTest(pt(52, 50), art, 20);
    expect(result).toBeDefined();
    expect(result?.distance).toBeCloseTo(2);
  });

  it('returns exact distance for a point feature', () => {
    const art = makeArtifact([makeLayer('pts', [makePointFeature([pt(0, 0)])])]);
    const result = tester.hitTest(pt(3, 4), art, 20);
    expect(result).toBeDefined();
    expect(result?.distance).toBeCloseTo(5);
  });

  it('respects custom radius for point features', () => {
    const art = makeArtifact([makeLayer('pts', [makePointFeature([pt(100, 100)])])]);
    expect(tester.hitTest(pt(100, 115), art, 10)).toBeUndefined();
    expect(tester.hitTest(pt(100, 115), art, 20)).toBeDefined();
  });

  it('returns undefined when artifact has no layers', () => {
    const art = makeArtifact([]);
    expect(tester.hitTest(pt(0, 0), art)).toBeUndefined();
  });

  it('returns undefined for empty point geometry', () => {
    const art = makeArtifact([makeLayer('pts', [makePointFeature([])])]);
    expect(tester.hitTest(pt(0, 0), art)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Part 3 — LineString feature hit testing
// ---------------------------------------------------------------------------

describe('HitTester — LineString features', () => {
  const tester = createHitTester();

  it('hits a horizontal segment perpendicularly', () => {
    // Segment (0,0)→(100,0). Query at (50,5) — perpendicular distance = 5.
    const art = makeArtifact([makeLayer('lines', [makeLineFeature([[pt(0, 0), pt(100, 0)]])])]);
    const result = tester.hitTest(pt(50, 5), art, 10);
    expect(result).toBeDefined();
    expect(result?.distance).toBeCloseTo(5);
  });

  it('misses a segment beyond hit radius', () => {
    const art = makeArtifact([makeLayer('lines', [makeLineFeature([[pt(0, 0), pt(100, 0)]])])]);
    expect(tester.hitTest(pt(50, 20), art, 10)).toBeUndefined();
  });

  it('hits segment endpoint', () => {
    const art = makeArtifact([makeLayer('lines', [makeLineFeature([[pt(0, 0), pt(100, 0)]])])]);
    const result = tester.hitTest(pt(-3, 4), art, 10);
    expect(result).toBeDefined();
    expect(result?.distance).toBeCloseTo(5);
  });

  it('hits on a multi-segment linestring', () => {
    const art = makeArtifact([
      makeLayer('lines', [makeLineFeature([[pt(0, 0), pt(100, 0), pt(100, 100)]])]),
    ]);
    // Query near the second segment (100,0)→(100,100), at (95,50)
    const result = tester.hitTest(pt(95, 50), art, 10);
    expect(result).toBeDefined();
    expect(result?.distance).toBeCloseTo(5);
  });

  it('returns undefined for linestring with single point part', () => {
    const art = makeArtifact([makeLayer('lines', [makeLineFeature([[pt(50, 50)]])])]);
    expect(tester.hitTest(pt(50, 50), art)).toBeUndefined();
  });

  it('returns undefined for linestring with empty part', () => {
    const art = makeArtifact([makeLayer('lines', [makeLineFeature([[]])])]);
    expect(tester.hitTest(pt(0, 0), art)).toBeUndefined();
  });

  it('hits a diagonal segment at perpendicular distance', () => {
    // Segment (0,0)→(100,100). Point at (0,10) — perpendicular foot at (5,5), dist=√50≈7.07
    const art = makeArtifact([makeLayer('lines', [makeLineFeature([[pt(0, 0), pt(100, 100)]])])]);
    const result = tester.hitTest(pt(0, 10), art, 10);
    expect(result).toBeDefined();
    expect(result?.distance).toBeCloseTo(Math.sqrt(50), 1);
  });
});

// ---------------------------------------------------------------------------
// Part 4 — Polygon feature hit testing
// ---------------------------------------------------------------------------

describe('HitTester — Polygon features', () => {
  const tester = createHitTester();

  it('returns distance 0 for point inside solid polygon', () => {
    const art = makeArtifact([makeLayer('polys', [makePolygonFeature([UNIT_SQUARE])])]);
    const result = tester.hitTest(pt(50, 50), art, DEFAULT_HIT_RADIUS);
    expect(result).toBeDefined();
    expect(result?.distance).toBe(0);
  });

  it('returns distance 0 for point near center of polygon (large radius)', () => {
    const art = makeArtifact([makeLayer('polys', [makePolygonFeature([UNIT_SQUARE])])]);
    const result = tester.hitTest(pt(50, 50), art, 200);
    expect(result?.distance).toBe(0);
  });

  it('misses polygon when point is clearly outside and beyond radius', () => {
    const art = makeArtifact([makeLayer('polys', [makePolygonFeature([UNIT_SQUARE])])]);
    // UNIT_SQUARE is (0,0)→(100,100). Point at (200,200): nearest corner at (100,100), dist≈141
    expect(tester.hitTest(pt(200, 200), art, 10)).toBeUndefined();
  });

  it('hits polygon boundary from outside when within radius', () => {
    const art = makeArtifact([makeLayer('polys', [makePolygonFeature([UNIT_SQUARE])])]);
    // Point at (105,50): 5 units outside right edge
    const result = tester.hitTest(pt(105, 50), art, 10);
    expect(result).toBeDefined();
    expect(result?.distance).toBeCloseTo(5);
  });

  it('treats point inside hole as boundary hit (not interior)', () => {
    // Polygon with exterior (0,0)→(100,100) and hole (25,25)→(75,75)
    const art = makeArtifact([
      makeLayer('polys', [makePolygonFeature([UNIT_SQUARE, UNIT_SQUARE_HOLE])]),
    ]);
    // Point at (50,50) is inside the hole — not a solid interior
    const result = tester.hitTest(pt(50, 50), art, 50);
    expect(result).toBeDefined();
    // Distance should be positive (to nearest hole wall), not 0
    expect(result?.distance).toBeGreaterThan(0);
  });

  it('returns distance 0 for point in exterior but outside all holes', () => {
    const art = makeArtifact([
      makeLayer('polys', [makePolygonFeature([UNIT_SQUARE, UNIT_SQUARE_HOLE])]),
    ]);
    // Point at (10,10) — inside exterior, outside hole
    const result = tester.hitTest(pt(10, 10), art, DEFAULT_HIT_RADIUS);
    expect(result).toBeDefined();
    expect(result?.distance).toBe(0);
  });

  it('returns undefined for polygon with empty ring array', () => {
    const art = makeArtifact([makeLayer('polys', [makePolygonFeature([])])]);
    expect(tester.hitTest(pt(50, 50), art)).toBeUndefined();
  });

  it('returns undefined for polygon whose exterior ring has fewer than 3 points', () => {
    const art = makeArtifact([makeLayer('polys', [makePolygonFeature([[pt(0, 0), pt(1, 1)]])])]);
    expect(tester.hitTest(pt(0, 0), art)).toBeUndefined();
  });

  it('handles concave polygon — point inside concavity is correctly resolved', () => {
    // L-shaped polygon (simplified)
    const lShape = [
      pt(0, 0),
      pt(200, 0),
      pt(200, 100),
      pt(100, 100),
      pt(100, 200),
      pt(0, 200),
      pt(0, 0),
    ];
    const art = makeArtifact([makeLayer('polys', [makePolygonFeature([lShape])])]);
    // Point at (50,150) is inside the L-shape
    const result = tester.hitTest(pt(50, 150), art, DEFAULT_HIT_RADIUS);
    expect(result).toBeDefined();
    expect(result?.distance).toBe(0);
    // Point at (150,150) is outside the L-shape (in the missing corner)
    const outside = tester.hitTest(pt(150, 150), art, 5);
    expect(outside).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Part 5 — Closest-feature selection across layers and features
// ---------------------------------------------------------------------------

describe('HitTester — closest-feature selection', () => {
  const tester = createHitTester();

  it('returns the closer of two point features in the same layer', () => {
    const art = makeArtifact([
      makeLayer('pts', [
        makePointFeature([pt(100, 100)]), // featureIndex 0 — farther
        makePointFeature([pt(50, 50)]), // featureIndex 1 — closer
      ]),
    ]);
    const result = tester.hitTest(pt(52, 50), art, 50);
    expect(result?.featureIndex).toBe(1);
  });

  it('returns the closer feature across two different layers', () => {
    const art = makeArtifact([
      makeLayer('a', [makePointFeature([pt(100, 100)])]),
      makeLayer('b', [makePointFeature([pt(50, 50)])]),
    ]);
    const result = tester.hitTest(pt(52, 50), art, 50);
    expect(result?.layerName).toBe('b');
  });

  it('returns the first-seen feature on exact tie (same distance)', () => {
    // Both features at equal distance from query point
    const art = makeArtifact([
      makeLayer('a', [makePointFeature([pt(0, 5)])]), // distance 5
      makeLayer('b', [makePointFeature([pt(0, -5)])]), // distance 5
    ]);
    const result = tester.hitTest(pt(0, 0), art, 10);
    // Tie goes to first-seen layer ('a')
    expect(result?.layerName).toBe('a');
  });

  it('ignores features beyond the hit radius when a closer one exists', () => {
    const art = makeArtifact([
      makeLayer('pts', [
        makePointFeature([pt(5, 0)]), // distance 5 — within radius
        makePointFeature([pt(50, 0)]), // distance 50 — outside radius=10
      ]),
    ]);
    const result = tester.hitTest(pt(0, 0), art, 10);
    expect(result?.featureIndex).toBe(0);
  });

  it('returns best polygon (distance 0) over nearby line within same radius', () => {
    // Polygon centered at (50,50), line nearby at y=62
    const art = makeArtifact([
      makeLayer('lines', [makeLineFeature([[pt(0, 62), pt(100, 62)]])]),
      makeLayer('polys', [makePolygonFeature([UNIT_SQUARE])]),
    ]);
    // Query at (50,50): inside polygon → distance 0; line at y=62 → distance 12
    const result = tester.hitTest(pt(50, 50), art, 20);
    expect(result?.layerName).toBe('polys');
    expect(result?.distance).toBe(0);
  });

  it('can find a point feature closer than a polygon boundary', () => {
    // Polygon (0,0)→(100,100), point feature at (110,50)
    // Query at (108,50): polygon boundary at x=100 (dist=8), point at (110,50) (dist=2)
    const art = makeArtifact([
      makeLayer('polys', [makePolygonFeature([UNIT_SQUARE])]),
      makeLayer('pts', [makePointFeature([pt(110, 50)])]),
    ]);
    const result = tester.hitTest(pt(108, 50), art, 10);
    expect(result?.layerName).toBe('pts');
    expect(result?.distance).toBeCloseTo(2);
  });

  it('handles multiple layers with mixed geometry types', () => {
    const art = makeArtifact([
      makeLayer('a', [makePointFeature([pt(200, 200)])]),
      makeLayer('b', [makeLineFeature([[pt(0, 10), pt(100, 10)]])]),
      makeLayer('c', [makePolygonFeature([UNIT_SQUARE])]),
    ]);
    // Query at (50,5): inside polygon distance 0, line at dist=5, point far away
    const result = tester.hitTest(pt(50, 5), art, 20);
    expect(result?.layerName).toBe('c');
    expect(result?.distance).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Part 6 — Hit radius edge cases
// ---------------------------------------------------------------------------

describe('HitTester — hit radius edge cases', () => {
  const tester = createHitTester();

  it('radius = 0: only hits at exact point location', () => {
    const art = makeArtifact([makeLayer('pts', [makePointFeature([pt(50, 50)])])]);
    expect(tester.hitTest(pt(50, 50), art, 0)).toBeDefined();
    expect(tester.hitTest(pt(51, 50), art, 0)).toBeUndefined();
  });

  it('radius = 1: hits at distance exactly 1', () => {
    const art = makeArtifact([makeLayer('pts', [makePointFeature([pt(0, 0)])])]);
    expect(tester.hitTest(pt(1, 0), art, 1)).toBeDefined();
    expect(tester.hitTest(pt(2, 0), art, 1)).toBeUndefined();
  });

  it('DEFAULT_HIT_RADIUS is 10', () => {
    expect(DEFAULT_HIT_RADIUS).toBe(10);
  });

  it('uses DEFAULT_HIT_RADIUS when radius parameter is omitted', () => {
    const art = makeArtifact([makeLayer('pts', [makePointFeature([pt(0, 0)])])]);
    expect(tester.hitTest(pt(9, 0), art)).toBeDefined(); // within default
    expect(tester.hitTest(pt(11, 0), art)).toBeUndefined(); // outside default
  });

  it('very large radius hits anything on the tile', () => {
    const art = makeArtifact([makeLayer('pts', [makePointFeature([pt(4096, 4096)])])]);
    expect(tester.hitTest(pt(0, 0), art, 10000)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Part 7 — Robustness (empty, degenerate, invalid)
// ---------------------------------------------------------------------------

describe('HitTester — robustness', () => {
  const tester = createHitTester();

  it('returns undefined for an artifact with no layers', () => {
    expect(tester.hitTest(pt(50, 50), makeArtifact([]))).toBeUndefined();
  });

  it('returns undefined for a layer with no features', () => {
    expect(tester.hitTest(pt(0, 0), makeArtifact([makeLayer('empty', [])]))).toBeUndefined();
  });

  it('skips unknown feature type gracefully', () => {
    const badFeature = {
      id: 0,
      type: 99,
      geometryType: 'Unknown',
      properties: {},
      geometry: [],
    } as unknown as VectorTileFeature;
    const art = makeArtifact([makeLayer('bad', [badFeature])]);
    expect(tester.hitTest(pt(0, 0), art)).toBeUndefined();
  });

  it('skips a polygon feature with only 1 ring of 2 points without throwing', () => {
    const art = makeArtifact([makeLayer('p', [makePolygonFeature([[pt(0, 0), pt(1, 1)]])])]);
    expect(() => tester.hitTest(pt(0, 0), art)).not.toThrow();
  });

  it('skips a linestring feature with a single-point part without throwing', () => {
    const art = makeArtifact([makeLayer('l', [makeLineFeature([[pt(5, 5)]])])]);
    expect(() => tester.hitTest(pt(5, 5), art)).not.toThrow();
  });

  it('skips a point feature with no vertices without throwing', () => {
    const art = makeArtifact([makeLayer('p', [makePointFeature([])])]);
    expect(() => tester.hitTest(pt(0, 0), art)).not.toThrow();
  });

  it('handles a mix of valid and invalid features — still finds the valid one', () => {
    const badFeature = {
      id: 0,
      type: 99,
      geometryType: 'Unknown',
      properties: {},
      geometry: [],
    } as unknown as VectorTileFeature;
    const goodFeature = makePointFeature([pt(5, 5)]);
    const art = makeArtifact([makeLayer('mixed', [badFeature, goodFeature])]);
    const result = tester.hitTest(pt(5, 5), art, 5);
    expect(result).toBeDefined();
    expect(result?.featureIndex).toBe(1);
  });

  it('handles a polygon with zero-length exterior ring gracefully', () => {
    const art = makeArtifact([makeLayer('p', [makePolygonFeature([[]])])]);
    expect(() => tester.hitTest(pt(0, 0), art)).not.toThrow();
    expect(tester.hitTest(pt(0, 0), art)).toBeUndefined();
  });

  it('is reusable across multiple calls (stateless)', () => {
    const art = makeArtifact([makeLayer('pts', [makePointFeature([pt(10, 10)])])]);
    const r1 = tester.hitTest(pt(10, 10), art);
    const r2 = tester.hitTest(pt(10, 10), art);
    expect(r1?.distance).toBe(r2?.distance);
    expect(r1?.featureIndex).toBe(r2?.featureIndex);
  });
});

// ---------------------------------------------------------------------------
// Part 8 — Large synthetic dataset
// ---------------------------------------------------------------------------

describe('HitTester — large synthetic dataset', () => {
  const tester = createHitTester();

  it('searches 500 point features and returns the closest in < 5ms', () => {
    const features: VectorTileFeature[] = [];
    for (let i = 0; i < 500; i++) {
      features.push(makePointFeature([pt(i * 8, (i % 64) * 8)]));
    }
    const art = makeArtifact([makeLayer('pts', features)]);

    const start = performance.now();
    const result = tester.hitTest(pt(0, 0), art, 10);
    const elapsed = performance.now() - start;

    expect(result).toBeDefined();
    expect(elapsed).toBeLessThan(5);
  });

  it('searches 200 polygon features without throwing', () => {
    const features: VectorTileFeature[] = [];
    for (let i = 0; i < 200; i++) {
      const x = (i % 20) * 50;
      const y = Math.floor(i / 20) * 50;
      features.push(
        makePolygonFeature([
          [pt(x, y), pt(x + 40, y), pt(x + 40, y + 40), pt(x, y + 40), pt(x, y)],
        ]),
      );
    }
    const art = makeArtifact([makeLayer('polys', features)]);

    expect(() => tester.hitTest(pt(25, 25), art)).not.toThrow();
    const result = tester.hitTest(pt(25, 25), art, DEFAULT_HIT_RADIUS);
    expect(result).toBeDefined();
    expect(result?.distance).toBe(0); // inside first polygon
  });

  it('returns undefined when all 100 features are outside hit radius', () => {
    const features: VectorTileFeature[] = [];
    for (let i = 0; i < 100; i++) {
      features.push(makePointFeature([pt(500 + i * 10, 500)]));
    }
    const art = makeArtifact([makeLayer('pts', features)]);
    // Query at origin — all points are at least 500 units away
    expect(tester.hitTest(pt(0, 0), art, 10)).toBeUndefined();
  });
});
