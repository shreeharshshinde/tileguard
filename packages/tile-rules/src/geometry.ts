/**
 * @file geometry.ts
 * @description Pure geometry utilities for vector tile validation.
 *
 * Every function in this module is a deterministic, side-effect-free predicate
 * that operates on decoded MVT coordinates (integer grid, extent = 4096 by default).
 * No I/O, no engine coupling, no external dependencies beyond the local type definitions.
 *
 * ## Coordinate model
 * MVT coordinates are integer values in the range [0, extent], where extent defaults to
 * 4096.  Tile compilers routinely emit coordinates slightly outside this range:
 *   - Clipping buffers (typically 64–80 units) extend polygon edges beyond tile edges to
 *     prevent rendering seams.
 *   - Label duplication places point features at their geographic centroid, which may be
 *     thousands of units outside the tile's nominal boundary.
 *   - Integer quantization (float → int snapping) can collapse two distinct floating-point
 *     coordinates into the same integer grid point, producing duplicate vertices.
 *
 * Validators in this module are aware of these documented MVT behaviours and treat them
 * as distinct from genuine geometry errors wherever the evidence supports doing so.
 *
 * ## Self-intersection algorithm (v0.5.2)
 * The self-intersection check uses a classical orientation-based O(N²) segment-pair
 * comparator, hardened by four targeted improvements derived from Phase 2 root-cause
 * analysis of 619 production-tile diagnostics:
 *
 *   1. Minimum-vertex guard — rings with fewer than 4 vertices are skipped.
 *   2. Closed-LineString closure skip — mirrors the existing Polygon closure skip for
 *      LineStrings whose first vertex equals their last vertex.
 *   3. Duplicate-vertex spike skip — segment pairs whose sole contact is a non-closing
 *      duplicate vertex (an integer-grid quantization artefact) are not reported.
 *   4. Bounding-box pre-check — axis-aligned bounding-box rejection before the full
 *      orientation test; reduces effective comparisons by ~99.97% on production corpora.
 *
 * See ADR-007 and ROOT_CAUSE_INVESTIGATION.md for full rationale and evidence.
 */

import type { Point, VectorTileFeature } from './types.js';
import { getFeatureParts } from './types.js';

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * A single geometry issue found by one of the `find*` functions.
 *
 * All fields beyond `code` and `message` are optional and only present when
 * the specific check can provide them.
 */
export interface GeometryIssue {
  /** Machine-readable issue code used by rules to populate `Diagnostic.data`. */
  readonly code:
    | 'OUT_OF_RANGE'
    | 'DEGENERATE_LINE'
    | 'DEGENERATE_POLYGON'
    | 'UNCLOSED_RING'
    | 'ZERO_AREA_RING'
    | 'SELF_INTERSECTION'
    | 'EMPTY_GEOMETRY';

  /** Human-readable description suitable for inclusion in a diagnostic message. */
  readonly message: string;

  /**
   * Zero-based index of the ring or part within the feature's geometry.
   * Present for all issues except `EMPTY_GEOMETRY`.
   */
  readonly partIndex?: number;

  /**
   * Zero-based index of the offending coordinate within its ring.
   * Present only for `OUT_OF_RANGE`.
   */
  readonly pointIndex?: number;

  /**
   * Indices of the two intersecting segments within the ring.
   * Present only for `SELF_INTERSECTION`.
   */
  readonly segments?: readonly [number, number];

  /**
   * The offending coordinate value.
   * Present only for `OUT_OF_RANGE`.
   */
  readonly point?: Point;
}

// ─── Coordinate range ────────────────────────────────────────────────────────

/**
 * Returns one `OUT_OF_RANGE` issue for every coordinate that falls outside the
 * interval `[-buffer, extent + buffer]` on either axis.
 *
 * A buffer of 0 enforces strict tile-extent conformance.  The recommended
 * default of 80 accommodates the clipping buffers applied by Planetiler,
 * OpenMapTiles, and CARTO Streets tile compilers (see ADR-006).
 *
 * @param feature - The decoded MVT feature to inspect.
 * @param extent  - The layer's declared extent (typically 4096).
 * @param buffer  - Number of coordinate units to allow beyond `[0, extent]`. Defaults to 0.
 */
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

// ─── Degenerate geometry ──────────────────────────────────────────────────────

