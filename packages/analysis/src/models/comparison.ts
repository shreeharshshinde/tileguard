/**
 * @tileguard/analysis — Comparison Data Models
 *
 * Immutable snapshot and comparison result types for tile-level differencing.
 *
 * ## Architecture
 *
 * - {@link TileSnapshot}: Frozen capture of tile state at a point in time.
 *   Created by {@link SnapshotFactory} from decoded tile data.
 * - {@link TileComparison}: Root comparison result produced by
 *   {@link ComparisonEngine.compare}. Contains feature-level diffs, layer
 *   comparisons, and summary statistics.
 * - All models are deeply readonly — consumers never mutate them.
 *
 * ## Data Flow
 *
 * ```
 * Raw tile data → SnapshotFactory → TileSnapshot
 *                                         ↓
 * TileSnapshot A + TileSnapshot B → ComparisonEngine → TileComparison
 *                                                            ↓
 *                                  TileComparison → RegressionEngine → RegressionAnalysis
 * ```
 *
 * @packageDocumentation
 */

import type { Diagnostic } from '@tileguard/core';
import type { TileStatistics } from './statistics.js';

// ---------------------------------------------------------------------------
// TileSnapshot
// ---------------------------------------------------------------------------

/**
 * Immutable snapshot of a single loaded tile. Created by ComparisonService
 * from InspectorStore state. Once created it never changes.
 */
export interface TileSnapshot {
  /** Absolute file path or URL label identifying the tile. */
  readonly filePath: string;
  /** Pre-computed tile statistics (feature counts, geometry distribution, etc.) */
  readonly statistics: TileStatistics;
  /** All layers extracted from the tile, in declaration order. */
  readonly layers: readonly LayerSnapshot[];
  /** All diagnostics produced for this tile. */
  readonly diagnostics: readonly Diagnostic[];
  /** All features across all layers, flattened for matching. */
  readonly features: readonly FeatureSnapshot[];
}

/**
 * Snapshot of a single layer within a tile.
 */
export interface LayerSnapshot {
  readonly name: string;
  readonly featureCount: number;
  readonly geometryCounts: {
    readonly point: number;
    readonly line: number;
    readonly polygon: number;
  };
  readonly extent: number;
}

/**
 * Snapshot of a single feature extracted from a tile.
 * Geometry is stored as a deep-frozen structure for comparison.
 */
export interface FeatureSnapshot {
  /** Layer name this feature belongs to. */
  readonly layerName: string;
  /** Zero-based index within the layer's feature array. */
  readonly featureIndex: number;
  /** Raw MVT feature ID — may be undefined if the tile omits IDs. */
  readonly id: number | string | undefined;
  /** Geometry type string as reported by the MVT decoder. */
  readonly geometryType: string;
  /** Decoded properties object. */
  readonly properties: Readonly<Record<string, unknown>>;
  /**
   * Decoded geometry in MVT tile-coordinate format.
   * Each entry is a ring/line, each ring/line is an array of {x, y} points.
   */
  readonly geometry: readonly (readonly {
    readonly x: number;
    readonly y: number;
  }[])[];
}

// ---------------------------------------------------------------------------
// Feature Comparison
// ---------------------------------------------------------------------------

/**
 * How a feature was classified after matching.
 */
export type FeatureChangeKind = 'unchanged' | 'modified' | 'added' | 'removed';

/**
 * Bitmask-style flags for what changed inside a modified feature.
 */
export interface FeatureChanges {
  readonly geometryChanged: boolean;
  readonly propertiesChanged: boolean;
  readonly diagnosticsChanged: boolean;
}

/**
 * A single feature comparison result produced by FeatureMatcher.
 */
export interface FeatureComparison {
  /** Classification of this feature. */
  readonly kind: FeatureChangeKind;
  /**
   * The feature from Tile A (before).
   * null for 'added' features.
   */
  readonly featureA: FeatureSnapshot | null;
  /**
   * The feature from Tile B (after).
   * null for 'removed' features.
   */
  readonly featureB: FeatureSnapshot | null;
  /**
   * Populated for 'modified' features only.
   * Describes which aspects changed.
   */
  readonly changes: FeatureChanges | null;
  /** Which matching priority was used (1=ID, 2=stable-prop, 3=geometry, 4=property). */
  readonly matchPriority: 1 | 2 | 3 | 4 | null;
}

// ---------------------------------------------------------------------------
// Geometry Difference
// ---------------------------------------------------------------------------

/**
 * Detailed geometry comparison result produced by GeometryDiffer.
 */
