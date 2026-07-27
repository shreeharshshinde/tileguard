/**
 * @tileguard/inspector — Geometry Module
 * Public barrel for all reusable geometric primitives.
 */

export type { BoundingBox } from './bounds.js';
export {
  center,
  containsPoint,
  createBoundsFromPoints,
  expand,
  height,
  intersects,
  width,
} from './bounds.js';
export {
  distanceSquared,
  equalsWithinTolerance,
  lerp,
  midpoint,
  signedArea,
} from './helpers.js';
export type { Matrix2D } from './matrix.js';
export { applyMatrix, buildMatrix, invertMatrix } from './matrix.js';
export type { ScreenPoint, TilePoint } from './point.js';
export type { FeatureContext, GeometryVisitor, Point } from './traversal.js';
export { walkArtifact, walkFeatureGeometry, walkLayer } from './traversal.js';
