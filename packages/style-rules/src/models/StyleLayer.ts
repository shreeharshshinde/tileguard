/**
 * @tileguard/style-rules — StyleLayer Model
 *
 * Immutable representation of a MapLibre layer. Each layer has a type
 * discriminant and typed paint/layout property blocks.
 */

import type { StyleExpression } from './StyleExpression.js';

// ---------------------------------------------------------------------------
// Layer Types
// ---------------------------------------------------------------------------

export type LayerType =
  | 'background'
  | 'fill'
  | 'line'
  | 'symbol'
  | 'circle'
  | 'heatmap'
  | 'hillshade'
  | 'raster'
  | 'fill-extrusion';

// ---------------------------------------------------------------------------
// Paint & Layout Property Value
// ---------------------------------------------------------------------------

/**
 * A property value can be a literal, a data-driven expression, or a
 * zoom-function expression. We store the raw value plus the parsed
 * expression (if the value is an expression array).
 */
export interface PropertyValue {
  /** The raw JSON value (string, number, array expression, etc.). */
  readonly raw: unknown;

  /** Parsed expression tree, or undefined if the value is a literal. */
  readonly expression: StyleExpression | undefined;
}

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

/**
 * A layer filter — stored as both raw JSON and a parsed expression AST.
 */
export interface LayerFilter {
  readonly raw: unknown;
  readonly expression: StyleExpression | undefined;
}

// ---------------------------------------------------------------------------
// StyleLayer
// ---------------------------------------------------------------------------

/**
 * A parsed MapLibre style layer. The model preserves all fields from the
 * specification while adding parsed expression ASTs for programmatic analysis.
 */
export interface StyleLayer {
  /** Layer ID — unique identifier. */
  readonly id: string;

  /** Layer type discriminant. */
  readonly type: LayerType | string;

  /** Source ID this layer references (undefined for background layers). */
  readonly source: string | undefined;

  /** Source layer for vector tile sources. */
  readonly sourceLayer: string | undefined;

  /** Layer filter as both raw JSON and parsed expression. */
  readonly filter: LayerFilter | undefined;

  /** Minimum zoom level for the layer. */
  readonly minzoom: number | undefined;

  /** Maximum zoom level for the layer. */
  readonly maxzoom: number | undefined;

  /** Layout properties (affects rendering but not appearance). */
  readonly layout: ReadonlyMap<string, PropertyValue>;

  /** Paint properties (appearance). */
  readonly paint: ReadonlyMap<string, PropertyValue>;

  /** Arbitrary layer metadata. */
  readonly metadata: Readonly<Record<string, unknown>> | undefined;

  /** Index position in the layers array (rendering order). */
  readonly index: number;

  /**
   * Original raw JSON for this layer.
   * Preserved for tooling that needs access to non-modeled fields.
   */
  readonly raw: Readonly<Record<string, unknown>>;
}
