/**
 * @tileguard/style-rules — Expression Parser
 *
 * Parses MapLibre expression arrays into a typed AST (StyleExpression).
 * Handles all expression operators in the MapLibre Style Specification.
 *
 * This parser does NOT validate expression semantics (wrong arg counts,
 * type mismatches). It only converts the JSON structure into AST nodes.
 * Validation is handled by the Validation Engine.
 */

import type {
  ExpressionArg,
  ExpressionLiteral,
  ExpressionType,
  StyleExpression,
} from '../models/StyleExpression.js';

// ---------------------------------------------------------------------------
// Known Operators
// ---------------------------------------------------------------------------

const KNOWN_OPERATORS = new Set<string>([
  // Data access
  'get', 'has', 'at', 'in', 'index-of', 'length', 'slice',
  // Feature
  'feature-state', 'geometry-type', 'id', 'properties',
  // Lookup
  'literal',
  // Comparison
  '==', '!=', '<', '>', '<=', '>=',
  // Logical
  'all', 'any', '!',
  // Decision
  'match', 'case', 'coalesce', 'within',
  // Ramp / Curve
  'step', 'interpolate', 'interpolate-hcl', 'interpolate-lab',
  // String
  'concat', 'downcase', 'upcase', 'resolved-locale', 'is-supported-script',
  // Math
  '+', '-', '*', '/', '%', '^',
  'abs', 'ceil', 'floor', 'round', 'min', 'max', 'sqrt',
  'log10', 'log2', 'ln', 'e', 'pi', 'sin', 'cos', 'tan',
  'asin', 'acos', 'atan',
  // Type
  'typeof', 'to-string', 'to-number', 'to-boolean', 'to-color', 'to-rgba',
  'number-format', 'image', 'format',
  // Color
  'rgb', 'rgba',
  // Zoom
  'zoom',
  // Variable binding
  'let', 'var',
  // Heatmap
  'heatmap-density', 'line-progress',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Determine whether a value looks like a MapLibre expression (an array
 * whose first element is a string that could be an operator).
 */
export function isExpressionArray(value: unknown): value is unknown[] {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    typeof value[0] === 'string'
  );
}

/**
 * Parse a MapLibre expression array into a StyleExpression AST node.
 * Returns undefined if the value is not a valid expression shape.
 */
export function parseExpression(value: unknown): StyleExpression | undefined {
  if (!isExpressionArray(value)) return undefined;
  return parseNode(value);
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function parseNode(arr: unknown[]): StyleExpression {
  const operatorStr = arr[0] as string;
  const operator: ExpressionType = KNOWN_OPERATORS.has(operatorStr)
    ? (operatorStr as ExpressionType)
    : 'unknown';

  const args: ExpressionArg[] = [];

  for (let i = 1; i < arr.length; i++) {
    const element = arr[i];
    args.push(parseArg(element));
  }

  return {
    operator,
    args,
    raw: arr,
  };
}

function parseArg(value: unknown): ExpressionArg {
  if (isExpressionArray(value)) {
    return parseNode(value);
  }
  return makeLiteral(value);
}

function makeLiteral(value: unknown): ExpressionLiteral {
  return {
    operator: 'literal_value',
    value,
    raw: value,
  };
}