/**
 * Returns a `DEGENERATE_LINE` issue for any LineString part with fewer than
 * two unique points, and a `DEGENERATE_POLYGON` issue for any Polygon ring
 * with fewer than four raw points or fewer than three unique vertices.
 *
 * Also returns `EMPTY_GEOMETRY` if the feature carries no geometry at all.
 *
 * @param feature - The decoded MVT feature to inspect.
 */
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

// ─── Unclosed rings ───────────────────────────────────────────────────────────

/**
 * Returns an `UNCLOSED_RING` issue for every Polygon ring whose first and last
 * vertices are not identical.
 *
 * Only applies to Polygon features (`feature.type === 3`).  LineStrings are
 * permitted to be open or closed; this check does not apply to them.
 *
 * @param feature - The decoded MVT feature to inspect.
 */
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

// ─── Zero-area rings ──────────────────────────────────────────────────────────

/**
 * Returns a `ZERO_AREA_RING` issue for every Polygon ring whose signed shoelace
 * area is exactly zero.
 *
 * A zero-area ring collapses to a line or a point and is not renderable as a
 * polygon.  Only applies to Polygon features (`feature.type === 3`).
 *
 * @param feature - The decoded MVT feature to inspect.
 */
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

// ─── Self-intersection ────────────────────────────────────────────────────────

/**
 * Returns one `SELF_INTERSECTION` issue per ring that contains at least one pair
 * of non-adjacent, non-closure segments that cross or touch.
 *
 * Applies to LineString (`feature.type === 2`) and Polygon (`feature.type === 3`)
 * features.  Point features are ignored.
 *
 * ### Algorithm (v0.5.2 hardening)
 *
 * The core detection uses an O(N²) orientation-based segment-pair comparator
 * (`segmentsIntersect`).  Four targeted guards reduce both false positives and
 * runtime cost without introducing any false negatives:
 *
 * **Guard 1 — Minimum-vertex guard**
 * Rings with fewer than 4 vertices cannot yield a non-adjacent, non-closure
 * segment pair.  They are skipped before entering the O(N²) loop.
 *
 * **Guard 2 — Closed-LineString closure skip**
 * A LineString whose first vertex equals its last vertex (a closed loop) is
 * treated as closed: `seg[0]` vs `seg[segCount-1]` are logically adjacent at
 * the closing point and are not compared.  Without this guard, every valid
 * boundary loop in the `boundary` layer would be spuriously flagged (Cat B2 in
 * the Phase 2 root-cause investigation: 282 / 619 diagnostics, 45.6%).
 *
 * **Guard 3 — Duplicate-vertex spike skip**
 * Tile compilers quantize floating-point geographic coordinates to the integer
 * grid.  When two adjacent real-world points round to the same integer, the ring
 * visits that grid point twice, creating a hairpin spike.  The two non-adjacent
 * segments that meet at the duplicated vertex would otherwise be flagged as
 * intersecting.  A one-pass O(N) pre-scan identifies all non-closing duplicate
 * vertices; segment pairs whose only contact is such a vertex are then skipped.
 * (Cat A: 161 / 619 diagnostics, 26.0%.)
 *
 * **Guard 4 — Bounding-box pre-check**
 * Before calling the full orientation test, the axis-aligned bounding boxes of
 * the two candidate segments are compared.  Disjoint boxes cannot intersect.
 * On production corpora this rejects ~99.97% of pairs, reducing the effective
 * cost of the loop from O(N²) to near-O(N).
 *
 * ### False-positive reduction (Phase 2 corpus, 294 tiles)
 * | Guard | FP eliminated | Cumulative FP reduction |
 * | :---- | ----: | ----: |
 * | Closed-LS closure skip | 288 | 46.5% |
 * | Duplicate-vertex spike skip | 161 | 26.0% |
 * | **Combined** | **449** | **72.5%** |
 *
 * True positives (170 genuine crossings + 6 collinear overlaps) are unaffected.
 *
 * @param feature - The decoded MVT feature to inspect.
 * @returns A list of `SELF_INTERSECTION` issues, at most one per ring.
 */
