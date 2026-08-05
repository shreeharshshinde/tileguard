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
  StyleDiagnosticLocation,
  StyleStatistics,
} from './models/index.js';

// Parser
export { parseStyleDocument, parseExpression, isExpressionArray, parseFilter } from './parser/index.js';
export type { ParseResult } from './parser/index.js';

// Resolver
export { resolveLayers, resolveLayer } from './resolver/index.js';

// Validator
export { validateStyle } from './validator/index.js';

// Analysis Engine (public API)
export {
  parseStyle,
  analyzeStyle,
  validateStyleAnalysis,
  getLayer,
  getSource,
  getStatistics,
} from './services/StyleAnalysisEngine.js';
