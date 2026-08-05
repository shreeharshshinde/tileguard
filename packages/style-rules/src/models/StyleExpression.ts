/**
 * @tileguard/style-rules — StyleExpression Model
 *
 * A typed AST for MapLibre expressions. Supports all core expression types
 * used in filters, paint properties, and layout properties.
 *
 * The AST is designed for analysis — not for evaluation. Each node carries
 * the expression operator, its arguments, and a reference to the raw array.
 */

// ---------------------------------------------------------------------------
// Expression Node Types
// ---------------------------------------------------------------------------

export type ExpressionType =
  // Data access
  | 'get'
  | 'has'
  | 'at'
  | 'in'
  | 'index-of'
  | 'length'
  | 'slice'
  // Feature
  | 'feature-state'
  | 'geometry-type'
  | 'id'
  | 'properties'
  // Lookup
  | 'literal'
  // Comparison
  | '=='
  | '!='
  | '<'
  | '>'
  | '<='
  | '>='
  // Logical
  | 'all'
  | 'any'
  | '!'
  // Decision
  | 'match'
  | 'case'
  | 'coalesce'
  | 'within'
  // Ramp / Curve
  | 'step'
  | 'interpolate'
  | 'interpolate-hcl'
  | 'interpolate-lab'
  // String
  | 'concat'
  | 'downcase'
  | 'upcase'
  | 'resolved-locale'
  | 'is-supported-script'
  // Math
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '^'
  | 'abs'
  | 'ceil'
  | 'floor'
  | 'round'
  | 'min'
  | 'max'
  | 'sqrt'
  | 'log10'
  | 'log2'
  | 'ln'
  | 'e'
  | 'pi'
  | 'sin'
  | 'cos'
  | 'tan'
  | 'asin'
  | 'acos'
  | 'atan'
  // Type
  | 'typeof'
  | 'to-string'
  | 'to-number'
  | 'to-boolean'
  | 'to-color'
  | 'to-rgba'
  | 'number-format'
  | 'image'
  | 'format'
  // Color
  | 'rgb'
  | 'rgba'
  // Zoom
  | 'zoom'
  // Variable binding
  | 'let'
  | 'var'
  // Heatmap
  | 'heatmap-density'
  | 'line-progress'
  // Unknown / unrecognized
  | 'unknown';

// ---------------------------------------------------------------------------
// Expression Nodes
// ---------------------------------------------------------------------------

/**
 * Base expression node. Every expression carries its operator, child
 * arguments (which are themselves expressions or literals), and a
 * reference to the original raw JSON array.
 */
export interface StyleExpression {
  /** The expression operator (first element of the array). */
  readonly operator: ExpressionType;

  /** Ordered arguments to the expression. */
  readonly args: readonly ExpressionArg[];

  /** The raw JSON array that produced this node. */
  readonly raw: unknown;
}

/**
 * An argument to an expression — either a sub-expression (another AST node)
 * or a literal value (string, number, boolean, null, object, array).
 */
export type ExpressionArg = StyleExpression | ExpressionLiteral;

/**
 * A literal value within an expression (non-expression argument).
 */
export interface ExpressionLiteral {
  readonly operator: 'literal_value';
  readonly value: unknown;
  readonly raw: unknown;
}

/**
 * Type guard: is this argument a sub-expression (not a literal)?
 */
export function isExpression(arg: ExpressionArg): arg is StyleExpression {
  return arg.operator !== 'literal_value';
}

/**
 * Type guard: is this argument a literal value?
 */
export function isLiteral(arg: ExpressionArg): arg is ExpressionLiteral {
  return arg.operator === 'literal_value';
}

// ---------------------------------------------------------------------------
// Property References (analysis helpers)
// ---------------------------------------------------------------------------

/**
 * Represents a property that an expression references via `["get", "name"]`.
 * Used by the semantic resolver to determine which feature properties
 * a layer depends on.
 */
export interface PropertyReference {
  /** The property name referenced. */
  readonly name: string;

  /** The expression path where the reference occurs. */
  readonly path: string;
}