export function findSelfIntersectionIssues(feature: VectorTileFeature): readonly GeometryIssue[] {
  if (feature.type !== 2 && feature.type !== 3) return [];

  const issues: GeometryIssue[] = [];
  const parts = getFeatureParts(feature);

  for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
    const points = parts[partIndex]!;

    // Guard 1: minimum-vertex guard.
    // A ring with fewer than 4 vertices has at most 3 segments (segCount ≤ 3).
    // After the adjacency skip (|i−j| ≤ 1) and the closure skip (i=0, j=segCount−1),
    // no segment pair remains to check.  Skip entirely to avoid empty-loop overhead.
    if (points.length < 4) continue;

    // Guard 2: closed-LineString closure skip.
    // For Polygon rings (type === 3), `closed` is already true; the inner loop skips
    // the (0, segCount−1) pair because the closing segments are logically adjacent.
    // A LineString with first === last is topologically equivalent and must receive
    // the same treatment — otherwise every valid closed boundary loop is flagged.
    const firstPt = points[0]!;
    const lastPt = points[points.length - 1]!;
    const isClosedLineString =
      feature.type === 2 && firstPt.x === lastPt.x && firstPt.y === lastPt.y;
    const closed = feature.type === 3 || isClosedLineString;

    // Guard 3: duplicate-vertex spike skip (pre-scan).
    // Collect all non-closing duplicate vertex keys before the O(N²) loop.
    // The inner loop will skip any segment pair whose only intersection is one of
    // these duplicated grid points (see findFirstSelfIntersection below).
    const duplicateVertices = collectDuplicateVertices(points, closed);

    const issue = findFirstSelfIntersection(points, closed, partIndex, duplicateVertices);
    if (issue !== undefined) issues.push(issue);
  }

  return issues;
}

// ─── Public math utilities ────────────────────────────────────────────────────

/**
 * Returns the number of distinct `(x, y)` pairs in `points`.
 * Used by degenerate-geometry detection to distinguish collapsed rings from
 * valid ones.
 */
export function uniquePointCount(points: readonly Point[]): number {
  return new Set(points.map((point) => `${point.x},${point.y}`)).size;
}

/**
 * Computes the signed area of a ring using the shoelace formula.
 *
 * A positive result indicates a counter-clockwise winding order; negative
 * indicates clockwise.  A result of zero means the ring is degenerate (collinear
 * or otherwise has no enclosed area).
 *
 * The ring does not need to be explicitly closed (first === last) — the formula
 * works correctly on both open and closed representations.
 */
export function signedArea(points: readonly Point[]): number {
  let area = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]!;
    const next = points[index + 1]!;
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

/**
 * Returns `true` if segments AB and CD intersect (properly or at an endpoint).
 *
 * Uses the standard orientation-based algorithm:
 *   - **Proper crossing**: the endpoints of AB lie on opposite sides of line CD,
 *     and vice versa.
 *   - **Collinear / degenerate**: one endpoint is collinear with the opposite
 *     segment and lies within its bounding range.
 *
 * All arithmetic is exact integer math — no floating-point tolerance is applied.
 * This means that a point lying exactly on a segment (e.g., a vertex of one
 * segment coinciding with an interior point of another) is treated as an
 * intersection.  Callers are responsible for filtering cases where this behaviour
 * produces false positives (see `collectDuplicateVertices` and Guard 3 above).
 */
export function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  // General case: endpoints strictly straddle each other's segment.
  if (o1 !== o2 && o3 !== o4) return true;

  // Collinear / degenerate cases: one endpoint lies on the opposite segment.
  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;

  return false;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Scans the ring once (O(N)) and returns the set of vertex keys (`"x,y"`) that
 * appear more than once, excluding the mandatory start-equals-end closing pair
 * of closed rings.
 *
 * These are integer-grid collisions produced by floating-point quantization
 * during tile compilation (Guard 3 pre-scan).  They must not be treated as
 * genuine self-intersections.
 *
 * @param points - The full vertex list of a single ring, including the closing
 *                 vertex for closed rings.
 * @param closed - Whether the ring is closed (first vertex === last vertex).
 *                 When `true`, the coincidence of index 0 and the last index is
 *                 excluded from the duplicate set.
 */
function collectDuplicateVertices(points: readonly Point[], closed: boolean): Set<string> {
  const seen = new Map<string, number>(); // vertex key → first occurrence index
  const duplicates = new Set<string>();
  const lastIndex = points.length - 1;

  for (let i = 0; i < points.length; i += 1) {
    const p = points[i]!;
    const key = `${p.x},${p.y}`;

    if (seen.has(key)) {
      // The start==end closing pair is structurally required for closed rings and
      // must never be classified as a duplicate — it is not a quantization artefact.
      const firstOccurrence = seen.get(key)!;
      if (closed && firstOccurrence === 0 && i === lastIndex) continue;
      duplicates.add(key);
    } else {
      seen.set(key, i);
    }
  }

  return duplicates;
}

