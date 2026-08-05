/**
 * @tileguard/style-rules — Expression Validator
 *
 * Validates expression usage within layers:
 *   - Unknown expression operators
 *   - (Future: type checking, arity validation, etc.)
 */

import type { StyleDiagnostic, ResolvedLayer } from '../models/StyleAnalysis.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateExpressions(
  resolvedLayers: readonly ResolvedLayer[],
): readonly StyleDiagnostic[] {
  const diagnostics: StyleDiagnostic[] = [];

  validateUnknownOperators(resolvedLayers, diagnostics);

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function validateUnknownOperators(
  resolvedLayers: readonly ResolvedLayer[],
  diags: StyleDiagnostic[],
): void {
  for (const resolved of resolvedLayers) {
    if (resolved.expressionOperators.includes('unknown')) {
      diags.push({
        severity: 'warning',
        message: `Layer "${resolved.layer.id}" contains an unrecognized expression operator.`,
        path: `layers[${resolved.layer.index}]`,
        code: 'unknown-expression-operator',
        suggestion: 'Check the expression syntax for typos or unsupported operators.',
      });
    }
  }
}
