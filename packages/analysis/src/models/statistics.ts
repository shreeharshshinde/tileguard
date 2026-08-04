/**
 * @tileguard/analysis — Tile Statistics Model
 */

export interface LayerStatistics {
  readonly name: string;
  readonly featureCount: number;
  readonly geometryCounts: {
    readonly point: number;
    readonly line: number;
    readonly polygon: number;
  };
  readonly diagnosticCount: number;
}

export interface TileStatistics {
  readonly totalLayers: number;
  readonly totalFeatures: number;
  readonly geometryCounts: {
    readonly point: number;
    readonly line: number;
    readonly polygon: number;
  };
  readonly diagnostics: {
    readonly errors: number;
    readonly warnings: number;
    readonly info: number;
  };
  readonly layers: readonly LayerStatistics[];
}

export const EMPTY_TILE_STATISTICS: TileStatistics = Object.freeze({
  totalLayers: 0,
  totalFeatures: 0,
  geometryCounts: Object.freeze({ point: 0, line: 0, polygon: 0 }),
  diagnostics: Object.freeze({ errors: 0, warnings: 0, info: 0 }),
  layers: Object.freeze([]),
});
