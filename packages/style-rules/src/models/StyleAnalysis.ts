/**
 * @tileguard/style-rules — StyleAnalysis Model
 *
 * The final output of the Style Analysis Engine. Combines the parsed
 * document, resolved relationships, validation diagnostics, and statistics
 * into a single immutable result object.
 */

import type { Severity } from '@tileguard/core';
import type { StyleDocument } from './StyleDocument.js';
import type { PropertyReference } from './StyleExpression.js';
import type { StyleLayer } from './StyleLayer.js';
import type { StyleSource } from './StyleSource.js';

// ---------------------------------------------------------------------------
// Resolved Relationships
// ---------------------------------------------------------------------------

/**
 * A resolved layer with its source and property dependencies.
 */
export interface ResolvedLayer {
  /** The parsed layer model. */
  readonly layer: StyleLayer;

  /** The resolved source this layer references (undefined for background). */
  readonly source: StyleSource | undefined;

  /** All property names this layer references via expressions and filters. */
  readonly propertyReferences: readonly PropertyReference[];

  /** All expression operators used in this layer. */
  readonly expressionOperators: readonly string[];

  /** Whether any expression in this layer references ["zoom"]. */
  readonly referencesZoom: boolean;

  /** Whether any expression in this layer references ["geometry-type"]. */
  readonly referencesGeometryType: boolean;

  /** Whether any expression in this layer references ["feature-state", ...]. */
  readonly referencesFeatureState: boolean;

  /** Whether any expression in this layer references ["id"]. */
  readonly referencesFeatureId: boolean;

  /** Feature-state keys referenced via ["feature-state", "key"]. */
  readonly featureStateKeys: readonly string[];
}

// ---------------------------------------------------------------------------
// Style Diagnostics
// ---------------------------------------------------------------------------

/**
 * A style-specific diagnostic (similar to core Diagnostic but produced
 * by the style analysis engine rather than the rule engine).
 */
/**
 * A style-specific diagnostic (similar to core Diagnostic but produced
 * by the style analysis engine rather than the rule engine).
 */
export interface StyleDiagnostic {
  /** Diagnostic severity. */
  readonly severity: Severity;

  /** Human-readable message. */
  readonly message: string;

  /** JSON path to the problematic value (e.g., "layers[3].paint.fill-color"). */
  readonly path: string;

  /** Machine-readable diagnostic code (e.g., 'duplicate-layer-id'). */
  readonly code: string;

  /** Optional suggestion for how to fix the issue. */
  readonly suggestion?: string | undefined;

  /**
   * Structured location within the style document.
   * More precise than `path` — includes line/column if available.
   */
  readonly location?: StyleDiagnosticLocation | undefined;

  /**
   * Optional URL to documentation explaining this diagnostic in detail.
   */
  readonly documentation?: string | undefined;
}

/**
 * Structured location within a style document for precise diagnostic pointing.
 */
export interface StyleDiagnosticLocation {
  /** JSON path (same as the top-level path field for convenience). */
  readonly jsonPath?: string | undefined;

  /** Layer ID where the issue was found (if applicable). */
  readonly layerId?: string | undefined;

  /** Layer index in the layers array. */
  readonly layerIndex?: number | undefined;

  /** Source ID where the issue was found (if applicable). */
  readonly sourceId?: string | undefined;

  /** Property name within paint/layout (if applicable). */
  readonly property?: string | undefined;

  /** Source file line number (1-indexed, if resolvable from raw JSON). */
  readonly line?: number | undefined;

  /** Source file column number (1-indexed, if resolvable from raw JSON). */
  readonly column?: number | undefined;
}

// ---------------------------------------------------------------------------
// Style Statistics
// ---------------------------------------------------------------------------

/**
 * Aggregated statistics about a parsed style document.
 */
export interface StyleStatistics {
  /** Total number of sources. */
  readonly sourceCount: number;

  /** Sources grouped by type. */
  readonly sourcesByType: Readonly<Record<string, number>>;

  /** Total number of layers. */
  readonly layerCount: number;

  /** Layers grouped by type. */
  readonly layersByType: Readonly<Record<string, number>>;

  /** Total number of expressions (across filters, paint, layout). */
  readonly expressionCount: number;

  /** Unique expression operators used. */
  readonly expressionOperators: readonly string[];

  /** Total number of filters across all layers. */
  readonly filterCount: number;

  /** Total paint properties defined across all layers. */
  readonly paintPropertyCount: number;

  /** Total layout properties defined across all layers. */
  readonly layoutPropertyCount: number;

  /** Number of layers that use data-driven expressions. */
  readonly dataDrivenLayerCount: number;

  /** Number of unique property references across all expressions. */
  readonly uniquePropertyReferences: readonly string[];

  /** Total number of property references (including duplicates). */
  readonly propertyReferenceCount: number;

  /** Number of imported styles (via the imports field). */
  readonly importedStyleCount: number;

  /** Maximum nesting depth of any expression in the document. */
  readonly maximumExpressionDepth: number;

  /** Whether the style uses sprites. */
  readonly usesSprites: boolean;

  /** Whether the style uses glyphs. */
  readonly usesGlyphs: boolean;

  /** Whether the style uses terrain. */
  readonly usesTerrain: boolean;
}

// ---------------------------------------------------------------------------
// StyleAnalysis
// ---------------------------------------------------------------------------

/**
 * The complete result of parsing, resolving, and validating a style document.
 *
 * Invariant: immutable. All fields are readonly.
 * Invariant: deterministic. Same input always produces same output.
 */
export interface StyleAnalysis {
  /** The parsed style document. */
  readonly document: StyleDocument;

  /** All sources, accessible by ID. */
  readonly sources: ReadonlyMap<string, StyleSource>;

  /** All layers with resolved relationships. */
  readonly layers: readonly ResolvedLayer[];

  /** Diagnostics produced by structural and semantic validation. */
  readonly diagnostics: readonly StyleDiagnostic[];

  /** Aggregated statistics about the style. */
  readonly statistics: StyleStatistics;

  /** Whether the analysis completed without errors. */
  readonly valid: boolean;

  /** Number of errors in diagnostics. */
  readonly errorCount: number;

  /** Number of warnings in diagnostics. */
  readonly warningCount: number;

  /** Number of info-level messages in diagnostics. */
  readonly infoCount: number;
}
