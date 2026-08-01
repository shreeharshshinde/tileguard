/**
 * @tileguard/inspector — SpatialIndex (Milestone 6 — Step 4)
 *
 * Grid-based spatial index for fast hover and selection candidate lookup.
 *
 * Algorithm:
 *   - Divide tile space into a uniform N×N grid of cells.
 *   - On build(), insert each feature's bounding box into every overlapping cell.
 *   - On query(point), return all feature refs from the cell containing the point,
 *     deduplicated. The caller (HitTester) then performs precise geometry testing.
 *
 * This reduces hit-testing from O(all_features) to O(features_in_cell), which
 * for typical tiles is a 10–100× speedup on large datasets.
 *
 * Boundary: Zero imports from renderer/, overlay/, React, or DOM APIs.
 * Only depends on geometry types (BoundingBox, TilePoint).
 */

import type { BoundingBox, TilePoint } from '../geometry/index.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Minimal feature reference stored in the index. */
export interface SpatialFeatureRef {
  readonly layerName: string;
  readonly featureIndex: number;
  readonly bounds: BoundingBox;
}

export interface SpatialIndex {
  /**
   * Build the index from a flat list of feature refs.
   * Replaces any previously built index.
   * O(n * cells_per_feature) where cells_per_feature ≪ total cells.
   */
  build(features: readonly SpatialFeatureRef[]): void;

  /**
   * Query candidate features near the given tile-space point.
   * Returns feature refs whose bounding box overlaps the cell containing the point.
   * Deduplicated — each ref appears at most once even if it spans multiple cells.
   */
  query(point: TilePoint): readonly SpatialFeatureRef[];

  /**
   * Query all features whose bounding box intersects the given region.
   * Useful for viewport culling.
   */
  queryRegion(region: BoundingBox): readonly SpatialFeatureRef[];

  /** Returns the number of indexed features. */
  readonly size: number;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class SpatialIndexImpl implements SpatialIndex {
  private readonly _gridSize: number;
  private readonly _cellSize: number;
  /** Cell index → array of feature refs. Sparse (undefined = empty cell). */
  private _cells: (SpatialFeatureRef[] | undefined)[];
  private _featureCount = 0;

  /**
   * @param gridSize  Number of cells per axis (default 32 → 32×32 = 1024 cells).
   * @param extent    Tile coordinate extent (default 4096).
   */
  constructor(
    gridSize = 32,
    private readonly _extent = 4096,
  ) {
    this._gridSize = gridSize;
    this._cellSize = _extent / gridSize;
    this._cells = new Array<SpatialFeatureRef[] | undefined>(
      gridSize * gridSize,
    );
  }

  get size(): number {
    return this._featureCount;
  }

  build(features: readonly SpatialFeatureRef[]): void {
    // Reset
    this._cells = new Array<SpatialFeatureRef[] | undefined>(
      this._gridSize * this._gridSize,
    );
    this._featureCount = features.length;

    for (const ref of features) {
      const { minCol, maxCol, minRow, maxRow } = this._boundsToGrid(ref.bounds);
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const idx = row * this._gridSize + col;
          if (this._cells[idx] === undefined) {
            this._cells[idx] = [];
          }
          (this._cells[idx] as SpatialFeatureRef[]).push(ref);
        }
      }
    }
  }

  query(point: TilePoint): readonly SpatialFeatureRef[] {
    const col = Math.floor(point.x / this._cellSize);
    const row = Math.floor(point.y / this._cellSize);
    const clampedCol = Math.max(0, Math.min(this._gridSize - 1, col));
    const clampedRow = Math.max(0, Math.min(this._gridSize - 1, row));
    const idx = clampedRow * this._gridSize + clampedCol;
    return this._cells[idx] ?? [];
  }

  queryRegion(region: BoundingBox): readonly SpatialFeatureRef[] {
    const { minCol, maxCol, minRow, maxRow } = this._boundsToGrid(region);
    const seen = new Set<string>();
    const result: SpatialFeatureRef[] = [];
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const idx = row * this._gridSize + col;
        const cell = this._cells[idx];
        if (cell === undefined) continue;
        for (const ref of cell) {
          const key = `${ref.layerName}:${ref.featureIndex}`;
          if (!seen.has(key)) {
            seen.add(key);
            result.push(ref);
          }
        }
      }
    }
    return result;
  }

  private _boundsToGrid(bounds: BoundingBox): {
    minCol: number;
    maxCol: number;
    minRow: number;
    maxRow: number;
  } {
    const minCol = Math.max(0, Math.floor(bounds.minX / this._cellSize));
    const maxCol = Math.min(
      this._gridSize - 1,
      Math.floor(bounds.maxX / this._cellSize),
    );
    const minRow = Math.max(0, Math.floor(bounds.minY / this._cellSize));
    const maxRow = Math.min(
      this._gridSize - 1,
      Math.floor(bounds.maxY / this._cellSize),
    );
    return { minCol, maxCol, minRow, maxRow };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a SpatialIndex using a uniform N×N grid.
 *
 * @param gridSize  Number of grid cells per axis (default 32).
 * @param extent    Tile coordinate extent (default 4096).
 *
 * @example
 *   const index = createSpatialIndex();
 *   index.build(featureRefs);
 *   const candidates = index.query({ x: 512, y: 512 });
 */
export function createSpatialIndex(gridSize = 32, extent = 4096): SpatialIndex {
  return new SpatialIndexImpl(gridSize, extent);
}
