/**
 * @tileguard/inspector — Comparison Engine Public API
 *
 * Re-exports from @tileguard/analysis (the single source of truth)
 * plus the inspector-specific ComparisonService (which adds InspectorStore integration).
 */

// Re-export all types and factories from the shared analysis package
export type {
  ComparisonEngine,
  FeatureMatcher,
  FeatureMatchResult,
  GeometryDiffer,
  PropertyDiffer,
  BoundingRect,
  ComparisonSummary,
  DiagnosticComparison,
  FeatureChangeKind,
  FeatureChanges,
  FeatureComparison,
  FeatureSnapshot,
  GeometryDiff,
  LayerChangeKind,
  LayerComparison,
  LayerSnapshot,
  PropertyDiff,
  PropertyDiffEntry,
  StatisticsDelta,
  TileComparison,
  TilePoint,
  TileSnapshot,
} from '@tileguard/analysis';

export {
  createComparisonEngine,
  createFeatureMatcher,
  createGeometryDiffer,
  createPropertyDiffer,
} from '@tileguard/analysis';

// Inspector-specific: ComparisonService with InspectorStore integration
export type { ComparisonService } from './ComparisonService.js';
export { createComparisonService } from './ComparisonService.js';
