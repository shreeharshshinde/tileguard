/**
 * @tileguard/style-rules — Models barrel export
 */

export type {
  StyleDocument,
  SpriteDescriptor,
  StyleProjection,
  StyleTerrain,
  StyleFog,
  StyleLight,
  StyleTransition,
  StyleImport,
} from './StyleDocument.js';

export type {
  StyleSource,
  SourceType,
  VectorSource,
  GeoJsonSource,
  RasterSource,
  RasterDemSource,
  ImageSource,
  VideoSource,
} from './StyleSource.js';

export type {
  StyleLayer,
  LayerType,
  PropertyValue,
  LayerFilter,
} from './StyleLayer.js';

export type {
  StyleExpression,
  ExpressionType,
  ExpressionArg,
  ExpressionLiteral,
  PropertyReference,
} from './StyleExpression.js';

export { isExpression, isLiteral } from './StyleExpression.js';

export type {
  StyleAnalysis,
  ResolvedLayer,
  StyleDiagnostic,
  StyleDiagnosticLocation,
  StyleStatistics,
} from './StyleAnalysis.js';
