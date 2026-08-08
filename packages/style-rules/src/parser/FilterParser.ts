/**
 * @tileguard/style-rules — Filter Parser
 *
 * Normalizes MapLibre filter expressions into the expression AST.
 *
 * MapLibre supports two filter syntaxes:
 *   1. Expression filters (v2): ["all", ["==", ["get", "type"], "road"]]
 *   2. Legacy filters (deprecated): ["==", "type", "road"]
 *
 * The Filter Parser handles both, converting legacy filters into their
 * expression-syntax equivalents so downstream analysis works uniformly.
 */

import type {
  ExpressionArg,
  ExpressionLiteral,
  StyleExpression,
} from '../models/StyleExpression.js';
import { isExpressionArray, parseExpression } from './ExpressionParser.js';

// ---------------------------------------------------------------------------
// Legacy Filter Operators
// ---------------------------------------------------------------------------

const LEGACY_COMPARISON_OPS = new Set(['==', '!=', '<', '>', '<=', '>=']);
const LEGACY_MEMBERSHIP_OPS = new Set(['in', '!in']);
const LEGACY_EXISTENCE_OPS = new Set(['has', '!has']);
const LEGACY_COMBINING_OPS = new Set(['all', 'any', 'none']);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a filter value into a StyleExpression AST node.
 * Handles both expression-based and legacy filter syntax.
 * Returns undefined if the value is not a valid filter.
 */
export function parseFilter(value: unknown): StyleExpression | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;

  const operator = value[0];
  if (typeof operator !== 'string') return undefined;

  // Determine if this is a legacy filter or expression filter.
  // Expression filters have sub-arrays as operands that start with operators.
  // Legacy filters use string property names directly.
  if (isLegacyFilter(value)) {
    return convertLegacyFilter(value);
  }

  // Expression-based filter — parse directly.
  return parseExpression(value);
}

// ---------------------------------------------------------------------------
// Legacy Detection
// ---------------------------------------------------------------------------

/**
 * Heuristic: a filter is "legacy" if:
 * - It's a comparison op where the second element is a plain string (property name)
 *   and NOT an array (which would be an expression).
 * - It's a membership op (in, !in).
 * - It's an existence op (has, !has).
 * - It's "none" (which doesn't exist in expression syntax).
 */
