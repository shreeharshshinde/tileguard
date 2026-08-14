/**
 * @tileguard/analysis — Shared Analysis Engine
 *
 * Provides tile comparison and regression detection algorithms for TileGuard.
 * This is the single source of truth for all comparison logic, consumed by
 * both `@tileguard/cli` (headless) and `@tileguard/inspector` (visual).
 *
 * ## Architecture
 *
 * The analysis pipeline has two stages:
 *
 * 1. **Comparison** — Takes two tile snapshots and produces a feature-level
 *    diff (added, removed, modified features with geometry and property diffs).
 *
 * 2. **Regression** — Takes a comparison result and ranks modified features
 *    by regression confidence, producing actionable engineering intelligence
 *    about which changes are most likely to be regressions.
 *
 * ## Key Design Decisions
 *
 * - Zero DOM, React, Canvas, or browser API dependencies
 * - All engines are stateless factories (create once, use many times)
 * - All models are deeply readonly (immutable after creation)
 * - Deterministic: same inputs always produce same outputs
 *
 * ## Quick Start
 *
 * ```ts
 * import {
 *   createComparisonEngine,
 *   createRegressionEngine,
 *   createSnapshotFactory,
 * } from '@tileguard/analysis';
 *
 * // Create snapshots from raw tile data
 * const factory = createSnapshotFactory();
 * const before = factory.createSnapshot('./v1.pbf', layers, diagnostics);
 * const after = factory.createSnapshot('./v2.pbf', layers, diagnostics);
 *
 * // Compare and analyze
 * const comparison = createComparisonEngine().compare(before, after);
 * const regression = createRegressionEngine().analyze(comparison);
 *
 * console.log(`${regression.summary.totalCandidates} regression candidates found`);
 * ```
 *
 * @packageDocumentation
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
