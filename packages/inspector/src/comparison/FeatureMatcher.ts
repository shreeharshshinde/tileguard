/**
 * @tileguard/inspector — FeatureMatcher (Milestone 7 — Step 1)
 *
 * Matches features between two tile snapshots using a 4-priority cascade:
 *
 *   Priority 1 — ID match:
 *     If both features have a defined id and they are equal,
 *     the match is definitive. No heuristic scoring needed.
 *
 *   Priority 2 — Stable property match:
 *     Properties known to be stable external identifiers
 *     (osm_id, building_id, road_id, gid, fid, object_id, feature_id, uuid)
 *     are compared. A hit on any one stable property produces a match.
 *
 *   Priority 3 — Geometry similarity:
 *     Bounding box overlap ratio, centroid proximity, and geometry type
 *     agreement are combined into a similarity score [0, 1]. Best candidate
 *     above threshold 0.7 wins.
 *
 *   Priority 4 — Property similarity score:
 *     Shared keys / total keys ratio (Jaccard index) weighted by matching
 *     values. Best candidate above threshold 0.5 wins.
 *
 * Matching is greedy: each feature from A is matched to at most one feature
 * from B, and vice versa. Once matched, both are removed from the candidate
 * pool. Order of processing: all priority-1 matches first, then priority-2,
 * then priority-3, then priority-4, then remaining as added/removed.
 *
 * Determinism: when two candidates tie on score, the one with the lower
 * featureIndex is preferred to make results stable regardless of tile
 * iteration order.
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs.
 */

import type { FeatureComparison, FeatureSnapshot } from './models.js';

// ---------------------------------------------------------------------------
// Stable property names treated as external identifiers (Priority 2)
// ---------------------------------------------------------------------------

const STABLE_PROPERTY_NAMES: ReadonlySet<string> = new Set([
  'osm_id',
  'osm:id',
  '@id',
  'building_id',
  'road_id',
  'gid',
  'fid',
  'objectid',
  'object_id',
  'feature_id',
  'uuid',
  'id',
  'ref',
]);

// ---------------------------------------------------------------------------
// Internal geometry helpers
// ---------------------------------------------------------------------------