function isLegacyFilter(arr: unknown[]): boolean {
  const op = arr[0] as string;

  if (LEGACY_EXISTENCE_OPS.has(op)) {
    // Legacy ["has", "prop"] has exactly 2 elements with string prop
    return arr.length === 2 && typeof arr[1] === 'string';
  }

  if (LEGACY_MEMBERSHIP_OPS.has(op)) {
    // Legacy ["in", "prop", v1, v2, ...] — 2nd element is a string
    return (
      arr.length >= 3 && typeof arr[1] === 'string' && !Array.isArray(arr[1])
    );
  }

  if (op === 'none') {
    return true;
  }

  if (LEGACY_COMPARISON_OPS.has(op)) {
    // Legacy: ["==", "prop", value] — 2nd element is a string, not an array
    return (
      arr.length === 3 && typeof arr[1] === 'string' && !Array.isArray(arr[1])
    );
  }

  if (LEGACY_COMBINING_OPS.has(op)) {
    // "all" or "any" — legacy if any sub-filter is legacy
    for (let i = 1; i < arr.length; i++) {
      if (Array.isArray(arr[i]) && isLegacyFilter(arr[i] as unknown[])) {
        return true;
      }
    }
    return false;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Legacy Conversion
// ---------------------------------------------------------------------------

function convertLegacyFilter(arr: unknown[]): StyleExpression {
  const op = arr[0] as string;

  if (LEGACY_COMPARISON_OPS.has(op)) {
    return convertLegacyComparison(op, arr);
  }

  if (LEGACY_EXISTENCE_OPS.has(op)) {
    return convertLegacyExistence(op, arr);
  }

  if (LEGACY_MEMBERSHIP_OPS.has(op)) {
    return convertLegacyMembership(op, arr);
  }

  if (op === 'none') {
    // ["none", ...filters] → ["!", ["any", ...filters]]
    const subFilters: ExpressionArg[] = [];
    for (let i = 1; i < arr.length; i++) {
      const sub = parseFilter(arr[i]);
      if (sub) subFilters.push(sub);
    }
    const anyExpr: StyleExpression = {
      operator: 'any',
      args: subFilters,
      raw: ['any', ...arr.slice(1)],
    };
    return {
      operator: '!',
      args: [anyExpr],
      raw: arr,
    };
  }

  if (LEGACY_COMBINING_OPS.has(op)) {
    // ["all", ...] or ["any", ...] — recursively convert sub-filters
    const subArgs: ExpressionArg[] = [];
    for (let i = 1; i < arr.length; i++) {
      const sub = parseFilter(arr[i]);
      if (sub) subArgs.push(sub);
    }
    return {
      operator: op as 'all' | 'any',
      args: subArgs,
      raw: arr,
    };
  }

  // Fallback: treat as expression
  return parseExpression(arr) ?? makeFallback(arr);
}

/**
 * Legacy comparison: ["==", "prop", value]
 * → Expression: ["==", ["get", "prop"], value]
 *
 * Special case: "$type" → ["geometry-type"]
 * Special case: "$id" → ["id"]
 */
function convertLegacyComparison(op: string, arr: unknown[]): StyleExpression {
  const property = arr[1] as string;
  const value = arr[2];

  const lhs = convertLegacyProperty(property);
  const rhs = makeLiteral(value);

  return {
    operator: op as '==' | '!=' | '<' | '>' | '<=' | '>=',
    args: [lhs, rhs],
    raw: arr,
  };
}

/**
 * Legacy existence: ["has", "prop"] → ["has", "prop"]
 * Legacy negated: ["!has", "prop"] → ["!", ["has", "prop"]]
 */
function convertLegacyExistence(op: string, arr: unknown[]): StyleExpression {
  const property = arr[1] as string;

  const hasExpr: StyleExpression = {
    operator: 'has',
    args: [makeLiteral(property)],
    raw: ['has', property],
  };

  if (op === '!has') {
    return {
      operator: '!',
      args: [hasExpr],
      raw: arr,
    };
  }

  return { ...hasExpr, raw: arr };
}

/**
 * Legacy membership: ["in", "prop", v1, v2, ...]
 * → ["match", ["get", "prop"], [v1, v2, ...], true, false]
 *
 * Legacy negated: ["!in", "prop", v1, v2, ...]
 * → ["!", ["match", ["get", "prop"], [v1, v2, ...], true, false]]
 */
function convertLegacyMembership(op: string, arr: unknown[]): StyleExpression {
  const property = arr[1] as string;
  const values = arr.slice(2);

  const getExpr = convertLegacyProperty(property);
  const matchExpr: StyleExpression = {
    operator: 'match',
    args: [getExpr, makeLiteral(values), makeLiteral(true), makeLiteral(false)],
    raw: [
      'match',
      property === '$type' ? ['geometry-type'] : ['get', property],
      values,
      true,
      false,
    ],
  };

  if (op === '!in') {
    return {
      operator: '!',
      args: [matchExpr],
      raw: arr,
    };
  }

  return { ...matchExpr, raw: arr };
}

/**
 * Convert a legacy property reference to an expression:
 *   "$type" → ["geometry-type"]
 *   "$id"   → ["id"]
 *   other   → ["get", "name"]
 */
function convertLegacyProperty(property: string): StyleExpression {
  if (property === '$type') {
    return { operator: 'geometry-type', args: [], raw: ['geometry-type'] };
  }
  if (property === '$id') {
    return { operator: 'id', args: [], raw: ['id'] };
  }
  return {
    operator: 'get',
    args: [makeLiteral(property)],
    raw: ['get', property],
  };
}

function makeLiteral(value: unknown): ExpressionLiteral {
  return { operator: 'literal_value', value, raw: value };
}

function makeFallback(arr: unknown[]): StyleExpression {
  return {
    operator: 'unknown',
    args: arr.slice(1).map(makeLiteral),
    raw: arr,
  };
}
