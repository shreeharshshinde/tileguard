/**
 * @tileguard/style-rules — Structure Validator
 *
 * Validates document-level structural integrity:
 *   - Version presence and value
 *   - Layers array presence and non-empty
 *   - Layer ID presence and uniqueness
 *   - Duplicate source IDs (structural duplicate detection)
 */

import type { StyleDiagnostic } from '../models/StyleAnalysis.js';
import type { StyleDocument } from '../models/StyleDocument.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateStructure(
  document: StyleDocument,
): readonly StyleDiagnostic[] {
  const diagnostics: StyleDiagnostic[] = [];

  validateVersion(document, diagnostics);
  validateLayersPresent(document, diagnostics);
  validateLayerIds(document, diagnostics);
  validateDuplicateLayerIds(document, diagnostics);

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function validateVersion(doc: StyleDocument, diags: StyleDiagnostic[]): void {
  if (doc.version === undefined) {
    diags.push({
      severity: 'error',
      message: 'Style document is missing the required "version" field.',
      path: 'version',
      code: 'missing-version',
      suggestion: 'Add "version": 8 to the root of the style document.',
    });
  } else if (doc.version !== 8) {
    diags.push({
      severity: 'error',
      message: `Style version "${doc.version}" is not supported. Only version 8 is valid.`,
      path: 'version',
      code: 'invalid-version',
      suggestion: 'Change "version" to 8.',
    });
  }
}

function validateLayersPresent(
  doc: StyleDocument,
  diags: StyleDiagnostic[],
): void {
  if (doc.layers.length === 0) {
    diags.push({
      severity: 'warning',
      message: 'Style has no layers declared.',
      path: 'layers',
      code: 'no-layers',
      suggestion: 'Add at least one layer to the "layers" array.',
    });
  }
}

function validateLayerIds(doc: StyleDocument, diags: StyleDiagnostic[]): void {
  for (const layer of doc.layers) {
    if (layer.id.startsWith('<unnamed-')) {
      diags.push({
        severity: 'error',
        message: `Layer at index ${layer.index} is missing a required "id" field.`,
        path: `layers[${layer.index}].id`,
        code: 'missing-layer-id',
        suggestion: 'Add a unique string "id" to this layer.',
      });
    }
  }
}

function validateDuplicateLayerIds(
  doc: StyleDocument,
  diags: StyleDiagnostic[],
): void {
  const seen = new Map<string, number>();
  for (const layer of doc.layers) {
    if (layer.id.startsWith('<unnamed-')) continue;

    const prev = seen.get(layer.id);
    if (prev !== undefined) {
      diags.push({
        severity: 'error',
        message: `Duplicate layer ID "${layer.id}" at index ${layer.index} (first seen at index ${prev}).`,
        path: `layers[${layer.index}].id`,
        code: 'duplicate-layer-id',
        suggestion: 'Give each layer a unique ID.',
      });
    } else {
      seen.set(layer.id, layer.index);
    }
  }
}