export interface GeometryDiff {
  readonly changed: boolean;
  /** Geometry type changed (e.g. Polygon → LineString). */
  readonly typeChanged: boolean;
  readonly typeA: string;
  readonly typeB: string;
  /** Number of vertices in A vs B. */
  readonly vertexCountA: number;
  readonly vertexCountB: number;
  readonly vertexCountDelta: number;
  /** Number of rings/lines in A vs B. */
  readonly ringCountA: number;
  readonly ringCountB: number;
  readonly ringCountDelta: number;
  /** Bounding box corners in tile coordinates. */
  readonly boundsA: BoundingRect;
  readonly boundsB: BoundingRect;
  readonly boundsChanged: boolean;
  /** Centroid shift in tile units. */
  readonly centroidA: TilePoint;
  readonly centroidB: TilePoint;
  readonly centroidShift: number;
}

export interface BoundingRect {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface TilePoint {
  readonly x: number;
  readonly y: number;
}

// ---------------------------------------------------------------------------
// Property Difference
// ---------------------------------------------------------------------------

/**
 * Difference for a single property key.
 */
export type PropertyDiffEntry =
  | { readonly kind: 'added'; readonly key: string; readonly valueB: unknown }
  | {
      readonly kind: 'removed';
      readonly key: string;
      readonly valueA: unknown;
    }
  | {
      readonly kind: 'modified';
      readonly key: string;
      readonly valueA: unknown;
      readonly valueB: unknown;
    };

/**
 * Full property comparison result produced by PropertyDiffer.
 */
export interface PropertyDiff {
  readonly changed: boolean;
  readonly entries: readonly PropertyDiffEntry[];
  readonly addedCount: number;
  readonly removedCount: number;
  readonly modifiedCount: number;
}

// ---------------------------------------------------------------------------
// Layer Comparison
// ---------------------------------------------------------------------------

export type LayerChangeKind = 'unchanged' | 'modified' | 'added' | 'removed';

/**
 * Comparison result for a single layer.
 */
export interface LayerComparison {
  readonly name: string;
  readonly kind: LayerChangeKind;
  /** Feature count in A (0 for added layers). */
  readonly featureCountA: number;
  /** Feature count in B (0 for removed layers). */
  readonly featureCountB: number;
  readonly featureCountDelta: number;
  readonly diagnosticCountA: number;
  readonly diagnosticCountB: number;
  /** Geometry type distribution for A. */
  readonly geometryCountsA: { point: number; line: number; polygon: number };
  /** Geometry type distribution for B. */
  readonly geometryCountsB: { point: number; line: number; polygon: number };
}

// ---------------------------------------------------------------------------
// Diagnostic Comparison
// ---------------------------------------------------------------------------

/**
 * Comparison of diagnostics between two tile snapshots.
 */
export interface DiagnosticComparison {
  readonly errorsA: number;
  readonly errorsB: number;
  readonly errorsDelta: number;
  readonly warningsA: number;
  readonly warningsB: number;
  readonly warningsDelta: number;
  readonly infoA: number;
  readonly infoB: number;
  readonly infoDelta: number;
  /** Diagnostics present in B but not in A. */
  readonly newDiagnostics: readonly Diagnostic[];
  /** Diagnostics present in A but not in B. */
  readonly resolvedDiagnostics: readonly Diagnostic[];
}

// ---------------------------------------------------------------------------
// Statistics Delta
// ---------------------------------------------------------------------------

/**
 * Numerical delta between two TileStatistics snapshots.
 */
export interface StatisticsDelta {
  readonly layersA: number;
  readonly layersB: number;
  readonly layersDelta: number;
  readonly featuresA: number;
  readonly featuresB: number;
  readonly featuresDelta: number;
  readonly verticesA: number;
  readonly verticesB: number;
  readonly verticesDelta: number;
  readonly diagnosticsA: number;
  readonly diagnosticsB: number;
  readonly diagnosticsDelta: number;
  readonly geometryCountsA: { point: number; line: number; polygon: number };
  readonly geometryCountsB: { point: number; line: number; polygon: number };
}

// ---------------------------------------------------------------------------
// Comparison Summary
// ---------------------------------------------------------------------------

/**
 * High-level summary of the full comparison — displayed as cards in the UI.
 */
export interface ComparisonSummary {
  readonly addedFeatures: number;
  readonly removedFeatures: number;
  readonly modifiedFeatures: number;
  readonly unchangedFeatures: number;
  readonly addedLayers: number;
  readonly removedLayers: number;
  readonly modifiedLayers: number;
  readonly newDiagnostics: number;
  readonly resolvedDiagnostics: number;
  /** true when every matched feature is unchanged and no layers were added/removed */
  readonly isIdentical: boolean;
}

// ---------------------------------------------------------------------------
// Root Comparison Result
// ---------------------------------------------------------------------------

/**
 * The root result produced by ComparisonService.
 * Everything the UI needs to display the full comparison.
 */
export interface TileComparison {
  readonly snapshotA: TileSnapshot;
  readonly snapshotB: TileSnapshot;
  readonly summary: ComparisonSummary;
  readonly layers: readonly LayerComparison[];
  readonly features: readonly FeatureComparison[];
  readonly diagnostics: DiagnosticComparison;
  readonly statistics: StatisticsDelta;
}
