/**
 * @tileguard/style-rules — MapLibre style specification provider + lint rules.
 *
 * This package provides the complete style validation pipeline for TileGuard:
 *
 * - **Provider**: Loads `.json` style files, handles parse failures gracefully
 *   (producing InvalidStyleSpecification artifacts for the `valid-json` rule),
 *   and supports empty placeholder fixtures.
 *
 * - **9 lint rules**: Each rule checks one specific aspect of the MapLibre
 *   style specification, producing structured diagnostics with JSON path
 *   location context.
 *
 * - **Style Analysis Engine**: A complete parser, resolver, validator, and
 *   statistics pipeline for MapLibre styles. Useful for building advanced
 *   analysis tools, custom validators, and style introspection utilities.
 *
 * ## Quick Start
 *
 * ```ts
 * import { createEngine } from '@tileguard/core';
 * import { stylePlugin } from '@tileguard/style-rules';
 *
 * const engine = createEngine({ plugins: [stylePlugin] });
 * const result = await engine.run(['./style.json']);
 * ```
 *
 * ## Rules
 *
 * | Rule ID | Default Severity | What it catches |
 * |---------|-----------------|-----------------|
 * | `style/valid-json` | error | Style file is not valid JSON |
 * | `style/version` | error | Version must be `8` |
 * | `style/sources-present` | error | Missing `sources` object |
 * | `style/layers-present` | error | Missing `layers` array |
 * | `style/layer-id-required` | error | Layers without an `id` |
 * | `style/unique-layer-id` | error | Duplicate layer IDs |
 * | `style/known-source` | error | References to undeclared sources |
 * | `style/zoom-range` | error | `minzoom` greater than `maxzoom` |
 * | `style/no-deprecated-ref` | warning | Usage of deprecated `ref` |
 *
 * ## Style Analysis Engine
 *
 * For advanced use cases beyond rule validation:
 *
 * ```ts
 * import { parseStyle, analyzeStyle, getStatistics } from '@tileguard/style-rules';
 *
 * const doc = parseStyle(styleJson);
 * const analysis = analyzeStyle(doc);
 * const stats = getStatistics(analysis);
 * ```
 *
 * @packageDocumentation
 */

import type { Plugin, Rule } from '@tileguard/core';
import { styleProvider } from './provider.js';
import { knownSourceRule } from './rules/known-source.js';
import { layerIdRequiredRule } from './rules/layer-id-required.js';
import { layersPresentRule } from './rules/layers-present.js';
import { noDeprecatedRefRule } from './rules/no-deprecated-ref.js';
import { sourcesPresentRule } from './rules/sources-present.js';
import { uniqueLayerIdRule } from './rules/unique-layer-id.js';
import { validJsonRule } from './rules/valid-json.js';
import { versionRule } from './rules/version.js';
import { zoomRangeRule } from './rules/zoom-range.js';

// ── Provider & Rules ──────────────────────────────────────────────────────
export { styleProvider } from './provider.js';
export { knownSourceRule } from './rules/known-source.js';
export { layerIdRequiredRule } from './rules/layer-id-required.js';
export { layersPresentRule } from './rules/layers-present.js';
export { noDeprecatedRefRule } from './rules/no-deprecated-ref.js';
export { sourcesPresentRule } from './rules/sources-present.js';
export { uniqueLayerIdRule } from './rules/unique-layer-id.js';
export { validJsonRule } from './rules/valid-json.js';
export { versionRule } from './rules/version.js';
export { zoomRangeRule } from './rules/zoom-range.js';
export type {
  AnyStyleArtifact,
  EmptyStyleArtifact,
  EmptyStyleSpecificationContent,
  InvalidStyleArtifact,
  InvalidStyleSpecificationContent,
  StyleArtifact,
  StyleLayer as StyleLayerLegacy,
  StyleSpecificationContent,
} from './types.js';

export {
  EMPTY_STYLE_ARTIFACT_TYPE,
  getLayerId,
  getStyleLayers,
  INVALID_STYLE_ARTIFACT_TYPE,
  isRecord,
  STYLE_ARTIFACT_TYPE,
} from './types.js';

// ── Style Analysis Engine (Milestone 8) ───────────────────────────────────

// Models
export type {
  ExpressionArg,
  ExpressionLiteral,
  ExpressionType,
  GeoJsonSource,
  ImageSource,
  LayerFilter,
  LayerType,
  PropertyReference,
  PropertyValue,
  RasterDemSource,
  RasterSource,
  ResolvedLayer,
  SourceType,
  SpriteDescriptor,
  StyleAnalysis,
  StyleDiagnostic,
  StyleDocument,
  StyleExpression,
  StyleFog,
  StyleImport,
  StyleLayer,
  StyleLight,
  StyleProjection,
  StyleSource,
  StyleStatistics,
  StyleTerrain,
  StyleTransition,
  VectorSource,
  VideoSource,
} from './models/index.js';
export { isExpression, isLiteral } from './models/index.js';
export type { ParseResult } from './parser/index.js';
// Parser
export {
  isExpressionArray,
  parseExpression,
  parseFilter,
  parseStyleDocument,
} from './parser/index.js';

// Resolver
export { resolveLayer, resolveLayers } from './resolver/index.js';
// Services (public API)
export {
  analyzeStyle,
  getLayer,
  getSource,
  getStatistics,
  parseStyle,
  validateStyleAnalysis,
} from './services/StyleAnalysisEngine.js';
// Validator
export { validateStyle } from './validator/index.js';

// ── Plugin & Rules ────────────────────────────────────────────────────────

/**
 * All style lint rules in recommended execution order.
 *
 * `validJsonRule` is first because all other rules depend on having a
 * successfully parsed style object. Structural rules (version, sources,
 * layers) precede content rules (known-source, zoom-range, etc.).
 */
export const styleRules: readonly Rule[] = [
  validJsonRule,
  versionRule,
  sourcesPresentRule,
  layersPresentRule,
  layerIdRequiredRule,
  uniqueLayerIdRule,
  knownSourceRule,
  zoomRangeRule,
  noDeprecatedRefRule,
];

/**
 * The style validation plugin for TileGuard.
 *
 * Bundles the style provider and all 9 style lint rules into a single
 * registerable unit. Pass this to `createEngine()` to enable style
 * validation.
 *
 * @example
 * ```ts
 * import { createEngine } from '@tileguard/core';
 * import { stylePlugin } from '@tileguard/style-rules';
 *
 * const engine = createEngine({
 *   plugins: [stylePlugin],
 *   rules: {
 *     'style/known-source': 'error',
 *     'style/no-deprecated-ref': 'off',
 *   },
 * });
 * ```
 */
export const stylePlugin: Plugin = {
  id: 'style-rules',
  name: 'TileGuard Style Rules',
  version: '0.4.0',
  providers: [styleProvider],
  rules: styleRules,
};
