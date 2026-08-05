/**
 * @tileguard/style-rules — MapLibre style specification provider + lint rules.
 *
 * This package ports the legacy style linter into framework-native rules.
 * The provider produces StyleSpecification artifacts for valid style JSON,
 * InvalidStyleSpecification artifacts for parse failures, and empty placeholder
 * artifacts for the zero-byte render fixtures preserved in the repo.
 *
 * Additionally, this package exports the Style Analysis Engine — a complete
 * parser, resolver, validator, and statistics pipeline for MapLibre styles.
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
  StyleDocument,
  SpriteDescriptor,
  StyleProjection,
  StyleTerrain,
  StyleFog,
  StyleLight,
  StyleTransition,
  StyleImport,
} from './models/index.js';

export type {
  StyleSource,
  SourceType,
  VectorSource,
  GeoJsonSource,
  RasterSource,
  RasterDemSource,
  ImageSource,
  VideoSource,
} from './models/index.js';

export type {
  StyleLayer,
  LayerType,
  PropertyValue,
  LayerFilter,
} from './models/index.js';

export type {
  StyleExpression,
  ExpressionType,
  ExpressionArg,
  ExpressionLiteral,
  PropertyReference,
} from './models/index.js';

export { isExpression, isLiteral } from './models/index.js';

export type {
  StyleAnalysis,
  ResolvedLayer,
  StyleDiagnostic,
  StyleStatistics,
} from './models/index.js';

// Parser
export { parseStyleDocument, parseExpression, isExpressionArray, parseFilter } from './parser/index.js';
export type { ParseResult } from './parser/index.js';

// Resolver
export { resolveLayers, resolveLayer } from './resolver/index.js';

// Validator
export { validateStyle } from './validator/index.js';

// Services (public API)
export {
  parseStyle,
  analyzeStyle,
  validateStyleAnalysis,
  getLayer,
  getSource,
  getStatistics,
} from './services/StyleAnalysisEngine.js';

// ── Plugin & Rules ────────────────────────────────────────────────────────

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

export const stylePlugin: Plugin = {
  id: 'style-rules',
  name: 'TileGuard Style Rules',
  version: '0.4.0',
  providers: [styleProvider],
  rules: styleRules,
};
