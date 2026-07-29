/**
 * @tileguard/inspector — FeatureHeader
 *
 * Displays the top section of the Feature Inspector panel:
 * layer name, geometry type icon, and feature ID.
 */

import type { ResolvedFeature } from '../../providers/FeatureProvider.js';
import './FeatureHeader.css';

export interface FeatureHeaderProps {
  readonly feature: ResolvedFeature;
}

const GEOMETRY_ICONS: Record<string, string> = {
  Point: '●',
  LineString: '╱',
  Polygon: '▬',
};

const GEOMETRY_LABELS: Record<string, string> = {
  Point: 'Point',
  LineString: 'LineString',
  Polygon: 'Polygon',
};

export function FeatureHeader({ feature }: FeatureHeaderProps): JSX.Element {
  const icon = GEOMETRY_ICONS[feature.geometryType] ?? '?';
  const label = GEOMETRY_LABELS[feature.geometryType] ?? feature.geometryType;
  const idLabel =
    feature.id !== undefined
      ? String(feature.id)
      : String(feature.featureIndex);

  return (
    <div className="feature-header">
      <div className="feature-header__row feature-header__row--layer">
        <span className="feature-header__label">Layer</span>
        <span className="feature-header__layer-name" title={feature.layerName}>
          {feature.layerName}
        </span>
      </div>

      <div className="feature-header__row feature-header__row--geometry">
        <span className="feature-header__label">Geometry</span>
        <span className="feature-header__geometry">
          <span className="feature-header__geometry-icon" aria-hidden="true">
            {icon}
          </span>
          <span className="feature-header__geometry-label">{label}</span>
        </span>
      </div>

      <div className="feature-header__row feature-header__row--id">
        <span className="feature-header__label">Feature ID</span>
        <span
          className="feature-header__id"
          aria-label={`Feature ID ${idLabel}`}
        >
          {idLabel}
        </span>
      </div>
    </div>
  );
}
