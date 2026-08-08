/**
 * @tileguard/style-rules — Style Analysis Service
 *
 * The orchestration layer that ties together parser, resolver, validator,
 * and statistics into a single pipeline. Produces the final StyleAnalysis.
 *
 * Public API:
 *   parseStyle()       — Parse only, no validation
 *   validateStyle()    — Parse + validate (returns diagnostics)
 *   analyzeStyle()     — Full pipeline: parse + resolve + validate + stats
 *   getLayer()         — Lookup a layer by ID in an analysis
 *   getSource()        — Lookup a source by ID in an analysis
 *   getStatistics()    — Compute statistics from a parsed document
 */

import type {
  ResolvedLayer,
  StyleAnalysis,
  StyleDiagnostic,
  StyleStatistics,
} from '../models/StyleAnalysis.js';
import type { StyleDocument } from '../models/StyleDocument.js';
import type {
  ExpressionArg,
  StyleExpression,
} from '../models/StyleExpression.js';
import { isExpression } from '../models/StyleExpression.js';
import type { StyleLayer } from '../models/StyleLayer.js';
import type { StyleSource } from '../models/StyleSource.js';
import { parseStyleDocument } from '../parser/StyleParser.js';
import { resolveLayers } from '../resolver/SemanticResolver.js';
import { validateStyle as runValidation } from '../validator/StyleValidator.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a style JSON into a StyleDocument.
 * Accepts a raw JSON string or a pre-parsed object.
 */
export function parseStyle(input: unknown): {
  readonly document: StyleDocument | undefined;
  readonly error: string | undefined;
} {
  return parseStyleDocument(input);
}

/**
 * Parse and validate a style, returning diagnostics.
 */
export function validateStyleAnalysis(input: unknown): {
  readonly document: StyleDocument | undefined;
  readonly diagnostics: readonly StyleDiagnostic[];
  readonly error: string | undefined;
} {
  const { document, error } = parseStyleDocument(input);
  if (!document) {
    return { document: undefined, diagnostics: [], error };
  }

  const resolved = resolveLayers(document);
  const diagnostics = runValidation(document, resolved);
  return { document, diagnostics, error: undefined };
}

/**
 * Full analysis pipeline: parse → resolve → validate → statistics.
 * Returns a complete StyleAnalysis or an error.
 */
export function analyzeStyle(input: unknown): {
  readonly analysis: StyleAnalysis | undefined;
  readonly error: string | undefined;
} {
  const { document, error } = parseStyleDocument(input);
  if (!document) {
    return { analysis: undefined, error };
  }

  const resolved = resolveLayers(document);
  const diagnostics = runValidation(document, resolved);
  const statistics = computeStatistics(document, resolved);

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter(
    (d) => d.severity === 'warning',
  ).length;
  const infoCount = diagnostics.filter((d) => d.severity === 'info').length;

  const analysis: StyleAnalysis = {
    document,
    sources: document.sources,
    layers: resolved,
    diagnostics,
    statistics,
    valid: errorCount === 0,
    errorCount,
    warningCount,
    infoCount,
  };

  return { analysis, error: undefined };
}

/**
 * Look up a layer by ID in a completed analysis.
 */
export function getLayer(
  analysis: StyleAnalysis,
  layerId: string,
): ResolvedLayer | undefined {
  return analysis.layers.find((rl) => rl.layer.id === layerId);
}

/**
 * Look up a source by ID in a completed analysis.
 */
export function getSource(
  analysis: StyleAnalysis,
  sourceId: string,
): StyleSource | undefined {
  return analysis.sources.get(sourceId);
}

/**
 * Compute statistics for a document. Can also be called standalone.
 */
export function getStatistics(
  document: StyleDocument,
  resolvedLayers?: readonly ResolvedLayer[],
): StyleStatistics {
  const resolved = resolvedLayers ?? resolveLayers(document);
  return computeStatistics(document, resolved);
}

// ---------------------------------------------------------------------------
// Statistics Computation
// ---------------------------------------------------------------------------

function computeStatistics(
  document: StyleDocument,
  resolvedLayers: readonly ResolvedLayer[],
): StyleStatistics {
  // Sources
  const sourcesByType: Record<string, number> = {};
  for (const [, source] of document.sources) {
    sourcesByType[source.type] = (sourcesByType[source.type] ?? 0) + 1;
  }

  // Layers
  const layersByType: Record<string, number> = {};
  for (const layer of document.layers) {
    layersByType[layer.type] = (layersByType[layer.type] ?? 0) + 1;
  }

  // Expressions
  const allOperators = new Set<string>();
  let expressionCount = 0;
  let filterCount = 0;
  let paintPropertyCount = 0;
  let layoutPropertyCount = 0;
  let dataDrivenLayerCount = 0;
  let maxDepth = 0;
  let totalPropertyRefs = 0;
  const allPropertyRefs = new Set<string>();

  for (const resolved of resolvedLayers) {
    const { layer } = resolved;
    let layerHasExpressions = false;

    // Count filter
    if (layer.filter?.expression) {
      filterCount++;
      expressionCount += countExpressions(layer.filter.expression);
      maxDepth = Math.max(
        maxDepth,
        measureExpressionDepth(layer.filter.expression),
      );
      layerHasExpressions = true;
    }

    // Count paint properties
    for (const [, propValue] of layer.paint) {
      paintPropertyCount++;
      if (propValue.expression) {
        expressionCount += countExpressions(propValue.expression);
        maxDepth = Math.max(
          maxDepth,
          measureExpressionDepth(propValue.expression),
        );
        layerHasExpressions = true;
      }
    }

    // Count layout properties
    for (const [, propValue] of layer.layout) {
      layoutPropertyCount++;
      if (propValue.expression) {
        expressionCount += countExpressions(propValue.expression);
        maxDepth = Math.max(
          maxDepth,
          measureExpressionDepth(propValue.expression),
        );
        layerHasExpressions = true;
      }
    }

    if (layerHasExpressions) dataDrivenLayerCount++;

    // Collect operators and property refs
    for (const op of resolved.expressionOperators) {
      allOperators.add(op);
    }
    for (const ref of resolved.propertyReferences) {
      allPropertyRefs.add(ref.name);
      totalPropertyRefs++;
    }
  }

  return {
    sourceCount: document.sources.size,
    sourcesByType,
    layerCount: document.layers.length,
    layersByType,
    expressionCount,
    expressionOperators: [...allOperators].sort(),
    filterCount,
    paintPropertyCount,
    layoutPropertyCount,
    dataDrivenLayerCount,
    uniquePropertyReferences: [...allPropertyRefs].sort(),
    propertyReferenceCount: totalPropertyRefs,
    importedStyleCount: document.imports?.length ?? 0,
    maximumExpressionDepth: maxDepth,
    usesSprites: document.sprite !== undefined,
    usesGlyphs: document.glyphs !== undefined,
    usesTerrain: document.terrain !== undefined,
  };
}

/**
 * Count total expression nodes in an expression tree.
 */
function countExpressions(expr: StyleExpression): number {
  let count = 1;
  for (const arg of expr.args) {
    if (isExpression(arg)) {
      count += countExpressions(arg);
    }
  }
  return count;
}

/**
 * Measure the maximum nesting depth of an expression tree.
 */
function measureExpressionDepth(expr: StyleExpression): number {
  let maxChild = 0;
  for (const arg of expr.args) {
    if (isExpression(arg)) {
      maxChild = Math.max(maxChild, measureExpressionDepth(arg));
    }
  }
  return 1 + maxChild;
}
