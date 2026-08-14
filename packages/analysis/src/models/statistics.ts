/**
 * @tileguard/analysis — Tile Statistics Model
 *
 * Aggregate statistics about a decoded vector tile. Computed once during
 * snapshot creation and used for comparison summaries, report generation,
 * and regression analysis.
 */

/**
 * Statistics for a single layer within a tile.
 */
export interface LayerStatistics {
  /** Layer name. */
  readonly name: string;
  /** Total number of features in this layer. */
  readonly featureCount: number;
  /** Feature counts broken down by geometry type. */
  readonly geometryCounts: {
    readonly point: number;
    readonly line: number;
    readonly polygon: number;
  };
  /** Number of diagnostics produced for features in this layer. */
  readonly diagnosticCount: number;
}

/**
 * Aggregate statistics for an entire tile.
 *
 * Used for comparison delta computation (before vs. after) and
 * report dashboard generation.
 */
export interface TileStatistics {
  /** Total number of layers in the tile. */
  readonly totalLayers: number;
  /** Total number of features across all layers. */
  readonly totalFeatures: number;
  /** Aggregate feature counts by geometry type. */
  readonly geometryCounts: {
    readonly point: number;
    readonly line: number;
    readonly polygon: number;
  };
  /** Aggregate diagnostic counts by severity. */
  readonly diagnostics: {
    readonly errors: number;
    readonly warnings: number;
    readonly info: number;
  };
  /** Per-layer statistics, in declaration order. */
  readonly layers: readonly LayerStatistics[];
}

/**
 * Sentinel value representing a tile with no data.
 * Used as the default when a snapshot has not yet been loaded.
 */
export const EMPTY_TILE_STATISTICS: TileStatistics = Object.freeze({
  totalLayers: 0,
  totalFeatures: 0,
  geometryCounts: Object.freeze({ point: 0, line: 0, polygon: 0 }),
  diagnostics: Object.freeze({ errors: 0, warnings: 0, info: 0 }),
  layers: Object.freeze([]),
});
