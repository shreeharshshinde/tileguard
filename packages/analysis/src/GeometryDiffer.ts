/**
 * @tileguard/inspector — GeometryDiffer (Milestone 7 — Step 1)
 *
 * Compares the geometry of two FeatureSnapshots and produces a detailed
 * GeometryDiff describing what changed.
 *
 * Comparisons:
 *   - Geometry type (Point / LineString / Polygon)
 *   - Vertex count (sum of all vertices across all rings/lines)
 *   - Ring / line count (number of coordinate sequences)
 *   - Bounding box (min/max across all coordinates)
 *   - Centroid (unweighted average of all vertices)
 *   - Coordinate-level equality (exact match check)
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs.
 */

import type {
  BoundingRect,
  FeatureSnapshot,
  GeometryDiff,
  TilePoint,
} from './models/comparison.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type PointArray = readonly { readonly x: number; readonly y: number }[];
type RingArray = readonly PointArray[];

/**
 * Count the total number of vertices across all rings/lines in a geometry.
 */
function countVertices(geometry: RingArray): number {
  let total = 0;
  for (const ring of geometry) {
    total += ring.length;
  }
  return total;
}

/**
 * Compute the axis-aligned bounding box of a geometry.
 * Returns a unit box at origin if the geometry is empty.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: nested geometry traversal
function computeBounds(geometry: RingArray): BoundingRect {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const ring of geometry) {
    for (const pt of ring) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
  }

  // Degenerate (empty geometry)
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Compute the unweighted centroid (average of all vertices) of a geometry.
 * Returns origin if the geometry is empty.
 */
function computeCentroid(geometry: RingArray): TilePoint {
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (const ring of geometry) {
    for (const pt of ring) {
      sumX += pt.x;
      sumY += pt.y;
      count++;
    }
  }

  if (count === 0) return { x: 0, y: 0 };
  return { x: sumX / count, y: sumY / count };
}

/**
 * Euclidean distance between two TilePoints.
 */
function distance(a: TilePoint, b: TilePoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Compare two bounding rects for approximate equality.
 * Uses a tolerance of 0.5 tile units to absorb rounding in compressed coords.
 */
function boundsEqual(a: BoundingRect, b: BoundingRect): boolean {
  const tol = 0.5;
  return (
    Math.abs(a.minX - b.minX) <= tol &&
    Math.abs(a.minY - b.minY) <= tol &&
    Math.abs(a.maxX - b.maxX) <= tol &&
    Math.abs(a.maxY - b.maxY) <= tol
  );
}

/**
 * Deeply compare two ring arrays for exact coordinate equality.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: deep recursive equality check
function geometryCoordinatesEqual(a: RingArray, b: RingArray): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ringA = a[i];
    const ringB = b[i];
    if (ringA === undefined || ringB === undefined) return false;
    if (ringA.length !== ringB.length) return false;
    for (let j = 0; j < ringA.length; j++) {
      const ptA = ringA[j];
      const ptB = ringB[j];
      if (ptA === undefined || ptB === undefined) return false;
      if (ptA.x !== ptB.x || ptA.y !== ptB.y) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// GeometryDiffer Interface
// ---------------------------------------------------------------------------

export interface GeometryDiffer {
  /**
   * Compare the geometry of two features and return a detailed diff.
   *
   * @param featureA The "before" feature snapshot.
   * @param featureB The "after" feature snapshot.
   */
  diff(featureA: FeatureSnapshot, featureB: FeatureSnapshot): GeometryDiff;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class GeometryDifferImpl implements GeometryDiffer {
  diff(featureA: FeatureSnapshot, featureB: FeatureSnapshot): GeometryDiff {
    const geoA = featureA.geometry as RingArray;
    const geoB = featureB.geometry as RingArray;

    const typeA = featureA.geometryType;
    const typeB = featureB.geometryType;
    const typeChanged = typeA !== typeB;

    const vertexCountA = countVertices(geoA);
    const vertexCountB = countVertices(geoB);
    const ringCountA = geoA.length;
    const ringCountB = geoB.length;

    const boundsA = computeBounds(geoA);
    const boundsB = computeBounds(geoB);
    const centroidA = computeCentroid(geoA);
    const centroidB = computeCentroid(geoB);

    const boundsChanged = !boundsEqual(boundsA, boundsB);
    const centroidShift = distance(centroidA, centroidB);
    const coordinatesEqual = geometryCoordinatesEqual(geoA, geoB);

    const changed = typeChanged || !coordinatesEqual || boundsChanged;

    return Object.freeze({
      changed,
      typeChanged,
      typeA,
      typeB,
      vertexCountA,
      vertexCountB,
      vertexCountDelta: vertexCountB - vertexCountA,
      ringCountA,
      ringCountB,
      ringCountDelta: ringCountB - ringCountA,
      boundsA: Object.freeze(boundsA),
      boundsB: Object.freeze(boundsB),
      boundsChanged,
      centroidA: Object.freeze(centroidA),
      centroidB: Object.freeze(centroidB),
      centroidShift,
    });
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a GeometryDiffer instance.
 *
 * @example
 *   const differ = createGeometryDiffer();
 *   const diff = differ.diff(featureA, featureB);
 *   if (diff.changed) { ... }
 */
export function createGeometryDiffer(): GeometryDiffer {
  return new GeometryDifferImpl();
}
