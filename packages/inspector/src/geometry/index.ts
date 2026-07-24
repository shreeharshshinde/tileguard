/**
 * @tileguard/inspector — Geometry Module
 * Public barrel for all reusable geometric primitives.
 */

export type { TilePoint, ScreenPoint } from './point.js';
export type { BoundingBox } from './bounds.js';
export {
  createBoundsFromPoints,
  width,
  height,
  center,
  containsPoint,
  intersects,
  expand,
} from './bounds.js';
export type { Matrix2D } from './matrix.js';
export { buildMatrix, invertMatrix, applyMatrix } from './matrix.js';
export {
  distanceSquared,
  midpoint,
  lerp,
  equalsWithinTolerance,
  signedArea,
} from './helpers.js';
export type { GeometryVisitor, FeatureContext, Point } from './traversal.js';
export { walkFeatureGeometry, walkLayer, walkArtifact } from './traversal.js';
