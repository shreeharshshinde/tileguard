/**
 * @tileguard/inspector — GeometrySection
 *
 * Renders a summary of the feature's geometry: type, coordinate count,
 * and a collapsed raw geometry view for debugging.
 */

import type { ResolvedFeature } from '../../providers/FeatureProvider.js';
import './GeometrySection.css';

export interface GeometrySectionProps {
  readonly feature: ResolvedFeature;
}

/** Count the total number of coordinates across all geometry rings/paths. */
function countCoordinates(
  geometryType: string,
  geometry: unknown,
): number {
  if (!Array.isArray(geometry)) return 0;

  if (geometryType === 'Point') {
    // geometry is [{ x, y }]
    return geometry.length;
  }

  if (geometryType === 'LineString') {
    // geometry is [[{ x, y }, ...]]
    let count = 0;
    for (const ring of geometry) {
      if (Array.isArray(ring)) count += ring.length;
    }
    return count;
  }

  if (geometryType === 'Polygon') {
    // geometry is [[[{ x, y }, ...], ...]]  or  [[{ x, y }, ...], ...]
    let count = 0;
    for (const outer of geometry) {
      if (Array.isArray(outer)) {
        for (const inner of outer) {
          if (Array.isArray(inner)) count += inner.length;
          else count += 1; // direct point
        }
      }
    }
    return count;
  }

  return 0;
}

export function GeometrySection({ feature }: GeometrySectionProps): JSX.Element {
  const coordCount = countCoordinates(feature.geometryType, feature.geometry);

  return (
    <div className="geometry-section">
      <div className="geometry-section__row">
        <span className="geometry-section__label">Type</span>
        <span className="geometry-section__value">{feature.geometryType}</span>
      </div>
      {coordCount > 0 && (
        <div className="geometry-section__row">
          <span className="geometry-section__label">Coordinates</span>
          <span className="geometry-section__value">{coordCount}</span>
        </div>
      )}
      <details className="geometry-section__raw">
        <summary className="geometry-section__raw-summary">
          Raw geometry
        </summary>
        <pre className="geometry-section__raw-content">
          {JSON.stringify(feature.geometry, null, 2)}
        </pre>
      </details>
    </div>
  );
}
