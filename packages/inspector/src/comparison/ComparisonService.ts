/**
 * @tileguard/inspector — ComparisonService (Milestone 7 — Step 1)
 *
 * Inspector-specific adapter that:
 *   1. createSnapshot(store) — extracts TileSnapshot from InspectorStore
 *   2. compare() — delegates to @tileguard/analysis ComparisonEngine
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs.
 */

import {
  createComparisonEngine,
  type TileComparison,
  type TileSnapshot,
  type FeatureSnapshot,
  type LayerSnapshot,
} from '@tileguard/analysis';
import type { TileStatistics, LayerStatistics } from '@tileguard/analysis';
import type { InspectorStore } from '../store/inspector-store.js';

// ---------------------------------------------------------------------------
// ComparisonService Interface
// ---------------------------------------------------------------------------

export interface ComparisonService {
  createSnapshot(store: InspectorStore): TileSnapshot | null;
  compare(snapshotA: TileSnapshot, snapshotB: TileSnapshot): TileComparison;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createComparisonService(): ComparisonService {
  const engine = createComparisonEngine();
  return new ComparisonServiceImpl(engine);
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class ComparisonServiceImpl implements ComparisonService {
  private readonly _engine: ReturnType<typeof createComparisonEngine>;

  constructor(engine: ReturnType<typeof createComparisonEngine>) {
    this._engine = engine;
  }

  createSnapshot(store: InspectorStore): TileSnapshot | null {
    const { lifecycle } = store;
    if (lifecycle.status !== 'loaded') return null;

    const { artifact, diagnostics, filePath } = lifecycle;

    // Build LayerSnapshots
    const allLayers = artifact.content.layers as unknown as Record<
      string,
      {
        name: string;
        extent: number;
        features: Array<{
          id?: number | string;
          geometryType: string;
          properties: Record<string, unknown>;
          geometry: unknown;
        }>;
      }
    >;

    const layerSnapshots: LayerSnapshot[] = Object.values(allLayers).map(
      (layer) => {
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
      },
    );

    // Build FeatureSnapshots
    const featureSnapshots: FeatureSnapshot[] = [];
    for (const [, layer] of Object.entries(allLayers)) {
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
              (f.geometry as readonly (readonly { x: number; y: number }[])[]).map(
                (ring) => Object.freeze([...ring]),
              ),
            ),
          }),
        );
      }
    }

    // Build statistics
    const diagsByLayer = new Map<string, number>();
    let diagErrors = 0, diagWarnings = 0, diagInfo = 0;
    for (const d of diagnostics) {
      const loc = d.location as { layer?: string } | undefined;
      if (loc?.layer) {
        diagsByLayer.set(loc.layer, (diagsByLayer.get(loc.layer) ?? 0) + 1);
      }
      if (d.severity === 'error') diagErrors++;
      else if (d.severity === 'warning') diagWarnings++;
      else diagInfo++;
    }

    let totalPoint = 0, totalLine = 0, totalPolygon = 0;
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
      geometryCounts: Object.freeze({ point: totalPoint, line: totalLine, polygon: totalPolygon }),
      diagnostics: Object.freeze({ errors: diagErrors, warnings: diagWarnings, info: diagInfo }),
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

  compare(snapshotA: TileSnapshot, snapshotB: TileSnapshot): TileComparison {
    return this._engine.compare(snapshotA, snapshotB);
  }
}
