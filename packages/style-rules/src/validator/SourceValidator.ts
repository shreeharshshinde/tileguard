/**
 * @tileguard/style-rules — Source Validator
 *
 * Validates source declarations and references:
 *   - Sources present when layers need them
 *   - Unused sources
 *   - Terrain source references
 */

import type {
  ResolvedLayer,
  StyleDiagnostic,
} from '../models/StyleAnalysis.js';
import type { StyleDocument } from '../models/StyleDocument.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateSources(
  document: StyleDocument,
  _resolvedLayers: readonly ResolvedLayer[],
): readonly StyleDiagnostic[] {
  const diagnostics: StyleDiagnostic[] = [];

  validateSourcesPresent(document, diagnostics);
  validateUnusedSources(document, diagnostics);
  validateTerrainSource(document, diagnostics);

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function validateSourcesPresent(
  doc: StyleDocument,
  diags: StyleDiagnostic[],
): void {
  if (
    doc.sources.size === 0 &&
    doc.layers.some((l) => l.type !== 'background')
  ) {
    diags.push({
      severity: 'warning',
      message:
        'Style has no sources declared, but contains layers that require sources.',
      path: 'sources',
      code: 'no-sources',
      suggestion: 'Add at least one source to the "sources" object.',
    });
  }
}

function validateUnusedSources(
  doc: StyleDocument,
  diags: StyleDiagnostic[],
): void {
  const referencedSources = new Set<string>();
  for (const layer of doc.layers) {
    if (layer.source !== undefined) {
      referencedSources.add(layer.source);
    }
  }

  // Terrain also references a source
  if (doc.terrain?.source) {
    referencedSources.add(doc.terrain.source);
  }

  for (const [sourceId] of doc.sources) {
    if (!referencedSources.has(sourceId)) {
      diags.push({
        severity: 'info',
        message: `Source "${sourceId}" is declared but not referenced by any layer.`,
        path: `sources.${sourceId}`,
        code: 'unused-source',
        suggestion:
          'Remove the unused source or add a layer that references it.',
      });
    }
  }
}

function validateTerrainSource(
  doc: StyleDocument,
  diags: StyleDiagnostic[],
): void {
  if (doc.terrain && !doc.sources.has(doc.terrain.source)) {
    diags.push({
      severity: 'error',
      message: `Terrain references unknown source "${doc.terrain.source}".`,
      path: 'terrain.source',
      code: 'terrain-unknown-source',
      suggestion: `Add a raster-dem source with ID "${doc.terrain.source}" to the sources object.`,
    });
  }
}
