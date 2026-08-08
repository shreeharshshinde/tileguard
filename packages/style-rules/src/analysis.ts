/**
 * @tileguard/style-rules/analysis — Browser-safe Style Analysis Engine
 *
 * This entry point exports ONLY the analysis pipeline (parser, resolver,
 * validator, statistics, models). It does NOT import the Node.js provider
 * or any module that uses `node:fs/promises`.
 *
 * Use this entry point in browser environments (Inspector, Vite apps).
 * Use the main entry point (`@tileguard/style-rules`) in Node.js environments.
 */

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
  StyleDiagnosticLocation,
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
// Analysis Engine (public API)
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
