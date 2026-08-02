/**
 * @tileguard/inspector — Comparison Engine Public API
 */

export type { ComparisonService } from './ComparisonService.js';
export { createComparisonService } from './ComparisonService.js';
export type { FeatureMatcher, FeatureMatchResult } from './FeatureMatcher.js';
export { createFeatureMatcher } from './FeatureMatcher.js';
export type { GeometryDiffer } from './GeometryDiffer.js';
export { createGeometryDiffer } from './GeometryDiffer.js';
export type {
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
} from './models.js';
export type { PropertyDiffer } from './PropertyDiffer.js';
export { createPropertyDiffer } from './PropertyDiffer.js';
