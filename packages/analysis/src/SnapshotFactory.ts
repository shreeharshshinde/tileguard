/**
 * @tileguard/analysis — SnapshotFactory
 *
 * Creates immutable TileSnapshot objects from raw decoded tile data.
 * Snapshots are the input format for the ComparisonEngine — they represent
 * a frozen capture of tile state at a point in time.
 *
 * The factory computes derived statistics (feature counts, geometry distribution,
 * diagnostic summaries) during snapshot creation so that downstream consumers
 * can access them without re-computation.
 *
 * @example
 * ```ts
 * import { createSnapshotFactory } from '@tileguard/analysis';
 *
 * const factory = createSnapshotFactory();
 * const snapshot = factory.createSnapshot('./tile.pbf', layers, diagnostics);
 *
 * console.log(snapshot.statistics.totalFeatures);
 * console.log(snapshot.features.length);
 * ```
 */

import type { Diagnostic } from '@tileguard/core';
import type {
  FeatureSnapshot,
  LayerSnapshot,
  TileSnapshot,
} from './models/comparison.js';
import type { LayerStatistics, TileStatistics } from './models/statistics.js';

// ---------------------------------------------------------------------------
// Input types (callers provide these)
// ---------------------------------------------------------------------------

/**
 * Raw layer data provided to the snapshot factory.
 *
 * This is the minimal structure needed to create a TileSnapshot.
 * Typically obtained from the tile provider's decode output.
 */
export interface RawLayerData {
  /** Layer name. */
  readonly name: string;
  /** Coordinate extent for this layer. */
  readonly extent: number;
  /** All features in this layer. */
  readonly features: readonly RawFeatureData[];
}

/**
 * Raw feature data provided to the snapshot factory.
 *
 * Represents a single decoded feature before snapshot creation.
 */
export interface RawFeatureData {
  /** Optional feature ID from the MVT encoding. */
  readonly id?: number | string;
  /** Geometry type string (e.g., "Point", "Polygon"). */
  readonly geometryType: string;
  /** Feature properties. */
  readonly properties: Readonly<Record<string, unknown>>;
  /** Decoded geometry as arrays of coordinate arrays. */
  readonly geometry: readonly (readonly {
    readonly x: number;
    readonly y: number;
  }[])[];
}

// ---------------------------------------------------------------------------
// Factory interface
// ---------------------------------------------------------------------------

/**
 * A factory that creates immutable TileSnapshot objects from raw data.
 *
 * Created via {@link createSnapshotFactory}.
 */
export interface SnapshotFactory {
  /**
   * Creates an immutable tile snapshot from raw layer data and diagnostics.
   *
   * @param filePath - The file path or URL identifying this tile.
   * @param layers - Raw decoded layer data.
   * @param diagnostics - Diagnostics produced during validation of this tile.
   * @returns A frozen TileSnapshot ready for comparison.
   */
  createSnapshot(
    filePath: string,
    layers: readonly RawLayerData[],
    diagnostics: readonly Diagnostic[],
  ): TileSnapshot;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createSnapshotFactory(): SnapshotFactory {
  return { createSnapshot };
}

function createSnapshot(
  filePath: string,
  layers: readonly RawLayerData[],
  diagnostics: readonly Diagnostic[],
): TileSnapshot {
  // Build LayerSnapshots
  const layerSnapshots: LayerSnapshot[] = layers.map((layer) => {
    const geomCounts = { point: 0, line: 0, polygon: 0 };
    for (const f of layer.features) {
      const t = f.geometryType.toLowerCase();
      if (t === 'point' || t.includes('point')) geomCounts.point++;
      else if (t === 'linestring' || t.includes('line')) geomCounts.line++;
      else geomCounts.polygon++;
    }
    return Object.freeze({
      name: layer.name,
      featureCount: layer.features.length,
      geometryCounts: Object.freeze({ ...geomCounts }),
      extent: layer.extent,
    });
  });

  // Build FeatureSnapshots
  const featureSnapshots: FeatureSnapshot[] = [];
  for (const layer of layers) {
    for (let i = 0; i < layer.features.length; i++) {
      const f = layer.features[i]!;
      featureSnapshots.push(
        Object.freeze({
          layerName: layer.name,
          featureIndex: i,
          id: f.id,
          geometryType: f.geometryType,
          properties: Object.freeze({ ...f.properties }),
          geometry: Object.freeze(
            f.geometry.map((ring) => Object.freeze([...ring])),
          ),
        }),
      );
    }
  }

  // Build statistics
  const diagsByLayer = new Map<string, number>();
  let diagErrors = 0,
    diagWarnings = 0,
    diagInfo = 0;
  for (const d of diagnostics) {
    const loc = d.location as { layer?: string } | undefined;
    if (loc?.layer) {
      diagsByLayer.set(loc.layer, (diagsByLayer.get(loc.layer) ?? 0) + 1);
    }
    if (d.severity === 'error') diagErrors++;
    else if (d.severity === 'warning') diagWarnings++;
    else diagInfo++;
  }

  let totalPoint = 0,
    totalLine = 0,
    totalPolygon = 0;
  for (const ls of layerSnapshots) {
    totalPoint += ls.geometryCounts.point;
    totalLine += ls.geometryCounts.line;
    totalPolygon += ls.geometryCounts.polygon;
  }

  const layerStats: LayerStatistics[] = layerSnapshots.map((ls) =>
    Object.freeze({
      name: ls.name,
      featureCount: ls.featureCount,
      geometryCounts: ls.geometryCounts,
      diagnosticCount: diagsByLayer.get(ls.name) ?? 0,
    }),
  );

  const statistics: TileStatistics = Object.freeze({
    totalLayers: layerSnapshots.length,
    totalFeatures: featureSnapshots.length,
    geometryCounts: Object.freeze({
      point: totalPoint,
      line: totalLine,
      polygon: totalPolygon,
    }),
    diagnostics: Object.freeze({
      errors: diagErrors,
      warnings: diagWarnings,
      info: diagInfo,
    }),
    layers: Object.freeze(layerStats),
  });

  return Object.freeze({
    filePath,
    statistics,
    layers: Object.freeze(layerSnapshots),
    diagnostics: Object.freeze([...diagnostics]),
    features: Object.freeze(featureSnapshots),
  });
}
