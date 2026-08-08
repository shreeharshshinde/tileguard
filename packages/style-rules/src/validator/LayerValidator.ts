/**
 * @tileguard/style-rules — Layer Validator
 *
 * Validates layer-level semantics:
 *   - Source references resolve to declared sources
 *   - Source-layer required for vector sources
 *   - Zoom range validity
 *   - Layer type validity
 *   - Missing source property for rendering layers
 */

import type {
  ResolvedLayer,
  StyleDiagnostic,
} from '../models/StyleAnalysis.js';
import type { StyleDocument } from '../models/StyleDocument.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_LAYER_TYPES = new Set([
  'background',
  'fill',
  'line',
  'symbol',
  'circle',
  'heatmap',
  'hillshade',
  'raster',
  'fill-extrusion',
]);

const LAYERS_REQUIRING_SOURCE = new Set([
  'fill',
  'line',
  'symbol',
  'circle',
  'heatmap',
  'hillshade',
  'raster',
  'fill-extrusion',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateLayers(
  document: StyleDocument,
  resolvedLayers: readonly ResolvedLayer[],
): readonly StyleDiagnostic[] {
  const diagnostics: StyleDiagnostic[] = [];

  validateLayerSourceReferences(resolvedLayers, diagnostics);
  validateSourceLayerProperty(resolvedLayers, diagnostics);
  validateZoomRanges(document, diagnostics);
  validateLayerTypes(document, diagnostics);

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function validateLayerSourceReferences(
  resolvedLayers: readonly ResolvedLayer[],
  diags: StyleDiagnostic[],
): void {
  for (const resolved of resolvedLayers) {
    const { layer } = resolved;

    if (LAYERS_REQUIRING_SOURCE.has(layer.type)) {
      if (layer.source === undefined) {
        diags.push({
          severity: 'error',
          message: `Layer "${layer.id}" of type "${layer.type}" is missing a required "source" property.`,
          path: `layers[${layer.index}].source`,
          code: 'missing-source-property',
          suggestion: `Add a "source" property referencing a declared source.`,
          location: {
            jsonPath: `layers[${layer.index}].source`,
            layerId: layer.id,
            layerIndex: layer.index,
          },
        });
      } else if (resolved.source === undefined) {
        diags.push({
          severity: 'error',
          message: `Layer "${layer.id}" references unknown source "${layer.source}".`,
          path: `layers[${layer.index}].source`,
          code: 'unknown-source-reference',
          suggestion: `Add "${layer.source}" to the "sources" object or fix the reference.`,
          location: {
            jsonPath: `layers[${layer.index}].source`,
            layerId: layer.id,
            layerIndex: layer.index,
          },
        });
      }
    }
  }
}

function validateSourceLayerProperty(
  resolvedLayers: readonly ResolvedLayer[],
  diags: StyleDiagnostic[],
): void {
  for (const resolved of resolvedLayers) {
    const { layer } = resolved;

    if (resolved.source?.type === 'vector' && layer.sourceLayer === undefined) {
      diags.push({
        severity: 'warning',
        message: `Layer "${layer.id}" uses vector source "${layer.source}" but has no "source-layer" property.`,
        path: `layers[${layer.index}].source-layer`,
        code: 'missing-source-layer',
        suggestion:
          'Add a "source-layer" property to specify which source layer to render.',
        location: {
          jsonPath: `layers[${layer.index}].source-layer`,
          layerId: layer.id,
          layerIndex: layer.index,
        },
      });
    }
  }
}

function validateZoomRanges(
  doc: StyleDocument,
  diags: StyleDiagnostic[],
): void {
  for (const layer of doc.layers) {
    if (
      layer.minzoom !== undefined &&
      layer.maxzoom !== undefined &&
      layer.minzoom > layer.maxzoom
    ) {
      diags.push({
        severity: 'error',
        message: `Layer "${layer.id}" has minzoom (${layer.minzoom}) greater than maxzoom (${layer.maxzoom}).`,
        path: `layers[${layer.index}].minzoom`,
        code: 'invalid-zoom-range',
        suggestion: 'Swap minzoom and maxzoom or remove one of them.',
        location: {
          jsonPath: `layers[${layer.index}].minzoom`,
          layerId: layer.id,
          layerIndex: layer.index,
        },
      });
    }
  }
}

function validateLayerTypes(
  doc: StyleDocument,
  diags: StyleDiagnostic[],
): void {
  for (const layer of doc.layers) {
    if (!VALID_LAYER_TYPES.has(layer.type) && layer.type !== 'unknown') {
      diags.push({
        severity: 'warning',
        message: `Layer "${layer.id}" uses unknown type "${layer.type}".`,
        path: `layers[${layer.index}].type`,
        code: 'unknown-layer-type',
        suggestion: `Use one of: ${[...VALID_LAYER_TYPES].join(', ')}.`,
        location: {
          jsonPath: `layers[${layer.index}].type`,
          layerId: layer.id,
          layerIndex: layer.index,
        },
      });
    }
  }
}