/**
 * Finds the first self-intersecting segment pair in a ring, applying all four
 * performance and correctness guards.
 *
 * Returns the first issue found (one per ring), or `undefined` if the ring is
 * geometrically simple.
 *
 * @param points            - The full vertex list, including the closing vertex.
 * @param closed            - Whether the first-vs-last-segment closure skip applies.
 * @param partIndex         - The ring's part index within the feature (for the issue).
 * @param duplicateVertices - Non-closing duplicate vertex keys to skip (Guard 3).
 */
function findFirstSelfIntersection(
  points: readonly Point[],
  closed: boolean,
  partIndex: number,
  duplicateVertices: Set<string>,
): GeometryIssue | undefined {
  const segmentCount = points.length - 1;

  for (let first = 0; first < segmentCount; first += 1) {
    const a = points[first]!;
    const b = points[first + 1]!;

    // Guard 4 (outer): precompute the AABB of segment AB once and reuse it
    // across all inner iterations, amortising the min/max cost.
    const aMinX = Math.min(a.x, b.x);
    const aMaxX = Math.max(a.x, b.x);
    const aMinY = Math.min(a.y, b.y);
    const aMaxY = Math.max(a.y, b.y);

    for (let second = first + 1; second < segmentCount; second += 1) {
      // Skip segment pairs that are topologically adjacent (share a vertex by
      // construction) — they will always intersect at their shared endpoint.
      if (Math.abs(first - second) <= 1) continue;

      // Guard 2: skip the (0, segCount−1) pair for closed rings.  These two
      // segments are adjacent at the closing vertex and their contact is not a
      // self-intersection.
      if (closed && first === 0 && second === segmentCount - 1) continue;

      const c = points[second]!;
      const d = points[second + 1]!;

      // Guard 4 (inner): reject immediately if the bounding boxes of AB and CD
      // are disjoint.  Two segments with non-overlapping AABBs cannot intersect.
      // This check eliminates ~99.97% of pairs on production corpora, reducing
      // the effective loop cost from O(N²) to near-O(N).
      if (
        aMinX > Math.max(c.x, d.x) ||
        aMaxX < Math.min(c.x, d.x) ||
        aMinY > Math.max(c.y, d.y) ||
        aMaxY < Math.min(c.y, d.y)
      ) {
        continue;
      }

      // Guard 3: skip pairs whose only contact is a known non-closing duplicate
      // vertex.  Such a vertex is an integer-grid collision produced by tile
      // compilation quantization, not a genuine self-intersection.
      if (duplicateVertices.size > 0) {
        const aKey = `${a.x},${a.y}`;
        const bKey = `${b.x},${b.y}`;
        const cKey = `${c.x},${c.y}`;
        const dKey = `${d.x},${d.y}`;
        if (
          (duplicateVertices.has(bKey) && (bKey === cKey || bKey === dKey)) ||
          (duplicateVertices.has(aKey) && (aKey === cKey || aKey === dKey)) ||
          (duplicateVertices.has(cKey) && (cKey === aKey || cKey === bKey)) ||
          (duplicateVertices.has(dKey) && (dKey === aKey || dKey === bKey))
        ) {
          continue;
        }
      }

      if (segmentsIntersect(a, b, c, d)) {
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

/**
 * Returns the orientation of the ordered triple (a, b, c):
 *   - `0` — collinear
 *   - `1` — clockwise
 *   - `2` — counter-clockwise
 *
 * Uses exact integer cross-product arithmetic.  No floating-point rounding occurs.
 */
function orientation(a: Point, b: Point, c: Point): 0 | 1 | 2 {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (value === 0) return 0;
  return value > 0 ? 1 : 2;
}

/**
 * Returns `true` if point `b` lies on segment AC (inclusive of endpoints),
 * assuming that `a`, `b`, `c` are already known to be collinear.
 *
 * The test is a simple axis-aligned bounding-box containment check — valid
 * only when collinearity has already been confirmed by `orientation`.
 */
function onSegment(a: Point, b: Point, c: Point): boolean {
  return (
    b.x <= Math.max(a.x, c.x) &&
    b.x >= Math.min(a.x, c.x) &&
    b.y <= Math.max(a.y, c.y) &&
    b.y >= Math.min(a.y, c.y)
  );
}
