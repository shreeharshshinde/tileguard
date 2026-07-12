import type { Point, VectorTileFeature } from './types.js';
import { getFeatureParts } from './types.js';

export interface GeometryIssue {
  readonly code:
    | 'OUT_OF_RANGE'
    | 'DEGENERATE_LINE'
    | 'DEGENERATE_POLYGON'
    | 'UNCLOSED_RING'
    | 'ZERO_AREA_RING'
    | 'SELF_INTERSECTION'
    | 'EMPTY_GEOMETRY';
  readonly message: string;
  readonly partIndex?: number;
  readonly pointIndex?: number;
  readonly segments?: readonly [number, number];
  readonly point?: Point;
}

export function findCoordinateRangeIssues(
  feature: VectorTileFeature,
  extent: number,
  buffer = 0,
): readonly GeometryIssue[] {
  const issues: GeometryIssue[] = [];
  const parts = getFeatureParts(feature);

  if (parts.length === 0 || parts.every((part) => part.length === 0)) {
    issues.push({ code: 'EMPTY_GEOMETRY', message: 'Feature has no geometry commands.' });
    return issues;
  }

  const min = -buffer;
  const max = extent + buffer;

  for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
    const points = parts[partIndex]!;
    for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
      const point = points[pointIndex]!;
      if (point.x < min || point.x > max || point.y < min || point.y > max) {
        issues.push({
          code: 'OUT_OF_RANGE',
          message: `Coordinate (${point.x}, ${point.y}) is outside tile extent 0-${extent} with buffer ${buffer}.`,
          partIndex,
          pointIndex,
          point,
        });
      }
    }
  }

  return issues;
}

export function findDegenerateGeometryIssues(feature: VectorTileFeature): readonly GeometryIssue[] {
  const issues: GeometryIssue[] = [];
  const parts = getFeatureParts(feature);

  if (parts.length === 0 || parts.every((part) => part.length === 0)) {
    issues.push({ code: 'EMPTY_GEOMETRY', message: 'Feature has no geometry commands.' });
    return issues;
  }

  for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
    const points = parts[partIndex]!;

    if (feature.type === 2 && uniquePointCount(points) < 2) {
      issues.push({
        code: 'DEGENERATE_LINE',
        message: 'LineString has fewer than 2 unique points.',
        partIndex,
      });
    }

    if (feature.type === 3 && (points.length < 4 || uniquePointCount(points) < 3)) {
      issues.push({
        code: 'DEGENERATE_POLYGON',
        message: 'Polygon ring has fewer than 3 unique vertices.',
        partIndex,
      });
    }
  }

  return issues;
}

export function findUnclosedRingIssues(feature: VectorTileFeature): readonly GeometryIssue[] {
  if (feature.type !== 3) return [];

  const issues: GeometryIssue[] = [];
  const parts = getFeatureParts(feature);

  for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
    const points = parts[partIndex]!;
    const first = points[0];
    const last = points[points.length - 1];

    if (first === undefined || last === undefined || first.x !== last.x || first.y !== last.y) {
      issues.push({
        code: 'UNCLOSED_RING',
        message: 'Polygon ring is not closed.',
        partIndex,
      });
    }
  }

  return issues;
}

export function findZeroAreaRingIssues(feature: VectorTileFeature): readonly GeometryIssue[] {
  if (feature.type !== 3) return [];

  const issues: GeometryIssue[] = [];
  const parts = getFeatureParts(feature);

  for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
    const points = parts[partIndex]!;
    if (Math.abs(signedArea(points)) === 0) {
      issues.push({
        code: 'ZERO_AREA_RING',
        message: 'Polygon ring has zero signed area.',
        partIndex,
      });
    }
  }

  return issues;
}

export function findSelfIntersectionIssues(feature: VectorTileFeature): readonly GeometryIssue[] {
  if (feature.type !== 2 && feature.type !== 3) return [];

  const issues: GeometryIssue[] = [];
  const parts = getFeatureParts(feature);

  for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
    const points = parts[partIndex]!;
    const issue = findFirstSelfIntersection(points, feature.type === 3, partIndex);
    if (issue !== undefined) issues.push(issue);
  }

  return issues;
}

export function uniquePointCount(points: readonly Point[]): number {
  return new Set(points.map((point) => `${point.x},${point.y}`)).size;
}

export function signedArea(points: readonly Point[]): number {
  let area = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]!;
    const next = points[index + 1]!;
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

export function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;
  return false;
}

function findFirstSelfIntersection(
  points: readonly Point[],
  closed: boolean,
  partIndex: number,
): GeometryIssue | undefined {
  const segmentCount = points.length - 1;

  for (let first = 0; first < segmentCount; first += 1) {
    for (let second = first + 1; second < segmentCount; second += 1) {
      if (Math.abs(first - second) <= 1) continue;
      if (closed && first === 0 && second === segmentCount - 1) continue;

      if (
        segmentsIntersect(points[first]!, points[first + 1]!, points[second]!, points[second + 1]!)
      ) {
        return {
          code: 'SELF_INTERSECTION',
          message: `Segments ${first} and ${second} intersect.`,
          partIndex,
          segments: [first, second],
        };
      }
    }
  }

  return undefined;
}

function orientation(a: Point, b: Point, c: Point): 0 | 1 | 2 {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (value === 0) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a: Point, b: Point, c: Point): boolean {
  return (
    b.x <= Math.max(a.x, c.x) &&
    b.x >= Math.min(a.x, c.x) &&
    b.y <= Math.max(a.y, c.y) &&
    b.y >= Math.min(a.y, c.y)
  );
}
