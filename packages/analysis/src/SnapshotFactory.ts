/**
 * @tileguard/analysis — SnapshotFactory
 *
 * Creates TileSnapshot objects from raw tile data.
 * No InspectorStore dependency — operates on plain data.
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

export interface RawLayerData {
  readonly name: string;
  readonly extent: number;
  readonly features: readonly RawFeatureData[];
}

export interface RawFeatureData {
  readonly id?: number | string;
  readonly geometryType: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly geometry: readonly (readonly {
    readonly x: number;
    readonly y: number;
  }[])[];
}

// ---------------------------------------------------------------------------
// Factory interface
// ---------------------------------------------------------------------------

export interface SnapshotFactory {
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
