/**
 * @tileguard/inspector — FeaturePanel
 *
 * The right sidebar panel. Replaces the Step 1 "Coming in Step 2" placeholder.
 *
 * Responsibilities:
 *   - Subscribe to selection changes via useSelectedFeature()
 *   - Render FeatureHeader + GeometrySection + PropertyTable for the selected feature
 *   - Show a placeholder message when nothing is selected
 *   - Never touch the renderer or viewport directly
 *
 * Event flow (canvas → panel):
 *   Canvas click
 *     → InteractionController.handleClick()
 *     → InspectorStore.select()
 *     → useSelectedFeature() re-renders this panel
 *
 * Event flow (diagnostic panel → this panel):
 *   DiagnosticPanel selects a diagnostic
 *     → Inspector.selectDiagnostic()
 *     → InspectorStore.select()
 *     → useSelectedFeature() re-renders this panel
 */

import { useSelectedFeature } from '../../hooks/use-store.js';
import type { InspectorStore } from '../../store/inspector-store.js';
import './FeaturePanel.css';
import { FeatureHeader } from './FeatureHeader.js';
import { GeometrySection } from './GeometrySection.js';
import { PropertyTable } from './PropertyTable.js';

export interface FeaturePanelProps {
  readonly store: InspectorStore;
}

export function FeaturePanel({ store }: FeaturePanelProps): JSX.Element {
  const feature = useSelectedFeature(store);

  if (feature === null) {
    return (
      <div className="feature-panel feature-panel--empty" aria-label="Feature Inspector panel">
        <div className="feature-panel__empty-state">
          <span className="feature-panel__empty-icon" aria-hidden="true">
            🔍
          </span>
          <span className="feature-panel__empty-title">
            No feature selected
          </span>
          <span className="feature-panel__empty-hint">
            Click a feature on the canvas or select a diagnostic to inspect it.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-panel" aria-label="Feature Inspector panel" aria-live="polite">
      <div className="feature-panel__section feature-panel__section--header">
        <FeatureHeader feature={feature} />
      </div>

      <div className="feature-panel__divider" role="separator" />

      <div className="feature-panel__section">
        <div className="feature-panel__section-title">Properties</div>
        <PropertyTable properties={feature.properties} />
      </div>

      <div className="feature-panel__divider" role="separator" />

      <div className="feature-panel__section">
        <div className="feature-panel__section-title">Geometry</div>
        <GeometrySection feature={feature} />
      </div>
    </div>
  );
}