type RingArray = readonly (readonly {
  readonly x: number;
  readonly y: number;
}[])[];

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function computeBoundsFromGeometry(geometry: RingArray): Bounds {
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
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

function computeCentroidFromGeometry(geometry: RingArray): {
  x: number;
  y: number;
} {
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
 * Intersection-over-Union for two bounding boxes.
 * Returns 0 if they don't overlap, 1 if identical.
 */
function boundsIoU(a: Bounds, b: Bounds): number {
  const interMinX = Math.max(a.minX, b.minX);
  const interMinY = Math.max(a.minY, b.minY);
  const interMaxX = Math.min(a.maxX, b.maxX);
  const interMaxY = Math.min(a.maxY, b.maxY);

  if (interMaxX <= interMinX || interMaxY <= interMinY) return 0;

  const interArea = (interMaxX - interMinX) * (interMaxY - interMinY);
  const areaA = (a.maxX - a.minX) * (a.maxY - a.minY);
  const areaB = (b.maxX - b.minX) * (b.maxY - b.minY);
  const unionArea = areaA + areaB - interArea;

  if (unionArea <= 0) return 0;
  return interArea / unionArea;
}

/**
 * Geometry similarity score [0, 1] combining:
 *   - Bounding box IoU (weight 0.5)
 *   - Centroid proximity normalised to tile extent (weight 0.3)
 *   - Geometry type match (weight 0.2)
 */
function geometrySimilarity(a: FeatureSnapshot, b: FeatureSnapshot): number {
  const geoA = a.geometry as RingArray;
  const geoB = b.geometry as RingArray;

  const boundsA = computeBoundsFromGeometry(geoA);
  const boundsB = computeBoundsFromGeometry(geoB);
  const iou = boundsIoU(boundsA, boundsB);

  const centroidA = computeCentroidFromGeometry(geoA);
  const centroidB = computeCentroidFromGeometry(geoB);
  const centroidDist = Math.sqrt(
    (centroidA.x - centroidB.x) ** 2 + (centroidA.y - centroidB.y) ** 2,
  );
  // Normalise distance by tile extent (4096 diagonal ≈ 5793)
  const proximityScore = Math.max(0, 1 - centroidDist / 5793);

  const typeScore = a.geometryType === b.geometryType ? 1 : 0;

  return iou * 0.5 + proximityScore * 0.3 + typeScore * 0.2;
}

/**
 * Property similarity score [0, 1]:
 *   Jaccard index on key sets, boosted when values match.
 */
function propertySimilarity(a: FeatureSnapshot, b: FeatureSnapshot): number {
  const keysA = new Set(Object.keys(a.properties));
  const keysB = new Set(Object.keys(b.properties));

  const unionSize = new Set([...keysA, ...keysB]).size;
  if (unionSize === 0) return 0;

  let matchingKeys = 0;
  let matchingValues = 0;

  for (const key of keysA) {
    if (keysB.has(key)) {
      matchingKeys++;
      try {
        if (
          JSON.stringify(a.properties[key]) ===
          JSON.stringify(b.properties[key])
        ) {
          matchingValues++;
        }
      } catch {
        // non-serialisable — count key match only
      }
    }
  }

  const jaccard = matchingKeys / unionSize;
  const valueBonus =
    matchingKeys > 0 ? (matchingValues / matchingKeys) * 0.3 : 0;

  return Math.min(1, jaccard + valueBonus);
}

// ---------------------------------------------------------------------------
// FeatureMatcher Interface
// ---------------------------------------------------------------------------

export interface FeatureMatchResult {
  /** All feature comparisons (matched + unmatched). */
  readonly comparisons: readonly FeatureComparison[];
}

export interface FeatureMatcher {
  /**
   * Match features from snapshot A against features from snapshot B.
   * Returns an array of FeatureComparison results covering every feature
   * from both snapshots.
   */
  match(
    featuresA: readonly FeatureSnapshot[],
    featuresB: readonly FeatureSnapshot[],
  ): FeatureMatchResult;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class FeatureMatcherImpl implements FeatureMatcher {
  // Geometry similarity threshold for Priority 3
  private static readonly GEO_THRESHOLD = 0.7;
  // Property similarity threshold for Priority 4
  private static readonly PROP_THRESHOLD = 0.5;

  match(
    featuresA: readonly FeatureSnapshot[],
    featuresB: readonly FeatureSnapshot[],
  ): FeatureMatchResult {
    const comparisons: FeatureComparison[] = [];

    // Track unmatched indices (working with indices into the original arrays)
    const unmatchedA = new Set(featuresA.map((_, i) => i));
    const unmatchedB = new Set(featuresB.map((_, i) => i));

    // Helper: consume a match
    const recordMatch = (
      idxA: number,
      idxB: number,
      priority: 1 | 2 | 3 | 4,
    ) => {
      const featureA = featuresA[idxA]!;
      const featureB = featuresB[idxB]!;

      // Determine whether geometry/properties changed
      const geoChanged = !this._geometryEqual(featureA, featureB);
      const propsChanged = !this._propertiesEqual(featureA, featureB);
      const diagnosticsChanged = false; // filled in by ComparisonService

      const unchanged = !geoChanged && !propsChanged;
      const kind = unchanged ? ('unchanged' as const) : ('modified' as const);

      comparisons.push(
        Object.freeze({
          kind,
          featureA,
          featureB,
          changes: Object.freeze({
            geometryChanged: geoChanged,
            propertiesChanged: propsChanged,
            diagnosticsChanged,
          }),
          matchPriority: priority,
        }),
      );

      unmatchedA.delete(idxA);
      unmatchedB.delete(idxB);
    };

    // ── Priority 1: ID match ─────────────────────────────────────────────
    const indexedByIdB = this._buildIdIndex(featuresB, unmatchedB);
    const toRemoveA: number[] = [];

    for (const idxA of unmatchedA) {
      const fa = featuresA[idxA]!;
      if (fa.id === undefined) continue;

      const idKey = String(fa.id);
      const idxB = indexedByIdB.get(idKey);
      if (idxB !== undefined && unmatchedB.has(idxB)) {
        toRemoveA.push(idxA);
        recordMatch(idxA, idxB, 1);
        indexedByIdB.delete(idKey);
      }
    }

    // ── Priority 2: Stable property match ───────────────────────────────
    for (const idxA of unmatchedA) {
      const fa = featuresA[idxA]!;
      let matched = false;

      for (const idxB of unmatchedB) {
        const fb = featuresB[idxB]!;
        if (this._stablePropertyMatch(fa, fb)) {
          recordMatch(idxA, idxB, 2);
          matched = true;
          break;
        }
      }

      if (matched) {
        // Snapshot of remaining for next priorities is handled by unmatchedA/B sets
      }
    }

    // ── Priority 3: Geometry similarity ─────────────────────────────────
    for (const idxA of [...unmatchedA]) {
      const fa = featuresA[idxA]!;
      let bestScore = FeatureMatcherImpl.GEO_THRESHOLD;
      let bestIdxB = -1;

      for (const idxB of unmatchedB) {
        const fb = featuresB[idxB]!;
        // Quick type filter: skip if types are completely different and geometry is empty
        const score = geometrySimilarity(fa, fb);
        if (score > bestScore || (score === bestScore && idxB < bestIdxB)) {
          bestScore = score;
          bestIdxB = idxB;
        }
      }

      if (bestIdxB !== -1) {
        recordMatch(idxA, bestIdxB, 3);
      }
    }

    // ── Priority 4: Property similarity ─────────────────────────────────
    for (const idxA of [...unmatchedA]) {
      const fa = featuresA[idxA]!;
      let bestScore = FeatureMatcherImpl.PROP_THRESHOLD;
      let bestIdxB = -1;

      for (const idxB of unmatchedB) {
        const fb = featuresB[idxB]!;
        const score = propertySimilarity(fa, fb);
        if (score > bestScore || (score === bestScore && idxB < bestIdxB)) {
          bestScore = score;
          bestIdxB = idxB;
        }
      }

      if (bestIdxB !== -1) {
        recordMatch(idxA, bestIdxB, 4);
      }
    }

    // ── Remaining in A → removed ─────────────────────────────────────────
    for (const idxA of unmatchedA) {
      comparisons.push(
        Object.freeze({
          kind: 'removed' as const,
          featureA: featuresA[idxA]!,
          featureB: null,
          changes: null,
          matchPriority: null,
        }),
      );
    }

    // ── Remaining in B → added ───────────────────────────────────────────
    for (const idxB of unmatchedB) {
      comparisons.push(
        Object.freeze({
          kind: 'added' as const,
          featureA: null,
          featureB: featuresB[idxB]!,
          changes: null,
          matchPriority: null,
        }),
      );
    }

    return Object.freeze({ comparisons: Object.freeze(comparisons) });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _buildIdIndex(
    features: readonly FeatureSnapshot[],
    available: Set<number>,
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (const idx of available) {
      const f = features[idx];
      if (f?.id !== undefined) {
        const key = String(f.id);
        // First occurrence wins (lower index)
        if (!map.has(key)) {
          map.set(key, idx);
        }
      }
    }
    return map;
  }

  private _stablePropertyMatch(
    a: FeatureSnapshot,
    b: FeatureSnapshot,
  ): boolean {
    for (const propName of STABLE_PROPERTY_NAMES) {
      const valA = a.properties[propName];
      const valB = b.properties[propName];
      if (valA !== undefined && valB !== undefined) {
        try {
          if (JSON.stringify(valA) === JSON.stringify(valB)) return true;
        } catch {
          if (valA === valB) return true;
        }
      }
    }
    return false;
  }

  private _geometryEqual(a: FeatureSnapshot, b: FeatureSnapshot): boolean {
    if (a.geometryType !== b.geometryType) return false;
    const gA = a.geometry as RingArray;
    const gB = b.geometry as RingArray;
    if (gA.length !== gB.length) return false;
    for (let i = 0; i < gA.length; i++) {
      const rA = gA[i]!;
      const rB = gB[i]!;
      if (rA.length !== rB.length) return false;
      for (let j = 0; j < rA.length; j++) {
        const pA = rA[j]!;
        const pB = rB[j]!;
        if (pA.x !== pB.x || pA.y !== pB.y) return false;
      }
    }
    return true;
  }

  private _propertiesEqual(a: FeatureSnapshot, b: FeatureSnapshot): boolean {
    try {
      return JSON.stringify(a.properties) === JSON.stringify(b.properties);
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a FeatureMatcher instance.
 *
 * @example
 *   const matcher = createFeatureMatcher();
 *   const { comparisons } = matcher.match(snapshotA.features, snapshotB.features);
 *   const modified = comparisons.filter(c => c.kind === 'modified');
 */
export function createFeatureMatcher(): FeatureMatcher {
  return new FeatureMatcherImpl();
}
