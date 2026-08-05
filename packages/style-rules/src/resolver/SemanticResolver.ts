/**
 * @tileguard/style-rules — Semantic Resolver
 *
 * Resolves relationships between parsed style objects:
 *   - Layer → Source resolution
 *   - Expression → Property reference extraction
 *   - Layer → Expression operator cataloging
 *
 * The resolver transforms a flat StyleDocument into a set of ResolvedLayers
 * that carry semantic context (which source? which properties? which operators?).
 * This is the bridge between parsing and analysis.
 */

import type { StyleDocument } from '../models/StyleDocument.js';
import type { StyleSource } from '../models/StyleSource.js';
import type { StyleLayer, PropertyValue } from '../models/StyleLayer.js';
import type {
  StyleExpression,
  ExpressionArg,
  PropertyReference,
} from '../models/StyleExpression.js';
import type { ResolvedLayer } from '../models/StyleAnalysis.js';
import { isExpression } from '../models/StyleExpression.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve all layers in the document, linking each to its source and
 * extracting property references and expression operators.
 */
export function resolveLayers(document: StyleDocument): readonly ResolvedLayer[] {
  const resolved: ResolvedLayer[] = [];

  for (const layer of document.layers) {
    resolved.push(resolveLayer(layer, document.sources));
  }

  return resolved;
}

/**
 * Resolve a single layer against the available sources.
 */
export function resolveLayer(
  layer: StyleLayer,
  sources: ReadonlyMap<string, StyleSource>,
): ResolvedLayer {
  // Resolve source
  const source = layer.source !== undefined ? sources.get(layer.source) : undefined;

  // Extract property references from filter + paint + layout
  const propertyRefs: PropertyReference[] = [];
  const operatorSet = new Set<string>();
  let referencesZoom = false;
  let referencesGeometryType = false;
  let referencesFeatureState = false;
  let referencesFeatureId = false;
  const featureStateKeys = new Set<string>();

  function processExpression(expr: StyleExpression, basePath: string): void {
    collectPropertyReferences(expr, basePath, propertyRefs);
    collectOperators(expr, operatorSet);
    collectSemanticMetadata(expr, {
      onZoom: () => { referencesZoom = true; },
      onGeometryType: () => { referencesGeometryType = true; },
      onFeatureState: (key) => { referencesFeatureState = true; featureStateKeys.add(key); },
      onFeatureId: () => { referencesFeatureId = true; },
    });
  }

  // From filter
  if (layer.filter?.expression) {
    processExpression(layer.filter.expression, `layers[${layer.index}].filter`);
  }

  // From paint properties
  for (const [key, propValue] of layer.paint) {
    if (propValue.expression) {
      processExpression(propValue.expression, `layers[${layer.index}].paint.${key}`);
    }
  }

  // From layout properties
  for (const [key, propValue] of layer.layout) {
    if (propValue.expression) {
      processExpression(propValue.expression, `layers[${layer.index}].layout.${key}`);
    }
  }

  return {
    layer,
    source,
    propertyReferences: propertyRefs,
    expressionOperators: [...operatorSet].sort(),
    referencesZoom,
    referencesGeometryType,
    referencesFeatureState,
    referencesFeatureId,
    featureStateKeys: [...featureStateKeys].sort(),
  };
}

// ---------------------------------------------------------------------------
// Property Reference Extraction
// ---------------------------------------------------------------------------

/**
 * Recursively walk an expression tree and extract all property references
 * (get, has, feature-state expressions).
 */
function collectPropertyReferences(
  expr: StyleExpression,
  basePath: string,
  refs: PropertyReference[],
): void {
  // ["get", "propName"] → reference
  if (expr.operator === 'get' && expr.args.length >= 1) {
    const firstArg = expr.args[0]!;
    if (!isExpression(firstArg) && typeof firstArg.value === 'string') {
      refs.push({ name: firstArg.value, path: basePath });
    }
  }

  // ["has", "propName"] → reference
  if (expr.operator === 'has' && expr.args.length >= 1) {
    const firstArg = expr.args[0]!;
    if (!isExpression(firstArg) && typeof firstArg.value === 'string') {
      refs.push({ name: firstArg.value, path: basePath });
    }
  }

  // ["feature-state", "propName"] → reference
  if (expr.operator === 'feature-state' && expr.args.length >= 1) {
    const firstArg = expr.args[0]!;
    if (!isExpression(firstArg) && typeof firstArg.value === 'string') {
      refs.push({ name: `$feature-state:${firstArg.value}`, path: basePath });
    }
  }

  // Recurse into sub-expressions
  for (const arg of expr.args) {
    if (isExpression(arg)) {
      collectPropertyReferences(arg, basePath, refs);
    }
  }
}

// ---------------------------------------------------------------------------
// Operator Collection
// ---------------------------------------------------------------------------

/**
 * Recursively walk an expression tree and collect all operator names.
 */
function collectOperators(expr: StyleExpression, operators: Set<string>): void {
  if (expr.operator !== 'unknown') {
    operators.add(expr.operator);
  }

  for (const arg of expr.args) {
    if (isExpression(arg)) {
      collectOperators(arg, operators);
    }
  }
}

// ---------------------------------------------------------------------------
// Semantic Metadata Collection
// ---------------------------------------------------------------------------

interface SemanticCallbacks {
  onZoom: () => void;
  onGeometryType: () => void;
  onFeatureState: (key: string) => void;
  onFeatureId: () => void;
}

/**
 * Walk an expression tree and call semantic callbacks for special references.
 */
function collectSemanticMetadata(expr: StyleExpression, callbacks: SemanticCallbacks): void {
  if (expr.operator === 'zoom') {
    callbacks.onZoom();
  }

  if (expr.operator === 'geometry-type') {
    callbacks.onGeometryType();
  }

  if (expr.operator === 'id') {
    callbacks.onFeatureId();
  }

  if (expr.operator === 'feature-state' && expr.args.length >= 1) {
    const firstArg = expr.args[0]!;
    if (!isExpression(firstArg) && typeof firstArg.value === 'string') {
      callbacks.onFeatureState(firstArg.value);
    }
  }

  for (const arg of expr.args) {
    if (isExpression(arg)) {
      collectSemanticMetadata(arg, callbacks);
    }
  }
}
