/**
 * @tileguard/analysis — Shared Analysis Engine
 *
 * Single source of truth for comparison and regression algorithms.
 * Consumed by both @tileguard/inspector and @tileguard/cli.
 *
 * Zero React, DOM, Vite, Canvas, or browser API dependencies.
 */

// ComparisonEngine — full comparison pipeline
export type { ComparisonEngine } from './ComparisonEngine.js';
export { createComparisonEngine } from './ComparisonEngine.js';
// Engines — regression
export type { ConfidenceScorer } from './ConfidenceScorer.js';
export { createConfidenceScorer } from './ConfidenceScorer.js';
export type { BuiltEvidence, EvidenceBuilder } from './EvidenceBuilder.js';
export { createEvidenceBuilder } from './EvidenceBuilder.js';
// Engines — comparison
export type { FeatureMatcher, FeatureMatchResult } from './FeatureMatcher.js';
export { createFeatureMatcher } from './FeatureMatcher.js';
export type { GeometryDiffer } from './GeometryDiffer.js';
export { createGeometryDiffer } from './GeometryDiffer.js';
// Models — comparison
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
} from './models/comparison.js';
// Models — regression
export type {
  ConfidenceWeights,
  RegressionAnalysis,
  RegressionCandidate,
  RegressionEvidence,
  RegressionKind,
  RegressionReason,
  RegressionRecommendation,
  RegressionSummary,
  TimelineStep,
} from './models/regression.js';
export {
  AREA_CHANGE_THRESHOLD,
  CENTROID_SHIFT_THRESHOLD,
  DEFAULT_CONFIDENCE_WEIGHTS,
  HIGH_SIGNAL_PROPERTIES,
  LOW_SIGNAL_PROPERTIES,
  MIN_CANDIDATE_CONFIDENCE,
} from './models/regression.js';
// Models — statistics
export type { LayerStatistics, TileStatistics } from './models/statistics.js';
export { EMPTY_TILE_STATISTICS } from './models/statistics.js';
export type { PropertyDiffer } from './PropertyDiffer.js';
export { createPropertyDiffer } from './PropertyDiffer.js';
export type {
  RegressionEngine,
  RegressionEngineOptions,
} from './RegressionEngine.js';
export { createRegressionEngine } from './RegressionEngine.js';

// SnapshotFactory — creates TileSnapshots from raw data
export type {
  RawFeatureData,
  RawLayerData,
  SnapshotFactory,
} from './SnapshotFactory.js';
export { createSnapshotFactory } from './SnapshotFactory.js';
