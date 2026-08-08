/**
 * @tileguard/inspector — StatisticsService (Milestone 6 — Step 3)
 *
 * Computes immutable tile statistics from the Provider layer.
 * Never reads InspectorStore directly.
 *
 * Boundary: Zero imports from renderer/, overlay/, viewport/, or DOM APIs.
 */

import type { LayerStatistics, TileStatistics } from '@tileguard/analysis';
import { EMPTY_TILE_STATISTICS } from '@tileguard/analysis';
import type { DiagnosticProvider } from '../providers/DiagnosticProvider.js';
import type { FeatureProvider } from '../providers/FeatureProvider.js';
import type { LayerProvider } from '../providers/LayerProvider.js';

// ---------------------------------------------------------------------------
// Public types (re-export for backward compatibility)
// ---------------------------------------------------------------------------

export type { LayerStatistics, TileStatistics } from '@tileguard/analysis';
export { EMPTY_TILE_STATISTICS } from '@tileguard/analysis';

// ---------------------------------------------------------------------------
// Geometry type normalisation
// ---------------------------------------------------------------------------

type GeometryBucket = 'point' | 'line' | 'polygon';

function toGeometryBucket(geometryType: string): GeometryBucket {
  const lower = geometryType.toLowerCase();
  if (lower === 'point' || lower.includes('point')) return 'point';
  if (lower === 'linestring' || lower.includes('line')) return 'line';
  return 'polygon';
}

// ---------------------------------------------------------------------------
// StatisticsService interface
// ---------------------------------------------------------------------------

export interface StatisticsService {
  /**
   * Compute and return a full TileStatistics snapshot.
   * Returns EMPTY_TILE_STATISTICS when no tile is loaded.
   */
  compute(): TileStatistics;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class StatisticsServiceImpl implements StatisticsService {
  constructor(
    private readonly _featureProvider: FeatureProvider,
    private readonly _diagnosticProvider: DiagnosticProvider,
    private readonly _layerProvider: LayerProvider,
  ) {}

  compute(): TileStatistics {
    const layers = this._layerProvider.getLayers();
    if (layers.length === 0) return EMPTY_TILE_STATISTICS;

    // Build per-layer diagnostic counts
    const diagByLayer = new Map<string, number>();
    for (const d of this._diagnosticProvider.getAllDiagnostics()) {
      const loc = d.location as { layer?: string } | undefined;
      const layerName = loc?.layer;
      if (layerName !== undefined) {
        diagByLayer.set(layerName, (diagByLayer.get(layerName) ?? 0) + 1);
      }
    }

    // Build per-layer geometry counts
    const geomByLayer = new Map<
      string,
      { point: number; line: number; polygon: number }
    >();
    for (const feature of this._featureProvider.getAllFeatures()) {
      const existing = geomByLayer.get(feature.layerName) ?? {
        point: 0,
        line: 0,
        polygon: 0,
      };
      const bucket = toGeometryBucket(feature.geometryType);
      existing[bucket]++;
      geomByLayer.set(feature.layerName, existing);
    }

    // Assemble per-layer statistics
    const layerStats: LayerStatistics[] = layers.map((layer) => {
      const geom = geomByLayer.get(layer.name) ?? {
        point: 0,
        line: 0,
        polygon: 0,
      };
      return Object.freeze({
        name: layer.name,
        featureCount: layer.featureCount,
        geometryCounts: Object.freeze({ ...geom }),
        diagnosticCount: diagByLayer.get(layer.name) ?? 0,
      });
    });

    // Aggregate totals
    let totalFeatures = 0;
    let totalPoint = 0;
    let totalLine = 0;
    let totalPolygon = 0;
    for (const ls of layerStats) {
      totalFeatures += ls.featureCount;
      totalPoint += ls.geometryCounts.point;
      totalLine += ls.geometryCounts.line;
      totalPolygon += ls.geometryCounts.polygon;
    }

    const diagSummary = this._diagnosticProvider.getSummary();

    return Object.freeze({
      totalLayers: layers.length,
      totalFeatures,
      geometryCounts: Object.freeze({
        point: totalPoint,
        line: totalLine,
        polygon: totalPolygon,
      }),
      diagnostics: Object.freeze({
        errors: diagSummary.errorCount,
        warnings: diagSummary.warningCount,
        info: diagSummary.infoCount,
      }),
      layers: Object.freeze(layerStats),
    });
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a StatisticsService backed by the three provider instances.
 *
 * @example
 *   const service = createStatisticsService(
 *     featureProvider, diagnosticProvider, layerProvider
 *   );
 *   const stats = service.compute();
 */
export function createStatisticsService(
  featureProvider: FeatureProvider,
  diagnosticProvider: DiagnosticProvider,
  layerProvider: LayerProvider,
): StatisticsService {
  return new StatisticsServiceImpl(
    featureProvider,
    diagnosticProvider,
    layerProvider,
  );
}
