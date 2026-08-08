/**
 * @tileguard/style-rules — Style Validator (Orchestrator)
 *
 * Coordinates all specialized validators and concatenates their diagnostics.
 * This file contains NO validation logic — it delegates to:
 *
 *   StructureValidator  — document-level structural integrity
 *   SourceValidator     — source declarations and references
 *   LayerValidator      — layer-level semantics
 *   ExpressionValidator — expression correctness
 *
 * Adding a new validation category means creating a new file and calling it here.
 */

import type {
  ResolvedLayer,
  StyleDiagnostic,
} from '../models/StyleAnalysis.js';
import type { StyleDocument } from '../models/StyleDocument.js';
import { validateExpressions } from './ExpressionValidator.js';
import { validateLayers } from './LayerValidator.js';
import { validateSources } from './SourceValidator.js';
import { validateStructure } from './StructureValidator.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all validation checks on a parsed document and resolved layers.
 * Returns all diagnostics found — no short-circuiting.
 */
export function validateStyle(
  document: StyleDocument,
  resolvedLayers: readonly ResolvedLayer[],
): readonly StyleDiagnostic[] {
  return [
    ...validateStructure(document),
    ...validateSources(document, resolvedLayers),
    ...validateLayers(document, resolvedLayers),
    ...validateExpressions(resolvedLayers),
  ];
}
